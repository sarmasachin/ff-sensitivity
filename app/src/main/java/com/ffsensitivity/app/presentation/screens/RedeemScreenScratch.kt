package com.ffsensitivity.app.presentation.screens

import android.content.Context
import com.ffsensitivity.app.ads.RedeemDailyInterstitialAds
import com.ffsensitivity.app.ads.findActivity
import com.ffsensitivity.app.data.RedeemCodeItem
import com.ffsensitivity.app.data.RedeemDailyAdStore
import com.ffsensitivity.app.data.remote.ApiException
import com.ffsensitivity.app.data.remote.RedeemRepository
import com.ffsensitivity.app.util.AppLog
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Scratch open + ad gate (keeps RedeemScreen under line budget). */
internal object RedeemScreenScratch {
    fun start(
        context: Context,
        scope: CoroutineScope,
        item: RedeemCodeItem,
        alreadyUnlocked: Boolean,
        isBusy: Boolean,
        setBusy: (Boolean) -> Unit,
        showBusy: () -> Unit,
        clearError: () -> Unit,
        showError: (
            code: String,
            title: String,
            message: String,
            retryKind: RedeemRetryKind?,
            retryItemId: String?
        ) -> Unit,
        onReady: (RedeemCodeItem) -> Unit
    ) {
        if (isBusy) {
            showBusy()
            return
        }
        clearError()
        setBusy(true)
        scope.launch {
            val check = withContext(Dispatchers.IO) {
                RedeemRepository.precheckScratch(
                    context = context,
                    item = item,
                    alreadyUnlockedLocally = alreadyUnlocked
                )
            }
            setBusy(false)
            check.fold(
                onSuccess = { onReady(item) },
                onFailure = { err ->
                    AppLog.e("Redeem scratch precheck failed", err)
                    val message = when (err) {
                        is ApiException -> err.message
                        else -> "Couldn't open scratch card. Try again."
                    }
                    showError(
                        (err as? ApiException)?.code ?: "REDEEM_SCRATCH_OPEN_FAILED",
                        "Couldn’t open scratch card",
                        message,
                        RedeemRetryKind.SCRATCH,
                        item.id
                    )
                }
            )
        }
    }

    fun request(
        context: Context,
        scope: CoroutineScope,
        item: RedeemCodeItem,
        dailyTab: Boolean,
        alreadyUnlocked: Boolean,
        isBusy: Boolean,
        setBusy: (Boolean) -> Unit,
        showBusy: () -> Unit,
        clearError: () -> Unit,
        setActionError: (RedeemUiError) -> Unit,
        showError: (
            code: String,
            title: String,
            message: String,
            retryKind: RedeemRetryKind?,
            retryItemId: String?
        ) -> Unit,
        onPassTick: () -> Unit,
        onReady: (RedeemCodeItem) -> Unit
    ) {
        fun proceed(busyNow: Boolean) {
            start(
                context = context,
                scope = scope,
                item = item,
                alreadyUnlocked = alreadyUnlocked,
                isBusy = busyNow,
                setBusy = setBusy,
                showBusy = showBusy,
                clearError = clearError,
                showError = showError,
                onReady = onReady
            )
        }

        // Type B: ad only when server says needsAd (re-scratch / more coins).
        if (item.isScratchReward) {
            if (!item.needsAd) {
                proceed(isBusy)
                return
            }
            RedeemDailyAdGate.run(
                context = context,
                activity = context.findActivity(),
                busy = isBusy,
                setBusy = setBusy,
                onClearError = clearError,
                onError = setActionError,
                onPassTick = onPassTick,
                retryItemId = item.id,
                onProceed = {
                    setBusy(true)
                    scope.launch {
                        val unlock = withContext(Dispatchers.IO) {
                            RedeemRepository.unlockScratchAfterAd(context, item)
                        }
                        setBusy(false)
                        unlock.fold(
                            onSuccess = {
                                onPassTick()
                                proceed(busyNow = false)
                            },
                            onFailure = { err ->
                                AppLog.e("Scratch ad unlock failed", err)
                                setActionError(
                                    RedeemUiError(
                                        code = (err as? ApiException)?.code
                                            ?: "REDEEM_AD_UNLOCK_FAILED",
                                        title = "Couldn’t unlock scratch",
                                        message = when (err) {
                                            is ApiException -> err.message
                                            else -> "Watch the ad again to scratch for coins."
                                        },
                                        retryKind = RedeemRetryKind.SCRATCH,
                                        retryItemId = item.id
                                    )
                                )
                            }
                        )
                    }
                }
            )
            return
        }

        if (!dailyTab) {
            proceed(isBusy)
            return
        }
        RedeemDailyAdGate.run(
            context = context,
            activity = context.findActivity(),
            busy = isBusy,
            setBusy = setBusy,
            onClearError = clearError,
            onError = setActionError,
            onPassTick = onPassTick,
            retryItemId = item.id,
            onProceed = { proceed(busyNow = false) }
        )
    }

    fun preloadIfNeeded(context: Context, dailyTab: Boolean) {
        if (dailyTab && RedeemDailyAdStore.needsAd(context)) {
            RedeemDailyInterstitialAds.preload(context)
        }
    }
}
