package com.ffsensitivity.app.data.remote

import android.os.SystemClock

data class ScreenVisit(
    val screen: String,
    val durationMs: Long
)

/**
 * Monotonic foreground-only screen timer. Route changes and app backgrounding
 * close a visit exactly once; wall-clock changes cannot inflate duration.
 */
class ScreenSessionTracker {
    private var currentScreen: String? = null
    private var startedAtMs: Long? = null
    private var foreground = false

    @Synchronized
    fun onScreenChanged(screen: String?): ScreenVisit? {
        if (screen == currentScreen) return null
        val now = SystemClock.elapsedRealtime()
        val ended = finish(now)
        currentScreen = screen
        if (foreground && screen != null) startedAtMs = now
        return ended
    }

    @Synchronized
    fun onForeground() {
        if (foreground) return
        foreground = true
        if (currentScreen != null) startedAtMs = SystemClock.elapsedRealtime()
    }

    @Synchronized
    fun onBackground(): ScreenVisit? {
        if (!foreground) return null
        val ended = finish(SystemClock.elapsedRealtime())
        foreground = false
        return ended
    }

    @Synchronized
    fun checkpoint(): ScreenVisit? {
        if (!foreground) return null
        val now = SystemClock.elapsedRealtime()
        val ended = finish(now)
        if (currentScreen != null) startedAtMs = now
        return ended
    }

    private fun finish(now: Long): ScreenVisit? {
        val screen = currentScreen ?: return null
        val started = startedAtMs ?: return null
        startedAtMs = null
        return ScreenVisit(screen, (now - started).coerceAtLeast(0))
    }
}
