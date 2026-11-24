package com.ffsensitivity.app.engine

import com.ffsensitivity.app.data.DeviceInfo
import com.ffsensitivity.app.data.DpiPreference
import com.ffsensitivity.app.data.FingerCount
import com.ffsensitivity.app.data.PlayerRole
import com.ffsensitivity.app.data.ScreenGuard
import com.ffsensitivity.app.data.WizardAnswers
import kotlin.math.roundToInt

/**
 * Best Premium Sensi — PRO engine (Classic [SettingsEngine] stays frozen).
 *
 * Upgrades vs Classic (visible value, still safe clamps):
 * - Slightly higher profile multiplier for sharper response
 * - Stronger role-specific extras (Rusher / One-tap / Flanker / Sniper)
 * - High-Hz stability trim on Free Look
 * - Multi-finger fire button nudged for claw comfort
 */
object SettingsEnginePro {

    /** Classic uses 1.0 — Pro polish. */
    private const val PROFILE_M = 1.04
    private const val ATTACH_BONUS = 0

    fun calculateAll(device: DeviceInfo, answers: WizardAnswers): FullSettingsResult {
        return try {
            FullSettingsResult(
                sensitivity = calculateSensitivity(device, answers),
                hud = calculateHud(device, answers),
                graphics = calculateGraphics(device),
                deviceLabel = device.deviceLabel,
                playstyleSummary = listOf(
                    "Premium Pro",
                    answers.fingers.label,
                    answers.role.label,
                    answers.dpiPreference.label,
                    answers.screenGuard.label
                ).joinToString(" · "),
                hardwareSummary = listOf(
                    device.ramLabel,
                    device.maxRefreshLabel,
                    device.screenInchesLabel
                ).joinToString(" · ")
            )
        } catch (t: Throwable) {
            throw IllegalStateException("Failed to calculate Pro settings", t)
        }
    }

    fun calculateSensitivity(device: DeviceInfo, answers: WizardAnswers): SensitivityResult {
        val dRam = deltaRam(device.ramGb)
        val panelHz = device.maxRefreshRateHz.coerceAtLeast(device.refreshRateHz)
        val dFps = deltaFps(panelHz)
        val dDpi = deltaDpi(answers.dpiPreference)
        val dTsr = deltaTsr(device.touchRateHz)
        val dFinger = deltaFinger(answers.fingers)
        val dGlass = deltaGlass(answers.screenGuard)
        val dAge = deltaAge(device.deviceAgeYears)

        val deltaS = dRam + dFps + dDpi + dTsr + dFinger + dGlass + dAge
        val roleG = roleGeneral(answers.role)
        val roleRdExtra = roleRedDotExtra(answers.role)
        val roleScopeExtra = roleScopeExtra(answers.role)
        val roleSniperExtra = roleSniperExtra(answers.role)
        val hzStability = freeLookHzTrim(panelHz)
        val roleFreeLook = roleFreeLookExtra(answers.role)

        val generalRaw = (150 + deltaS + roleG) * PROFILE_M
        val general = clamp(generalRaw.roundToInt(), 50, 200)

        val redDot = clamp(general - 10 + roleRdExtra, 40, 200)
        val scope2x = clamp(general - 20 + roleScopeExtra, 30, 200)
        val scope4x = clamp(general - 30 + roleScopeExtra, 20, 200)
        val sniper = clamp(
            (general * 0.5).roundToInt() + ATTACH_BONUS + roleSniperExtra,
            20,
            150
        )
        val freeLook = clamp(
            ((120 + deltaS) * PROFILE_M).roundToInt() + roleFreeLook + hzStability,
            20,
            200
        )
        val fireButton = calculateFireButton(dRam, answers.fingers)

        val breakdown = buildList {
            add("Engine = Best Premium Pro (upgraded)")
            add("M_profile = $PROFILE_M (Classic 1.0)")
            add("Base General 150 · Free Look base 120")
            add(signed("ΔRAM", dRam))
            add(signed("ΔFPS", dFps))
            add(signed("ΔDPI", dDpi))
            add(signed("ΔTSR", dTsr))
            add(signed("ΔFinger", dFinger))
            add(signed("ΔGlass", dGlass))
            add(signed("ΔAge", dAge))
            add("ΔS = $deltaS")
            add(signed("Role General (${answers.role.label})", roleG))
            if (roleRdExtra != 0) add(signed("Pro Red Dot extra", roleRdExtra))
            if (roleScopeExtra != 0) add(signed("Pro Scope extra", roleScopeExtra))
            if (roleSniperExtra != 0) add(signed("Pro Sniper extra", roleSniperExtra))
            if (roleFreeLook != 0) add(signed("Pro Free Look role", roleFreeLook))
            if (hzStability != 0) add(signed("Pro Hz stability", hzStability))
            add("General = $general")
            add("Free Look = $freeLook")
            add("Fire Button = $fireButton")
        }

        return SensitivityResult(
            general = general,
            redDot = redDot,
            scope2x = scope2x,
            scope4x = scope4x,
            sniper = sniper,
            freeLook = freeLook,
            fireButton = fireButton,
            breakdown = breakdown,
            deltaTotal = deltaS
        )
    }

