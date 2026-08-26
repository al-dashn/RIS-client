package com.dashn.sdk

internal class DTSErrorCapture(
    private val emit: (DTSEventType, Map<String, String>) -> Unit,
) {
    private val emailRegex = Regex("[\\w.+-]+@[\\w-]+\\.[\\w.-]+", RegexOption.IGNORE_CASE)
    private val phoneRegex = Regex("(?:\\+?\\d{1,3}[-.\\s]?)?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}")

    /** Installs a global uncaught-exception handler for automatic error capture. */
    fun install() {
        val previousHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            capture(throwable, "uncaughtException")
            previousHandler?.uncaughtException(thread, throwable)
        }
    }

    fun capture(throwable: Throwable, source: String = "manual") {
        captureMessage(throwable.message ?: throwable.javaClass.simpleName, source)
    }

    fun captureMessage(message: String, source: String = "manual") {
        val cleaned = stripPII(message)
        emit(DTSEventType.ERROR, mapOf("message" to cleaned, "source" to source))
    }

    private fun stripPII(input: String): String {
        var cleaned = input
        cleaned = emailRegex.replace(cleaned, "[REDACTED]")
        cleaned = phoneRegex.replace(cleaned, "[REDACTED]")
        return cleaned
    }
}
