package com.ffsensitivity.app.engine

import com.ffsensitivity.app.data.AppSession
import com.ffsensitivity.app.data.FingerCount
import com.ffsensitivity.app.data.ProMaxCrowdOffsets
import com.ffsensitivity.app.util.AppLog
import kotlin.math.roundToInt

/**
 * One Tap Premium peer + personal prior + community share apply.
 * Order matches Pro Max: peers → last-compare soft prior → share.
 * Keeps headshot Red Dot / scope ladder invariants after every pull.
 * Does not touch Classic / Best / Pro Max engines.
 */
internal object SettingsEngineOneTapCrowd {

    private const val CROWD_GEN = 8
    private const val CROWD_SCOPE = 8
    private const val CROWD_FIRE = 3
    private const val SHARE_W_MAX = 0.24

    data class Applied(
        val general: Int,
        val redDot: Int,
        val scope2x: Int,
        val scope4x: Int,
        val sniper: Int,
        val freeLook: Int,
        val fireButton: Int,
        val shareWeight: Double,
        val notes: List<String>
    )

    fun apply(
        generalIn: Int,
        rdPanelTrim: Int,
        panelHz: Int,
        sniperBase: Int,
        freeLookBase: Int,
        fireBase: Int,
        fingers: FingerCount,
        crowd: ProMaxCrowdOffsets = AppSession.oneTapCrowdOffsets
    ): Applied {
        val minLift = SettingsEngineOneTap.rdMinLift(panelHz)
        val cGen = crowd.general.coerceIn(-CROWD_GEN, CROWD_GEN)
        val cRd = crowd.redDot.coerceIn(-CROWD_SCOPE, CROWD_SCOPE)
        val c2 = crowd.scope2x.coerceIn(-CROWD_SCOPE, CROWD_SCOPE)
        val c4 = crowd.scope4x.coerceIn(-CROWD_SCOPE, CROWD_SCOPE)
        val cSn = crowd.sniper.coerceIn(-CROWD_SCOPE, CROWD_SCOPE)
        val cFl = crowd.freeLook.coerceIn(-CROWD_SCOPE, CROWD_SCOPE)
        val cFire = crowd.fireButton.coerceIn(-CROWD_FIRE, CROWD_FIRE)

        // Peer deltas fold into the same Hz-tier invariant helper.
        var (general, redDot) = SettingsEngineOneTap.headshotGeneralAndRedDot(
            generalIn = generalIn + cGen,
            rdExtraTrim = rdPanelTrim + cRd,
            panelHz = panelHz
        )

        var (scope2x, scope4x) = SettingsEngineOneTap.headshotScopes(general, redDot)
        scope2x = (scope2x + c2).coerceIn(30, minOf(SettingsEngineOneTap.SCOPE_2X_SOFT_MAX, redDot))
        scope4x = (scope4x + c4).coerceIn(20, SettingsEngineOneTap.SCOPE_4X_SOFT_MAX)
        // Re-lock 2x/4x ladder under Red Dot after peer nudge.
        val ladder = SettingsEngineOneTap.headshotScopes(general, redDot)
        scope2x = minOf(maxOf(scope2x, ladder.first), redDot)
        scope4x = minOf(
            scope4x,
            (scope2x - SettingsEngineOneTap.SCOPE_2X_VS_4X_MIN_GAP).coerceAtLeast(20)
        )

        // Rebase sniper on locked General (not pre-crowd generalIn).
        val sniperRoleExtra = sniperBase - (generalIn * 0.5).roundToInt()
        var sniper = ((general * 0.5).roundToInt() + sniperRoleExtra + cSn).coerceIn(20, 140)
        var freeLook = (freeLookBase + cFl).coerceIn(20, 195)
        var fireButton = fireInBand(fireBase + cFire, fingers)

        // Personal last-compare soft prior (after peers, before share) — Pro Max parity.
        val priorStore = AppSession.oneTapPersonalPrior
        val prior = priorStore.softAdds()
        val priorNotes = mutableListOf<String>()
        if (priorStore.active) {
            general = (general + prior.general).coerceIn(50, 200)
            redDot = (redDot + prior.redDot).coerceIn(40, SettingsEngineOneTap.RD_SOFT_MAX)
            scope2x = (scope2x + prior.scope2x).coerceIn(
                30,
                minOf(SettingsEngineOneTap.SCOPE_2X_SOFT_MAX, redDot)
            )
            scope4x = (scope4x + prior.scope4x).coerceIn(20, SettingsEngineOneTap.SCOPE_4X_SOFT_MAX)
            sniper = (sniper + prior.sniper).coerceIn(20, 140)
            freeLook = (freeLook + prior.freeLook).coerceIn(20, 195)
            fireButton = fireInBand(fireButton + prior.fireButton, fingers)
            val locked = relockHeadshot(general, redDot, scope2x, scope4x, panelHz)
            general = locked.general
            redDot = locked.redDot
            scope2x = locked.scope2x
            scope4x = locked.scope4x
            priorNotes.add("Personal prior · soft 28%")
            if (prior.general != 0) priorNotes.add(signed("Prior General", prior.general))
            if (prior.redDot != 0) priorNotes.add(signed("Prior Red Dot", prior.redDot))
            if (prior.scope2x != 0) priorNotes.add(signed("Prior 2x", prior.scope2x))
            if (prior.fireButton != 0) priorNotes.add(signed("Prior Fire", prior.fireButton))
        }
        AppLog.i(
            "ONE_TAP_PRIOR_OK|active=${if (priorStore.active) 1 else 0}|" +
                "g=${prior.general}|rd=${prior.redDot}|s2=${prior.scope2x}|fb=${prior.fireButton}"
        )

        val share = crowd.community
        var shareW = 0.0
        if (share.active) {
            val sc = crowd.shareConflict
            shareW = ProMaxShareConflict.dampenedWeight(
                baseWeight = share.weight.coerceIn(0.0, SHARE_W_MAX),
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
            ).coerceIn(0.0, SHARE_W_MAX)
            fun pull(cur: Int, target: Int, lo: Int, hi: Int): Int {
                val mixed = (cur * (1.0 - shareW) + target * shareW).roundToInt()
                return mixed.coerceIn(lo, hi)
            }
            general = pull(general, share.general, 50, 200)
            redDot = pull(redDot, share.redDot, 40, SettingsEngineOneTap.RD_SOFT_MAX)
            scope2x = pull(
                scope2x,
                share.scope2x,
                30,
                minOf(SettingsEngineOneTap.SCOPE_2X_SOFT_MAX, redDot)
            )
            scope4x = pull(scope4x, share.scope4x, 20, SettingsEngineOneTap.SCOPE_4X_SOFT_MAX)
            val lockedShare = relockHeadshot(general, redDot, scope2x, scope4x, panelHz)
            general = lockedShare.general
            redDot = lockedShare.redDot
            scope2x = lockedShare.scope2x
            scope4x = lockedShare.scope4x
            sniper = pull(sniper, share.sniper, 20, 140)
            freeLook = pull(freeLook, share.freeLook, 20, 195)
        }
        AppSession.oneTapSharePullWeight = shareW

        val notes = buildList {
            add(
                "One-Tap crowd = ${crowd.matchFrom} ×${crowd.matchCount} · " +
                    "conf ${(crowd.confidence * 100).toInt().coerceIn(0, 100)}%"
            )
            add(
                "RD Hz tier = ${panelHz}Hz · base +" +
                    "${SettingsEngineOneTap.rdBaseLift(panelHz)} · min +$minLift"
            )
            if (cGen != 0) add(signed("Crowd General", cGen))
            if (cRd != 0) add(signed("Crowd Red Dot", cRd))
            if (c2 != 0) add(signed("Crowd 2x", c2))
            if (c4 != 0) add(signed("Crowd 4x", c4))
            if (cSn != 0) add(signed("Crowd Sniper", cSn))
            if (cFl != 0) add(signed("Crowd Free Look", cFl))
            if (cFire != 0) add(signed("Crowd Fire", cFire))
            addAll(priorNotes)
            if (share.active) {
                add(
                    "One-Tap share ${share.source}×${share.matchCount} · " +
                        "pull ${(shareW * 100).toInt()}%"
                )
            }
        }

        check(redDot >= general + minLift) {
            "One Tap crowd broke RD invariant: RD=$redDot G=$general hz=$panelHz min=$minLift"
        }

        return Applied(
            general = general,
            redDot = redDot,
            scope2x = scope2x,
            scope4x = scope4x,
            sniper = sniper,
            freeLook = freeLook,
            fireButton = fireButton,
            shareWeight = shareW,
            notes = notes
        )
    }

