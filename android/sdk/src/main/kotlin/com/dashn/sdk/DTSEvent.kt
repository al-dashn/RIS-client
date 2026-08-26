package com.dashn.sdk

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import java.time.Instant

enum class DTSEventType(val value: String) {
    SCREEN_VIEW("screen_view"),
    CART_UPDATE("cart_update"),
    CUSTOMIZATION("customization"),
    ERROR("error"),
}

@Serializable
data class DTSEvent(
    val eventId: String,
    val eventType: String,
    val timestamp: String,
    val sessionId: String,
    val anonymousUserId: String,
    val platform: String,
    val osVersion: String,
    val page: String,
    val properties: Map<String, JsonElement>,
) {
    companion object {
        private const val PLATFORM = "android"
        private val OS_VERSION: String by lazy { android.os.Build.VERSION.RELEASE }

        fun create(
            eventType: DTSEventType,
            sessionId: String,
            anonymousUserId: String,
            page: String = "",
            properties: Map<String, String> = emptyMap(),
        ): DTSEvent = create(
            eventType = eventType.value,
            sessionId = sessionId,
            anonymousUserId = anonymousUserId,
            page = page,
            properties = properties,
        )

        /** Create an event with string properties (convenience for most use cases). */
        fun create(
            eventType: String,
            sessionId: String,
            anonymousUserId: String,
            page: String = "",
            properties: Map<String, String> = emptyMap(),
        ): DTSEvent = createTyped(
            eventType = eventType,
            sessionId = sessionId,
            anonymousUserId = anonymousUserId,
            page = page,
            properties = properties.mapValues { JsonPrimitive(it.value) },
        )

        /** Create an event with fully typed properties (numbers, booleans, nested objects). */
        fun createTyped(
            eventType: String,
            sessionId: String,
            anonymousUserId: String,
            page: String = "",
            properties: Map<String, JsonElement> = emptyMap(),
        ): DTSEvent = DTSEvent(
            eventId = java.util.UUID.randomUUID().toString(),
            eventType = eventType,
            timestamp = Instant.now().toString(),
            sessionId = sessionId,
            anonymousUserId = anonymousUserId,
            platform = PLATFORM,
            osVersion = OS_VERSION,
            page = page,
            properties = properties,
        )
    }
}
