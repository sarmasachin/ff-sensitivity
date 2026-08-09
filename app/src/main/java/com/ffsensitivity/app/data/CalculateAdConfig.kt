package com.ffsensitivity.app.data

/**
 * Remote Calculate rewarded-ad gate (from GET /api/v1/app/config → ads.calculate).
 * Defaults match previous hardcoded 24h behavior.
 */
object CalculateAdConfig {
    const val DEFAULT_INCOMPLETE =
        "Watch the full ad to see your settings."
    const val DEFAULT_BUTTON =
        "Calculate Best Pro Settings · Watch Ad"

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