    private data class LockedScopes(
        val general: Int,
        val redDot: Int,
        val scope2x: Int,
        val scope4x: Int
    )

    /** Re-assert Hz-tier RD lift + 2x/4x ladder after soft prior / share pulls. */
    private fun relockHeadshot(
        generalIn: Int,
        redDotIn: Int,
        scope2xIn: Int,
        scope4xIn: Int,
        panelHz: Int
    ): LockedScopes {
        val minLift = SettingsEngineOneTap.rdMinLift(panelHz)
        var (general, redDot) = SettingsEngineOneTap.headshotGeneralAndRedDot(
            generalIn = generalIn,
            rdExtraTrim = 0,
            panelHz = panelHz
        )
        redDot = maxOf(redDot, redDotIn).coerceAtMost(SettingsEngineOneTap.RD_SOFT_MAX)
        if (redDot < general + minLift) {
            val fix = SettingsEngineOneTap.headshotGeneralAndRedDot(
                generalIn = general,
                rdExtraTrim = 0,
                panelHz = panelHz
            )
            general = fix.first
            redDot = fix.second
        }
        val scp = SettingsEngineOneTap.headshotScopes(general, redDot)
        var scope2x = minOf(maxOf(scope2xIn, scp.first), redDot)
        var scope4x = minOf(
            maxOf(scope4xIn, 20),
            (scope2x - SettingsEngineOneTap.SCOPE_2X_VS_4X_MIN_GAP).coerceAtLeast(20)
        )
        scope2x = minOf(scope2x, SettingsEngineOneTap.SCOPE_2X_SOFT_MAX)
        scope4x = minOf(scope4x, SettingsEngineOneTap.SCOPE_4X_SOFT_MAX)
        return LockedScopes(general, redDot, scope2x, scope4x)
    }

    private fun fireInBand(raw: Int, fingers: FingerCount): Int {
        val (lo, hi) = when (fingers) {
            FingerCount.TWO -> 38 to 42
            FingerCount.THREE -> 44 to 47
            FingerCount.FOUR -> 46 to 49
            FingerCount.FIVE -> 48 to 51
            FingerCount.SIX -> 50 to 53
        }
        return raw.coerceIn(lo, hi)
    }

    private fun signed(label: String, delta: Int): String {
        val sign = if (delta > 0) "+$delta" else "$delta"
        return "$label $sign"
    }
}
