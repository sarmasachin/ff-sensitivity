package com.ffsensitivity.app.engine

import com.ffsensitivity.app.data.DeviceInfo
import com.ffsensitivity.app.data.FingerCount
import kotlin.math.roundToInt

/**
 * One Tap Premium HUD — role-aware layout helpers.
 * Kept separate so [SettingsEngineOneTap] stays under the soft 400-line budget.
 * Classic / Best Premium / Pro Max HUD code is untouched.
 */
internal object SettingsEngineOneTapHud {

    private const val GLOO_LO = 78
    private const val GLOO_HI = 92
    private const val JUMP_LO = 52
    private const val JUMP_HI = 62
    private const val CROUCH_LO = 48
    private const val CROUCH_HI = 58

    fun build(
        device: DeviceInfo,
        fingers: FingerCount,
        fireButtonPercent: Int
    ): HudResult {
        val fireInt = fireButtonPercent.coerceIn(30, 70)
        val layout = layoutScale(device.screenInches, fingers)
        var gloo = (layout * 1.55).roundToInt().coerceIn(GLOO_LO, GLOO_HI)
        var jump = (layout * 1.05).roundToInt().coerceIn(JUMP_LO, JUMP_HI)
        var crouch = (layout * 0.98).roundToInt().coerceIn(CROUCH_LO, CROUCH_HI)
        if (crouch > jump - 2) {
            crouch = (jump - 2).coerceAtLeast(CROUCH_LO)
        }
        val (qwsOn, qwsPct) = quickWeapon(fingers)
        check(gloo in GLOO_LO..GLOO_HI) { "One Tap HUD gloo out of band: $gloo" }
        check(jump in JUMP_LO..JUMP_HI) { "One Tap HUD jump out of band: $jump" }
        check(crouch in CROUCH_LO..CROUCH_HI && crouch <= jump - 2) {
            "One Tap HUD crouch/jump ladder broken: crouch=$crouch jump=$jump"
        }
        return HudResult(
            firePercent = fireInt,
            firePositionNote = firePositionNote(fingers),
            glooPercent = gloo,
            glooFingerLabel = glooLabel(fingers),
            jumpPercent = jump,
            crouchPercent = crouch,
            quickWeaponSwitchOn = qwsOn,
            quickWeaponSwitchPercent = qwsPct,
            transparencyRange = "30-36%"
        )
    }

    fun firePositionNote(fingers: FingerCount): String = when (fingers) {
        FingerCount.TWO ->
            "Bottom-right edge se 18% upar · compact thumb tap (One-Tap)"
        FingerCount.THREE ->
            "Fire slightly inward · stable index tap, don’t oversize"
        FingerCount.FOUR ->
            "Compact claw fire · keep button small for clean headshots"
        FingerCount.FIVE, FingerCount.SIX ->
            "Tight claw fire zone · small button, stable One-Tap taps"
    }

    private fun layoutScale(screenInches: Double, fingers: FingerCount): Double {
        val fingerSize = when (fingers) {
            FingerCount.TWO -> 0.0
            FingerCount.THREE -> 1.5
            FingerCount.FOUR -> 2.5
            FingerCount.FIVE -> 3.5
            FingerCount.SIX -> 4.5
        }
        return 42.0 - (((screenInches - 6.5) / 0.2) * 1.4) + fingerSize
    }

    private fun glooLabel(fingers: FingerCount): String = when (fingers) {
        FingerCount.TWO -> "Left Thumb · gloo away from aim hand"
        FingerCount.THREE -> "Left Index · aim hand free for One-Tap"
        FingerCount.FOUR -> "Left Index · compact gloo, no claw rush"
        FingerCount.FIVE, FingerCount.SIX -> "Left Index · small gloo, stable peek"
    }

    private fun quickWeapon(fingers: FingerCount): Pair<Boolean, Int> = when (fingers) {
        FingerCount.TWO -> false to 45
        FingerCount.THREE -> true to 58
        FingerCount.FOUR -> true to 60
        FingerCount.FIVE, FingerCount.SIX -> true to 62
    }
}