    fun calculateHud(device: DeviceInfo, answers: WizardAnswers): HudResult {
        val fingerSize = when (answers.fingers) {
            FingerCount.TWO -> 0.0
            FingerCount.THREE -> 3.0
            FingerCount.FOUR -> 5.0
            FingerCount.FIVE -> 7.0
            FingerCount.SIX -> 9.0
        }
        // Pro: slightly easier claw reach on larger hands / more fingers.
        val proClaw = when (answers.fingers) {
            FingerCount.TWO -> 0.0
            FingerCount.THREE -> 1.0
            FingerCount.FOUR -> 1.5
            FingerCount.FIVE, FingerCount.SIX -> 2.0
        }
        val fire = 45.0 - (((device.screenInches - 6.5) / 0.2) * 2.0) + fingerSize + proClaw
        val fireInt = fire.roundToInt().coerceIn(30, 70)
        val gloo = clamp((fire * 1.8).roundToInt(), 80, 100)
        val jump = clamp((fire * 1.25).roundToInt(), 55, 70)
        val crouch = clamp((fire * 1.15).roundToInt(), 50, 65)
        val isMulti = answers.fingers != FingerCount.TWO
        return HudResult(
            firePercent = fireInt,
            firePositionNote = "Bottom edge se 20% upar · Pro claw fit",
            glooPercent = gloo,
            glooFingerLabel = if (answers.fingers == FingerCount.TWO) "Left Thumb" else "Left Index",
            jumpPercent = jump,
            crouchPercent = crouch,
            quickWeaponSwitchOn = isMulti,
            quickWeaponSwitchPercent = if (isMulti) 72 else 50,
            transparencyRange = "35-40%"
        )
    }

    fun calculateGraphics(device: DeviceInfo): GraphicsResult {
        val quality = when {
            device.ramGb < 4.0 -> "Smooth"
            device.ramGb >= 8.0 -> "Ultra / MAX"
            else -> "Standard"
        }
        return GraphicsResult(quality = quality)
    }

    // ---------- Pro-tuned tables (Classic stays in SettingsEngine) ----------

    private fun deltaRam(ramGb: Double): Int = when {
        ramGb <= 2.0 -> 25
        ramGb <= 3.0 -> 20
        ramGb <= 4.0 -> 10
        ramGb < 8.0 -> 0
        ramGb < 12.0 -> -10
        else -> -18
    }

    private fun deltaFps(hz: Int): Int = when {
        hz <= 60 -> 15
        hz <= 90 -> 0
        hz <= 120 -> -10
        else -> -18
    }

    private fun deltaDpi(pref: DpiPreference): Int = when (pref) {
        DpiPreference.NONE -> 0
        DpiPreference.MID -> -15
        DpiPreference.HIGH -> -30
    }

    private fun deltaTsr(hz: Int?): Int = when {
        hz == null -> 0
        hz < 180 -> 10
        hz <= 240 -> 0
        hz >= 360 -> -12
        else -> 0
    }

    private fun deltaFinger(fingers: FingerCount): Int = when (fingers) {
        FingerCount.TWO -> 10
        FingerCount.THREE -> 0
        FingerCount.FOUR -> -8
        FingerCount.FIVE -> -12
        FingerCount.SIX -> -15
    }

    private fun deltaGlass(guard: ScreenGuard): Int = when (guard) {
        ScreenGuard.MATTE -> -8
        ScreenGuard.NORMAL -> 0
        ScreenGuard.NONE -> 6
    }

    private fun deltaAge(years: Double?): Int = when {
        years == null -> 0
        years < 1.0 -> 0
        years < 3.0 -> 5
        else -> 12
    }

    /** Stronger playstyle identity than Classic. */
    private fun roleGeneral(role: PlayerRole): Int = when (role) {
        PlayerRole.RUSHER -> 18
        PlayerRole.ONE_TAP -> 24
        PlayerRole.FLANKER -> 8
        PlayerRole.SNIPER -> -12
    }

    private fun roleRedDotExtra(role: PlayerRole): Int = when (role) {
        PlayerRole.RUSHER -> 12
        PlayerRole.ONE_TAP -> 18
        PlayerRole.FLANKER -> 4
        PlayerRole.SNIPER -> -2
    }

    private fun roleScopeExtra(role: PlayerRole): Int = when (role) {
        PlayerRole.FLANKER -> 8
        PlayerRole.SNIPER -> 4
        else -> 0
    }

    private fun roleSniperExtra(role: PlayerRole): Int = when (role) {
        PlayerRole.SNIPER -> 25
        PlayerRole.FLANKER -> 4
        else -> 0
    }

    private fun roleFreeLookExtra(role: PlayerRole): Int = when (role) {
        PlayerRole.RUSHER -> 4
        PlayerRole.ONE_TAP -> 2
        PlayerRole.FLANKER -> 3
        PlayerRole.SNIPER -> -4
    }

    /** High refresh: slightly calmer free-look for tracking. */
    private fun freeLookHzTrim(hz: Int): Int = when {
        hz >= 120 -> -4
        hz >= 90 -> -2
        else -> 0
    }

    private fun calculateFireButton(deltaRam: Int, fingers: FingerCount): Int {
        val fingerAdj = when (fingers) {
            FingerCount.TWO -> 8
            FingerCount.THREE -> 4
            FingerCount.FOUR -> 2
            FingerCount.FIVE -> 1
            FingerCount.SIX -> 0
        }
        val proClawNudge = when (fingers) {
            FingerCount.TWO -> 0
            FingerCount.THREE -> 1
            else -> 2
        }
        val raw = (55.0 - (deltaRam * 0.5) - fingerAdj + proClawNudge).roundToInt()
        val (lo, hi) = when (fingers) {
            FingerCount.TWO -> 42 to 48
            FingerCount.THREE -> 48 to 52
            FingerCount.FOUR -> 50 to 55
            FingerCount.FIVE -> 52 to 57
            FingerCount.SIX -> 54 to 60
        }
        return raw.coerceIn(lo, hi)
    }

    private fun signed(label: String, delta: Int): String {
        val sign = if (delta > 0) "+$delta" else "$delta"
        return "$label $sign"
    }

    private fun clamp(value: Int, min: Int, max: Int): Int = value.coerceIn(min, max)
}
