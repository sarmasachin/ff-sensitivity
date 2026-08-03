package com.ffsensitivity.app.data

data class SensitivityValues(
    val general: Int,
    val redDot: Int,
    val scope2x: Int,
    val scope4x: Int,
    val sniper: Int,
    val freeLook: Int,
    val fireButton: Int
) {
    fun diffAgainst(other: SensitivityValues): SensitivityValues = SensitivityValues(
        general = general - other.general,
        redDot = redDot - other.redDot,
        scope2x = scope2x - other.scope2x,
        scope4x = scope4x - other.scope4x,
        sniper = sniper - other.sniper,
        freeLook = freeLook - other.freeLook,
        fireButton = fireButton - other.fireButton
    )
}

enum class CompareFeedback(val label: String, val storageKey: String) {
    TOO_SLOW("Too slow", "too_slow"),
    PERFECT("Perfect", "perfect"),
    TOO_FAST("Too fast", "too_fast")
}

data class SensitivityCompareEntry(
    val timestamp: Long,
    val deviceLabel: String,
    val fingers: String,
    val role: String,
    val dpiPreference: String,
    val screenGuard: String,
    val suggested: SensitivityValues,
    val actual: SensitivityValues,
    val feedback: CompareFeedback
)
