package com.dtsris.sdk

import android.app.Activity
import android.app.Application
import android.os.Bundle

internal class DTSScreenViewCapture(
    private val emit: (DTSEventType, Map<String, String>) -> Unit,
) : Application.ActivityLifecycleCallbacks {

    private var currentActivityName: String? = null

    fun register(app: Application) {
        app.registerActivityLifecycleCallbacks(this)
        // Emit initial screen view
        emitScreenView(app.javaClass.simpleName)
    }

    override fun onActivityResumed(activity: Activity) {
        currentActivityName = activity.javaClass.simpleName
        emitScreenView(currentActivityName ?: "unknown")
    }

    private fun emitScreenView(screenName: String) {
        emit(DTSEventType.SCREEN_VIEW, mapOf("screen" to screenName))
    }

    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
    override fun onActivityStarted(activity: Activity) {}
    override fun onActivityPaused(activity: Activity) {}
    override fun onActivityStopped(activity: Activity) {}
    override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
    override fun onActivityDestroyed(activity: Activity) {}
}
