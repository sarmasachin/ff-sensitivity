package com.ffsensitivity.app.engine

import com.ffsensitivity.app.data.AppSession
import com.ffsensitivity.app.data.DeviceInfo
import com.ffsensitivity.app.data.DpiPreference
import com.ffsensitivity.app.data.FingerCount
import com.ffsensitivity.app.data.PlayerRole
import com.ffsensitivity.app.data.ScreenGuard
import com.ffsensitivity.app.data.WizardAnswers
import kotlin.math.roundToInt

/**
 * One Tap Premium — headshot-locked engine.
 *
 * Classic / Best Premium ([SettingsEnginePro]) / Pro Max stay untouched.
 * Role is always forced to [PlayerRole.ONE_TAP] regardless of wizard pick.
 *
 * Design vs Best Premium One-Tap row:
 * - Lower profile M (less clamp saturation)
 * - Red Dot vs General hardened (min lift + ratio; General yields near soft-cap)
 * - Hz-tier RD base/min lift (60Hz more lift; 120+/144 calmer) + residual Hz/TSR trim
 * - Split 2x / 4x extras (2x mid-range headshot up, 4x controlled)
 * - Compact fire-button bands + finger-specific position note (stable one-tap)
 * - Role-aware HUD: compact gloo/jump/crouch, aim-hand-free labels, clearer transparency
 */
object SettingsEngineOneTap {

    private const val PROFILE_M = 1.025
    private const val ATTACH_BONUS = 0

    /** Forced One-Tap Headshot role extras (not a full role table). */
    private const val ROLE_GENERAL = 20
    /** Mid-range headshot — stronger than 4x. */
    private const val ROLE_SCOPE_2X = 11
    /** Longer mid — controlled, below 2x. */
    private const val ROLE_SCOPE_4X = 5
    private const val ROLE_SNIPER = 0
    private const val ROLE_FREE_LOOK = 1

    internal const val SCOPE_2X_SOFT_MAX = 195
    internal const val SCOPE_4X_SOFT_MAX = 190
    /** Keep 2x clearly above 4x for the headshot ladder. */
    internal const val SCOPE_2X_VS_4X_MIN_GAP = 8

    /** Delegates — see [SettingsEngineOneTapRd] for Hz-tier lift math. */
    internal const val RD_SOFT_MAX = SettingsEngineOneTapRd.RD_SOFT_MAX
    internal const val RD_MIN_LIFT = SettingsEngineOneTapRd.RD_MIN_LIFT
    private const val RD_RATIO = SettingsEngineOneTapRd.RD_RATIO

    internal fun rdBaseLift(panelHz: Int): Int = SettingsEngineOneTapRd.rdBaseLift(panelHz)

    internal fun rdMinLift(panelHz: Int): Int = SettingsEngineOneTapRd.rdMinLift(panelHz)

    internal fun headshotGeneralAndRedDot(
        generalIn: Int,
        rdExtraTrim: Int = 0,
        panelHz: Int = 90
    ): Pair<Int, Int> = SettingsEngineOneTapRd.headshotGeneralAndRedDot(
        generalIn = generalIn,
        rdExtraTrim = rdExtraTrim,
        panelHz = panelHz
    )

    fun calculateAll(device: DeviceInfo, answers: WizardAnswers): FullSettingsResult {
        val locked = answers.copy(role = PlayerRole.ONE_TAP)
        return try {
            val sensitivity = calculateSensitivity(device, locked)
            val crowd = AppSession.oneTapCrowdOffsets
            val confPct = (crowd.confidence * 100).toInt().coerceIn(0, 100)
            val peerLabel = ProMaxCrowdTierLabel.peerSummary(
                matchFrom = crowd.matchFrom,
                matchCount = crowd.matchCount,
                confPct = confPct,
                communityActive = crowd.community.active,
            )
            val shareLabel =
                if (crowd.community.active) "share×${crowd.community.matchCount}" else null
            FullSettingsResult(
                sensitivity = sensitivity,
                // HUD fire % must match sensi fire button (one accurate value).
                hud = SettingsEngineOneTapHud.build(
                    device = device,
                    fingers = locked.fingers,
                    fireButtonPercent = sensitivity.fireButton
                ),
                graphics = calculateGraphics(device),
                deviceLabel = device.deviceLabel,
                playstyleSummary = listOfNotNull(
                    "One Tap Premium",
                    locked.fingers.label,
                    locked.role.label,
                    locked.dpiPreference.label,
                    locked.screenGuard.label,
                    peerLabel,
                    shareLabel
                ).joinToString(" · "),
                hardwareSummary = listOf(
                    device.ramLabel,
                    device.maxRefreshLabel,
                    device.screenInchesLabel
                ).joinToString(" · ")
            )
        } catch (t: Throwable) {
            throw IllegalStateException("Failed to calculate One Tap Premium settings", t)
        }
    }

