package com.dashn.sdk

import android.app.Application
import android.util.Log
import kotlinx.coroutines.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class DTSTracker private constructor(
    private val config: DTSConfig,
    private val application: Application,
) {
    private val anonymousUserId: String
    private val sessionId: String

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val eventQueue = mutableListOf<DTSEvent>()
    private var flushJob: Job? = null
    private var screenCapture: DTSScreenViewCapture? = null
    internal val cartCapture: DTSCartUpdateCapture
    internal val customizationCapture: DTSCustomizationCapture
    internal val errorCapture: DTSErrorCapture = DTSErrorCapture { type, props -> track(type, "", props) }

    // New components
    private val networkDetector = DTSNetworkDetector(application)
    private val lifecycleTracker = DTSLifecycleTracker { type, props -> track(type, "", props) }
    private val offlineBuffer = DTSOfflineBuffer(application)

    @Volatile private var started = false
    @Volatile private var disposed = false

    /** Authenticated user ID — merged into every event's properties as "user_id". */
    @Volatile var userId: String? = null
    /** Current cart ID — merged into every event's properties as "cart_id" when set. */
    @Volatile var cartId: String? = null

    private val json = Json { ignoreUnknownKeys = true }

    companion object {
        @Volatile private var instance: DTSTracker? = null

        fun initialize(application: Application, config: DTSConfig): DTSTracker {
            return instance ?: synchronized(this) {
                instance ?: DTSTracker(config, application).also { instance = it }
            }
        }

        fun getInstance(): DTSTracker {
            return instance ?: throw IllegalStateException(
                "DTSTracker not initialized. Call DTSTracker.initialize() first."
            )
        }
    }

    init {
        DTSStorage.initialize(application)
        anonymousUserId = DTSStorage.getAnonymousUserId()
        sessionId = DTSStorage.getSessionId()
        DTSStorage.rotateSessionId()

        cartCapture = DTSCartUpdateCapture { type, props -> trackTyped(type.value, "", props) }
        customizationCapture = DTSCustomizationCapture { type, props -> trackTyped(type.value, "", props) }
    }

    // ---- Public API ----

    fun start() {
        if (started || disposed) return
        started = true

        screenCapture = DTSScreenViewCapture { type, props ->
            track(type, props["screen"] ?: "", props)
        }
        screenCapture?.register(application)

        errorCapture.install()
        lifecycleTracker.register(application)
        networkDetector.start()

        // Capture install attribution on first launch if configured
        if (config.captureInstallReferrer && !DTSStorage.hasInstallBeenTracked()) {
            scope.launch {
                try {
                    val referrer = DTSInstallReferrer.getReferrer(application)
                    if (referrer != null) {
                        track("install", "", mapOf("referrer" to referrer))
                    }
                } catch (_: Exception) {
                    // Silently ignore — never crash the host app
                } finally {
                    DTSStorage.markInstallTracked()
                }
            }
        }

        // Flush any persisted offline events on start
        scope.launch { flushOfflineBuffer() }

        // Adaptive flush loop — respects network type for interval
        flushJob = scope.launch {
            while (isActive && !disposed) {
                val interval = config.flushIntervalMs * networkDetector.flushIntervalMultiplier
                delay(interval)
                flush()
            }
        }
    }

    // ---- Identity ----

    /** Link the current anonymous session to a logged-in user. */
    fun identify(userId: String, traits: Map<String, String> = emptyMap()) {
        val previousUserId = this.userId
        this.userId = userId
        val props = mutableMapOf<String, JsonElement>(
            "user_id" to JsonPrimitive(userId),
            "is_new_identification" to JsonPrimitive(previousUserId == null || previousUserId != userId),
        )
        if (previousUserId != null) {
            props["previous_user_id"] = JsonPrimitive(previousUserId)
        }
        traits.forEach { (k, v) -> props[k] = JsonPrimitive(v) }
        trackTyped("identify", "", props)
    }

    /** Clear the current identity (on logout). */
    fun resetIdentity() {
        val prev = userId
        userId = null
        if (prev != null) {
            track("logout", "", mapOf("user_id" to prev))
        }
    }

    // ---- Tracking ----

    fun track(type: DTSEventType, page: String = "", properties: Map<String, String> = emptyMap()) {
        track(type.value, page, properties)
    }

    /** Track an event with a free-form event type string (for custom KPIs not in the enum). */
    fun track(eventType: String, page: String = "", properties: Map<String, String> = emptyMap()) {
        if (disposed) return
        val enriched = properties.toMutableMap()
        userId?.let { enriched["user_id"] = it }
        cartId?.let { enriched["cart_id"] = it }
        val event = DTSEvent.create(eventType, sessionId, anonymousUserId, page, enriched)
        synchronized(eventQueue) {
            eventQueue.add(event)
            if (eventQueue.size >= effectiveMaxBatchSize) {
                scope.launch { flush() }
            }
        }
    }

    /** Track an event with fully typed properties (numbers, booleans, nested objects). */
    fun trackTyped(eventType: String, page: String = "", properties: Map<String, JsonElement> = emptyMap()) {
        if (disposed) return
        val enriched = properties.toMutableMap()
        userId?.let { enriched["user_id"] = JsonPrimitive(it) }
        cartId?.let { enriched["cart_id"] = JsonPrimitive(it) }
        val event = DTSEvent.createTyped(eventType, sessionId, anonymousUserId, page, enriched)
        synchronized(eventQueue) {
            eventQueue.add(event)
            if (eventQueue.size >= effectiveMaxBatchSize) {
                scope.launch { flush() }
            }
        }
    }

    // ---- Flush ----

    suspend fun flush() {
        val batch: List<DTSEvent>
        synchronized(eventQueue) {
            if (eventQueue.isEmpty()) return
            batch = eventQueue.toList()
            eventQueue.clear()
        }

        if (batch.isEmpty()) return

        if (!networkDetector.isOnline) {
            // Offline: persist to buffer
            offlineBuffer.persist(batch)
            return
        }

        try {
            DTSRetry.withBackoff(config.maxRetries) {
                sendBatch(batch)
            }
        } catch (e: Throwable) {
            // Persist failed batch to offline buffer for later retry
            offlineBuffer.persist(batch)
            logError("Flush failed, events persisted to offline buffer", e)
        }
    }

    /** Attempt to flush all persisted offline events. */
    suspend fun flushOfflineBuffer() {
        val offline = offlineBuffer.loadAll()
        if (offline.isEmpty()) return
        if (!networkDetector.isOnline) return

        try {
            DTSRetry.withBackoff(config.maxRetries) {
                sendBatch(offline)
            }
            offlineBuffer.clear()
        } catch (e: Throwable) {
            // Keep in buffer, will retry later
            logError("Offline buffer flush failed", e)
        }
    }

    fun dispose() {
        disposed = true
        flushJob?.cancel()
        lifecycleTracker.unregister(application)
        networkDetector.stop()
        screenCapture = null
        // Final best-effort flush before teardown
        try {
            kotlinx.coroutines.runBlocking(Dispatchers.IO) { flush() }
        } catch (_: Throwable) {
            // Best-effort final flush
        }
        scope.cancel()
    }

    // ---- Private ----

    /** Effective max batch size, scaled by network type. */
    private val effectiveMaxBatchSize: Int
        get() = config.maxBatchSize * networkDetector.batchSizeMultiplier

    private fun sendBatch(batch: List<DTSEvent>) {
        val url = URL("${config.normalizedEndpointUrl}/events")
        val connection = url.openConnection() as HttpURLConnection
        // Allow self-signed certs for development endpoints
        if (config.allowInsecureSsl && connection is javax.net.ssl.HttpsURLConnection) {
            val trustAllCerts = arrayOf<javax.net.ssl.TrustManager>(object : javax.net.ssl.X509TrustManager {
                override fun checkClientTrusted(chain: Array<java.security.cert.X509Certificate>, authType: String) {}
                override fun checkServerTrusted(chain: Array<java.security.cert.X509Certificate>, authType: String) {}
                override fun getAcceptedIssuers(): Array<java.security.cert.X509Certificate> = arrayOf()
            })
            val sslContext = javax.net.ssl.SSLContext.getInstance("TLS")
            sslContext.init(null, trustAllCerts, java.security.SecureRandom())
            connection.sslSocketFactory = sslContext.socketFactory
            connection.hostnameVerifier = javax.net.ssl.HostnameVerifier { _, _ -> true }
        }
        connection.apply {
            requestMethod = "POST"
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("X-API-Key", config.apiKey)
            doOutput = true
            connectTimeout = 10_000
            readTimeout = 10_000
        }

        val wrapper = BatchPayload(events = batch)
        val body = json.encodeToString(wrapper)

        OutputStreamWriter(connection.outputStream).use { it.write(body) }

        val status = connection.responseCode
        if (status !in 200..299) {
            val errorBody = connection.errorStream?.bufferedReader()?.readText()?.take(200) ?: ""
            throw HttpException(status, errorBody)
        }
    }

    private fun logError(message: String, error: Throwable) {
        Log.e("DTSRIS", "$message: ${error.message}")
        var cause: Throwable? = error.cause
        while (cause != null) {
            Log.e("DTSRIS", "  caused by: ${cause.message}")
            cause = cause.cause
        }
    }
}

@Serializable
private data class BatchPayload(val events: List<DTSEvent>)

class HttpException(val statusCode: Int, body: String) : Exception("HTTP $statusCode: $body")
