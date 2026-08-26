package com.dashn.sdk

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.File

/**
 * Offline event buffer backed by local file storage.
 * Events are persisted when the device is offline and flushed when connectivity returns.
 */
class DTSOfflineBuffer(context: Context) {

    private val bufferFile = File(context.filesDir, "dtsris_offline_buffer.json")
    private val json = Json { ignoreUnknownKeys = true }

    private val _queuedCount = MutableStateFlow(0)
    val queuedCount: StateFlow<Int> = _queuedCount

    /** Persist a batch of events to disk for later retry. */
    fun persist(events: List<DTSEvent>) {
        try {
            val existing = loadAll()
            val all = existing + events
            bufferFile.writeText(json.encodeToString(all))
            _queuedCount.value = all.size
        } catch (_: Throwable) {
            // Best-effort persistence
        }
    }

    /** Load all persisted events. */
    fun loadAll(): List<DTSEvent> {
        return try {
            if (!bufferFile.exists() || bufferFile.length() == 0L) return emptyList()
            val raw = bufferFile.readText()
            json.decodeFromString<List<DTSEvent>>(raw)
        } catch (_: Throwable) {
            emptyList()
        }
    }

    /** Clear the buffer after successful send. */
    fun clear() {
        try {
            bufferFile.delete()
            _queuedCount.value = 0
        } catch (_: Throwable) {
            // Ignore
        }
    }

    /**
     * Replace the buffer content (e.g., after partial flush failure,
     * keep only remaining events).
     */
    fun replace(events: List<DTSEvent>) {
        try {
            if (events.isEmpty()) {
                clear()
            } else {
                bufferFile.writeText(json.encodeToString(events))
                _queuedCount.value = events.size
            }
        } catch (_: Throwable) {
            // Ignore
        }
    }

    /** Number of events currently persisted. */
    fun count(): Int = _queuedCount.value
}
