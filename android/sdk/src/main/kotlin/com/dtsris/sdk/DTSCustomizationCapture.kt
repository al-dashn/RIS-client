package com.dtsris.sdk

internal class DTSCustomizationCapture(
    private val emit: (DTSEventType, Map<String, String>) -> Unit,
) {
    fun capture(attribute: String, oldValue: String? = null, newValue: String? = null) {
        val props = mutableMapOf("attribute" to attribute)
        oldValue?.let { props["oldValue"] = it }
        newValue?.let { props["newValue"] = it }
        emit(DTSEventType.CUSTOMIZATION, props)
    }
}
