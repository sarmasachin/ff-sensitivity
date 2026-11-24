package com.ffsensitivity.app.data

/**
 * Absolute soft targets from Community share cards (approved/featured).
 * Applied only by SettingsEngineProMax after Compare offsets.
 */
data class ProMaxCommunityPull(
    val general: Int = 0,
    val redDot: Int = 0,
    val scope2x: Int = 0,
    val scope4x: Int = 0,
    val sniper: Int = 0,
    val freeLook: Int = 0,
    val weight: Double = 0.0,
    val matchCount: Int = 0,
    val source: String = "none"
) {
    val active: Boolean get() = weight > 0.0 && matchCount >= 2
}

/** Per-field peer agreement 0.3–1.0 from server MAD (1 = tight). */
data class ProMaxFieldAgreement(
    val general: Double = 1.0,
    val redDot: Double = 1.0,
    val scope2x: Double = 1.0,
    val scope4x: Double = 1.0,
    val sniper: Double = 1.0,
    val freeLook: Double = 1.0,
    val fireButton: Double = 1.0
) {
    fun weakestLabel(): String? {
        val pairs = listOf(
            "General" to general,
            "Red Dot" to redDot,
            "2x" to scope2x,
            "4x" to scope4x,
            "Sniper" to sniper,
            "Free Look" to freeLook,
            "Fire" to fireButton
        )
        val weak = pairs.minByOrNull { it.second } ?: return null
        if (weak.second >= 0.75) return null
        val band = when {
            weak.second >= 0.5 -> "mid"
            else -> "low"
        }
        return "${weak.first} agreement $band"
    }
}

/** Remote dampen knobs from Nest `shareConflict` (ProMax-only). */
data class ProMaxShareConflictKnobs(
    val softGap: Double = 8.0,
    val hardGap: Double = 35.0,
    val maxShrink: Double = 0.75
)

/**
 * Peer avg(actual − suggested) + optional community absolute pull.
 * Applied only by [com.ffsensitivity.app.engine.SettingsEngineProMax].
 */
data class ProMaxCrowdOffsets(
    val general: Int = 0,
    val redDot: Int = 0,
    val scope2x: Int = 0,
    val scope4x: Int = 0,
    val sniper: Int = 0,
    val freeLook: Int = 0,
    val fireButton: Int = 0,
    val matchFrom: String = "none",
    val matchCount: Int = 0,
    val confidence: Double = 0.0,
    val blendFrom: String = "",
    val fieldAgreement: ProMaxFieldAgreement = ProMaxFieldAgreement(),
    val community: ProMaxCommunityPull = ProMaxCommunityPull(),
    val shareConflict: ProMaxShareConflictKnobs = ProMaxShareConflictKnobs()
) {
    val hasAny: Boolean
        get() = general != 0 || redDot != 0 || scope2x != 0 || scope4x != 0 ||
            sniper != 0 || freeLook != 0 || fireButton != 0 || community.active
}
