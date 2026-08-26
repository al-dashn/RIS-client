package com.dashn.sdk

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive

internal class DTSCartUpdateCapture(
    private val emit: (DTSEventType, Map<String, JsonElement>) -> Unit,
) {
    fun capture(action: String, productId: String? = null, quantity: Int? = null) {
        val props = mutableMapOf<String, JsonElement>("action" to JsonPrimitive(action))
        productId?.let { props["productId"] = JsonPrimitive(it) }
        quantity?.let { props["quantity"] = JsonPrimitive(it) }
        emit(DTSEventType.CART_UPDATE, props)
    }
}
