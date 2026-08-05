package com.ffsensitivity.app.presentation.screens

import com.ffsensitivity.app.data.DailyChallengeStore

internal enum class ChallengeTab { TODAY, REWARDS }

enum class ChallengeRetryKind { REFRESH_SNAPSHOT, CHECK_IN, QUIZ, AD, CLAIM_MILESTONE }

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
