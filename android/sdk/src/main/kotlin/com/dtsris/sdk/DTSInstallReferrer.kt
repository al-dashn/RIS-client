package com.dtsris.sdk

import android.content.Context
import android.util.Log
import com.android.installreferrer.api.InstallReferrerClient
import com.android.installreferrer.api.InstallReferrerStateListener
import com.android.installreferrer.api.ReferrerDetails
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * Utility for retrieving the Google Play Install Referrer on supported devices.
 * Gracefully degrades when the Play Store is absent or the API is unavailable.
 */
internal object DTSInstallReferrer {

    private const val TAG = "DTSRIS-InstallReferrer"

    /**
     * Fetch the install referrer string from the Play Store.
     * Returns null if the API is unavailable, the connection fails, or the referrer is empty.
     */
    suspend fun getReferrer(context: Context): String? {
        return try {
            val client = InstallReferrerClient.newBuilder(context).build()
            val details = connectAndGetReferrer(client)
            client.endConnection()
            details.installReferrer?.takeIf { it.isNotBlank() }
        } catch (e: Exception) {
            Log.w(TAG, "Install referrer unavailable: ${e.message}")
            null
        }
    }

    private suspend fun connectAndGetReferrer(client: InstallReferrerClient): ReferrerDetails {
        return suspendCancellableCoroutine { continuation ->
            try {
                client.startConnection(object : InstallReferrerStateListener {
                    override fun onInstallReferrerSetupFinished(responseCode: Int) {
                        if (responseCode == InstallReferrerClient.InstallReferrerResponse.OK) {
                            try {
                                val details = client.installReferrer
                                continuation.resume(details)
                            } catch (e: Exception) {
                                continuation.resume(ReferrerDetails("", 0L, 0L))
                            }
                        } else {
                            Log.w(TAG, "Install referrer response code: $responseCode")
                            continuation.resume(ReferrerDetails("", 0L, 0L))
                        }
                    }

                    override fun onInstallReferrerServiceDisconnected() {
                        Log.w(TAG, "Install referrer service disconnected")
                        continuation.resume(ReferrerDetails("", 0L, 0L))
                    }
                })
            } catch (e: Exception) {
                Log.w(TAG, "Failed to start install referrer connection: ${e.message}")
                continuation.resume(ReferrerDetails("", 0L, 0L))
            }
        }
    }
}
