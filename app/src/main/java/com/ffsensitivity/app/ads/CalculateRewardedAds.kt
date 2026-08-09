package com.ffsensitivity.app.ads

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import com.ffsensitivity.app.BuildConfig
import com.ffsensitivity.app.util.AppLog
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Shared rewarded unit for Calculate, DPI, Watch Ad Bonus, Second Chance.
 * Thread-safe load/show; reward↔dismiss order-safe.
 */
object CalculateRewardedAds {
    private val lock = Any()
    private val mainHandler = Handler(Looper.getMainLooper())

    @Volatile
    private var cached: RewardedAd? = null

    @Volatile
    private var loading = false

    @Volatile
    private var showing = false

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

    /** Cache only — never auto-present. */
    fun preload(context: Context) {
        synchronized(lock) {
            if (cached != null || loading || showing) return
            startLoadLocked(context.applicationContext)
        }
    }

    fun show(
        activity: Activity,
        onRewarded: () -> Unit,
        onNotCompleted: (message: String) -> Unit,
        incompleteMessage: String = "Watch the full ad to see your settings."
    ) {
        fun failBusy() {
            mainHandler.post {
                onNotCompleted("Please wait — an ad is already loading or showing.")
            }
        }
        synchronized(lock) {
            if (showing) {
                failBusy()
                return
            }
            // Do not steal another screen's in-flight request.
            if (pendingShow != null) {
                failBusy()
                return
            }
            val ready = cached
            if (ready != null) {
                cached = null
                showing = true
                present(activity, ready, onRewarded, onNotCompleted, incompleteMessage)
                return
            }
            pendingShow = PendingShow(activity, onRewarded, onNotCompleted, incompleteMessage)
            if (!loading) {
                startLoadLocked(activity.applicationContext)
            }
        }
    }

    private fun startLoadLocked(appCtx: Context) {
        loading = true
        RewardedAd.load(
            appCtx,
            BuildConfig.ADMOB_REWARDED_CALCULATE,
            AdRequest.Builder().build(),
            object : RewardedAdLoadCallback() {
                override fun onAdLoaded(ad: RewardedAd) {
                    val toPresent: PendingShow?
                    synchronized(lock) {
                        loading = false
                        val pending = pendingShow
                        if (pending != null) {
                            pendingShow = null
                            showing = true
                            toPresent = pending
                        } else {
                            cached = ad
                            toPresent = null
                        }
                    }
                    if (toPresent != null) {
                        present(
                            toPresent.activity,
                            ad,
                            toPresent.onRewarded,
                            toPresent.onNotCompleted,
                            toPresent.incompleteMessage
                        )
                    }
                }

                override fun onAdFailedToLoad(error: LoadAdError) {
                    AppLog.w(
                        "Rewarded load failed code=${error.code} domain=${error.domain}: ${error.message}"
                    )
                    val failed: PendingShow?
                    synchronized(lock) {
                        cached = null
                        loading = false
                        failed = pendingShow
                        pendingShow = null
                    }
                    failed?.let { p ->
                        mainHandler.post {
                            p.onNotCompleted(
                                "Ad couldn’t load (${error.code}). Check connection and try again."
                            )
                        }
                    }
                }
            }
        )
    }

    private fun present(
        activity: Activity,
        ad: RewardedAd,
        onRewarded: () -> Unit,
        onNotCompleted: (message: String) -> Unit,
        incompleteMessage: String
    ) {
        val earned = AtomicBoolean(false)
        val dismissed = AtomicBoolean(false)
        val finished = AtomicBoolean(false)
        val token = Any()

        fun clearShowing() {
            synchronized(lock) { showing = false }
        }

        fun finishOk() {
            if (!finished.compareAndSet(false, true)) return
            mainHandler.removeCallbacksAndMessages(token)
            clearShowing()
            preload(activity)
            onRewarded()
        }

        fun finishFail(message: String) {
            if (!finished.compareAndSet(false, true)) return
            mainHandler.removeCallbacksAndMessages(token)
            clearShowing()
            preload(activity)
            onNotCompleted(message)
        }

        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() {
                dismissed.set(true)
                mainHandler.post {
                    if (earned.get()) {
                        finishOk()
                    } else {
                        // Reward callback can arrive slightly after dismiss on some devices.
                        mainHandler.postAtTime(
                            {
                                if (earned.get()) finishOk() else finishFail(incompleteMessage)
                            },
                            token,
                            SystemClock.uptimeMillis() + 400L
                        )
                    }
                }
            }

            override fun onAdFailedToShowFullScreenContent(error: AdError) {
                AppLog.w("Rewarded show failed code=${error.code}: ${error.message}")
                mainHandler.post {
                    finishFail("Couldn’t show the ad (${error.code}). Try again.")
                }
            }
        }

        try {
            ad.show(activity) {
                earned.set(true)
                mainHandler.post {
                    if (dismissed.get()) finishOk()
                }
            }
        } catch (t: Throwable) {
            AppLog.e("Rewarded ad.show crashed", t)
            mainHandler.post {
                finishFail("Couldn’t show the ad. Try again.")
            }
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
