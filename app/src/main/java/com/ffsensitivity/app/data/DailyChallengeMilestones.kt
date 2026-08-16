package com.ffsensitivity.app.data

import com.ffsensitivity.app.data.remote.ChallengeRemoteCache

data class StreakMilestone(
    val days: Int,
    val title: String,
    val rewardLabel: String,
    val coinReward: Int,
    val badge: String? = null
)

fun liveMilestones(): List<StreakMilestone> =
    ChallengeRemoteCache.milestones.orEmpty()

fun liveMilestoneByDays(days: Int): StreakMilestone? =
    liveMilestones().firstOrNull { it.days == days }
