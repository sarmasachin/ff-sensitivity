package com.ffsensitivity.app.ads

import android.app.Activity
import android.content.Context
import android.os.Handler
import android.os.SystemClock
import com.ffsensitivity.app.BuildConfig
import com.ffsensitivity.app.util.AppLog
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import java.util.concurrent.atomic.AtomicBoolean

/**
 * One rewarded placement cache (Calculate / DPI / Premium / AdBonus / SecondChance).
 * Own AdMob [unitId] + independent preload so screens do not steal each other's ad.
 */
internal class RewardedAdSlot(
    private val slotName: String,
    private val unitId: String,
    private val mainHandler: Handler,
    private val whenSdkReady: (action: () -> Unit) -> Unit,
    private val isGlobalShowing: () -> Boolean,
    private val setGlobalShowing: (Boolean) -> Unit,
    private val onNeedInitialize: (Context) -> Unit
) {
    private val lock = Any()

    @Volatile
    private var cached: RewardedAd? = null

    @Volatile
    private var loading = false

    @Volatile
    private var showing = false

    @Volatile
    private var loadAttempts = 0

    @Volatile
    private var pendingShow: PendingShow? = null

    private data class PendingShow(
        val activity: Activity,
        val onRewarded: () -> Unit,
        val onNotCompleted: (String) -> Unit,
        val incompleteMessage: String
    )

    /** Cache only — never auto-present. */
    fun preload(context: Context) {
        val app = context.applicationContext
        synchronized(lock) {
            if (cached != null || loading || showing) return
        }
        onNeedInitialize(app)
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
        incompleteMessage: String
    ) {
        fun failBusy() {
            mainHandler.post {
                onNotCompleted("Please wait — an ad is already playing.")
            }
        }
        val app = activity.applicationContext
        synchronized(lock) {
            if (showing || isGlobalShowing()) {
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
                setGlobalShowing(true)
                present(activity, ready, onRewarded, onNotCompleted, incompleteMessage)
                return
            }
            pendingShow = PendingShow(activity, onRewarded, onNotCompleted, incompleteMessage)
            loadAttempts = 0
        }
        onNeedInitialize(app)
        whenSdkReady {
            val raceBlocked: PendingShow?
            synchronized(lock) {
                if (showing || isGlobalShowing()) {
                    // Race: another fullscreen started after we queued pendingShow.
                    raceBlocked = pendingShow
                    pendingShow = null
                } else if (cached != null && pendingShow != null) {
                    val p = pendingShow!!
                    val ad = cached!!
                    cached = null
                    pendingShow = null
                    showing = true
                    setGlobalShowing(true)
                    raceBlocked = null
                    present(p.activity, ad, p.onRewarded, p.onNotCompleted, p.incompleteMessage)
                    return@whenSdkReady
                } else {
                    raceBlocked = null
                    if (!loading && pendingShow != null) {
                        startLoadLocked(app)
                    }
                }
            }
            if (raceBlocked != null) {
                mainHandler.post {
                    raceBlocked.onNotCompleted(
                        "Please wait — an ad is already playing."
                    )
                }
            }
        }
    }

    private fun startLoadLocked(appCtx: Context) {
        loading = true
        loadAttempts += 1
        val attempt = loadAttempts
        mainHandler.post {
            RewardedAd.load(
                appCtx,
                unitId,
                AdRequest.Builder().build(),
                object : RewardedAdLoadCallback() {
                    override fun onAdLoaded(ad: RewardedAd) {
                        val toPresent: PendingShow?
                        val blocked: PendingShow?
                        synchronized(lock) {
                            loading = false
                            loadAttempts = 0
                            val pending = pendingShow
                            if (pending != null) {
                                if (isGlobalShowing()) {
                                    // Another fullscreen is up — cache for next tap; unblock waiter.
                                    cached = ad
                                    pendingShow = null
                                    toPresent = null
                                    blocked = pending
                                } else {
                                    pendingShow = null
                                    showing = true
                                    setGlobalShowing(true)
                                    toPresent = pending
                                    blocked = null
                                }
                            } else {
                                cached = ad
                                toPresent = null
                                blocked = null
                            }
                        }
                        AppLog.w("Rewarded loaded slot=$slotName")
                        if (toPresent != null) {
                            present(
                                toPresent.activity,
                                ad,
                                toPresent.onRewarded,
                                toPresent.onNotCompleted,
                                toPresent.incompleteMessage
                            )
                        } else if (blocked != null) {
                            mainHandler.post {
                                blocked.onNotCompleted(
                                    "Please wait — an ad is already playing."
                                )
                            }
                        }
                    }

                    override fun onAdFailedToLoad(error: LoadAdError) {
                        AppLog.w(
                            "Rewarded load failed slot=$slotName attempt=$attempt " +
                                "code=${error.code} domain=${error.domain} unit=$unitId: ${error.message}"
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
                                if (BuildConfig.DEBUG && noFill) {
                                    AppLog.w(
                                        "DEBUG NO_FILL slot=$slotName after $attempt tries — granting reward"
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
        return when (error.code) {
            AdRequest.ERROR_CODE_NETWORK_ERROR ->
                "No internet connection. Turn on mobile data or Wi‑Fi and try again."
            AdRequest.ERROR_CODE_NO_FILL ->
                "No ad is available right now. Please try again in a moment."
            AdRequest.ERROR_CODE_INVALID_REQUEST ->
                "Couldn’t load the ad. Please try again."
            AdRequest.ERROR_CODE_APP_ID_MISSING ->
                "Ads aren’t ready on this build. Please update the app."
            else ->
                "Couldn’t load the ad. Check your connection and try again."
        }
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
            synchronized(lock) {
                showing = false
                setGlobalShowing(false)
            }
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
                AppLog.w(
                    "Rewarded show failed slot=$slotName code=${error.code}: ${error.message}"
                )
                mainHandler.post {
                    finishFail("Couldn’t show the ad. Please try again.")
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
            AppLog.e("Rewarded ad.show crashed slot=$slotName", t)
            mainHandler.post {
                finishFail("Couldn’t show the ad. Try again.")
            }
        }
    }
}
