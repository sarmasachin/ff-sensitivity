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
 * Premium Sensi Pro Unlock — ProMax engine (stronger than [SettingsEnginePro]).
 *
 * Extra vs Best Premium Pro:
 * - Higher profile multiplier
 * - Stronger role extras
 * - Deep crowd offsets (model / CPU / GPU / RAM / play) on all sensi fields
 *
 * Classic [SettingsEngine] and Best Premium [SettingsEnginePro] stay untouched.
 */
object SettingsEngineProMax {

    /** Best Premium Pro uses 1.04 — ProMax sharper. */
    private const val PROFILE_M = 1.07
    private const val ATTACH_BONUS = 0
    private const val CROWD_GEN = 12
    private const val CROWD_SCOPE = 10
    private const val CROWD_FIRE = 5

    fun calculateAll(device: DeviceInfo, answers: WizardAnswers): FullSettingsResult {
        return try {
            val crowd = AppSession.proMaxCrowdOffsets
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
                sensitivity = calculateSensitivity(device, answers),
                hud = calculateHud(device, answers),
                graphics = calculateGraphics(device),
                deviceLabel = device.deviceLabel,
                playstyleSummary = listOfNotNull(
                    "Pro Max",
                    peerLabel,
                    shareLabel,
                    answers.fingers.label,
                    answers.role.label,
                    answers.dpiPreference.label,
                    answers.screenGuard.label
                ).joinToString(" · "),
                hardwareSummary = listOf(
                    device.ramLabel,
                    device.processorBrand.ifBlank { device.processorType }.ifBlank { "CPU" },
                    device.gpuVendor.ifBlank { device.gpuLabel }.ifBlank { "GPU" },
                    device.maxRefreshLabel,
                    device.screenInchesLabel
                ).joinToString(" · ")
            )
        } catch (t: Throwable) {
            throw IllegalStateException("Failed to calculate ProMax settings", t)
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

        val crowd = AppSession.proMaxCrowdOffsets
        val cGen = crowd.general.coerceIn(-CROWD_GEN, CROWD_GEN)
        val cRd = crowd.redDot.coerceIn(-CROWD_SCOPE, CROWD_SCOPE)
        val c2 = crowd.scope2x.coerceIn(-CROWD_SCOPE, CROWD_SCOPE)
        val c4 = crowd.scope4x.coerceIn(-CROWD_SCOPE, CROWD_SCOPE)
        val cSn = crowd.sniper.coerceIn(-CROWD_SCOPE, CROWD_SCOPE)
        val cFl = crowd.freeLook.coerceIn(-CROWD_SCOPE, CROWD_SCOPE)
        val cFire = crowd.fireButton.coerceIn(-CROWD_FIRE, CROWD_FIRE)

        val generalRaw = (150 + deltaS + roleG) * PROFILE_M
        var general = clamp(generalRaw.roundToInt() + cGen, 50, 200)

        var redDot = clamp(general - 10 + roleRdExtra + cRd, 40, 200)
        var scope2x = clamp(general - 20 + roleScopeExtra + c2, 30, 200)
        var scope4x = clamp(general - 30 + roleScopeExtra + c4, 20, 200)
        var sniper = clamp(
            (general * 0.5).roundToInt() + ATTACH_BONUS + roleSniperExtra + cSn,
            20,
            150
        )
        var freeLook = clamp(
            ((120 + deltaS) * PROFILE_M).roundToInt() + roleFreeLook + hzStability + cFl,
            20,
            200
        )
        var fireButton = clamp(calculateFireButton(dRam, answers.fingers) + cFire, 1, 100)

        // Personal last-compare soft prior (after crowd, before share).
        val prior = AppSession.proMaxPersonalPrior.softAdds()
        general = clamp(general + prior.general, 50, 200)
        redDot = clamp(redDot + prior.redDot, 40, 200)
        scope2x = clamp(scope2x + prior.scope2x, 30, 200)
        scope4x = clamp(scope4x + prior.scope4x, 20, 200)
        sniper = clamp(sniper + prior.sniper, 20, 150)
        freeLook = clamp(freeLook + prior.freeLook, 20, 200)
        fireButton = clamp(fireButton + prior.fireButton, 1, 100)

        val share = crowd.community
        var shareW = 0.0
        if (share.active) {
            // Peer vs share conflict dampen — strong peers + hard clash → less pull.
            val sc = crowd.shareConflict
            shareW = ProMaxShareConflict.dampenedWeight(
                baseWeight = share.weight,
                peerMatchCount = crowd.matchCount,
                peerConfidence = crowd.confidence,
                pairs = listOf(
                    ProMaxShareConflict.FieldPair(general, share.general),
                    ProMaxShareConflict.FieldPair(redDot, share.redDot),
                    ProMaxShareConflict.FieldPair(scope2x, share.scope2x),
                    ProMaxShareConflict.FieldPair(scope4x, share.scope4x),
                    ProMaxShareConflict.FieldPair(sniper, share.sniper),
                    ProMaxShareConflict.FieldPair(freeLook, share.freeLook),
                ),
                knobs = ProMaxShareConflict.Knobs(
                    softGap = sc.softGap,
                    hardGap = sc.hardGap,
                    maxShrink = sc.maxShrink,
                ),
            )
            fun pull(cur: Int, target: Int, lo: Int, hi: Int): Int {
                val mixed = (cur * (1.0 - shareW) + target * shareW).roundToInt()
                return mixed.coerceIn(lo, hi)
            }
            general = pull(general, share.general, 50, 200)
            redDot = pull(redDot, share.redDot, 40, 200)
            scope2x = pull(scope2x, share.scope2x, 30, 200)
            scope4x = pull(scope4x, share.scope4x, 20, 200)
            sniper = pull(sniper, share.sniper, 20, 150)
            freeLook = pull(freeLook, share.freeLook, 20, 200)
        }
        // Trust badge reads this so UI % matches actual pull.
        AppSession.proMaxSharePullWeight = shareW

        val breakdown = buildList {
            add("Engine = Premium Sensi Pro Max")
            add("M_profile = $PROFILE_M (Best Premium 1.04 · Classic 1.0)")
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
            if (roleRdExtra != 0) add(signed("ProMax Red Dot extra", roleRdExtra))
            if (roleScopeExtra != 0) add(signed("ProMax Scope extra", roleScopeExtra))
            if (roleSniperExtra != 0) add(signed("ProMax Sniper extra", roleSniperExtra))
            if (roleFreeLook != 0) add(signed("ProMax Free Look role", roleFreeLook))
            if (hzStability != 0) add(signed("ProMax Hz stability", hzStability))
            add(
                "Crowd match = ${crowd.matchFrom} ×${crowd.matchCount} · " +
                    "conf ${(crowd.confidence * 100).toInt().coerceIn(0, 100)}%"
            )
            if (cGen != 0) add(signed("Crowd General", cGen))
            if (cRd != 0) add(signed("Crowd Red Dot", cRd))
            if (c2 != 0) add(signed("Crowd 2x", c2))
            if (c4 != 0) add(signed("Crowd 4x", c4))
            if (cSn != 0) add(signed("Crowd Sniper", cSn))
            if (cFl != 0) add(signed("Crowd Free Look", cFl))
            if (cFire != 0) add(signed("Crowd Fire", cFire))
            if (AppSession.proMaxPersonalPrior.active) {
                add("Personal prior · soft 28%")
                if (prior.general != 0) add(signed("Prior General", prior.general))
                if (prior.redDot != 0) add(signed("Prior Red Dot", prior.redDot))
                if (prior.fireButton != 0) add(signed("Prior Fire", prior.fireButton))
            }
            if (share.active) {
                val basePct = (share.weight * 100).toInt()
                val effPct = (shareW * 100).toInt()
                val dampNote =
                    if (effPct < basePct) " · conflict damp ${basePct}→$effPct%" else ""
                add(
                    "Share pull = ${share.source} ×${share.matchCount} · " +
                        "w $effPct%$dampNote"
                )
            }
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

    /** Stronger than Best Premium Pro. */
    private fun roleGeneral(role: PlayerRole): Int = when (role) {
        PlayerRole.RUSHER -> 22
        PlayerRole.ONE_TAP -> 28
        PlayerRole.FLANKER -> 10
        PlayerRole.SNIPER -> -14
    }

    private fun roleRedDotExtra(role: PlayerRole): Int = when (role) {
        PlayerRole.RUSHER -> 14
        PlayerRole.ONE_TAP -> 22
        PlayerRole.FLANKER -> 6
        PlayerRole.SNIPER -> -3
    }

    private fun roleScopeExtra(role: PlayerRole): Int = when (role) {
        PlayerRole.FLANKER -> 10
        PlayerRole.SNIPER -> 6
        PlayerRole.ONE_TAP -> 2
        else -> 0
    }

    private fun roleSniperExtra(role: PlayerRole): Int = when (role) {
        PlayerRole.SNIPER -> 30
        PlayerRole.FLANKER -> 6
        else -> 0
    }

    private fun roleFreeLookExtra(role: PlayerRole): Int = when (role) {
        PlayerRole.RUSHER -> 5
        PlayerRole.ONE_TAP -> 3
        PlayerRole.FLANKER -> 4
        PlayerRole.SNIPER -> -5
    }

    /** High refresh: slightly calmer free-look for tracking. */
    private fun freeLookHzTrim(hz: Int): Int = when {
        hz >= 120 -> -5
        hz >= 90 -> -3
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
