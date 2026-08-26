package com.dashn.sdk

import android.app.Activity
import android.app.Application
import android.os.Bundle

/**
 * Tracks app lifecycle: foreground/background transitions.
 * Emits `app_foreground` and `app_background` events.
 */
class DTSLifecycleTracker(
    private val emit: (eventType: String, props: Map<String, String>) -> Unit,
) : Application.ActivityLifecycleCallbacks {

    private var resumedCount = 0
    private var isInForeground = false

    fun register(application: Application) {
        application.registerActivityLifecycleCallbacks(this)
    }

    override fun onActivityResumed(activity: Activity) {
        resumedCount++
        if (!isInForeground && resumedCount > 0) {
            isInForeground = true
            emit("app_foreground", mapOf("timestamp" to System.currentTimeMillis().toString()))
        }
    }

    override fun onActivityPaused(activity: Activity) {
        resumedCount--
    }

    override fun onActivityStopped(activity: Activity) {
        // Check if transitioning to background
        if (resumedCount <= 0 && isInForeground) {
            isInForeground = false
            emit("app_background", mapOf("timestamp" to System.currentTimeMillis().toString()))
        }
    }

    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
    override fun onActivityStarted(activity: Activity) {}
    override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
    override fun onActivityDestroyed(activity: Activity) {}

    fun unregister(application: Application) {
        application.unregisterActivityLifecycleCallbacks(this)
    }

    /** Whether the app is currently in the foreground. */
    val isForeground: Boolean get() = isInForeground
}
