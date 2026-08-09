package com.ffsensitivity.app.ads

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import com.ffsensitivity.app.BuildConfig
import com.ffsensitivity.app.util.AppLog
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback

/**
 * Rewarded ad for Calculate Best Pro Settings.
 * Results open only after reward earned AND the ad fully dismisses.
 */
object CalculateRewardedAds {
    @Volatile
    private var cached: RewardedAd? = null

    @Volatile
    private var loading = false

    @Volatile
    private var pendingShow: PendingShow? = null

    private data class PendingShow(
        val activity: Activity,
        val onRewarded: () -> Unit,
        val onNotCompleted: (String) -> Unit,
        val incompleteMessage: String
    )

    fun initialize(context: Context) {
        runCatching {
            MobileAds.initialize(context.applicationContext) {}
        }.onFailure { AppLog.e("MobileAds init failed", it) }
    }

    fun preload(context: Context) {
        if (cached != null || loading) return
        loadIntoCache(context.applicationContext, presentPending = true)
    }

    private fun loadIntoCache(appCtx: Context, presentPending: Boolean) {
        loading = true
        RewardedAd.load(
            appCtx,
            BuildConfig.ADMOB_REWARDED_CALCULATE,
            AdRequest.Builder().build(),
            object : RewardedAdLoadCallback() {
                override fun onAdLoaded(ad: RewardedAd) {
                    loading = false
                    val pending = pendingShow
                    if (presentPending && pending != null) {
                        pendingShow = null
                        present(
                            pending.activity,
                            ad,
                            pending.onRewarded,
                            pending.onNotCompleted,
                            pending.incompleteMessage
                        )
                    } else {
                        cached = ad
                    }
                }

                override fun onAdFailedToLoad(error: LoadAdError) {
                    cached = null
                    loading = false
                    AppLog.w("Calculate rewarded load failed: ${error.message}")
                    val pending = pendingShow
                    pendingShow = null
                    pending?.let { p ->
                        p.activity.runOnUiThread {
                            p.onNotCompleted("Ad couldn’t load. Check connection and try again.")
                        }
                    }
                }
            }
        )
    }

    /**
     * Shows rewarded ad.
     * [onRewarded] only after user earns reward AND closes the ad.
     * Early close / fail → [onNotCompleted] (no results).
     */
    fun show(
        activity: Activity,
        onRewarded: () -> Unit,
        onNotCompleted: (message: String) -> Unit,
        incompleteMessage: String = "Watch the full ad to see your settings."
    ) {
        val ready = cached
        if (ready != null) {
            cached = null
            present(activity, ready, onRewarded, onNotCompleted, incompleteMessage)
            return
        }
        if (loading) {
            pendingShow = PendingShow(activity, onRewarded, onNotCompleted, incompleteMessage)
            return
        }
        pendingShow = PendingShow(activity, onRewarded, onNotCompleted, incompleteMessage)
        loadIntoCache(activity.applicationContext, presentPending = true)
    }

    private fun present(
        activity: Activity,
        ad: RewardedAd,
        onRewarded: () -> Unit,
        onNotCompleted: (message: String) -> Unit,
        incompleteMessage: String
    ) {
        var earned = false
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() {
                preload(activity)
                activity.runOnUiThread {
                    if (earned) {
                        onRewarded()
                    } else {
                        onNotCompleted(incompleteMessage)
                    }
                }
            }

            override fun onAdFailedToShowFullScreenContent(error: AdError) {
                preload(activity)
                activity.runOnUiThread {
                    onNotCompleted("Couldn’t show the ad. Try again.")
                }
            }
        }
        // Reward marks completion; results open only on dismiss after earn.
        ad.show(activity) { _ ->
            earned = true
        }
    }
}

fun Context.findActivity(): Activity? {
    var ctx: Context = this
    while (ctx is ContextWrapper) {
        if (ctx is Activity) return ctx
        ctx = ctx.baseContext
    }
    return null
}
