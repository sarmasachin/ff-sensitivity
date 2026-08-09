package com.ffsensitivity.app.data

import android.content.Context

/** Local unlock window after a completed Calculate rewarded ad. Hours from [CalculateAdConfig]. */
object CalculateAdStore {
    private const val PREFS = "ff_calculate_ad_v1"
    private const val KEY_LAST_REWARD_MS = "last_reward_ms"

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /** True when the user must finish a rewarded ad before opening results. */
    fun needsAd(context: Context): Boolean {
        if (!CalculateAdConfig.enabled) return false
        val windowMs = CalculateAdConfig.cooldownWindowMs()
        if (windowMs <= 0L) return true
        val last = prefs(context).getLong(KEY_LAST_REWARD_MS, 0L).coerceAtLeast(0L)
        if (last == 0L) return true
        val age = System.currentTimeMillis() - last
        return age < 0L || age >= windowMs
    }

    fun markRewarded(context: Context) {
        prefs(context).edit()
            .putLong(KEY_LAST_REWARD_MS, System.currentTimeMillis())
            .apply()
    }
}
