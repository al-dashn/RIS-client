package com.dashn.sdk

import kotlinx.coroutines.delay
import kotlin.math.min
import kotlin.math.pow
import kotlin.random.Random

internal object DTSRetry {
    private const val INITIAL_BACKOFF_MS = 1000L
    private const val MAX_BACKOFF_MS = 30000L

    suspend fun <T> withBackoff(
        maxRetries: Int,
        operation: suspend () -> T,
    ): T {
        var lastError: Throwable? = null
        for (attempt in 0..maxRetries) {
            try {
                return operation()
            } catch (e: Throwable) {
                lastError = e
                if (attempt >= maxRetries) break
                val base = INITIAL_BACKOFF_MS * 2.0.pow(attempt.toDouble())
                val jitter = base * (0.8 + Random.nextDouble() * 0.4)
                val delayMs = min(jitter.toLong(), MAX_BACKOFF_MS)
                delay(delayMs)
            }
        }
        throw lastError ?: IllegalStateException("Retry failed")
    }
}
