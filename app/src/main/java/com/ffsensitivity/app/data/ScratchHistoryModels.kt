package com.ffsensitivity.app.data

enum class ScratchCardKind {
    MILESTONE,
    REDEEM,
    SHOP
}

data class ScratchedCardEntry(
    val id: String,
    val kind: ScratchCardKind,
    val title: String,
    val detail: String,
    val rewardLabel: String,
    val code: String? = null,
    val coins: Int = 0,
    val badge: String? = null,
    val scratchedAtMs: Long
) {
    fun daysLeft(nowMs: Long = System.currentTimeMillis()): Int {
        val age = (nowMs - scratchedAtMs).coerceAtLeast(0L)
        val leftMs = ScratchHistoryStore.RETENTION_MS - age
        return ((leftMs + 86_399_999L) / 86_400_000L).toInt().coerceIn(0, ScratchHistoryStore.RETENTION_DAYS)
    }

    fun isExpired(nowMs: Long = System.currentTimeMillis()): Boolean =
        nowMs - scratchedAtMs >= ScratchHistoryStore.RETENTION_MS
}
