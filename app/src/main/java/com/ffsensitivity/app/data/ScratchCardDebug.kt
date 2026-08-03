package com.ffsensitivity.app.data

import com.ffsensitivity.app.BuildConfig

/**
 * QA-only scratch unlock for first 3 milestones (Day 7 / 15 / 20).
 * Live safety: only works when BOTH are true —
 * 1) debug build (BuildConfig.DEBUG)
 * 2) this flag
 * Before Play Store release: set [UNLOCK_FIRST_THREE_FOR_QA] = false
 * (release builds already ignore it even if left true).
 */
object ScratchCardDebug {
    const val UNLOCK_FIRST_THREE_FOR_QA = true

    val forceUnlockDays: Set<Int>
        get() = if (BuildConfig.DEBUG && UNLOCK_FIRST_THREE_FOR_QA) {
            setOf(7, 15, 20)
        } else {
            emptySet()
        }

    fun isForceUnlocked(days: Int): Boolean = days in forceUnlockDays
}
