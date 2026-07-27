package com.dtsris.sdk

import android.content.Context
import android.content.SharedPreferences
import java.util.UUID

internal object DTSStorage {
    private const val PREFS_NAME = "com.dtsris.prefs"
    private const val KEY_UID = "anonymousUserId"
    private const val KEY_SID = "sessionId"
    private const val KEY_INSTALL_TRACKED = "installTracked"

    @Volatile private var prefs: SharedPreferences? = null
    @Volatile private var initialized = false

    fun initialize(context: Context) {
        if (initialized) return
        synchronized(this) {
            if (initialized) return
            prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            initialized = true
        }
    }

    fun getAnonymousUserId(): String {
        val p = prefs ?: return fallbackUid()
        var uid = p.getString(KEY_UID, null)
        if (uid.isNullOrBlank()) {
            uid = UUID.randomUUID().toString()
            p.edit().putString(KEY_UID, uid).apply()
        }
        return uid
    }

    fun getSessionId(): String {
        val p = prefs ?: return UUID.randomUUID().toString()
        var sid = p.getString(KEY_SID, null)
        if (sid.isNullOrBlank()) {
            sid = UUID.randomUUID().toString()
            p.edit().putString(KEY_SID, sid).apply()
        }
        return sid
    }

    fun rotateSessionId() {
        val p = prefs ?: return
        p.edit().putString(KEY_SID, UUID.randomUUID().toString()).apply()
    }

    fun hasInstallBeenTracked(): Boolean {
        val p = prefs ?: return false
        return p.getBoolean(KEY_INSTALL_TRACKED, false)
    }

    fun markInstallTracked() {
        val p = prefs ?: return
        p.edit().putBoolean(KEY_INSTALL_TRACKED, true).apply()
    }

    private var fallbackUid: String? = null
    private fun fallbackUid(): String = fallbackUid ?: UUID.randomUUID().toString().also { fallbackUid = it }
}
