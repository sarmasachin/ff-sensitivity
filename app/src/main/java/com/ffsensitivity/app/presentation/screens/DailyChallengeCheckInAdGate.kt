package com.ffsensitivity.app.presentation.screens

import android.app.Activity
import android.content.Context
import com.ffsensitivity.app.ads.CheckInInterstitialAds
import com.ffsensitivity.app.data.CheckInAdConfig
import com.ffsensitivity.app.data.CheckInAdStore
import com.ffsensitivity.app.data.DailyChallengeStore
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.SafeOps
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Daily Check-in claim after interstitial — respects remote ads.checkIn. */
object DailyChallengeCheckInAdGate {
    fun run(
        context: Context,
        activity: Activity?,
        busy: Boolean,
        scope: CoroutineScope,
        setBusy: (Boolean) -> Unit,
        onClearError: () -> Unit,
        onError: (ChallengeUiError) -> Unit,
        onSnapshot: (DailyChallengeStore.Snapshot) -> Unit,
        onPassTick: () -> Unit,
        runClaimWithoutAd: () -> Unit
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
        if (!CheckInAdStore.needsAd(context)) {
            runClaimWithoutAd()
            return
        }
        if (activity == null) {
            onError(
                ChallengeUiError(
                    code = "CHALLENGE_CHECKIN_AD_NO_ACTIVITY",
                    title = "Couldn’t show ad",
                    message = "Restart the app and try again.",
                    retryKind = ChallengeRetryKind.CHECK_IN
                )
            )
            return
        }
        onClearError()
        setBusy(true)
        CheckInInterstitialAds.show(
            activity = activity,
            onCompleted = {
                CheckInAdStore.markShown(context)
                onPassTick()
                scope.launch {
                    val result = runCatching {
                        withContext(Dispatchers.IO) {
                            DailyChallengeStore.claimCheckIn(context)
                        }
                    }.getOrElse {
                        AppLog.e("Check-in after interstitial failed", it)
                        null
                    }
                    setBusy(false)
                    when {
                        result == null -> onError(
                            ChallengeUiError(
                                code = "CHALLENGE_CHECKIN_FAILED",
                                title = "Check-in failed",
                                message = "Something went wrong. Try again.",
                                retryKind = ChallengeRetryKind.CHECK_IN
                            )
                        )
                        result.ok -> {
                            onSnapshot(result.snapshot)
                            SafeOps.toast(context, result.message)
                        }
                        else -> {
                            onSnapshot(result.snapshot)
                            onError(
                                ChallengeUiError(
                                    code = "CHALLENGE_CHECKIN_FAILED",
                                    title = "Check-in failed",
                                    message = result.message.ifBlank {
                                        "Action was declined."
                                    },
                                    retryKind = ChallengeRetryKind.CHECK_IN
                                )
                            )
                        }
                    }
                }
            },
            onNotCompleted = { message ->
                setBusy(false)
                onError(
                    ChallengeUiError(
                        code = "CHALLENGE_CHECKIN_AD_REQUIRED",
                        title = "Ad required",
                        message = message,
                        retryKind = ChallengeRetryKind.CHECK_IN
                    )
                )
            },
            incompleteMessage = CheckInAdConfig.incompleteMessage
        )
    }
}
