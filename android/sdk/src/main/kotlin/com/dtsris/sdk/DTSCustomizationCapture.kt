package com.dtsris.sdk

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive

internal class DTSCustomizationCapture(
    private val emit: (DTSEventType, Map<String, JsonElement>) -> Unit,
) {
    fun capture(attribute: String, oldValue: String? = null, newValue: String? = null) {
        val props = mutableMapOf<String, JsonElement>("attribute" to JsonPrimitive(attribute))
        oldValue?.let { props["oldValue"] = JsonPrimitive(it) }
        newValue?.let { props["newValue"] = JsonPrimitive(it) }
        emit(DTSEventType.CUSTOMIZATION, props)
    }
}
