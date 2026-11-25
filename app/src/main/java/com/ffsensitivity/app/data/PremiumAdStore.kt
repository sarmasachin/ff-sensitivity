package com.ffsensitivity.app.data

import android.content.Context

/**
 * Local unlock window after a completed Premium Pro rewarded ad (or coin unlock).
 * Duration from [PremiumAdConfig.cooldownMinutes] (admin Ads → Premium Pro).
 * Per feature (sensi / hud / graphics).
 */
object PremiumAdStore {
    private const val PREFS = "ff_premium_ad_v1"

    private val FeatureIds = setOf("sensi", "hud", "graphics")

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun normalizeFeatureId(featureId: String): String {
        val id = featureId.trim().lowercase()
        return if (id in FeatureIds) id else "sensi"
    }

    private fun rewardKey(featureId: String): String =
        "last_reward_ms_${normalizeFeatureId(featureId)}"

    /**
     * True while the last coin/ad unlock is still inside the admin unlock window.
     * Independent of [PremiumAdConfig.enabled] so coin-only mode still skips the popup.
     */
    fun isUnlocked(context: Context, featureId: String = AppSession.featureId): Boolean {
        val windowMs = PremiumAdConfig.cooldownWindowMs()
        if (windowMs <= 0L) return false
        val id = normalizeFeatureId(featureId)
        val last = prefs(context).getLong(rewardKey(id), 0L).coerceAtLeast(0L)
        if (last == 0L) return false
        val age = System.currentTimeMillis() - last
        return age >= 0L && age < windowMs
    }

    /** True when the user must finish a rewarded ad before opening Premium results. */
    fun needsAd(context: Context, featureId: String = AppSession.featureId): Boolean {
        if (!PremiumAdConfig.enabled) return false
        return !isUnlocked(context, featureId)
    }

    fun markRewarded(context: Context, featureId: String = AppSession.featureId) {
        val id = normalizeFeatureId(featureId)
        prefs(context).edit()
            .putLong(rewardKey(id), System.currentTimeMillis())
            .apply()
    }
}
