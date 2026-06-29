package com.dtsris.sdk

internal class DTSCartUpdateCapture(
    private val emit: (DTSEventType, Map<String, String>) -> Unit,
) {
    fun capture(action: String, productId: String? = null, quantity: Int? = null) {
        val props = mutableMapOf("action" to action)
        productId?.let { props["productId"] = it }
        quantity?.let { props["quantity"] = it.toString() }
        emit(DTSEventType.CART_UPDATE, props)
    }
}
