package com.ffsensitivity.app.data

import android.content.Context

/** Local unlock window after a completed DPI rewarded ad. Hours from [DpiAdConfig]. */
object DpiAdStore {
    private const val PREFS = "ff_dpi_ad_v1"
    private const val KEY_LAST_REWARD_MS = "last_reward_ms"

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun needsAd(context: Context): Boolean {
        if (!DpiAdConfig.enabled) return false
        val windowMs = DpiAdConfig.cooldownWindowMs()
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
