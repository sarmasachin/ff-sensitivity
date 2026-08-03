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
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.LocalActivity
import androidx.compose.material.icons.outlined.MonetizationOn
import androidx.compose.material.icons.outlined.PlayCircle
import androidx.compose.material.icons.outlined.Whatshot
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.DailyChallengeStore
import com.ffsensitivity.app.data.QuizUiPhase
import com.ffsensitivity.app.data.ShopStore
import com.ffsensitivity.app.data.quizForToday
import com.ffsensitivity.app.presentation.components.AtmosphereScaffold
import com.ffsensitivity.app.presentation.components.InlineErrorBanner
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
import androidx.compose.ui.graphics.Color
import kotlinx.coroutines.delay
import java.time.LocalDate

private enum class ChallengeTab { TODAY, REWARDS }

enum class ChallengeRetryKind { REFRESH_SNAPSHOT, CHECK_IN, QUIZ, AD, CLAIM_MILESTONE }

data class ChallengeUiError(
    val code: String,
    val title: String,
    val message: String,
    val retryKind: ChallengeRetryKind? = null,
    val retryMilestoneDays: Int? = null
)

private val EmptySafeSnapshot = DailyChallengeStore.Snapshot(
    coins = 0,
    streak = 0,
    checkedInToday = false,
    quizDoneToday = false,
    quizCorrectToday = null,
    adDoneToday = false,
    lastRewardNote = "",
    claimedMilestones = emptySet()
)

