package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.MonetizationOn
import androidx.compose.material.icons.outlined.Style
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.BuildConfig
import com.ffsensitivity.app.data.DailyChallengeStore
import com.ffsensitivity.app.data.ScratchCardDebug
import com.ffsensitivity.app.data.ScratchHistoryStore
import com.ffsensitivity.app.data.StreakMilestone
import com.ffsensitivity.app.data.remote.ChallengeRemoteCache
import com.ffsensitivity.app.data.streakMilestones
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.AmberHot
import com.ffsensitivity.app.presentation.theme.AmberSoft
import com.ffsensitivity.app.presentation.theme.Hairline
import com.ffsensitivity.app.presentation.theme.HairlineStrong
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.presentation.theme.Success
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.presentation.theme.SurfaceDeep
import com.ffsensitivity.app.presentation.theme.SurfaceLift
import com.ffsensitivity.app.presentation.theme.VoidBlack
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.SafeOps
import java.util.Locale

private enum class MilestoneState { LOCKED, READY, CLAIMED }

@Composable
fun DailyChallengeRewardsTab(
    snapshot: DailyChallengeStore.Snapshot,
    onSnapshot: (DailyChallengeStore.Snapshot) -> Unit,
    onError: (ChallengeUiError) -> Unit,
    onClearError: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var scratchTarget by remember { mutableStateOf<StreakMilestone?>(null) }
    var claiming by remember { mutableStateOf(false) }
    val milestones =
        ChallengeRemoteCache.milestones?.takeIf { it.isNotEmpty() }
            ?: runCatching { streakMilestones }.getOrElse {
                AppLog.e("Milestone list failed", it)
                emptyList()
            }
    val nextTarget = milestones.firstOrNull {
        snapshot.streak < it.days && !ScratchCardDebug.isForceUnlocked(it.days)
    }?.days
    val progressToNext = when {
        nextTarget == null && snapshot.streak > 0 -> 1f
        nextTarget == null -> 0f
        else -> {
            val prev = milestones.lastOrNull { it.days <= snapshot.streak }?.days ?: 0
            val span = (nextTarget - prev).coerceAtLeast(1)
            ((snapshot.streak - prev).toFloat() / span).coerceIn(0f, 1f)
        }
    }
    val showQaBanner = ScratchCardDebug.forceUnlockDays.isNotEmpty()

    scratchTarget?.let { target ->
        MilestoneScratchCardDialog(
            milestone = target,
            onDismiss = {
                if (!claiming) scratchTarget = null
            },
            onUnlocked = {
                if (claiming) return@MilestoneScratchCardDialog false
                claiming = true
                onClearError()
                val ok = runCatching {
                    val result = DailyChallengeStore.claimMilestone(context, target.days)
                    onSnapshot(result.snapshot)
                    if (result.ok) {
                        runCatching {
                            ScratchHistoryStore.addMilestone(context, target)
                        }.onFailure {
                            AppLog.e("Milestone history save failed", it)
                            onError(
                                ChallengeUiError(
                                    code = "CHALLENGE_MILESTONE_HISTORY_FAILED",
                                    title = "Claimed, archive failed",
                                    message = "Reward claimed, but Scratch Cards history did not save."
                                )
                            )
                        }
                        SafeOps.toast(context, result.message)
                    } else {
                        onError(
                            ChallengeUiError(
                                code = "CHALLENGE_MILESTONE_REJECTED",
                                title = "Couldn’t claim reward",
                                message = result.message.ifBlank { "Milestone claim was declined." }
                            )
                        )
                    }
                    claiming = false
                    result.ok
                }.getOrElse {
                    AppLog.e("Scratch claim failed", it)
                    claiming = false
                    onError(
                        ChallengeUiError(
                            code = "CHALLENGE_MILESTONE_FAILED",
                            title = "Claim failed",
                            message = "Something went wrong claiming this milestone. Try again."
                        )
                    )
                    false
                }
                ok
            }
        )
    }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(
                text = "REWARDS",
                color = Amber,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.6.sp
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Streak milestone board",
                color = InkPrimary,
                fontSize = 24.sp,
                fontWeight = FontWeight.Black,
                lineHeight = 30.sp
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Unlock a milestone, then scratch the foil card to collect coins.",
                color = InkSecondary,
                fontSize = 13.sp,
                lineHeight = 18.sp
            )
            if (showQaBanner) {
                Spacer(modifier = Modifier.height(10.dp))
                QaDebugBanner()
            }
            Spacer(modifier = Modifier.height(14.dp))
            StreakProgressHero(
                streak = snapshot.streak,
                nextTarget = nextTarget,
                progress = progressToNext,
                coins = snapshot.coins
            )
        }

        if (milestones.isEmpty()) {
            item {
                Text(
                    text = "Milestones unavailable right now.",
                    color = InkMuted,
                    fontSize = 13.sp
                )
            }
        } else {
            items(milestones, key = { it.days }) { milestone ->
                val state = when {
                    milestone.days in snapshot.claimedMilestones -> MilestoneState.CLAIMED
                    snapshot.streak >= milestone.days ||
                        ScratchCardDebug.isForceUnlocked(milestone.days) -> MilestoneState.READY
                    else -> MilestoneState.LOCKED
                }
                MilestoneCard(
                    milestone = milestone,
                    state = state,
                    streak = snapshot.streak,
                    forceUnlocked = ScratchCardDebug.isForceUnlocked(milestone.days) &&
                        milestone.days !in snapshot.claimedMilestones &&
                        snapshot.streak < milestone.days,
                    enabled = state == MilestoneState.READY && !claiming && scratchTarget == null,
                    onScratch = {
                        if (claiming || scratchTarget != null) {
                            onError(
                                ChallengeUiError(
                                    code = "CHALLENGE_BUSY",
                                    title = "Please wait",
                                    message = "A scratch claim is already in progress."
                                )
                            )
                            return@MilestoneCard
                        }
                        onClearError()
                        scratchTarget = milestone
                    }
                )
            }
        }

        item {
            Spacer(modifier = Modifier.height(8.dp))
            InstructionsCard()
        }
    }
}

