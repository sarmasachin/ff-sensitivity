package com.ffsensitivity.app.data

import android.content.Context

// --- Start: Copy CMS live wire (Sachin) ---
/** Tracks home opens vs Copy rate.minSessions gate. */
class RatePromptStore(context: Context) {
    private val prefs =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun sessionCount(): Int = prefs.getInt(KEY_SESSIONS, 0).coerceAtLeast(0)

    fun bumpSession() {
        prefs.edit().putInt(KEY_SESSIONS, sessionCount() + 1).apply()
    }

    fun dismissed(): Boolean = prefs.getBoolean(KEY_DISMISSED, false)

    fun dismiss() {
        prefs.edit().putBoolean(KEY_DISMISSED, true).apply()
    }

    fun markRated() {
        prefs.edit().putBoolean(KEY_DISMISSED, true).apply()
    }

    companion object {
        private const val PREFS = "ff_rate_prompt_v1"
        private const val KEY_SESSIONS = "sessions"
        private const val KEY_DISMISSED = "dismissed"
    }
}
// --- End: Copy CMS live wire (Sachin) ---
