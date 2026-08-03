package com.ffsensitivity.app.engine

import com.ffsensitivity.app.data.DeviceInfo
import com.ffsensitivity.app.data.DpiPreference
import com.ffsensitivity.app.data.FingerCount
import com.ffsensitivity.app.data.PlayerRole
import com.ffsensitivity.app.data.ScreenGuard
import com.ffsensitivity.app.data.WizardAnswers
import kotlin.math.roundToInt

data class SensitivityResult(
    val general: Int,
    val redDot: Int,
    val scope2x: Int,
    val scope4x: Int,
    val sniper: Int,
    val freeLook: Int,
    val fireButton: Int,
    val breakdown: List<String>,
    val deltaTotal: Int
)

data class HudResult(
    val firePercent: Int,
    val firePositionNote: String,
    val glooPercent: Int,
    val glooFingerLabel: String,
    val jumpPercent: Int,
    val crouchPercent: Int,
    val quickWeaponSwitchOn: Boolean,
    val quickWeaponSwitchPercent: Int,
    val transparencyRange: String
)

data class GraphicsResult(
    val quality: String,
    val highFps: String = "HIGH",
    val highResolution: String = "Normal",
    val shadow: String = "OFF",
    val colorFilter: String = "Bright"
)

data class DpiResult(
    val originalDpi: Int,
    val balancedDpi: Int,
    val extremeDpi: Int,
    val dangerDpi: Int,
    val crashWarningThreshold: Int,
    /** Default × RAM/Hz safe multiplier (1.25 / 1.35 / 1.45) */
    val safeMaxDpi: Int,
    val safeMultiplier: Double,
    val safeMultiplierLabel: String,
    val currentDensityDpi: Int,
    val stableDensityDpi: Int,
    val currentSmallestWidthDp: Int,
    val resolutionLabel: String,
    val ramLabel: String,
    val refreshLabel: String
)

data class FullSettingsResult(
    val sensitivity: SensitivityResult,
    val hud: HudResult,
    val graphics: GraphicsResult,
    val deviceLabel: String,
    val playstyleSummary: String,
    val hardwareSummary: String
)

/**
 * USER-LOCKED Free Fire formula (exact tables from user spec).
 *
 * ΔS = ΔRAM + ΔFPS + ΔDPI + ΔTSR + ΔFinger + ΔGlass + ΔAge
 * (Role is NOT inside ΔS — applied per-scope as specified.)
 *
 * General   = Clamp((150 + ΔS + Role.G) × M_profile, 50, 200)
 * Red Dot   = Clamp(General − 10 + Role.RD_extra, 40, 200)
 * 2x / 4x   = Clamp(General − 20/30 + Role.Scope_extra, …)
 * Sniper    = Clamp(General×0.5 + AttachBonus + Role.Sniper_extra, 20, 150)
 * Free Look = Clamp((120 + ΔS) × M_profile, 20, 200)
 * FireBtn   = ClampBand(55 − ΔRAM×0.5 − F_adj)
 *
 * M_profile default 1.0 (wizard has no profile step yet).
 * Attachment bonus default 0 (wizard has no attachment step yet).
 */
object SettingsEngine {

    /** Auto Custom / Standard until profile step exists */
    private const val PROFILE_M = 1.0
    /** No attachment step yet */
    private const val ATTACH_BONUS = 0