    fun calculateSensitivity(device: DeviceInfo, answers: WizardAnswers): SensitivityResult {
        val locked = answers.copy(role = PlayerRole.ONE_TAP)
        val dRam = deltaRam(device.ramGb)
        val panelHz = device.maxRefreshRateHz.coerceAtLeast(device.refreshRateHz)
        val dFps = deltaFps(panelHz)
        val dDpi = deltaDpi(locked.dpiPreference)
        val dTsr = deltaTsr(device.touchRateHz)
        val dFinger = deltaFinger(locked.fingers)
        val dGlass = deltaGlass(locked.screenGuard)
        val dAge = deltaAge(device.deviceAgeYears)

        val deltaS = dRam + dFps + dDpi + dTsr + dFinger + dGlass + dAge
        val hzStability = freeLookHzTrim(panelHz)
        val rdHzTrim = SettingsEngineOneTapRd.redDotPanelTrim(panelHz)
        val rdTsrTrim = SettingsEngineOneTapRd.redDotTouchTrim(device.touchRateHz)
        val rdPanelTrim = rdHzTrim + rdTsrTrim

        val generalRaw = (150 + deltaS + ROLE_GENERAL) * PROFILE_M
        val generalIn = clamp(generalRaw.roundToInt(), 50, 200)
        val sniperBase = clamp(
            (generalIn * 0.5).roundToInt() + ATTACH_BONUS + ROLE_SNIPER,
            20,
            140
        )
        val freeLookBase = clamp(
            ((120 + deltaS) * PROFILE_M).roundToInt() + ROLE_FREE_LOOK + hzStability,
            20,
            195
        )
        val fireBase = calculateFireButton(dRam, locked.fingers)

        val baseLift = rdBaseLift(panelHz)
        val minLift = rdMinLift(panelHz)

        // Peer / community bucket (One-Tap Headshot only) — then re-lock RD ladder.
        val applied = SettingsEngineOneTapCrowd.apply(
            generalIn = generalIn,
            rdPanelTrim = rdPanelTrim,
            panelHz = panelHz,
            sniperBase = sniperBase,
            freeLookBase = freeLookBase,
            fireBase = fireBase,
            fingers = locked.fingers
        )
        val general = applied.general
        val redDot = applied.redDot
        val scope2x = applied.scope2x
        val scope4x = applied.scope4x
        val sniper = applied.sniper
        val freeLook = applied.freeLook
        val fireButton = applied.fireButton
        val rdDelta = redDot - general

        val breakdown = buildList {
            add("Engine = One Tap Premium (headshot-locked)")
            add("Role locked = ${PlayerRole.ONE_TAP.label}")
            add("M_profile = $PROFILE_M (soft headshot curve)")
            add("Base General 150 · Free Look base 120")
            add(signed("ΔRAM", dRam))
            add(signed("ΔFPS", dFps))
            add(signed("ΔDPI", dDpi))
            add(signed("ΔTSR", dTsr))
            add(signed("ΔFinger", dFinger))
            add(signed("ΔGlass", dGlass))
            add(signed("ΔAge", dAge))
            add("ΔS = $deltaS")
            add(signed("One-Tap General", ROLE_GENERAL))
            add(
                "Red Dot invariant: ≥ General+$minLift · ≥ General×$RD_RATIO · " +
                    "softMax $RD_SOFT_MAX · ${panelHz}Hz tier"
            )
            add(signed("One-Tap Red Dot base lift (${panelHz}Hz)", baseLift))
            if (rdHzTrim != 0) add(signed("Red Dot Hz trim (${panelHz}Hz)", rdHzTrim))
            if (rdTsrTrim != 0) {
                add(signed("Red Dot TSR trim (${device.touchRateHz ?: "n/a"}Hz)", rdTsrTrim))
            }
            if (generalIn != general) {
                add("General yielded $generalIn → $general (room for Red Dot lift / crowd)")
            }
            add(signed("One-Tap 2x scope (mid HS)", ROLE_SCOPE_2X))
            add(signed("One-Tap 4x scope (controlled)", ROLE_SCOPE_4X))
            add("Scope ladder: Red Dot ≥ 2x ≥ 4x+$SCOPE_2X_VS_4X_MIN_GAP")
            if (ROLE_FREE_LOOK != 0) add(signed("One-Tap Free Look", ROLE_FREE_LOOK))
            if (hzStability != 0) add(signed("Free Look Hz stability", hzStability))
            addAll(applied.notes)
            add("General = $general")
            add("Red Dot = $redDot (Δ vs General +$rdDelta)")
            add("2x = $scope2x · 4x = $scope4x")
            add("Tip: Red Dot pe headshot track; mid fights → trust 2x; overshoot → General -3")
            add("Free Look = $freeLook")
            add("Fire Button = $fireButton (compact One-Tap band)")
            add(
                "Fire position = ${SettingsEngineOneTapHud.firePositionNote(locked.fingers)}"
            )
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

    fun calculateGraphics(device: DeviceInfo): GraphicsResult {
        val quality = when {
            device.ramGb < 4.0 -> "Smooth"
            device.ramGb >= 8.0 -> "Ultra / MAX"
            else -> "Standard"
        }
        return GraphicsResult(quality = quality)
    }

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

    private fun freeLookHzTrim(hz: Int): Int = when {
        hz >= 120 -> -4
        hz >= 90 -> -2
        else -> 0
    }

    /**
     * Mid-range headshot scopes: 2x stronger than 4x, both under Red Dot.
     * Returns (scope2x, scope4x).
     */
    internal fun headshotScopes(general: Int, redDot: Int): Pair<Int, Int> {
        val twoMax = minOf(SCOPE_2X_SOFT_MAX, redDot)
        var scope2x = clamp(general - 20 + ROLE_SCOPE_2X, 30, twoMax)
        val fourMax = minOf(
            SCOPE_4X_SOFT_MAX,
            (scope2x - SCOPE_2X_VS_4X_MIN_GAP).coerceAtLeast(20)
        )
        var scope4x = clamp(general - 30 + ROLE_SCOPE_4X, 20, fourMax)
        // Re-assert ladder if clamps squeezed the gap (very low General edge).
        if (scope2x < scope4x + SCOPE_2X_VS_4X_MIN_GAP && scope2x < twoMax) {
            scope2x = minOf(twoMax, scope4x + SCOPE_2X_VS_4X_MIN_GAP)
        }
        if (scope4x > scope2x - SCOPE_2X_VS_4X_MIN_GAP) {
            scope4x = (scope2x - SCOPE_2X_VS_4X_MIN_GAP).coerceAtLeast(20)
        }
        check(scope2x <= redDot) {
            "One Tap scope ladder broken: 2x=$scope2x > RedDot=$redDot"
        }
        check(scope2x >= scope4x + SCOPE_2X_VS_4X_MIN_GAP || scope2x <= 30) {
            "One Tap 2x/4x gap broken: 2x=$scope2x 4x=$scope4x"
        }
        return scope2x to scope4x
    }

    /**
     * Compact One-Tap fire — smaller + narrower bands than Best Premium
     * so the tap target stays precise for headshots.
     */
    private fun calculateFireButton(deltaRam: Int, fingers: FingerCount): Int {
        val fingerAdj = when (fingers) {
            FingerCount.TWO -> 9
            FingerCount.THREE -> 5
            FingerCount.FOUR -> 3
            FingerCount.FIVE -> 2
            FingerCount.SIX -> 1
        }
        val raw = (53.0 - (deltaRam * 0.45) - fingerAdj).roundToInt()
        val (lo, hi) = when (fingers) {
            FingerCount.TWO -> 38 to 42
            FingerCount.THREE -> 44 to 47
            FingerCount.FOUR -> 46 to 49
            FingerCount.FIVE -> 48 to 51
            FingerCount.SIX -> 50 to 53
        }
        val value = raw.coerceIn(lo, hi)
        check(value in lo..hi) {
            "One Tap fire band broken: value=$value band=$lo..$hi fingers=$fingers"
        }
        return value
    }

    private fun signed(label: String, delta: Int): String {
        val sign = if (delta > 0) "+$delta" else "$delta"
        return "$label $sign"
    }

    private fun clamp(value: Int, min: Int, max: Int): Int = value.coerceIn(min, max)
}
