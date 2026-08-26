package com.dashn.sdk

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Build

/**
 * Network type detection for adaptive batching.
 * WiFi → flush aggressively. Cellular → batch larger, flush less often.
 */
class DTSNetworkDetector(context: Context) {

    enum class NetworkType {
        WIFI,
        CELLULAR,
        ETHERNET,
        NONE
    }

    @Volatile
    var currentType: NetworkType = NetworkType.NONE
        private set

    private val connectivityManager =
        context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    private var networkCallback: ConnectivityManager.NetworkCallback? = null

    /** Suggested batch size multiplier for the current network. */
    val batchSizeMultiplier: Int
        get() = when (currentType) {
            NetworkType.WIFI -> 1     // default
            NetworkType.CELLULAR -> 3 // batch 3x more on cellular
            NetworkType.ETHERNET -> 1
            NetworkType.NONE -> 1
        }

    /** Suggested flush interval multiplier for the current network. */
    val flushIntervalMultiplier: Long
        get() = when (currentType) {
            NetworkType.WIFI -> 1L
            NetworkType.CELLULAR -> 3L // wait 3x longer on cellular
            NetworkType.ETHERNET -> 1L
            NetworkType.NONE -> 1L
        }

    /** Whether the device currently has internet connectivity. */
    val isOnline: Boolean
        get() = currentType != NetworkType.NONE

    fun start() {
        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()

        networkCallback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                updateNetworkType(network)
            }

            override fun onLost(network: Network) {
                currentType = NetworkType.NONE
            }

            override fun onCapabilitiesChanged(
                network: Network,
                capabilities: NetworkCapabilities,
            ) {
                updateNetworkType(network)
            }
        }

        connectivityManager.registerNetworkCallback(request, networkCallback!!)

        // Initial state
        val activeNetwork = connectivityManager.activeNetwork
        if (activeNetwork != null) {
            updateNetworkType(activeNetwork)
        }
    }

    fun stop() {
        networkCallback?.let {
            try { connectivityManager.unregisterNetworkCallback(it) } catch (_: Throwable) {}
        }
        networkCallback = null
    }

    private fun updateNetworkType(network: Network) {
        val caps = connectivityManager.getNetworkCapabilities(network) ?: run {
            currentType = NetworkType.NONE
            return
        }

        currentType = when {
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> NetworkType.WIFI
            caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> NetworkType.CELLULAR
            caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> NetworkType.ETHERNET
            else -> NetworkType.NONE
        }
    }

    /** Returns true if the device is on a metered (cellular) connection. */
    val isMetered: Boolean
        get() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
                return connectivityManager.isActiveNetworkMetered
            }
            return currentType == NetworkType.CELLULAR
        }
}
