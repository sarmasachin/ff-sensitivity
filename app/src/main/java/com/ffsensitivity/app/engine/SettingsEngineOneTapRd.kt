package com.ffsensitivity.app.engine

import kotlin.math.roundToInt

/**
 * One Tap Premium Red Dot math — Hz-tier base/min lift (variant B) + residual trim.
 * Kept separate so [SettingsEngineOneTap] stays ≤400 lines.
 * Classic / Best / Pro Max untouched.
 */
internal object SettingsEngineOneTapRd {

    const val RD_SOFT_MAX = 195
    /** Absolute floor / mid-high Hz default min lift. */
    const val RD_MIN_LIFT = 10
    const val RD_RATIO = 1.06

    /**
     * Preferred Red Dot − General gap by panel refresh (variant B).
     * ≤60 → stronger headshot track; ≥121/144 → calmer (less overflick).
     */
    fun rdBaseLift(panelHz: Int): Int = when {
        panelHz <= 60 -> 14
        panelHz <= 90 -> 12
        panelHz <= 120 -> 11
        else -> 10
    }

    /**
     * Hard floor Red Dot − General by panel refresh.
     * 60Hz phones keep a stricter +12 floor; mid/high Hz keep +10.
     */
    fun rdMinLift(panelHz: Int): Int = when {
        panelHz <= 60 -> 12
        else -> RD_MIN_LIFT
    }

    /** High refresh → calmer Red Dot tracking (headshot, not Free Look). */
    fun redDotPanelTrim(hz: Int): Int = when {
        hz >= 144 -> -4
        hz >= 120 -> -3
        hz >= 90 -> -2
        else -> 0
    }

    /** Low touch sampling → slight Red Dot boost; very high TSR → slight calm. */
    fun redDotTouchTrim(hz: Int?): Int = when {
        hz == null -> 0
        hz < 120 -> 4
        hz < 180 -> 3
        hz <= 240 -> 0
        hz >= 360 -> -2
        else -> -1
    }

    /**
     * Ensures Red Dot stays clearly above General for headshot tracking.
     * [panelHz] selects Hz-tier base/min lift; [rdExtraTrim] = residual Hz/TSR trim.
     */
    fun headshotGeneralAndRedDot(
        generalIn: Int,
        rdExtraTrim: Int = 0,
        panelHz: Int = 90
    ): Pair<Int, Int> {
        val minLift = rdMinLift(panelHz)
        val baseLift = rdBaseLift(panelHz)
        var general = generalIn.coerceIn(50, 200)
        val generalCap = RD_SOFT_MAX - minLift
        if (general > generalCap) {
            general = generalCap
        }
        val fromLift = general + baseLift
        val fromRatio = (general * RD_RATIO).roundToInt()
        var redDot = maxOf(fromLift, fromRatio, general + minLift)
        redDot += rdExtraTrim
        redDot = redDot.coerceIn(40, RD_SOFT_MAX)
        if (redDot < general + minLift) {
            general = (redDot - minLift).coerceAtLeast(50)
            redDot = maxOf(redDot, general + minLift).coerceAtMost(RD_SOFT_MAX)
            if (redDot < general + minLift) {
                general = (redDot - minLift).coerceAtLeast(50)
            }
        }
        check(redDot >= general + minLift) {
            "One Tap headshot invariant broken: RD=$redDot General=$general " +
                "trim=$rdExtraTrim hz=$panelHz min=$minLift base=$baseLift"
        }
        return general to redDot
    }
}
