package com.ffsensitivity.app.engine

import kotlin.math.abs

/**
 * Peer vs community absolute conflict dampening (ProMax-only).
 *
 * When share-card targets diverge hard from the already-applied
 * engine + crowd + personal-prior baseline *and* peer match is solid,
 * shrink share pull weight so cards don't fight a good compare match.
 *
 * Weak/no peers → keep full share weight (share is the backup signal).
 * Soft/hard gap + maxShrink come from Nest `shareConflict` (defaults below).
 */
internal object ProMaxShareConflict {

    private const val MAX_W = 0.32

    /** Defaults match api DEFAULT_PROMAX_CONFIG.shareConflict. */
    data class Knobs(
        val softGap: Double = SOFT_GAP,
        val hardGap: Double = HARD_GAP,
        val maxShrink: Double = MAX_SHRINK,
    ) {
        companion object {
            val DEFAULT = Knobs()
        }
    }

    const val SOFT_GAP = 8.0
    const val HARD_GAP = 35.0
    /** Max fraction of weight removed under full conflict + strong peers. */
    const val MAX_SHRINK = 0.75

    data class FieldPair(val current: Int, val target: Int)

    fun dampenedWeight(
        baseWeight: Double,
        peerMatchCount: Int,
        peerConfidence: Double,
        pairs: List<FieldPair>,
        knobs: Knobs = Knobs.DEFAULT,
    ): Double {
        val w0 = baseWeight.coerceIn(0.0, MAX_W)
        if (w0 <= 0.0 || pairs.isEmpty()) return w0

        val peerStrength = peerStrength(peerMatchCount, peerConfidence)
        // No solid peers → do not dampen.
        if (peerStrength < 0.12) return w0

        val soft = knobs.softGap.coerceIn(0.0, 50.0)
        val hard = knobs.hardGap.coerceIn(soft + 1.0, 100.0)
        val maxShrink = knobs.maxShrink.coerceIn(0.0, 0.95)

        val meanAbs = pairs.map { abs(it.target - it.current).toDouble() }.average()
        val conflict = ((meanAbs - soft) / (hard - soft)).coerceIn(0.0, 1.0)
        if (conflict <= 0.0) return w0

        val shrink = 1.0 - (conflict * peerStrength * maxShrink)
        return (w0 * shrink).coerceIn(0.0, MAX_W)
    }

    private fun peerStrength(matchCount: Int, confidence: Double): Double {
        if (matchCount <= 0) return 0.0
        val n = matchCount.coerceIn(1, 12) / 12.0
        return (confidence.coerceIn(0.0, 1.0) * n).coerceIn(0.0, 1.0)
    }
}
