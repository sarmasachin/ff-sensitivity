package com.ffsensitivity.app.presentation.screens

internal enum class RedeemRetryKind { COMMENTS, SCRATCH, COPY }

internal data class RedeemUiError(
    val code: String,
    val title: String,
    val message: String,
    val retryKind: RedeemRetryKind? = null,
    val retryItemId: String? = null
)

internal fun maskCode(code: String): String {
    val parts = code.split("-")
    if (parts.size < 4) return "****-****-****-****"
    return "${parts[0]}-****-****-${parts.last()}"
}

internal fun isMaskedRedeemCode(code: String): Boolean {
    val c = code.trim()
    if (c.isBlank()) return true
    return c.contains('•') || c.contains("****") || c.contains('…')
}

internal fun copyableRedeemSecret(code: String): String? {
    val secret = code.trim()
    return secret.takeIf { it.isNotBlank() && !isMaskedRedeemCode(it) }
}
