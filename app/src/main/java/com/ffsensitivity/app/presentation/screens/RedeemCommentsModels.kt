package com.ffsensitivity.app.presentation.screens

internal enum class CommentsRetryKind { RELOAD, POST }

internal data class CommentsUiError(
    val code: String,
    val title: String,
    val message: String,
    val retryKind: CommentsRetryKind? = null
)

internal fun relativeTime(createdAtMs: Long): String {
    val diff = (System.currentTimeMillis() - createdAtMs).coerceAtLeast(0L)
    val mins = diff / 60_000
    val hours = diff / 3_600_000
    val days = diff / 86_400_000
    return when {
        mins < 1 -> "Just now"
        mins < 60 -> "${mins}m"
        hours < 24 -> "${hours}h"
        days < 7 -> "${days}d"
        else -> "${days / 7}w"
    }
}
