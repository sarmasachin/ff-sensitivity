package com.ffsensitivity.app.engine

/**
 * Human labels for Pro Max crowd match tiers (playstyle summary + trust badge).
 * Keep device_hz / family_hz / family / chip_hz checks before broader prefixes.
 */
internal object ProMaxCrowdTierLabel {

    fun peerSummary(
        matchFrom: String,
        matchCount: Int,
        confPct: Int,
        communityActive: Boolean,
    ): String {
        if (matchCount <= 0 && !communityActive) return "crowd ready"
        val short = shortName(matchFrom, matchCount)
        return if (matchCount > 0) {
            "peers $short×$matchCount·$confPct%"
        } else {
            "crowd ready"
        }
    }

    fun shortName(matchFrom: String, matchCount: Int): String {
        val from = matchFrom.removeSuffix("_cache").removeSuffix("_blend")
        return when {
            from.startsWith("device_hz_play") -> "modelHz"
            from.startsWith("device_family_hz_play") -> "familyHz"
            from.startsWith("device_family_play") -> "family"
            from.startsWith("device_play") -> "model"
            from.startsWith("chip_hz_play") -> "chipHz"
            from.startsWith("chip_play") -> "chip"
            from.startsWith("hw_play") -> "hw"
            from.startsWith("ram_play") -> "ram"
            from.startsWith("hz_play") -> "hz"
            from.startsWith("dpi_guard_play") -> "dpi"
            from.startsWith("play") -> "play"
            matchCount > 0 -> "all"
            else -> "none"
        }
    }

    /** Trust-badge wording (slightly fuller than playstyle short codes). */
    fun trustTier(matchFrom: String, matchCount: Int): String {
        val from = matchFrom.removeSuffix("_cache").removeSuffix("_blend")
        return when {
            from.startsWith("device_hz_play") -> "model·Hz"
            from.startsWith("device_family_hz_play") -> "family·Hz"
            from.startsWith("device_family_play") -> "family"
            from.startsWith("device_play") -> "model"
            from.startsWith("chip_hz_play") -> "chip·Hz"
            from.startsWith("chip_play") -> "chip"
            from.startsWith("hw_play") -> "hardware"
            from.startsWith("ram_play") -> "RAM"
            from.startsWith("hz_play") -> "refresh"
            from.startsWith("dpi_guard_play") -> "DPI"
            from.startsWith("play") -> "playstyle"
            matchCount > 0 -> "all peers"
            else -> "no compare yet"
        }
    }
}
