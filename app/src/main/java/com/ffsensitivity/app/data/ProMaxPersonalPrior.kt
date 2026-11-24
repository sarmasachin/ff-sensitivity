package com.ffsensitivity.app.data

import kotlin.math.roundToInt

/**
 * User's last Compare deltas (actual − suggested).
 * Soft-applied by Pro Max and One Tap after peer crowd offsets and before
 * share pull. Session slots stay separate:
 * [AppSession.proMaxPersonalPrior] vs [AppSession.oneTapPersonalPrior].
 */
data class ProMaxPersonalPrior(
    val general: Int = 0,
    val redDot: Int = 0,
    val scope2x: Int = 0,
    val scope4x: Int = 0,
    val sniper: Int = 0,
    val freeLook: Int = 0,
    val fireButton: Int = 0
) {
    val active: Boolean
        get() = general != 0 || redDot != 0 || scope2x != 0 || scope4x != 0 ||
            sniper != 0 || freeLook != 0 || fireButton != 0

    /** Soft additive deltas (weaker than peer crowd caps). */
    fun softAdds(): SoftAdds {
        if (!active) return SoftAdds.ZERO
        return SoftAdds(
            general = scale(general, CAP_GEN),
            redDot = scale(redDot, CAP_SCOPE),
            scope2x = scale(scope2x, CAP_SCOPE),
            scope4x = scale(scope4x, CAP_SCOPE),
            sniper = scale(sniper, CAP_SCOPE),
            freeLook = scale(freeLook, CAP_SCOPE),
            fireButton = scale(fireButton, CAP_FIRE)
        )
    }

    data class SoftAdds(
        val general: Int,
        val redDot: Int,
        val scope2x: Int,
        val scope4x: Int,
        val sniper: Int,
        val freeLook: Int,
        val fireButton: Int
    ) {
        companion object {
            val ZERO = SoftAdds(0, 0, 0, 0, 0, 0, 0)
        }
    }

    companion object {
        private const val WEIGHT = 0.28
        private const val CAP_GEN = 8
        private const val CAP_SCOPE = 6
        private const val CAP_FIRE = 3
        private const val STORE_GEN = 24
        private const val STORE_SCOPE = 20
        private const val STORE_FIRE = 10

        fun fromCompare(
            suggested: SensitivityValues,
            actual: SensitivityValues
        ): ProMaxPersonalPrior {
            val d = actual.diffAgainst(suggested)
            return ProMaxPersonalPrior(
                general = d.general.coerceIn(-STORE_GEN, STORE_GEN),
                redDot = d.redDot.coerceIn(-STORE_SCOPE, STORE_SCOPE),
                scope2x = d.scope2x.coerceIn(-STORE_SCOPE, STORE_SCOPE),
                scope4x = d.scope4x.coerceIn(-STORE_SCOPE, STORE_SCOPE),
                sniper = d.sniper.coerceIn(-STORE_SCOPE, STORE_SCOPE),
                freeLook = d.freeLook.coerceIn(-STORE_SCOPE, STORE_SCOPE),
                fireButton = d.fireButton.coerceIn(-STORE_FIRE, STORE_FIRE)
            )
        }

        private fun scale(raw: Int, cap: Int): Int =
            (raw * WEIGHT).roundToInt().coerceIn(-cap, cap)
    }
}
