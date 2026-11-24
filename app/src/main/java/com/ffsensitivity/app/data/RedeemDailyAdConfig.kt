package com.ffsensitivity.app.data

/**
 * Remote Redeem Daily interstitial gate
 * (GET /api/v1/app/config → ads.redeemDaily).
 */
object RedeemDailyAdConfig {
    const val DEFAULT_INCOMPLETE = "Watch the ad to open today’s redeem card."
    const val DEFAULT_BUTTON = "Redeem Now · Watch Ad"

    @Volatile
    var enabled: Boolean = true
        private set

    @Volatile
    var cooldownMinutes: Int = 24 * 60
        private set

    @Volatile
    var incompleteMessage: String = DEFAULT_INCOMPLETE
        private set

    @Volatile
    var buttonLabel: String = DEFAULT_BUTTON
        private set

    fun apply(
        enabled: Boolean,
        cooldownMinutes: Int,
        incompleteMessage: String,
        buttonLabel: String
    ) {
        this.enabled = enabled
        this.cooldownMinutes = cooldownMinutes.coerceIn(0, 168 * 60)
        this.incompleteMessage =
            incompleteMessage.trim().ifBlank { DEFAULT_INCOMPLETE }.take(200)
        this.buttonLabel =
            buttonLabel.trim().ifBlank { DEFAULT_BUTTON }.take(200)
    }

    fun cooldownWindowMs(): Long =
        cooldownMinutes.toLong().coerceAtLeast(0L) * 60L * 1000L
}
