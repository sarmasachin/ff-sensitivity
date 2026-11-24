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
    val auth = httpCode == 401 || isAuthFailureCode(code)
    if (auth && code != "AUTH_SUSPENDED" && code != "AUTH_GOOGLE_INVALID") {
        return "AUTH_REQUIRED" to friendlyApiMessage("AUTH_REQUIRED", message)
    }
    val resolvedCode = if (auth) code else code.trim().ifBlank { "HTTP_$httpCode" }
    return resolvedCode to friendlyApiMessage(resolvedCode, message)
}
