package com.dtsris.sdk

import android.app.Application
import android.util.Log
import kotlinx.coroutines.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
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
    val cartCapture: DTSCartUpdateCapture
    val customizationCapture: DTSCustomizationCapture
    val errorCapture: DTSErrorCapture

    @Volatile private var started = false
    @Volatile private var disposed = false

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

        cartCapture = DTSCartUpdateCapture { type, props -> track(type, props) }
        customizationCapture = DTSCustomizationCapture { type, props -> track(type, props) }
        errorCapture = DTSErrorCapture { type, props -> track(type, props) }
    }

    // ---- Public API ----

    fun start() {
        if (started || disposed) return
        started = true

        screenCapture = DTSScreenViewCapture { type, props -> track(type, props) }
        screenCapture?.register(application)

        errorCapture.install()

        flushJob = scope.launch {
            while (isActive && !disposed) {
                delay(config.flushIntervalMs)
                flush()
            }
        }
    }

    fun track(type: DTSEventType, properties: Map<String, String> = emptyMap()) {
        if (disposed) return
        val event = DTSEvent.create(type, sessionId, anonymousUserId, properties)
        synchronized(eventQueue) {
            eventQueue.add(event)
            if (eventQueue.size >= config.maxBatchSize) {
                scope.launch { flush() }
            }
        }
    }

    suspend fun flush() {
        val batch: List<DTSEvent>
        synchronized(eventQueue) {
            if (eventQueue.isEmpty()) return
            batch = eventQueue.toList()
            eventQueue.clear()
        }

        if (batch.isEmpty()) return

        try {
            DTSRetry.withBackoff(config.maxRetries) {
                sendBatch(batch)
            }
        } catch (e: Throwable) {
            synchronized(eventQueue) {
                eventQueue.addAll(0, batch)
            }
            logError("Flush failed, events re-queued", e)
        }
    }

    fun dispose() {
        disposed = true
        flushJob?.cancel()
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

    private fun sendBatch(batch: List<DTSEvent>) {
        val url = URL("${config.normalizedEndpointUrl}/events")
        val connection = url.openConnection() as HttpURLConnection
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
    }
}

@Serializable
private data class BatchPayload(val events: List<DTSEvent>)

class HttpException(val statusCode: Int, body: String) : Exception("HTTP $statusCode: $body")