    fun calculateAll(device: DeviceInfo, answers: WizardAnswers): FullSettingsResult {
        return try {
            FullSettingsResult(
                sensitivity = calculateSensitivity(device, answers),
                hud = calculateHud(device, answers),
                graphics = calculateGraphics(device),
                deviceLabel = device.deviceLabel,
                playstyleSummary = listOf(
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
            throw IllegalStateException("Failed to calculate settings", t)
        }
    }

    fun calculateSensitivity(device: DeviceInfo, answers: WizardAnswers): SensitivityResult {
        val dRam = deltaRam(device.ramGb)
        val dFps = deltaFps(device.maxRefreshRateHz.coerceAtLeast(device.refreshRateHz))
        val dDpi = deltaDpi(answers.dpiPreference)
        val dTsr = deltaTsr(device.touchRateHz)
        val dFinger = deltaFinger(answers.fingers)
        val dGlass = deltaGlass(answers.screenGuard)
        val dAge = deltaAge(device.deviceAgeYears)

        // Role is per-scope (not inside ΔS) — matches locked clarification of user formula
        val deltaS = dRam + dFps + dDpi + dTsr + dFinger + dGlass + dAge
        val roleG = roleGeneral(answers.role)
        val roleRdExtra = roleRedDotExtra(answers.role)
        val roleScopeExtra = roleScopeExtra(answers.role)
        val roleSniperExtra = roleSniperExtra(answers.role)

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
        val freeLook = clamp(((120 + deltaS) * PROFILE_M).roundToInt(), 20, 200)
        val fireButton = calculateFireButton(dRam, answers.fingers)

        val breakdown = buildList {
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
            if (roleRdExtra != 0) add(signed("Role Red Dot extra", roleRdExtra))
            if (roleScopeExtra != 0) add(signed("Role Scope extra", roleScopeExtra))
            if (roleSniperExtra != 0) add(signed("Role Sniper extra", roleSniperExtra))
            add("M_profile = $PROFILE_M")
            add("General = Clamp((150 + ΔS + Role.G) × M) = $general")
            add("Free Look = Clamp((120 + ΔS) × M) = $freeLook")
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
        val fire = 45.0 - (((device.screenInches - 6.5) / 0.2) * 2.0) + fingerSize
        val fireInt = fire.roundToInt().coerceIn(30, 70)
        val gloo = clamp((fire * 1.8).roundToInt(), 80, 100)
        val jump = clamp((fire * 1.25).roundToInt(), 55, 70)
        val crouch = clamp((fire * 1.15).roundToInt(), 50, 65)
        val isMulti = answers.fingers != FingerCount.TWO
        return HudResult(
            firePercent = fireInt,
            firePositionNote = "Bottom edge se 20% upar",
            glooPercent = gloo,
            glooFingerLabel = if (answers.fingers == FingerCount.TWO) "Left Thumb" else "Left Index",
            jumpPercent = jump,
            crouchPercent = crouch,
            quickWeaponSwitchOn = isMulti,
            quickWeaponSwitchPercent = if (isMulti) 70 else 50,
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

    /**
     * DPI & Resolution calculator (user-locked).
     *
     * Categories:
     *   Original  = Default Smallest Width
     *   Balanced  = Default + 60
     *   Extreme   = Default × 1.3
     *   Danger    = Default × 1.5   (Do NOT Cross card limit)
     *   Absolute  = Default × 1.6   (crash warning threshold)
     *
     * Safe Max = Default × Multiplier (conservative min of RAM tier + Hz tier):
     *   2–4GB / 60Hz class → 1.25
     *   ~6GB / 90Hz class  → 1.35
     *   8GB+ / 120Hz+      → 1.45
     */
    fun calculateDpi(device: DeviceInfo): DpiResult {
        return try {
            val d = device.defaultSmallestWidthDp.coerceIn(240, 1000)
            val hz = device.maxRefreshRateHz.coerceAtLeast(device.refreshRateHz)
            val (multiplier, multiplierLabel) = dpiSafeMultiplier(device.ramGb, hz)
            val safeMax = (d * multiplier).roundToInt().coerceAtMost(1000)
            DpiResult(
                originalDpi = d,
                balancedDpi = (d + 60).coerceAtMost(1000),
                extremeDpi = (d * 1.3).roundToInt().coerceAtMost(1000),
                dangerDpi = (d * 1.5).roundToInt().coerceAtMost(1000),
                crashWarningThreshold = (d * 1.6).roundToInt().coerceAtMost(1200),
                safeMaxDpi = safeMax,
                safeMultiplier = multiplier,
                safeMultiplierLabel = multiplierLabel,
                currentDensityDpi = device.densityDpi,
                stableDensityDpi = device.stableDensityDpi,
                currentSmallestWidthDp = device.smallestWidthDp,
                resolutionLabel = device.resolutionLabel.ifBlank { "Unknown" },
                ramLabel = device.ramLabel.ifBlank { "Unknown RAM" },
                refreshLabel = device.maxRefreshLabel.ifBlank { "Unknown Hz" }
            )
        } catch (t: Throwable) {
            throw IllegalStateException("Failed to calculate DPI", t)
        }
    }

    /**
     * RAM tier and Hz tier each map to 1.25 / 1.35 / 1.45.
     * Final multiplier = min(ramTier, hzTier) so mixed phones stay on the safer side.
     */
    private fun dpiSafeMultiplier(ramGb: Double, refreshHz: Int): Pair<Double, String> {
        val ramTier = when {
            ramGb < 5.0 -> 1.25   // 2–4GB class
            ramGb < 8.0 -> 1.35   // ~6GB class
            else -> 1.45          // 8GB+
        }
        val hzTier = when {
            refreshHz < 90 -> 1.25    // 60Hz class
            refreshHz < 120 -> 1.35   // 90Hz class
            else -> 1.45              // 120Hz+
        }
        val multiplier = minOf(ramTier, hzTier)
        val label = when (multiplier) {
            1.25 -> "×1.25 · 2–4GB / 60Hz class"
            1.35 -> "×1.35 · ~6GB / 90Hz class"
            else -> "×1.45 · 8GB+ / 120Hz+ class"
        }
        return multiplier to label
    }

    // ---------- User exact delta tables ----------

    /** 2GB:+25 · 3GB:+20 · 4GB:+10 · 6GB:0 · 8GB:−10 · 12/16GB:−18 */
    private fun deltaRam(ramGb: Double): Int = when {
        ramGb <= 2.0 -> 25
        ramGb <= 3.0 -> 20
        ramGb <= 4.0 -> 10
        ramGb < 8.0 -> 0   // 6GB bucket (and 5–7.9)
        ramGb < 12.0 -> -10
        else -> -18
    }

    /**
     * 30FPS/60Hz:+15 · 60FPS/90Hz:0 · 90FPS/120Hz:−10 · 120FPS/144Hz+:−18
     * Using panel max Hz as FPS-class proxy.
     */
    private fun deltaFps(hz: Int): Int = when {
        hz <= 60 -> 15
        hz <= 90 -> 0
        hz <= 120 -> -10
        else -> -18
    }

    /** No:0 · Mid:−15 · High:−30 */
    private fun deltaDpi(pref: DpiPreference): Int = when (pref) {
        DpiPreference.NONE -> 0
        DpiPreference.MID -> -15
        DpiPreference.HIGH -> -30
    }

    /**
     * Low (<180):+10 · Medium (180–240):0 · High (360–480+):−12
     * Unknown → Medium (0). 241–359 treated as medium (0).
     */
    private fun deltaTsr(hz: Int?): Int = when {
        hz == null -> 0
        hz < 180 -> 10
        hz <= 240 -> 0
        hz >= 360 -> -12
        else -> 0
    }

    /** 2F:+10 · 3F:0 · 4F:−8 · 5F:−12 · 6F:−15 */
    private fun deltaFinger(fingers: FingerCount): Int = when (fingers) {
        FingerCount.TWO -> 10
        FingerCount.THREE -> 0
        FingerCount.FOUR -> -8
        FingerCount.FIVE -> -12
        FingerCount.SIX -> -15
    }

    /** Matte:−8 · Normal:0 · No Guard:+6 */
    private fun deltaGlass(guard: ScreenGuard): Int = when (guard) {
        ScreenGuard.MATTE -> -8
        ScreenGuard.NORMAL -> 0
        ScreenGuard.NONE -> 6
    }

    /** 0–1y:0 · 1–3y:+5 · 3–5+y:+12 · unknown:0 */
    private fun deltaAge(years: Double?): Int = when {
        years == null -> 0
        years < 1.0 -> 0
        years < 3.0 -> 5
        else -> 12
    }

    private fun roleGeneral(role: PlayerRole): Int = when (role) {
        PlayerRole.RUSHER -> 15
        PlayerRole.ONE_TAP -> 20
        PlayerRole.FLANKER -> 5
        PlayerRole.SNIPER -> -10
    }

    /** Extra on Red Dot after (General − 10) */
    private fun roleRedDotExtra(role: PlayerRole): Int = when (role) {
        PlayerRole.RUSHER -> 10
        PlayerRole.ONE_TAP -> 15
        else -> 0
    }

    /** Extra on 2x / 4x */
    private fun roleScopeExtra(role: PlayerRole): Int = when (role) {
        PlayerRole.FLANKER -> 5
        else -> 0
    }

    /** Extra on Sniper scope */
    private fun roleSniperExtra(role: PlayerRole): Int = when (role) {
        PlayerRole.SNIPER -> 20
        else -> 0
    }

    /**
     * Fire Button Size = 55 − (ΔRAM × 0.5) − FingerAdj
     * then clamp to finger bands:
     * 2F 42–48 · 3F 48–52 · 4F 50–55 · 5F 52–57 · 6F 54–60
     */
    private fun calculateFireButton(deltaRam: Int, fingers: FingerCount): Int {
        val fingerAdj = when (fingers) {
            FingerCount.TWO -> 8
            FingerCount.THREE -> 4
            FingerCount.FOUR -> 2
            FingerCount.FIVE -> 1
            FingerCount.SIX -> 0
        }
        val raw = (55.0 - (deltaRam * 0.5) - fingerAdj).roundToInt()
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