@Composable
fun DailyChallengeScreen(
    contentPadding: PaddingValues,
    onBack: () -> Boolean
) {
    val context = LocalContext.current
    var tab by remember { mutableStateOf(ChallengeTab.TODAY) }
    var actionError by remember { mutableStateOf<ChallengeUiError?>(null) }
    var snap by remember {
        mutableStateOf(EmptySafeSnapshot)
    }

    fun clearError() {
        actionError = null
    }

    fun showError(error: ChallengeUiError) {
        actionError = error
    }

    fun refreshSnapshot(): Boolean {
        return runCatching {
            snap = DailyChallengeStore.snapshot(context)
            true
        }.getOrElse {
            AppLog.e("Daily challenge snapshot failed", it)
            snap = EmptySafeSnapshot
            showError(
                ChallengeUiError(
                    code = "CHALLENGE_SNAPSHOT_FAILED",
                    title = "Challenge unavailable",
                    message = "Could not load today’s progress. Try again.",
                    retryKind = ChallengeRetryKind.REFRESH_SNAPSHOT
                )
            )
            false
        }
    }

    fun backSafe() {
        clearError()
        val ok = runCatching { onBack() }.getOrElse {
            AppLog.e("Daily challenge back crashed", it)
            false
        }
        if (!ok) {
            showError(
                ChallengeUiError(
                    code = "CHALLENGE_BACK_FAILED",
                    title = "Couldn’t go back",
                    message = "Navigation failed. Try again."
                )
            )
        }
    }

    fun runRetry(error: ChallengeUiError) {
        when (error.retryKind) {
            ChallengeRetryKind.REFRESH_SNAPSHOT -> {
                clearError()
                refreshSnapshot()
            }
            ChallengeRetryKind.CHECK_IN,
            ChallengeRetryKind.QUIZ,
            ChallengeRetryKind.AD,
            ChallengeRetryKind.CLAIM_MILESTONE,
            null -> clearError()
        }
    }

    LaunchedEffect(Unit) {
        refreshSnapshot()
    }

    AtmosphereScaffold {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(contentPadding)
                .statusBarsPadding()
                .navigationBarsPadding()
        ) {
            ChallengeTopBar(
                coins = snap.coins,
                onBack = { backSafe() }
            )
            Spacer(modifier = Modifier.height(12.dp))

            actionError?.let { err ->
                InlineErrorBanner(
                    title = err.title,
                    message = err.message,
                    onDismiss = { clearError() },
                    retryLabel = if (err.retryKind == ChallengeRetryKind.REFRESH_SNAPSHOT) {
                        "Retry"
                    } else {
                        null
                    },
                    onRetry = if (err.retryKind == ChallengeRetryKind.REFRESH_SNAPSHOT) {
                        { runRetry(err) }
                    } else {
                        null
                    },
                    modifier = Modifier.padding(horizontal = 20.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            ChallengeTabRow(
                selected = tab,
                onSelect = {
                    clearError()
                    tab = it
                },
                modifier = Modifier.padding(horizontal = 20.dp)
            )
            Spacer(modifier = Modifier.height(18.dp))

            when (tab) {
                ChallengeTab.TODAY -> {
                    DailyChallengeTodayTab(
                        snapshot = snap,
                        onSnapshot = { snap = it },
                        onError = { showError(it) },
                        onClearError = { clearError() },
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp)
                    )
                }
                ChallengeTab.REWARDS -> {
                    DailyChallengeRewardsTab(
                        snapshot = snap,
                        onSnapshot = { snap = it },
                        onError = { showError(it) },
                        onClearError = { clearError() },
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun ChallengeTopBar(coins: Int, onBack: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(42.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(SurfaceCard)
                .border(1.dp, HairlineStrong, RoundedCornerShape(12.dp))
                .clickable(onClick = onBack),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Outlined.ArrowBack,
                contentDescription = "Back",
                tint = InkPrimary,
                modifier = Modifier.size(20.dp)
            )
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "DAILY RUN",
                color = Amber,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.5.sp
            )
            Text(
                text = "Daily Challenge",
                color = InkPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
        WalletCoinsChip(coins = coins)
    }
}

@Composable
private fun WalletCoinsChip(coins: Int) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(14.dp))
            .background(Brush.horizontalGradient(listOf(SurfaceLift, SurfaceCard)))
            .border(1.dp, Amber.copy(alpha = 0.45f), RoundedCornerShape(14.dp))
            .padding(start = 6.dp, end = 12.dp, top = 6.dp, bottom = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(30.dp)
                .clip(RoundedCornerShape(99.dp))
                .background(Brush.radialGradient(listOf(AmberHot, Amber)))
                .border(1.dp, AmberHot.copy(alpha = 0.7f), RoundedCornerShape(99.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Outlined.MonetizationOn,
                contentDescription = null,
                tint = VoidBlack,
                modifier = Modifier.size(18.dp)
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
                text = formatCoins(coins),
                color = AmberHot,
                fontSize = 14.sp,
                fontWeight = FontWeight.Black,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun ChallengeTabRow(
    selected: ChallengeTab,
    onSelect: (ChallengeTab) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(SurfaceCard)
            .border(1.dp, HairlineStrong, RoundedCornerShape(16.dp))
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        ChallengeTabChip(
            label = "Daily Challenge",
            selected = selected == ChallengeTab.TODAY,
            onClick = { onSelect(ChallengeTab.TODAY) },
            modifier = Modifier.weight(1f)
        )
        ChallengeTabChip(
            label = "Rewards",
            selected = selected == ChallengeTab.REWARDS,
            onClick = { onSelect(ChallengeTab.REWARDS) },
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
private fun ChallengeTabChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .height(42.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (selected) Brush.horizontalGradient(listOf(Amber, AmberHot))
                else Brush.horizontalGradient(listOf(SurfaceCard, SurfaceCard))
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            color = if (selected) VoidBlack else InkSecondary,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            maxLines = 1
        )
    }
}

@Composable
fun DailyChallengeTodayTab(
    snapshot: DailyChallengeStore.Snapshot,
    onSnapshot: (DailyChallengeStore.Snapshot) -> Unit,
    onError: (ChallengeUiError) -> Unit,
    onClearError: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val question = remember {
        runCatching { quizForToday(LocalDate.now().dayOfYear) }.getOrElse {
            AppLog.e("Daily quiz load failed", it)
            com.ffsensitivity.app.data.DailyQuizQuestion(
                id = "safe",
                question = "Ready for today’s challenge?",
                options = listOf("Yes", "No", "Maybe", "Later"),
                correctIndex = 0
            )
        }
    }
    val quizOptions = remember(question) { question.options }
    var selectedOption by remember { mutableIntStateOf(-1) }
    var busy by remember { mutableStateOf(false) }

    LaunchedEffect(snapshot.quizCountdownEndsAtMs, snapshot.quizPhase) {
        val ends = snapshot.quizCountdownEndsAtMs
        if (ends <= 0L) return@LaunchedEffect
        val wait = ends - System.currentTimeMillis()
        if (wait > 0L) delay(wait)
        delay(50)
        runCatching { onSnapshot(DailyChallengeStore.snapshot(context)) }
    }

    LaunchedEffect(snapshot.quizPhase) {
        if (
            snapshot.quizPhase == QuizUiPhase.LOCKED ||
            snapshot.quizPhase == QuizUiPhase.CLOSED
        ) {
            selectedOption = -1
        }
    }

    fun runAction(
        failCode: String,
        failTitle: String,
        block: () -> DailyChallengeStore.Result
    ) {
        if (busy) {
            onError(
                ChallengeUiError(
                    code = "CHALLENGE_BUSY",
                    title = "Please wait",
                    message = "Another action is already in progress."
                )
            )
            return
        }
        onClearError()
        busy = true
        val result = runCatching { block() }.getOrElse {
            AppLog.e("Daily challenge action failed", it)
            null
        }
        busy = false
        when {
            result == null -> {
                onError(
                    ChallengeUiError(
                        code = failCode,
                        title = failTitle,
                        message = "Something went wrong. Try again."
                    )
                )
            }
            result.ok -> {
                onSnapshot(result.snapshot)
                SafeOps.toast(context, result.message)
            }
            else -> {
                onSnapshot(result.snapshot)
                onError(
                    ChallengeUiError(
                        code = failCode,
                        title = failTitle,
                        message = result.message.ifBlank { "Action was declined." }
                    )
                )
            }
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
    ) {
        Text(
            text = "TODAY",
            color = Amber,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.6.sp
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "Complete today’s run",
            color = InkPrimary,
            fontSize = 24.sp,
            fontWeight = FontWeight.Black,
            lineHeight = 30.sp
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "Check-in · answer 1 quiz · optional ad bonus. Keep your streak alive.",
            color = InkSecondary,
            fontSize = 13.sp,
            lineHeight = 18.sp
        )
        Spacer(modifier = Modifier.height(16.dp))

        WalletHeroCard(
            coins = snapshot.coins,
            streak = snapshot.streak,
            doneCount = snapshot.todayDoneCount.coerceIn(0, 3),
            lastRewardNote = snapshot.lastRewardNote,
            goldStyle = runCatching {
                ShopStore.hasGoldWalletStyle(context)
            }.getOrDefault(false)
        )
        Spacer(modifier = Modifier.height(16.dp))

        val checkInPlus = runCatching {
            ShopStore.boostCharges(context, ShopStore.ID_BOOST_CHECKIN_PLUS)
        }.getOrDefault(0)
        val quizDouble = runCatching {
            ShopStore.boostCharges(context, ShopStore.ID_BOOST_QUIZ_DOUBLE)
        }.getOrDefault(0)
        ChallengeTaskCard(
            icon = Icons.Outlined.LocalActivity,
            title = "Daily Check-in",
            subtitle = when {
                snapshot.checkedInToday -> "Claimed today · come back tomorrow"
                checkInPlus > 0 -> "Collect +20 · Plus boost ready (×$checkInPlus)"
                else -> "Collect your daily +20 coins"
            },
            done = snapshot.checkedInToday,
            actionLabel = when {
                snapshot.checkedInToday -> "Claimed"
                checkInPlus > 0 -> "Collect +40"
                else -> "Collect +20"
            },
            actionEnabled = !snapshot.checkedInToday && !busy,
            onAction = {
                runAction("CHALLENGE_CHECKIN_FAILED", "Check-in failed") {
                    DailyChallengeStore.claimCheckIn(context)
                }
            }
        )
        Spacer(modifier = Modifier.height(14.dp))

        DailyChallengeQuizCard(
            question = question.question,
            options = quizOptions,
            selectedOption = selectedOption,
            onSelect = {
                if (
                    snapshot.quizPhase != QuizUiPhase.AVAILABLE &&
                    snapshot.quizPhase != QuizUiPhase.OPEN
                ) {
                    return@DailyChallengeQuizCard
                }
                if (!busy) {
                    onClearError()
                    selectedOption = it
                }
            },
            phase = snapshot.quizPhase,
            countdownEndsAtMs = snapshot.quizCountdownEndsAtMs,
            quizBoostReady = quizDouble > 0,
            actionEnabled = (
                snapshot.quizPhase == QuizUiPhase.AVAILABLE ||
                    snapshot.quizPhase == QuizUiPhase.OPEN
                ) &&
                !busy &&
                selectedOption in quizOptions.indices &&
                quizOptions.size >= 2,
            onSubmit = {
                if (selectedOption !in quizOptions.indices) {
                    onError(
                        ChallengeUiError(
                            code = "CHALLENGE_QUIZ_VALIDATION",
                            title = "Select an option",
                            message = "Choose an answer before submitting the quiz."
                        )
                    )
                    return@DailyChallengeQuizCard
                }
                runAction("CHALLENGE_QUIZ_FAILED", "Quiz submit failed") {
                    val correct = selectedOption == question.correctIndex
                    DailyChallengeStore.submitQuiz(context, correct)
                }
            }
        )
        Spacer(modifier = Modifier.height(14.dp))

        ChallengeTaskCard(
            icon = Icons.Outlined.PlayCircle,
            title = "Watch Ad Bonus",
            subtitle = if (snapshot.adDoneToday) "Bonus claimed for today"
            else "Optional · earn +30 coins (1 per day)",
            done = snapshot.adDoneToday,
            actionLabel = if (snapshot.adDoneToday) "Claimed" else "Claim +30",
            actionEnabled = !snapshot.adDoneToday && !busy,
            onAction = {
                runAction("CHALLENGE_AD_FAILED", "Ad bonus failed") {
                    DailyChallengeStore.claimAdBonus(context)
                }
            }
        )

        Spacer(modifier = Modifier.height(20.dp))
        Text(
            text = "Tip: finish all 3 for a perfect day. Long streaks unlock bigger Rewards tab milestones.",
            color = InkMuted,
            fontSize = 12.sp,
            lineHeight = 17.sp
        )
        Spacer(modifier = Modifier.height(28.dp))
    }
}

@Composable
private fun WalletHeroCard(
    coins: Int,
    streak: Int,
    doneCount: Int,
    lastRewardNote: String,
    goldStyle: Boolean
) {
    val border = if (goldStyle) AmberHot.copy(alpha = 0.65f) else Amber.copy(alpha = 0.38f)
    val bg = if (goldStyle) {
        listOf(Color(0xFF2A2214), SurfaceLift, SurfaceCard)
    } else {
        listOf(SurfaceLift, SurfaceCard)
    }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(Brush.verticalGradient(bg))
            .border(1.dp, border, RoundedCornerShape(20.dp))
            .padding(16.dp)
    ) {
        Text(
            text = if (goldStyle) "GOLD WALLET" else "WALLET",
            color = Amber,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.4.sp
        )
        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier
                    .weight(1.15f)
                    .clip(RoundedCornerShape(16.dp))
                    .background(Brush.horizontalGradient(listOf(AmberSoft, SurfaceDeep.copy(alpha = 0.55f))))
                    .border(1.dp, Amber.copy(alpha = 0.42f), RoundedCornerShape(16.dp))
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(46.dp)
                        .clip(RoundedCornerShape(99.dp))
                        .background(Brush.radialGradient(listOf(AmberHot, Amber)))
                        .border(1.5.dp, AmberHot.copy(alpha = 0.75f), RoundedCornerShape(99.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Outlined.MonetizationOn,
                        contentDescription = null,
                        tint = VoidBlack,
                        modifier = Modifier.size(26.dp)
                    )
                }
                Spacer(modifier = Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "BALANCE",
                        color = InkMuted,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.1.sp
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = formatCoins(coins),
                        color = AmberHot,
                        fontSize = 26.sp,
                        fontWeight = FontWeight.Black,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "coins",
                        color = InkSecondary,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            Column(
                modifier = Modifier
                    .weight(0.85f)
                    .clip(RoundedCornerShape(16.dp))
                    .background(SurfaceDeep.copy(alpha = 0.55f))
                    .border(1.dp, HairlineStrong, RoundedCornerShape(16.dp))
                    .padding(12.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Outlined.Whatshot,
                        contentDescription = null,
                        tint = Amber,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "STREAK",
                        color = InkMuted,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.1.sp
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "$streak",
                    color = InkPrimary,
                    fontSize = 26.sp,
                    fontWeight = FontWeight.Black
                )
                Text(
                    text = if (streak == 1) "day" else "days",
                    color = InkSecondary,
                    fontSize = 11.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(14.dp))
        Text(
            text = "Today’s progress · $doneCount/3",
            color = InkSecondary,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium
        )
        Spacer(modifier = Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            repeat(3) { i ->
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(6.dp)
                        .clip(RoundedCornerShape(99.dp))
                        .background(if (i < doneCount) Amber else SurfaceDeep)
                )
            }
        }
        if (lastRewardNote.isNotBlank()) {
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = "Last added · $lastRewardNote",
                color = Success,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun ChallengeTaskCard(
    icon: ImageVector,
    title: String,
    subtitle: String,
    done: Boolean,
    actionLabel: String,
    actionEnabled: Boolean,
    onAction: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(Brush.verticalGradient(listOf(SurfaceLift, SurfaceCard)))
            .border(
                1.dp,
                if (done) Success.copy(alpha = 0.35f) else Amber.copy(alpha = 0.28f),
                RoundedCornerShape(20.dp)
            )
            .padding(16.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (done) Success.copy(alpha = 0.15f) else AmberSoft)
                    .border(
                        1.dp,
                        if (done) Success.copy(alpha = 0.4f) else Amber.copy(alpha = 0.35f),
                        RoundedCornerShape(12.dp)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (done) Icons.Outlined.CheckCircle else icon,
                    contentDescription = null,
                    tint = if (done) Success else Amber,
                    modifier = Modifier.size(22.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(title, color = InkPrimary, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(3.dp))
                Text(subtitle, color = InkSecondary, fontSize = 12.sp, lineHeight = 16.sp)
            }
        }
        Spacer(modifier = Modifier.height(14.dp))
        ChallengeActionButton(
            label = actionLabel,
            enabled = actionEnabled,
            onClick = onAction
        )
    }
}

@Composable
private fun ChallengeActionButton(
    label: String,
    enabled: Boolean,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(48.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(
                if (enabled) Brush.horizontalGradient(listOf(Amber, AmberHot))
                else Brush.horizontalGradient(listOf(SurfaceLift, SurfaceLift))
            )
            .border(
                1.dp,
                if (enabled) Amber.copy(alpha = 0.35f) else Hairline,
                RoundedCornerShape(14.dp)
            )
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            color = if (enabled) VoidBlack else InkMuted,
            fontSize = 14.sp,
            fontWeight = FontWeight.Black
        )
    }
}

private fun formatCoins(value: Int): String =
    String.format(java.util.Locale.US, "%,d", value)
