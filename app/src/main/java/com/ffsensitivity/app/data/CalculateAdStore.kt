package com.ffsensitivity.app.data

import android.content.Context

/**
 * Local unlock window after a completed Calculate rewarded ad.
 * Hours from [CalculateAdConfig].
 *
 * Keys are **per feature** (sensi / hud / graphics) so watching an ad for Best
 * Sensitivity does not unlock Custom HUD or Graphics Settings.
 */
object CalculateAdStore {
    private const val PREFS = "ff_calculate_ad_v1"
    private const val KEY_LAST_REWARD_MS_LEGACY = "last_reward_ms"

    private val FeatureIds = setOf("sensi", "hud", "graphics")

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun normalizeFeatureId(featureId: String): String {
        val id = featureId.trim().lowercase()
        return if (id in FeatureIds) id else "sensi"
    }

    private fun rewardKey(featureId: String): String =
        "last_reward_ms_${normalizeFeatureId(featureId)}"

    /** True when the user must finish a rewarded ad before opening results. */
    fun needsAd(context: Context, featureId: String = AppSession.featureId): Boolean {
        if (!CalculateAdConfig.enabled) return false
        val windowMs = CalculateAdConfig.cooldownWindowMs()
        if (windowMs <= 0L) return true
        val id = normalizeFeatureId(featureId)
        val p = prefs(context)
        var last = p.getLong(rewardKey(id), 0L).coerceAtLeast(0L)
        // One-time migrate: old single key only unlocked sensi.
        if (last == 0L && id == "sensi") {
            last = p.getLong(KEY_LAST_REWARD_MS_LEGACY, 0L).coerceAtLeast(0L)
        }
        if (last == 0L) return true
        val age = System.currentTimeMillis() - last
        return age < 0L || age >= windowMs
    }

    fun markRewarded(context: Context, featureId: String = AppSession.featureId) {
        val id = normalizeFeatureId(featureId)
        val editor = prefs(context).edit()
            .putLong(rewardKey(id), System.currentTimeMillis())
        if (id == "sensi") {
            editor.putLong(KEY_LAST_REWARD_MS_LEGACY, System.currentTimeMillis())
        }
        editor.apply()
    }
}
