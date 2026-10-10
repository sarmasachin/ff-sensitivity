package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.LocalActivity
import androidx.compose.material.icons.outlined.PlayCircle
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.ads.CalculateRewardedAds
import com.ffsensitivity.app.ads.CheckInInterstitialAds
import com.ffsensitivity.app.ads.QuizInterstitialAds
import com.ffsensitivity.app.ads.findActivity
import com.ffsensitivity.app.data.AdBonusAdConfig
import com.ffsensitivity.app.data.CheckInAdConfig
import com.ffsensitivity.app.data.ChallengeQuizTimingConfig
import com.ffsensitivity.app.data.CheckInAdStore
import com.ffsensitivity.app.data.DailyChallengeStore
import com.ffsensitivity.app.data.QuizAdStore
import com.ffsensitivity.app.data.QuizUiPhase
import com.ffsensitivity.app.data.ShopStore
import com.ffsensitivity.app.data.remote.ChallengeRemoteCache
import com.ffsensitivity.app.data.remote.ChallengeRepository
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.SafeOps
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun DailyChallengeTodayTab(
    snapshot: DailyChallengeStore.Snapshot,
    onSnapshot: (DailyChallengeStore.Snapshot) -> Unit,
    onError: (ChallengeUiError) -> Unit,
    onClearError: () -> Unit,
    quizSyncGen: Int = 0,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var question by remember {
        mutableStateOf(cachedReadyQuiz() ?: quizPlaceholderQuestion())
    }
    fun applyCachedQuiz() {
        val cached = cachedReadyQuiz()
        if (cached != null) {
            question = cached
        } else if (!ChallengeRemoteCache.isFreshToday() && quizQuestionReady(question.id)) {
            question = quizPlaceholderQuestion()
        }
    }
    LaunchedEffect(quizSyncGen) {
        applyCachedQuiz()
        if (cachedReadyQuiz() != null && quizSyncGen > 0) {
            return@LaunchedEffect
        }
        val result = withContext(Dispatchers.IO) {
            ChallengeRepository.syncToday(context)
        }
        result.onSuccess { payload ->
            payload.question?.let { question = it }
            applyCachedQuiz()
            if (payload.question == null && !quizQuestionReady(question.id)) {
                onError(
                    ChallengeUiError(
                        code = "CHALLENGE_NO_QUIZ",
                        title = "No quiz today",
                        message = "Admin quiz bank has no live question for today.",
                        retryKind = ChallengeRetryKind.REFRESH_SNAPSHOT
                    )
                )
            }
        }.onFailure {
            AppLog.e("Challenge sync on today tab failed", it)
            applyCachedQuiz()
            challengeLoadError(it, quizQuestionReady(question.id))?.let(onError)
        }
    }
    var selectedOption by remember { mutableIntStateOf(-1) }
    var busy by remember { mutableStateOf(false) }
    var quizAdPassTick by remember { mutableIntStateOf(0) }
    var secondChanceAdPassTick by remember { mutableIntStateOf(0) }
    var checkInAdPassTick by remember { mutableIntStateOf(0) }

    LaunchedEffect(snapshot.quizCountdownEndsAtMs, snapshot.quizPhase) {
        val ends = snapshot.quizCountdownEndsAtMs
        if (ends <= 0L) return@LaunchedEffect
        val wait = ends - System.currentTimeMillis()
        if (wait > 0L) delay(wait)
        delay(50)
        runCatching { onSnapshot(DailyChallengeStore.snapshot(context)) }
    }

    // Live “Next Ad Available in …” tick (1 min refresh is enough for hours/mins copy).
    var adTick by remember { mutableIntStateOf(0) }
    LaunchedEffect(snapshot.nextAdAvailableAtMs) {
        val ends = snapshot.nextAdAvailableAtMs
        if (ends <= 0L) return@LaunchedEffect
        while (System.currentTimeMillis() < ends) {
            adTick += 1
            delay(30_000L)
        }
        delay(50)
        runCatching { onSnapshot(DailyChallengeStore.snapshot(context)) }
    }

    LaunchedEffect(snapshot.adAvailable) {
        if (snapshot.adAvailable && snapshot.adBonusEnabled) {
            CalculateRewardedAds.preload(context)
        }
    }

    LaunchedEffect(snapshot.checkedInToday) {
        if (!snapshot.checkedInToday && CheckInAdStore.needsAd(context)) {
            CheckInInterstitialAds.preload(context)
        }
    }

    LaunchedEffect(snapshot.quizPhase) {
        if (
            (snapshot.quizPhase == QuizUiPhase.AVAILABLE ||
                snapshot.quizPhase == QuizUiPhase.OPEN) &&
            QuizAdStore.needsAd(context)
        ) {
            QuizInterstitialAds.preload(context)
        }
    }

    LaunchedEffect(snapshot.quizPhase) {
        if (
            snapshot.quizPhase == QuizUiPhase.LOCKED ||
            snapshot.quizPhase == QuizUiPhase.CLOSED ||
            snapshot.quizPhase == QuizUiPhase.AWAITING_AD
        ) {
            selectedOption = -1
        }
        if (snapshot.quizPhase == QuizUiPhase.AWAITING_AD) {
            CalculateRewardedAds.preload(context)
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
        scope.launch {
            val result = runCatching {
                withContext(Dispatchers.IO) { block() }
            }.getOrElse {
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
                    onError(challengeActionError(failCode, failTitle, result.message))
                }
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
            text = "Check in and answer today’s quiz to keep your streak alive.",
            color = InkSecondary,
            fontSize = 13.sp,
            lineHeight = 18.sp
        )
        Spacer(modifier = Modifier.height(16.dp))

        WalletHeroCard(
            coins = snapshot.coins,
            streak = snapshot.streak,
            doneCount = snapshot.todayDoneCount.coerceIn(0, 2),
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
        val needsCheckInAd = remember(snapshot.checkedInToday, busy, checkInAdPassTick) {
            !snapshot.checkedInToday && CheckInAdStore.needsAd(context)
        }
        val checkInCoins = ChallengeQuizTimingConfig.checkinCoins
        val checkInBoostCoins = checkInCoins + 20
        if (ChallengeQuizTimingConfig.checkInEnabled) {
        ChallengeTaskCard(
            icon = Icons.Outlined.LocalActivity,
            title = "Daily Check-in",
            subtitle = when {
                snapshot.checkedInToday -> "Claimed today · come back tomorrow"
                needsCheckInAd && checkInPlus > 0 ->
                    "Watch ad · Collect +$checkInBoostCoins · Plus boost ready (×$checkInPlus)"
                needsCheckInAd -> "Watch ad · Collect your daily +$checkInCoins coins"
                checkInPlus > 0 -> "Collect +$checkInCoins · Plus boost ready (×$checkInPlus)"
                else -> "Collect your daily +$checkInCoins coins"
            },
            done = snapshot.checkedInToday,
            actionLabel = when {
                snapshot.checkedInToday -> "Claimed"
                busy && needsCheckInAd -> "Watch ad…"
                needsCheckInAd -> CheckInAdConfig.buttonLabel
                checkInPlus > 0 -> "Collect +$checkInBoostCoins"
                else -> "Collect +$checkInCoins"
            },
            actionEnabled = !snapshot.checkedInToday && !busy,
            onAction = {
                DailyChallengeCheckInAdGate.run(
                    context = context,
                    activity = context.findActivity(),
                    busy = busy,
                    scope = scope,
                    setBusy = { busy = it },
                    onClearError = onClearError,
                    onError = onError,
                    onSnapshot = onSnapshot,
                    onPassTick = { checkInAdPassTick += 1 },
                    runClaimWithoutAd = {
                        runAction("CHALLENGE_CHECKIN_FAILED", "Check-in failed") {
                            DailyChallengeStore.claimCheckIn(context)
                        }
                    }
                )
            }
        )
        Spacer(modifier = Modifier.height(14.dp))
        }

        if (ChallengeQuizTimingConfig.quizEnabled) {
        DailyChallengeTodayQuizSection(
            context = context,
            scope = scope,
            snapshot = snapshot,
            question = question,
            quizDouble = quizDouble,
            selectedOption = selectedOption,
            busy = busy,
            quizAdPassTick = quizAdPassTick,
            secondChanceAdPassTick = secondChanceAdPassTick,
            applyCachedQuiz = { applyCachedQuiz() },
            onSelectOption = { selectedOption = it },
            onQuestion = { question = it },
            onQuizAdPassTick = { quizAdPassTick += 1 },
            onSecondChancePassTick = { secondChanceAdPassTick += 1 },
            setBusy = { busy = it },
            runAction = { code, title, block -> runAction(code, title, block) },
            onError = onError,
            onClearError = onClearError,
            onSnapshot = onSnapshot
        )
        }
        Spacer(modifier = Modifier.height(14.dp))

        val adRemainingMs = remember(snapshot.nextAdAvailableAtMs, adTick) {
            (snapshot.nextAdAvailableAtMs - System.currentTimeMillis()).coerceAtLeast(0L)
        }
        val adAvailable = snapshot.adAvailable
        ChallengeTaskCard(
            icon = Icons.Outlined.PlayCircle,
            title = "Watch Ad Bonus",
            subtitle = when {
                !snapshot.adBonusEnabled -> "Ad bonus is turned off"
                adAvailable -> "Watch a full ad to earn bonus coins"
                else -> "Next Ad Available in ${formatAdCooldown(adRemainingMs)}"
            },
            done = !adAvailable && snapshot.adBonusEnabled,
            actionLabel = when {
                !snapshot.adBonusEnabled -> "Unavailable"
                busy && adAvailable -> "Watch ad…"
                adAvailable -> AdBonusAdConfig.buttonLabel
                else -> "On cooldown"
            },
            actionEnabled = adAvailable && snapshot.adBonusEnabled && !busy,
            onAction = {
                DailyChallengeAdBonusGate.run(
                    context = context,
                    activity = context.findActivity(),
                    busy = busy,
                    scope = scope,
                    setBusy = { busy = it },
                    onClearError = onClearError,
                    onError = onError,
                    onSnapshot = onSnapshot
                )
            }
        )
        Spacer(modifier = Modifier.height(28.dp))
    }
}
