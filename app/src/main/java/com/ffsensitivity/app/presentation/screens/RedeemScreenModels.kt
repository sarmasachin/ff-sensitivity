package com.ffsensitivity.app.presentation.screens

import com.ffsensitivity.app.data.remote.ApiException
import com.ffsensitivity.app.data.remote.isAuthFailure
import com.ffsensitivity.app.data.remote.userMessage

internal enum class RedeemRetryKind { COMMENTS, SCRATCH, COPY }

internal data class RedeemUiError(
    val code: String,
    val title: String,
    val message: String,
    val retryKind: RedeemRetryKind? = null,
    val retryItemId: String? = null
)

/** Map catalog load failure to UI — never hide AUTH as a fake “connection” error. */
internal fun redeemCatalogLoadError(error: Throwable?): RedeemUiError {
    val api = error as? ApiException
    if (api != null && api.isAuthFailure()) {
        return RedeemUiError(
            code = "AUTH_REQUIRED",
            title = "Sign in required",
            message = api.userMessage("Session expired. Sign in again to load rewards.")
        )
    }
    return RedeemUiError(
        code = api?.code ?: "REDEEM_CATALOG_FAILED",
        title = "Rewards unavailable",
        message = error?.userMessage(
            "Could not load rewards. Check your connection and try again."
        ) ?: "Could not load rewards. Check your connection and try again."
    )
}

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
