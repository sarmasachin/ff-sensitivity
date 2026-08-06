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
import com.ffsensitivity.app.data.DailyChallengeStore
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
        }.onFailure {
            AppLog.e("Challenge sync on today tab failed", it)
            ChallengeRemoteCache.todayQuestion?.let { question = it }
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
        )
        Spacer(modifier = Modifier.height(14.dp))

        ChallengeTaskCard(
            icon = Icons.Outlined.PlayCircle,
            title = "Watch Ad Bonus",
            subtitle = if (snapshot.adDoneToday) {
                "Bonus claimed for today"
            } else {
                "Ad bonus not available yet"
            },
            done = snapshot.adDoneToday,
            actionLabel = if (snapshot.adDoneToday) "Claimed" else "Unavailable",
            actionEnabled = false,
            onAction = { }
        )
        Spacer(modifier = Modifier.height(28.dp))
    }
}
