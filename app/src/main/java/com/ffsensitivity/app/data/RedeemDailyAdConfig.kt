package com.ffsensitivity.app.data

/**
 * Remote Redeem Daily scratch gate
 * (GET /api/v1/app/config → ads.redeemDaily).
 */
object RedeemDailyAdConfig {
    const val DEFAULT_INCOMPLETE = "Watch the ad to open today’s redeem card."
    const val DEFAULT_BUTTON = "Redeem Now · Watch Ad"

    @Volatile
    var enabled: Boolean = true
        private set

    @Volatile
    var cooldownHours: Int = 24
        private set

    @Volatile
    var incompleteMessage: String = DEFAULT_INCOMPLETE
        private set

    @Volatile
    var buttonLabel: String = DEFAULT_BUTTON
        private set

    fun apply(
        enabled: Boolean,
        cooldownHours: Int,
        incompleteMessage: String,
        buttonLabel: String
    ) {
        this.enabled = enabled
        this.cooldownHours = cooldownHours.coerceIn(0, 168)
        this.incompleteMessage =
            incompleteMessage.trim().ifBlank { DEFAULT_INCOMPLETE }.take(200)
        this.buttonLabel =
            buttonLabel.trim().ifBlank { DEFAULT_BUTTON }.take(200)
    }

    fun cooldownWindowMs(): Long =
        cooldownHours.toLong().coerceAtLeast(0L) * 60L * 60L * 1000L
}
