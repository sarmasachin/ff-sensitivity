package com.ffsensitivity.app.ads

import android.app.Activity
import android.content.Context
import com.ffsensitivity.app.BuildConfig
import com.ffsensitivity.app.util.AppLog
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback

/**
 * Interstitial for Daily Check-in.
 * Check-in proceeds only after the ad is shown and dismissed (or free via remote cooldown).
 */
object CheckInInterstitialAds {
    @Volatile
    private var cached: InterstitialAd? = null

    @Volatile
    private var loading = false

    @Volatile
    private var pendingShow: PendingShow? = null

    private data class PendingShow(
        val activity: Activity,
        val onCompleted: () -> Unit,
        val onNotCompleted: (String) -> Unit,
        val incompleteMessage: String
    )

    fun preload(context: Context) {
        if (cached != null || loading) return
        loadIntoCache(context.applicationContext, presentPending = true)
    }

    private fun loadIntoCache(appCtx: Context, presentPending: Boolean) {
        loading = true
        InterstitialAd.load(
            appCtx,
            BuildConfig.ADMOB_INTERSTITIAL_CHECKIN,
            AdRequest.Builder().build(),
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: InterstitialAd) {
                    loading = false
                    val pending = pendingShow
                    if (presentPending && pending != null) {
                        pendingShow = null
                        present(
                            pending.activity,
                            ad,
                            pending.onCompleted,
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
                    AppLog.w("Check-in interstitial load failed: ${error.message}")
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

    fun show(
        activity: Activity,
        onCompleted: () -> Unit,
        onNotCompleted: (message: String) -> Unit,
        incompleteMessage: String = "Watch the ad to claim check-in."
    ) {
        val ready = cached
        if (ready != null) {
            cached = null
            present(activity, ready, onCompleted, onNotCompleted, incompleteMessage)
            return
        }
        if (loading) {
            pendingShow = PendingShow(activity, onCompleted, onNotCompleted, incompleteMessage)
            return
        }
        pendingShow = PendingShow(activity, onCompleted, onNotCompleted, incompleteMessage)
        loadIntoCache(activity.applicationContext, presentPending = true)
    }

    private fun present(
        activity: Activity,
        ad: InterstitialAd,
        onCompleted: () -> Unit,
        onNotCompleted: (message: String) -> Unit,
        incompleteMessage: String
    ) {
        var shown = false
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdShowedFullScreenContent() {
                shown = true
            }

            override fun onAdDismissedFullScreenContent() {
                preload(activity)
                activity.runOnUiThread {
                    if (shown) {
                        onCompleted()
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
        ad.show(activity)
    }
}
