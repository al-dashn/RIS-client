package com.dtsris.sdk

import kotlinx.serialization.Serializable
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
    val eventType: String,
    val timestamp: String,
    val sessionId: String,
    val anonymousUserId: String,
    val properties: Map<String, JsonPrimitive>,
) {
    companion object {
        fun create(
            eventType: DTSEventType,
            sessionId: String,
            anonymousUserId: String,
            properties: Map<String, String> = emptyMap(),
        ): DTSEvent = DTSEvent(
            eventType = eventType.value,
            timestamp = Instant.now().toString(),
            sessionId = sessionId,
            anonymousUserId = anonymousUserId,
            properties = properties.mapValues { JsonPrimitive(it.value) },
        )
    }
}
