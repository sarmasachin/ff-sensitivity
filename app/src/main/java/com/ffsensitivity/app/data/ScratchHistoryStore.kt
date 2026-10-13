package com.ffsensitivity.app.data

/**
 * Retention window for the scratch archive. The card list itself comes from the server.
 */
object ScratchHistoryStore {

    @Volatile
    var retentionDays: Int = 30
        set(value) {
            field = value.coerceIn(1, 365)
        }

    @Volatile
    var autoPurge: Boolean = true

    val RETENTION_DAYS: Int get() = retentionDays
    val RETENTION_MS: Long get() = retentionDays * 24L * 60L * 60L * 1000L
}
