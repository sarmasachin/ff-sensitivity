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
import com.ffsensitivity.app.data.CheckInAdStore
import com.ffsensitivity.app.data.DailyChallengeStore
import com.ffsensitivity.app.data.QuizAdConfig
import com.ffsensitivity.app.data.QuizAdStore
import com.ffsensitivity.app.data.SecondChanceAdConfig
import com.ffsensitivity.app.data.SecondChanceAdStore
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
import java.util.Locale

@Composable
fun DailyChallengeTodayTab(
    snapshot: DailyChallengeStore.Snapshot,
    onSnapshot: (DailyChallengeStore.Snapshot) -> Unit,
    onError: (ChallengeUiError) -> Unit,
    onClearError: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var question by remember {
        mutableStateOf(
            ChallengeRemoteCache.todayQuestion
                ?: com.ffsensitivity.app.data.DailyQuizQuestion(
                    id = "loading",
                    question = "Loading today’s quiz…",
                    options = listOf("…", "…", "…", "…"),
                    correctIndex = -1
                )
        )
    }
    LaunchedEffect(Unit) {
        val result = withContext(Dispatchers.IO) {
            ChallengeRepository.syncToday(context)
        }
        result.onSuccess { payload ->
            payload.question?.let { question = it }
            if (payload.question == null) {
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
            ChallengeRemoteCache.todayQuestion?.let { question = it }
            if (ChallengeRemoteCache.todayQuestion == null) {
                onError(
                    ChallengeUiError(
                        code = "CHALLENGE_SYNC_FAILED",
                        title = "Couldn’t load quiz",
                        message = "Check connection and try again.",
                        retryKind = ChallengeRetryKind.REFRESH_SNAPSHOT
                    )
                )
            }
        }
    }
    val quizOptions = remember(question) { question.options }
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
        ChallengeTaskCard(
            icon = Icons.Outlined.LocalActivity,
            title = "Daily Check-in",
            subtitle = when {
                snapshot.checkedInToday -> "Claimed today · come back tomorrow"
                needsCheckInAd && checkInPlus > 0 ->
                    "Watch ad · Collect +40 · Plus boost ready (×$checkInPlus)"
                needsCheckInAd -> "Watch ad · Collect your daily +20 coins"
                checkInPlus > 0 -> "Collect +20 · Plus boost ready (×$checkInPlus)"
                else -> "Collect your daily +20 coins"
            },
            done = snapshot.checkedInToday,
            actionLabel = when {
                snapshot.checkedInToday -> "Claimed"
                busy && needsCheckInAd -> "Watch ad…"
                needsCheckInAd -> CheckInAdConfig.buttonLabel
                checkInPlus > 0 -> "Collect +40"
                else -> "Collect +20"
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

        val quizCanSubmit = (
            snapshot.quizPhase == QuizUiPhase.AVAILABLE ||
                snapshot.quizPhase == QuizUiPhase.OPEN
            ) &&
            !busy &&
            selectedOption in quizOptions.indices &&
            quizOptions.size >= 2
        val quizAwaitingAd = snapshot.quizPhase == QuizUiPhase.AWAITING_AD
        val needsQuizAd = remember(snapshot.quizPhase, busy, quizAdPassTick) {
            (snapshot.quizPhase == QuizUiPhase.AVAILABLE ||
                snapshot.quizPhase == QuizUiPhase.OPEN) &&
                QuizAdStore.needsAd(context)
        }
        val needsSecondChanceAd = remember(quizAwaitingAd, secondChanceAdPassTick) {
            quizAwaitingAd && SecondChanceAdStore.needsAd(context)
        }
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
            actionEnabled = if (quizAwaitingAd) !busy else quizCanSubmit,
            submitLabel = when {
                quizAwaitingAd && busy -> "Watch ad…"
                quizAwaitingAd && needsSecondChanceAd -> SecondChanceAdConfig.buttonLabel
                quizAwaitingAd -> "Unlock New Question"
                busy && needsQuizAd -> "Watch ad…"
                needsQuizAd -> QuizAdConfig.buttonLabel
                else -> "Submit Answer"
            },
            onSubmit = {
                if (quizAwaitingAd) {
                    DailyChallengeSecondChanceGate.run(
                        context = context,
                        activity = context.findActivity(),
                        busy = busy,
                        scope = scope,
                        setBusy = { busy = it },
                        onClearError = onClearError,
                        onError = onError,
                        onQuestion = { q ->
                            question = q
                            selectedOption = -1
                        },
                        onSnapshot = onSnapshot,
                        onPassTick = { secondChanceAdPassTick += 1 }
                    )
                    return@DailyChallengeQuizCard
                }
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
                fun doSubmit() {
                    runAction("CHALLENGE_QUIZ_FAILED", "Quiz submit failed") {
                        if (question.id.isBlank() || question.id == "loading") {
                            DailyChallengeStore.Result(
                                false,
                                "Quiz not loaded yet. Reopen Daily Challenge.",
                                DailyChallengeStore.snapshot(context)
                            )
                        } else {
                            DailyChallengeStore.submitQuiz(context, question.id, selectedOption)
                        }
                    }
                }
                if (!QuizAdStore.needsAd(context)) {
                    doSubmit()
                    return@DailyChallengeQuizCard
                }
                val activity = context.findActivity()
                if (activity == null) {
                    onError(
                        ChallengeUiError(
                            code = "CHALLENGE_QUIZ_AD_NO_ACTIVITY",
                            title = "Couldn’t show ad",
                            message = "Restart the app and try again.",
                            retryKind = ChallengeRetryKind.QUIZ
                        )
                    )
                    return@DailyChallengeQuizCard
                }
                if (busy) {
                    onError(
                        ChallengeUiError(
                            code = "CHALLENGE_BUSY",
                            title = "Please wait",
                            message = "Another action is already in progress."
                        )
                    )
                    return@DailyChallengeQuizCard
                }
                onClearError()
                busy = true
                QuizInterstitialAds.show(
                    activity = activity,
                    onCompleted = {
                        QuizAdStore.markShown(context)
                        quizAdPassTick += 1
                        busy = false
                        doSubmit()
                    },
                    onNotCompleted = { message ->
                        busy = false
                        onError(
                            ChallengeUiError(
                                code = "CHALLENGE_QUIZ_AD_REQUIRED",
                                title = "Ad required",
                                message = message,
                                retryKind = ChallengeRetryKind.QUIZ
                            )
                        )
                    },
                    incompleteMessage = QuizAdConfig.incompleteMessage
                )
            }
        )
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

private fun formatAdCooldown(ms: Long): String {
    val totalMin = ((ms + 59_999L) / 60_000L).coerceAtLeast(0L)
    val hours = totalMin / 60L
    val mins = totalMin % 60L
    return when {
        hours <= 0L && mins <= 0L -> "a moment"
        hours <= 0L -> if (mins == 1L) "1 min" else "$mins mins"
        mins <= 0L -> if (hours == 1L) "1 hour" else "$hours hours"
        else -> String.format(
            Locale.US,
            "%d hour%s %d min%s",
            hours,
            if (hours == 1L) "" else "s",
            mins,
            if (mins == 1L) "" else "s"
        )
    }
}
