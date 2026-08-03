package com.ffsensitivity.app.data

/**
 * Local defaults until Challenge API pushes admin quiz timing + coins.
 * Matches admin ChallengeRules.
 */
object ChallengeQuizTimingConfig {
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

    fun lockDurationMs(): Long = wrongAnswerLockHours * 60L * 60L * 1000L

    fun openWindowMs(): Long = quizOpenWindowHours * 60L * 60L * 1000L

    fun signedCoins(delta: Int): String = if (delta > 0) "+$delta" else "$delta"
}

enum class QuizUiPhase {
    /** First try today — question visible. */
    AVAILABLE,
    /** Wrong answer — waiting for lock to end. */
    LOCKED,
    /** Lock ended — question open until window closes. */
    OPEN,
    /** Open window ended without a correct answer. */
    CLOSED,
    /** Correct answer claimed today. */
    DONE_CORRECT
}
