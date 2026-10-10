package com.ffsensitivity.app.data.remote

private val AUTH_CODES = setOf(
    "AUTH_REQUIRED",
    "AUTH_EXPIRED",
    "AUTH_INVALID",
    "AUTH_REVOKED",
    "HTTP_401",
)

fun ApiException.isAuthFailure(): Boolean = isAuthFailureCode(code)

fun isAuthFailureCode(code: String): Boolean {
    val c = code.trim()
    return c.equals("Unauthorized", ignoreCase = true) || c in AUTH_CODES
}

fun normalizeApiError(code: String, message: String, httpCode: Int): Pair<String, String> {
    if (code == "AUTH_GOOGLE_INVALID" || code == "AUTH_SUSPENDED") {
        return code to message.ifBlank { "Something went wrong. Please try again." }
    }
    val auth = httpCode == 401 || isAuthFailureCode(code)
    if (!auth) {
        return code to message.ifBlank { "Something went wrong. Please try again." }
    }
    val msg = when {
        message.isBlank() || message.equals("Unauthorized", ignoreCase = true) ->
            "Session expired. Sign in again."
        else -> message
    }
    return "AUTH_REQUIRED" to msg
}
