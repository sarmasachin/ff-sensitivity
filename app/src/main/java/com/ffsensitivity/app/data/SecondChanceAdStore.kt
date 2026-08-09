package com.ffsensitivity.app.data

import android.content.Context

/** Local unlock window after a completed second-chance rewarded ad. */
object SecondChanceAdStore {
    private const val PREFS = "ff_second_chance_ad_v1"
    private const val KEY_LAST_REWARDED_MS = "last_rewarded_ms"

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun needsAd(context: Context): Boolean {
        if (!SecondChanceAdConfig.enabled) return false
        val windowMs = SecondChanceAdConfig.cooldownWindowMs()
        if (windowMs <= 0L) return true
        val last = prefs(context).getLong(KEY_LAST_REWARDED_MS, 0L).coerceAtLeast(0L)
        if (last == 0L) return true
        val age = System.currentTimeMillis() - last
        return age < 0L || age >= windowMs
    }

    fun markRewarded(context: Context) {
        prefs(context).edit()
            .putLong(KEY_LAST_REWARDED_MS, System.currentTimeMillis())
            .apply()
    }
}
