package com.ffsensitivity.app.ads

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.os.Handler
import android.os.Looper
import com.ffsensitivity.app.BuildConfig
import com.ffsensitivity.app.util.AppLog
import com.google.android.gms.ads.MobileAds

/**
 * Rewarded ads for Calculate / DPI / Premium unlock / Ad Bonus / Second Chance.
 * **Per-slot AdMob unit + cache** so placements do not share fill or steal preload.
 * Debug: after NO_FILL retries, grants reward so local testing is not blocked.
 */
object CalculateRewardedAds {
    enum class Slot {
        CALCULATE,
        DPI,
        PREMIUM,
        AD_BONUS,
        SECOND_CHANCE
    }

    private val lock = Any()
    private val mainHandler = Handler(Looper.getMainLooper())

    @Volatile
    private var sdkReady = false

    @Volatile
    private var sdkStarting = false

    @Volatile
    private var globalShowing = false

    private var appCtx: Context? = null
    private val readyWaiters = ArrayList<() -> Unit>()

    private fun unitIdFor(slot: Slot): String = when (slot) {
        Slot.CALCULATE -> BuildConfig.ADMOB_REWARDED_CALCULATE
        Slot.DPI -> BuildConfig.ADMOB_REWARDED_DPI
        Slot.PREMIUM -> BuildConfig.ADMOB_REWARDED_PREMIUM
        Slot.AD_BONUS -> BuildConfig.ADMOB_REWARDED_AD_BONUS
        Slot.SECOND_CHANCE -> BuildConfig.ADMOB_REWARDED_SECOND_CHANCE
    }

    private val slots: Map<Slot, RewardedAdSlot> by lazy {
        Slot.entries.associateWith { slot ->
            RewardedAdSlot(
                slotName = slot.name,
                unitId = unitIdFor(slot),
                mainHandler = mainHandler,
                whenSdkReady = ::whenSdkReady,
                isGlobalShowing = { synchronized(lock) { globalShowing } },
                setGlobalShowing = { v -> synchronized(lock) { globalShowing = v } },
                onNeedInitialize = { ctx -> initialize(ctx) }
            )
        }
    }

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
                AppLog.w("MobileAds initialized (rewarded per-slot units)")
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

    private fun slotOf(slot: Slot): RewardedAdSlot = slots.getValue(slot)

    /** Cache only for [slot] — never auto-present. */
    fun preload(context: Context, slot: Slot) {
        slotOf(slot).preload(context)
    }

    fun show(
        activity: Activity,
        slot: Slot,
        onRewarded: () -> Unit,
        onNotCompleted: (message: String) -> Unit,
        incompleteMessage: String = "Watch the full ad to see your settings."
    ) {
        slotOf(slot).show(activity, onRewarded, onNotCompleted, incompleteMessage)
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
