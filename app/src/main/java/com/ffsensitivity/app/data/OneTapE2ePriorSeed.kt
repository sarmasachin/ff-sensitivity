package com.ffsensitivity.app.data

import android.content.Context

/**
 * Debug/E2E only: seed [AppSession.oneTapPersonalPrior] from shared_prefs
 * so emulator can verify soft prior apply without a live Compare save.
 *
 * Prefs file: one_tap_e2e_v1 — set seed_prior=true (+ optional prior_* ints).
 */
object OneTapE2ePriorSeed {
    private const val PREFS = "one_tap_e2e_v1"

    fun consume(context: Context): Boolean {
        return runCatching {
            val prefs = context.applicationContext
                .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            if (!prefs.getBoolean("seed_prior", false)) return false
            AppSession.oneTapPersonalPrior = ProMaxPersonalPrior(
                general = prefs.getInt("prior_g", 10),
                redDot = prefs.getInt("prior_rd", 6),
                scope2x = prefs.getInt("prior_s2", 4),
                scope4x = prefs.getInt("prior_s4", 0),
                sniper = prefs.getInt("prior_sn", 0),
                freeLook = prefs.getInt("prior_fl", 0),
                fireButton = prefs.getInt("prior_fb", 2)
            )
            prefs.edit().putBoolean("seed_prior", false).apply()
            true
        }.getOrDefault(false)
    }
}