@Composable
private fun QaDebugBanner() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(AmberSoft)
            .border(1.dp, Amber.copy(alpha = 0.4f), RoundedCornerShape(14.dp))
            .padding(12.dp)
    ) {
        Text(
            text = "QA ONLY · DEBUG BUILD",
            color = AmberHot,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.2.sp
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = "Day 7 / 15 / 20 scratch cards force-unlocked for testing. " +
                "Off in release, or set ScratchCardDebug.UNLOCK_FIRST_THREE_FOR_QA = false.",
            color = InkSecondary,
            fontSize = 11.sp,
            lineHeight = 15.sp
        )
        if (!BuildConfig.DEBUG) {
            Text(
                text = "Unexpected: debug flag active outside DEBUG.",
                color = InkMuted,
                fontSize = 10.sp
            )
        }
    }
}

@Composable
private fun StreakProgressHero(
    streak: Int,
    nextTarget: Int?,
    progress: Float,
    coins: Int
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(Brush.horizontalGradient(listOf(SurfaceLift, SurfaceCard)))
            .border(1.dp, Amber.copy(alpha = 0.38f), RoundedCornerShape(20.dp))
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "CURRENT STREAK",
                    color = InkMuted,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.2.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "$streak days",
                    color = AmberHot,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Black
                )
            }
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(14.dp))
                    .background(Brush.horizontalGradient(listOf(AmberSoft, SurfaceDeep.copy(alpha = 0.5f))))
                    .border(1.dp, Amber.copy(alpha = 0.42f), RoundedCornerShape(14.dp))
                    .padding(horizontal = 10.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(RoundedCornerShape(99.dp))
                        .background(Brush.radialGradient(listOf(AmberHot, Amber))),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Outlined.MonetizationOn,
                        contentDescription = null,
                        tint = VoidBlack,
                        modifier = Modifier.size(16.dp)
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Text(
                        text = "WALLET",
                        color = InkMuted,
                        fontSize = 8.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.1.sp
                    )
                    Text(
                        text = formatRewardCoins(coins),
                        color = AmberHot,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Black,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = if (nextTarget == null) {
                "All streak gates cleared · scratch any ready cards"
            } else {
                "Next streak unlock · Day $nextTarget"
            },
            color = InkSecondary,
            fontSize = 12.sp
        )
        Spacer(modifier = Modifier.height(8.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(99.dp))
                .background(SurfaceDeep)
        ) {
            val fill = progress.coerceIn(0f, 1f)
            if (fill > 0f) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(fill)
                        .height(8.dp)
                        .clip(RoundedCornerShape(99.dp))
                        .background(Brush.horizontalGradient(listOf(Amber, AmberHot)))
                )
            }
        }
    }
}

