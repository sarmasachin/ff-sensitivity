package com.ffsensitivity.app.data

/**
 * Local defaults until Challenge API pushes admin quiz timing + coins + ad bonus.
 * Matches admin ChallengeRules.
 */
object ChallengeQuizTimingConfig {
    /** Minutes after wrong before rewarded-ad second chance (default 20). */
    @Volatile
    var wrongAnswerLockMinutes: Int = 20
        set(value) {
            field = value.coerceIn(1, 24 * 60)
        }

    @Deprecated("Use wrongAnswerLockMinutes")
    @Volatile
    var wrongAnswerLockHours: Int = 4
        set(value) {
            field = value.coerceIn(1, 72)
        }

    @Volatile
    var quizOpenWindowHours: Int = 2
        set(value) {
            field = value.coerceIn(1, 48)
        }

    /** Coins on correct answer (≥ 0). */
    @Volatile
    var quizCorrectCoins: Int = 50
        set(value) {
            field = value.coerceIn(0, 9999)
        }

    /**
     * Coins on wrong answer. Negative = penalty; balance may go below 0
     * (e.g. 0 + (−10) → −10).
     */
    @Volatile
    var quizWrongCoins: Int = -10
        set(value) {
            field = value.coerceIn(-9999, 9999)
        }

    /** When false, Watch Ad Bonus is hidden/disabled. */
    @Volatile
    var adBonusOptional: Boolean = true

    /** Hours before another Watch Ad Bonus claim. */
    @Volatile
    var adBonusCooldownHours: Int = 4
        set(value) {
            field = value.coerceIn(1, 168)
        }

    fun lockDurationMs(): Long = wrongAnswerLockMinutes * 60L * 1000L

    fun openWindowMs(): Long = quizOpenWindowHours * 60L * 60L * 1000L

    fun adCooldownDurationMs(): Long = adBonusCooldownHours * 60L * 60L * 1000L

    fun signedCoins(delta: Int): String = if (delta > 0) "+$delta" else "$delta"
}

enum class QuizUiPhase {
    /** First try today — question visible. */
    AVAILABLE,
    /** Wrong answer — waiting for lock to end. */
    LOCKED,
    /** Lock ended — watch rewarded ad to unlock a new question. */
    AWAITING_AD,
    /** Legacy alias: treated like AWAITING_AD / second-chance available. */
    OPEN,
    /** Open window ended / second chance used up. */
    CLOSED,
    /** Correct answer already earned today. */
    DONE_CORRECT
}
