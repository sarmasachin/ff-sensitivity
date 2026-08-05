package com.ffsensitivity.app.presentation.screens

internal enum class RedeemRetryKind { COMMENTS, SCRATCH, COPY }

internal enum class RedeemTab { DAILY, WEEKLY }

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
