package com.ffsensitivity.app.data

/**
 * Remote DPI rewarded-ad gate (from GET /api/v1/app/config → ads.dpi).
 * Defaults match previous hardcoded 24h behavior. Separate from Calculate.
 */
object DpiAdConfig {
    const val DEFAULT_INCOMPLETE =
        "Watch the full ad to see your DPI & Resolution result."
    const val DEFAULT_BUTTON =
        "DPI & Resolution Result · Watch Ad"

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
