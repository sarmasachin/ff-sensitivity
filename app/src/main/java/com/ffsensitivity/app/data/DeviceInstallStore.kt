package com.ffsensitivity.app.data

import android.content.Context
import android.content.SharedPreferences
import java.util.UUID

// --- Start: Devices live wire (Sachin) ---
/** Stable install id for Nest device registry (not Google account). */
object DeviceInstallStore {
    private const val PREFS = "ff_device_install_v1"
    private const val KEY_INSTALL_ID = "install_id"

    private fun prefs(context: Context): SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun installId(context: Context): String {
        val p = prefs(context)
        val existing = p.getString(KEY_INSTALL_ID, "").orEmpty().trim().lowercase()
        if (existing.startsWith("dev_") && existing.length >= 12) return existing
        val next = "dev_" + UUID.randomUUID().toString().replace("-", "").take(24)
        p.edit().putString(KEY_INSTALL_ID, next).apply()
        return next
    }
}
// --- End: Devices live wire (Sachin) ---
