package com.ffsensitivity.app.presentation.screens

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import com.ffsensitivity.app.ads.QuizInterstitialAds
import com.ffsensitivity.app.ads.findActivity
import com.ffsensitivity.app.data.DailyChallengeStore
import com.ffsensitivity.app.data.DailyQuizQuestion
import com.ffsensitivity.app.data.QuizAdConfig
import com.ffsensitivity.app.data.QuizAdStore
import com.ffsensitivity.app.data.QuizUiPhase
import com.ffsensitivity.app.data.SecondChanceAdConfig
import com.ffsensitivity.app.data.SecondChanceAdStore
import kotlinx.coroutines.CoroutineScope

@Composable
internal fun DailyChallengeTodayQuizSection(
    context: Context,
    scope: CoroutineScope,
    snapshot: DailyChallengeStore.Snapshot,
    question: DailyQuizQuestion,
    quizDouble: Int,
    selectedOption: Int,
    busy: Boolean,
    quizAdPassTick: Int,
    secondChanceAdPassTick: Int,
    applyCachedQuiz: () -> Unit,
    onSelectOption: (Int) -> Unit,
    onQuestion: (DailyQuizQuestion) -> Unit,
    onQuizAdPassTick: () -> Unit,
    onSecondChancePassTick: () -> Unit,
    setBusy: (Boolean) -> Unit,
    runAction: (String, String, () -> DailyChallengeStore.Result) -> Unit,
    onError: (ChallengeUiError) -> Unit,
    onClearError: () -> Unit,
    onSnapshot: (DailyChallengeStore.Snapshot) -> Unit
) {
    val quizReady = quizQuestionReady(question.id)
    val quizOptions = remember(question) { question.options }
    val quizCanSubmit = (
        snapshot.quizPhase == QuizUiPhase.AVAILABLE ||
            snapshot.quizPhase == QuizUiPhase.OPEN
        ) &&
        quizReady &&
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
            if (!quizReady) return@DailyChallengeQuizCard
            if (
                snapshot.quizPhase != QuizUiPhase.AVAILABLE &&
                snapshot.quizPhase != QuizUiPhase.OPEN
            ) {
                return@DailyChallengeQuizCard
            }
            if (!busy) {
                onClearError()
                onSelectOption(it)
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
            !quizReady -> "Loading quiz…"
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
                    setBusy = setBusy,
                    onClearError = onClearError,
                    onError = onError,
                    onQuestion = { q ->
                        onQuestion(q)
                        onSelectOption(-1)
                    },
                    onSnapshot = onSnapshot,
                    onPassTick = onSecondChancePassTick
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
                applyCachedQuiz()
                val questionId = cachedReadyQuiz()?.id ?: question.id
                if (!quizQuestionReady(questionId)) {
                    onError(
                        ChallengeUiError(
                            code = "CHALLENGE_QUIZ_NOT_READY",
                            title = "Quiz still loading",
                            message = "Wait for today’s question to load, or tap Retry.",
                            retryKind = ChallengeRetryKind.REFRESH_SNAPSHOT
                        )
                    )
                    return
                }
                runAction("CHALLENGE_QUIZ_FAILED", "Quiz submit failed") {
                    DailyChallengeStore.submitQuiz(context, questionId, selectedOption)
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
            setBusy(true)
            QuizInterstitialAds.show(
                activity = activity,
                onCompleted = {
                    QuizAdStore.markShown(context)
                    onQuizAdPassTick()
                    setBusy(false)
                    doSubmit()
                },
                onNotCompleted = { message ->
                    setBusy(false)
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
}
