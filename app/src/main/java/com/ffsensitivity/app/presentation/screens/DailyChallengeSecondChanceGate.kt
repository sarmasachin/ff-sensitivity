package com.ffsensitivity.app.presentation.screens

import android.app.Activity
import android.content.Context
import com.ffsensitivity.app.ads.CalculateRewardedAds
import com.ffsensitivity.app.data.DailyChallengeStore
import com.ffsensitivity.app.data.DailyQuizQuestion
import com.ffsensitivity.app.data.SecondChanceAdConfig
import com.ffsensitivity.app.data.SecondChanceAdStore
import com.ffsensitivity.app.data.remote.ChallengeRepository
import com.ffsensitivity.app.data.remote.userMessage
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.SafeOps
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Quiz second-chance unlock after lock — respects remote ads.secondChance.
 */
object DailyChallengeSecondChanceGate {
    fun run(
        context: Context,
        activity: Activity?,
        busy: Boolean,
        scope: CoroutineScope,
        setBusy: (Boolean) -> Unit,
        onClearError: () -> Unit,
        onError: (ChallengeUiError) -> Unit,
        onQuestion: (DailyQuizQuestion) -> Unit,
        onSnapshot: (DailyChallengeStore.Snapshot) -> Unit,
        onPassTick: () -> Unit
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

        fun unlock() {
            setBusy(true)
            scope.launch {
                val unlocked = runCatching {
                    withContext(Dispatchers.IO) {
                        ChallengeRepository.unlockSecondChance(context)
                    }
                }.getOrElse {
                    AppLog.e("Second chance unlock failed", it)
                    Result.failure(it)
                }
                setBusy(false)
                unlocked.fold(
                    onSuccess = { q ->
                        onQuestion(q)
                        onSnapshot(DailyChallengeStore.snapshot(context))
                        SafeOps.toast(context, "New question unlocked")
                    },
                    onFailure = { err ->
                        onError(
                            ChallengeUiError(
                                code = "CHALLENGE_SECOND_CHANCE_FAILED",
                                title = "Unlock failed",
                                message = err.userMessage("Couldn’t unlock new question. Please try again."),
                                retryKind = ChallengeRetryKind.QUIZ
                            )
                        )
                    }
                )
            }
        }

        if (!SecondChanceAdStore.needsAd(context)) {
            onClearError()
            unlock()
            return
        }
        if (activity == null) {
            onError(
                ChallengeUiError(
                    code = "CHALLENGE_QUIZ_AD_NO_ACTIVITY",
                    title = "Ad unavailable",
                    message = "Couldn’t open the ad right now. Please try again.",
                    retryKind = ChallengeRetryKind.QUIZ
                )
            )
            return
        }
        onClearError()
        setBusy(true)
        CalculateRewardedAds.show(
            activity = activity,
            slot = CalculateRewardedAds.Slot.SECOND_CHANCE,
            onRewarded = {
                SecondChanceAdStore.markRewarded(context)
                onPassTick()
                unlock()
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
            incompleteMessage = SecondChanceAdConfig.incompleteMessage
        )
    }
}
