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
 * Waits for MobileAds init, loads on main thread, retries on NO_FILL.
 * Debug: after NO_FILL retries, grants reward so local testing is not blocked.
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
    private var sdkReady = false

    @Volatile
    private var sdkStarting = false

    @Volatile
    private var loadAttempts = 0

    @Volatile
    private var pendingShow: PendingShow? = null

    private var appCtx: Context? = null
    private val readyWaiters = ArrayList<() -> Unit>()

    private data class PendingShow(
        val activity: Activity,
        val onRewarded: () -> Unit,
        val onNotCompleted: (String) -> Unit,
        val incompleteMessage: String
    )

    fun initialize(context: Context) {
        val app = context.applicationContext
        synchronized(lock) {
            appCtx = app
            if (sdkReady || sdkStarting) return
            sdkStarting = true
        }
        runCatching {
            MobileAds.initialize(app) {
                val waiters: List<() -> Unit>
                synchronized(lock) {
                    sdkReady = true
                    sdkStarting = false
                    waiters = readyWaiters.toList()
                    readyWaiters.clear()
                }
                AppLog.w("MobileAds initialized unit=${BuildConfig.ADMOB_REWARDED_CALCULATE}")
                waiters.forEach { action -> mainHandler.post(action) }
            }
        }.onFailure {
            synchronized(lock) {
                sdkStarting = false
            }
            AppLog.e("MobileAds init failed", it)
        }
    }

    private fun whenSdkReady(action: () -> Unit) {
        synchronized(lock) {
            if (sdkReady) {
                mainHandler.post(action)
                return
            }
            readyWaiters.add(action)
        }
        appCtx?.let { initialize(it) }
    }

    /** Cache only — never auto-present. */
    fun preload(context: Context) {
        val app = context.applicationContext
        synchronized(lock) {
            appCtx = app
            if (cached != null || loading || showing) return
        }
        initialize(app)
        whenSdkReady {
            synchronized(lock) {
                if (cached != null || loading || showing) return@whenSdkReady
                startLoadLocked(app)
            }
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
        val app = activity.applicationContext
        synchronized(lock) {
            appCtx = app
            if (showing) {
                failBusy()
                return
            }
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
            loadAttempts = 0
        }
        initialize(app)
        whenSdkReady {
            synchronized(lock) {
                if (showing) return@whenSdkReady
                if (cached != null && pendingShow != null) {
                    val p = pendingShow!!
                    val ad = cached!!
                    cached = null
                    pendingShow = null
                    showing = true
                    present(p.activity, ad, p.onRewarded, p.onNotCompleted, p.incompleteMessage)
                    return@whenSdkReady
                }
                if (!loading && pendingShow != null) {
                    startLoadLocked(app)
                }
            }
        }
    }

    private fun startLoadLocked(appCtx: Context) {
        loading = true
        loadAttempts += 1
        val attempt = loadAttempts
        val unitId = BuildConfig.ADMOB_REWARDED_CALCULATE
        // AdMob load must run on main thread.
        mainHandler.post {
            RewardedAd.load(
                appCtx,
                unitId,
                AdRequest.Builder().build(),
                object : RewardedAdLoadCallback() {
                    override fun onAdLoaded(ad: RewardedAd) {
                        val toPresent: PendingShow?
                        synchronized(lock) {
                            loading = false
                            loadAttempts = 0
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
                            "Rewarded load failed attempt=$attempt code=${error.code} " +
                                "domain=${error.domain} unit=$unitId: ${error.message}"
                        )
                        val noFill = error.code == AdRequest.ERROR_CODE_NO_FILL
                        val maxAttempts = if (noFill) 3 else 2
                        val retry: Boolean
                        synchronized(lock) {
                            loading = false
                            retry = pendingShow != null && attempt < maxAttempts
                        }
                        if (retry) {
                            val delayMs = if (noFill) 1600L else 900L
                            mainHandler.postDelayed({
                                synchronized(lock) {
                                    if (pendingShow != null && !loading && !showing) {
                                        startLoadLocked(appCtx)
                                    }
                                }
                            }, delayMs)
                            return
                        }
                        val failed: PendingShow?
                        synchronized(lock) {
                            cached = null
                            loading = false
                            loadAttempts = 0
                            failed = pendingShow
                            pendingShow = null
                        }
                        failed?.let { p ->
                            mainHandler.post {
                                // Google test inventory sometimes returns code 3 on real devices.
                                // Debug APK: unblock Sensitivity/DPI/Bonus flow after retries.
                                if (BuildConfig.DEBUG && noFill) {
                                    AppLog.w(
                                        "DEBUG NO_FILL after $attempt tries — granting reward"
                                    )
                                    p.onRewarded()
                                } else {
                                    p.onNotCompleted(humanLoadError(error))
                                }
                            }
                        }
                    }
                }
            )
        }
    }

    private fun humanLoadError(error: LoadAdError): String {
        val code = error.code
        val hint = when (code) {
            AdRequest.ERROR_CODE_NETWORK_ERROR ->
                "No network / AdMob blocked. Turn on mobile data or Wi‑Fi."
            AdRequest.ERROR_CODE_NO_FILL ->
                "No ad available right now. Try again in a moment."
            AdRequest.ERROR_CODE_INVALID_REQUEST ->
                "Invalid ad request. Reinstall the debug APK."
            AdRequest.ERROR_CODE_APP_ID_MISSING ->
                "AdMob App ID missing in the app build."
            else ->
                "Ad couldn’t load. Check connection and try again."
        }
        return "$hint (code $code)"
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
                    finishFail("Couldn’t show the ad (code ${error.code}). Try again.")
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
