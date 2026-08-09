package com.ffsensitivity.app.data

import android.content.Context

/** Local unlock window after a shown Check-in interstitial. Hours from [CheckInAdConfig]. */
object CheckInAdStore {
    private const val PREFS = "ff_checkin_ad_v1"
    private const val KEY_LAST_SHOWN_MS = "last_interstitial_ms"

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun needsAd(context: Context): Boolean {
        if (!CheckInAdConfig.enabled) return false
        val windowMs = CheckInAdConfig.cooldownWindowMs()
        if (windowMs <= 0L) return true
        val last = prefs(context).getLong(KEY_LAST_SHOWN_MS, 0L).coerceAtLeast(0L)
        if (last == 0L) return true
        val age = System.currentTimeMillis() - last
        return age < 0L || age >= windowMs
    }

    fun markShown(context: Context) {
        prefs(context).edit()
            .putLong(KEY_LAST_SHOWN_MS, System.currentTimeMillis())
            .apply()
    }
}
