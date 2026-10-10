package com.ffsensitivity.app.presentation.screens

import com.ffsensitivity.app.data.DailyChallengeStore
import com.ffsensitivity.app.data.DailyQuizQuestion
import com.ffsensitivity.app.data.remote.ApiException
import com.ffsensitivity.app.data.remote.ChallengeRemoteCache
import com.ffsensitivity.app.data.remote.isAuthFailure

internal enum class ChallengeTab { TODAY, REWARDS }

enum class ChallengeRetryKind {
    REFRESH_SNAPSHOT,
    CHECK_IN,
    QUIZ,
    AD,
    CLAIM_MILESTONE,
    SIGN_IN
}

data class ChallengeUiError(
    val code: String,
    val title: String,
    val message: String,
    val retryKind: ChallengeRetryKind? = null,
    val retryMilestoneDays: Int? = null
)

internal val EmptySafeSnapshot = DailyChallengeStore.Snapshot(
    coins = 0,
    streak = 0,
    checkedInToday = false,
    quizDoneToday = false,
    quizCorrectToday = null,
    adDoneToday = false,
    lastRewardNote = "",
    claimedMilestones = emptySet()
)

internal fun formatCoins(value: Int): String =
    String.format(java.util.Locale.US, "%,d", value)

internal const val QUIZ_PLACEHOLDER_ID = "loading"

internal fun quizPlaceholderQuestion(): DailyQuizQuestion =
    DailyQuizQuestion(
        id = QUIZ_PLACEHOLDER_ID,
        question = "Loading today’s quiz…",
        options = emptyList(),
        correctIndex = -1
    )

internal fun quizQuestionReady(id: String): Boolean {
    val t = id.trim()
    return t.isNotEmpty() && !t.equals(QUIZ_PLACEHOLDER_ID, ignoreCase = true)
}

internal fun cachedReadyQuiz(): DailyQuizQuestion? =
    ChallengeRemoteCache.todayQuestion?.takeIf {
        quizQuestionReady(it.id) && ChallengeRemoteCache.isFreshToday()
    }

internal fun challengeLoadError(
    err: Throwable,
    hasCachedQuestion: Boolean
): ChallengeUiError? {
    val api = err as? ApiException
    if (api != null && api.isAuthFailure()) {
        return ChallengeUiError(
            code = "AUTH_REQUIRED",
            title = "Sign in required",
            message = api.message,
            retryKind = ChallengeRetryKind.SIGN_IN
        )
    }
    if (!hasCachedQuestion) {
        return ChallengeUiError(
            code = "CHALLENGE_SYNC_FAILED",
            title = "Couldn’t load quiz",
            message = "Check connection and try again.",
            retryKind = ChallengeRetryKind.REFRESH_SNAPSHOT
        )
    }
    return null
}

internal fun formatAdCooldown(ms: Long): String {
    val totalMin = ((ms + 59_999L) / 60_000L).coerceAtLeast(0L)
    val hours = totalMin / 60L
    val mins = totalMin % 60L
    return when {
        hours <= 0L && mins <= 0L -> "a moment"
        hours <= 0L -> if (mins == 1L) "1 min" else "$mins mins"
        mins <= 0L -> if (hours == 1L) "1 hour" else "$hours hours"
        else -> String.format(
            java.util.Locale.US,
            "%d hour%s %d min%s",
            hours,
            if (hours == 1L) "" else "s",
            mins,
            if (mins == 1L) "" else "s"
        )
    }
}

internal fun challengeActionError(
    failCode: String,
    failTitle: String,
    message: String
): ChallengeUiError {
    val auth = message.contains("sign in", ignoreCase = true)
    return ChallengeUiError(
        code = if (auth) "AUTH_REQUIRED" else failCode,
        title = if (auth) "Sign in required" else failTitle,
        message = message.ifBlank { "Action was declined." },
        retryKind = if (auth) ChallengeRetryKind.SIGN_IN else null
    )
}