@Composable
private fun MilestoneCard(
    milestone: StreakMilestone,
    state: MilestoneState,
    streak: Int,
    forceUnlocked: Boolean,
    enabled: Boolean,
    onScratch: () -> Unit
) {
    val borderColor = when (state) {
        MilestoneState.CLAIMED -> Success.copy(alpha = 0.4f)
        MilestoneState.READY -> Amber.copy(alpha = 0.45f)
        MilestoneState.LOCKED -> HairlineStrong
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(Brush.verticalGradient(listOf(SurfaceLift, SurfaceCard)))
            .border(1.dp, borderColor, RoundedCornerShape(18.dp))
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(52.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(
                    when (state) {
                        MilestoneState.CLAIMED -> Success.copy(alpha = 0.14f)
                        MilestoneState.READY -> AmberSoft
                        MilestoneState.LOCKED -> SurfaceDeep.copy(alpha = 0.7f)
                    }
                )
                .border(
                    1.dp,
                    when (state) {
                        MilestoneState.CLAIMED -> Success.copy(alpha = 0.4f)
                        MilestoneState.READY -> Amber.copy(alpha = 0.4f)
                        MilestoneState.LOCKED -> Hairline
                    },
                    RoundedCornerShape(14.dp)
                ),
            contentAlignment = Alignment.Center
        ) {
            when (state) {
                MilestoneState.CLAIMED -> Icon(
                    Icons.Outlined.CheckCircle,
                    contentDescription = null,
                    tint = Success,
                    modifier = Modifier.size(24.dp)
                )
                MilestoneState.READY -> Icon(
                    Icons.Outlined.Style,
                    contentDescription = null,
                    tint = Amber,
                    modifier = Modifier.size(24.dp)
                )
                MilestoneState.LOCKED -> Icon(
                    Icons.Outlined.Lock,
                    contentDescription = null,
                    tint = InkMuted,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "DAY ${milestone.days}",
                color = Amber,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.2.sp
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = milestone.title,
                color = InkPrimary,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = milestone.rewardLabel,
                color = InkSecondary,
                fontSize = 12.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            when {
                state == MilestoneState.LOCKED -> {
                    Spacer(modifier = Modifier.height(3.dp))
                    Text(
                        text = "${(milestone.days - streak).coerceAtLeast(0)} days left",
                        color = InkMuted,
                        fontSize = 11.sp
                    )
                }
                forceUnlocked -> {
                    Spacer(modifier = Modifier.height(3.dp))
                    Text(
                        text = "QA unlock · scratch to test",
                        color = AmberHot,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                state == MilestoneState.READY -> {
                    Spacer(modifier = Modifier.height(3.dp))
                    Text(
                        text = "Scratch card ready",
                        color = Amber,
                        fontSize = 11.sp
                    )
                }
            }
        }
        Spacer(modifier = Modifier.width(8.dp))
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(12.dp))
                .background(
                    when (state) {
                        MilestoneState.READY -> Brush.horizontalGradient(listOf(Amber, AmberHot))
                        else -> Brush.horizontalGradient(listOf(SurfaceDeep, SurfaceDeep))
                    }
                )
                .border(
                    1.dp,
                    if (state == MilestoneState.READY) Amber.copy(alpha = 0.35f) else Hairline,
                    RoundedCornerShape(12.dp)
                )
                .clickable(enabled = enabled, onClick = onScratch)
                .padding(horizontal = 12.dp, vertical = 10.dp)
        ) {
            Text(
                text = when (state) {
                    MilestoneState.CLAIMED -> "Claimed"
                    MilestoneState.READY -> "Scratch"
                    MilestoneState.LOCKED -> "Locked"
                },
                color = when (state) {
                    MilestoneState.READY -> VoidBlack
                    MilestoneState.CLAIMED -> Success
                    MilestoneState.LOCKED -> InkMuted
                },
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
private fun InstructionsCard() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(SurfaceCard)
            .border(1.dp, HairlineStrong, RoundedCornerShape(18.dp))
            .padding(16.dp)
    ) {
        Text(
            text = "INSTRUCTIONS",
            color = Amber,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.3.sp
        )
        Spacer(modifier = Modifier.height(10.dp))
        InstructionLine("1. Complete Daily Challenge every day to grow streak.")
        InstructionLine("2. Miss a day and streak resets to 1 on next check-in.")
        InstructionLine("3. Reach a milestone → Scratch button unlocks.")
        InstructionLine("4. Scratch the foil — card fully opens at 40%.")
        InstructionLine("5. Coins go to your Wallet after scratch unlock.")
        InstructionLine("6. Each scratch card can be claimed only once.")
    }
}

@Composable
private fun InstructionLine(text: String) {
    Text(
        text = text,
        color = InkSecondary,
        fontSize = 12.sp,
        lineHeight = 18.sp,
        modifier = Modifier.padding(bottom = 6.dp)
    )
}

private fun formatRewardCoins(value: Int): String =
    String.format(Locale.US, "%,d", value.coerceAtLeast(0))
