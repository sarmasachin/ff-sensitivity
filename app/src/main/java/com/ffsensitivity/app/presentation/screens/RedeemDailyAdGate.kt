package com.ffsensitivity.app.presentation.screens

import android.app.Activity
import android.content.Context
import com.ffsensitivity.app.ads.RedeemDailyInterstitialAds
import com.ffsensitivity.app.data.RedeemDailyAdConfig
import com.ffsensitivity.app.data.RedeemDailyAdStore

/**
 * Gate before Daily redeem scratch open — respects remote ads.redeemDaily.
 */
internal object RedeemDailyAdGate {
    fun run(
        context: Context,
        activity: Activity?,
        busy: Boolean,
        setBusy: (Boolean) -> Unit,
        onClearError: () -> Unit,
        onError: (RedeemUiError) -> Unit,
        onPassTick: () -> Unit,
        retryItemId: String,
        onProceed: () -> Unit
    ) {
        if (busy) {
            onError(
                RedeemUiError(
                    code = "REDEEM_BUSY",
                    title = "Please wait",
                    message = "Another action is already in progress."
                )
            )
            return
        }
        if (!RedeemDailyAdStore.needsAd(context)) {
            onProceed()
            return
        }
        if (activity == null) {
            onError(
                RedeemUiError(
                    code = "REDEEM_AD_NO_ACTIVITY",
                    title = "Couldn’t show ad",
                    message = "Restart the app and try again.",
                    retryKind = RedeemRetryKind.SCRATCH,
                    retryItemId = retryItemId
                )
            )
            return
        }
        onClearError()
        setBusy(true)
        RedeemDailyInterstitialAds.show(
            activity = activity,
            onCompleted = {
                RedeemDailyAdStore.markShown(context)
                onPassTick()
                setBusy(false)
                onProceed()
            },
            onNotCompleted = { message ->
                setBusy(false)
                onError(
                    RedeemUiError(
                        code = "REDEEM_AD_REQUIRED",
                        title = "Ad required",
                        message = message,
                        retryKind = RedeemRetryKind.SCRATCH,
                        retryItemId = retryItemId
                    )
                )
            },
            incompleteMessage = RedeemDailyAdConfig.incompleteMessage
        )
    }
}