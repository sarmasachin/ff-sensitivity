package com.ffsensitivity.app.data

/**
 * Remote Watch Ad Bonus gate
 * (GET /api/v1/app/config → ads.adBonus).
 * Enable/cooldown also mirrored onto [ChallengeQuizTimingConfig] for local UX;
 * server claim still uses Challenge rules (kept in sync by admin /ads save).
 */
object AdBonusAdConfig {
    const val DEFAULT_INCOMPLETE = "Watch the full ad to claim bonus coins."
    const val DEFAULT_BUTTON = "Watch Ad for Bonus Coins"

    @Volatile
    var enabled: Boolean = true
        private set

    @Volatile
    var cooldownHours: Int = 4
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
        ChallengeQuizTimingConfig.adBonusOptional = enabled
        ChallengeQuizTimingConfig.adBonusCooldownHours =
            this.cooldownHours.coerceAtLeast(1).coerceAtMost(168)
    }
}
