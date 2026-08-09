package com.ffsensitivity.app.presentation.screens

import android.app.Activity
import android.content.Context
import com.ffsensitivity.app.ads.CalculateRewardedAds
import com.ffsensitivity.app.data.AdBonusAdConfig
import com.ffsensitivity.app.data.DailyChallengeStore
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.SafeOps
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Watch Ad Bonus claim after rewarded ad — uses remote ads.adBonus copy. */
object DailyChallengeAdBonusGate {
    fun run(
        context: Context,
        activity: Activity?,
        busy: Boolean,
        scope: CoroutineScope,
        setBusy: (Boolean) -> Unit,
        onClearError: () -> Unit,
        onError: (ChallengeUiError) -> Unit,
        onSnapshot: (DailyChallengeStore.Snapshot) -> Unit
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

        fun claim() {
            setBusy(true)
            scope.launch {
                val result = runCatching {
                    withContext(Dispatchers.IO) {
                        DailyChallengeStore.claimAdBonus(context)
                    }
                }.getOrElse {
                    AppLog.e("Ad bonus claim failed", it)
                    null
                }
                setBusy(false)
                when {
                    result == null -> onError(
                        ChallengeUiError(
                            code = "CHALLENGE_AD_FAILED",
                            title = "Ad bonus failed",
                            message = "Something went wrong. Try again.",
                            retryKind = ChallengeRetryKind.AD
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
                                code = "CHALLENGE_AD_FAILED",
                                title = "Ad bonus failed",
                                message = result.message.ifBlank {
                                    "Action was declined."
                                },
                                retryKind = ChallengeRetryKind.AD
                            )
                        )
                    }
                }
            }
        }

        // Admin Off → claim without rewarded ad (same pattern as second chance / calculate).
        if (!AdBonusAdConfig.enabled) {
            onClearError()
            claim()
            return
        }
        if (activity == null) {
            onError(
                ChallengeUiError(
                    code = "CHALLENGE_AD_NO_ACTIVITY",
                    title = "Couldn’t show ad",
                    message = "Restart the app and try again.",
                    retryKind = ChallengeRetryKind.AD
                )
            )
            return
        }
        onClearError()
        setBusy(true)
        CalculateRewardedAds.show(
            activity = activity,
            onRewarded = { claim() },
            onNotCompleted = { message ->
                setBusy(false)
                onError(
                    ChallengeUiError(
                        code = "CHALLENGE_AD_REQUIRED",
                        title = "Ad required",
                        message = message,
                        retryKind = ChallengeRetryKind.AD
                    )
                )
            },
            incompleteMessage = AdBonusAdConfig.incompleteMessage
        )
    }
}
