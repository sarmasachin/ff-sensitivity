package com.ffsensitivity.app.presentation.screens

import com.ffsensitivity.app.data.CompareFeedback
import com.ffsensitivity.app.data.SensitivityValues
import com.ffsensitivity.app.engine.SensitivityResult

internal enum class CompareRetryKind { COMPARE, SAVE }

internal data class CompareUiError(
    val code: String,
    val title: String,
    val message: String,
    val retryKind: CompareRetryKind? = null
)

internal fun SensitivityResult.toValues(): SensitivityValues = SensitivityValues(
    general = general,
    redDot = redDot,
    scope2x = scope2x,
    scope4x = scope4x,
    sniper = sniper,
    freeLook = freeLook,
    fireButton = fireButton
)

internal fun filterDigits(raw: String): String =
    raw.filter { it.isDigit() }.take(3)

internal fun parseActual(
    general: String,
    redDot: String,
    scope2x: String,
    scope4x: String,
    sniper: String,
    freeLook: String,
    fireButton: String
): SensitivityValues? {
    fun scope(v: String): Int? = v.toIntOrNull()?.takeIf { it in 0..200 }
    fun fire(v: String): Int? = v.toIntOrNull()?.takeIf { it in 1..100 }
    return SensitivityValues(
        general = scope(general) ?: return null,
        redDot = scope(redDot) ?: return null,
        scope2x = scope(scope2x) ?: return null,
        scope4x = scope(scope4x) ?: return null,
        sniper = scope(sniper) ?: return null,
        freeLook = scope(freeLook) ?: return null,
        fireButton = fire(fireButton) ?: return null
    )
}

internal fun signed(v: Int): String = if (v > 0) "+$v" else "$v"

internal fun insightText(generalDiff: Int, feedback: CompareFeedback): String {
    val base = when {
        generalDiff == 0 -> "General matches exactly — solid baseline."
        generalDiff > 0 -> "You keep General ${signed(generalDiff)} faster than the app."
        else -> "You keep General ${signed(generalDiff)} slower than the app."
    }
    val feel = when (feedback) {
        CompareFeedback.TOO_SLOW -> " Feel tag: Too slow."
        CompareFeedback.TOO_FAST -> " Feel tag: Too fast."
        CompareFeedback.PERFECT -> " Feel tag: Perfect."
    }
    return base + feel + " Saved to local history for offset learning."
}
