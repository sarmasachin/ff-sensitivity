package com.ffsensitivity.app.data

data class StreakMilestone(
    val days: Int,
    val title: String,
    val rewardLabel: String,
    val coinReward: Int,
    val badge: String? = null
)

val streakMilestones: List<StreakMilestone> = listOf(
    StreakMilestone(7, "Week Warrior", "+50 coins · Scratch", 50),
    StreakMilestone(15, "Rising Pro", "+75 coins · Scratch", 75),
    StreakMilestone(20, "Solid Start", "+100 coins · Scratch", 100),
    StreakMilestone(30, "Monthly Elite", "+150 coins · Badge · Scratch", 150, "Monthly Elite"),
    StreakMilestone(45, "Focus Fire", "+200 coins · Scratch", 200),
    StreakMilestone(60, "Two Month Ace", "+250 coins · Scratch", 250),
    StreakMilestone(75, "Sharp Shooter", "+300 coins · Scratch", 300),
    StreakMilestone(90, "Quarter Legend", "+400 coins · Badge · Scratch", 400, "Quarter Legend"),
    StreakMilestone(100, "Century Club", "+500 coins · Scratch", 500),
    StreakMilestone(120, "Iron Streak", "+600 coins · Scratch", 600),
    StreakMilestone(150, "Half-Year Heat", "+750 coins · Scratch", 750),
    StreakMilestone(180, "Season Master", "+1000 coins · Badge · Scratch", 1000, "Season Master"),
    StreakMilestone(200, "200 Club", "+1200 coins · Scratch", 1200),
    StreakMilestone(240, "Unbroken", "+1500 coins · Scratch", 1500),
    StreakMilestone(260, "Hardcore", "+1700 coins · Scratch", 1700),
    StreakMilestone(290, "Near Immortal", "+2000 coins · Scratch", 2000),
    StreakMilestone(300, "300 Crown", "+2200 coins · Badge · Scratch", 2200, "300 Crown"),
    StreakMilestone(350, "Final Push", "+2500 coins · Scratch", 2500),
    StreakMilestone(360, "Almost Eternal", "+2800 coins · Scratch", 2800),
    StreakMilestone(365, "Year Legend", "+5000 coins · Legend · Scratch", 5000, "Year Legend")
)
