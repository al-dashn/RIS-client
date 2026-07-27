package com.dtsris.sdk

data class DTSConfig(
    val apiKey: String,
    val endpointUrl: String,
    val maxRetries: Int = 5,
    val maxBatchSize: Int = 20,
    val flushIntervalMs: Long = 5000L,
    val allowInsecureSsl: Boolean = false,
    val captureInstallReferrer: Boolean = false,
) {
    init {
        require(apiKey.isNotBlank()) { "DTS RIS: apiKey is required" }
        require(endpointUrl.isNotBlank()) { "DTS RIS: endpointUrl is required" }
    }

    val normalizedEndpointUrl: String
        get() = endpointUrl.trimEnd('/')
}
