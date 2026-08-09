package com.ffsensitivity.app.data

/**
 * Remote Quiz second-chance rewarded gate
 * (GET /api/v1/app/config → ads.secondChance).
 */
object SecondChanceAdConfig {
    const val DEFAULT_INCOMPLETE = "Watch the full ad to unlock a new question."
    const val DEFAULT_BUTTON = "Watch Ad for New Question"

    @Volatile
    var enabled: Boolean = true
        private set

    @Volatile
    var cooldownHours: Int = 0
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
