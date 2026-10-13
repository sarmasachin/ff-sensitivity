package com.ffsensitivity.app.data.remote

import android.content.Context
import com.ffsensitivity.app.data.DailyChallengeStore
import com.ffsensitivity.app.data.ScratchHistoryStore
import com.ffsensitivity.app.data.UserSessionStore
import com.ffsensitivity.app.util.AppLog

// --- Start: Scratch live wire (Sachin) ---
object ScratchConfigCache {
    @Volatile
    var config: ScratchConfigPayload? = null
        private set

    fun set(next: ScratchConfigPayload) {
        config = next
        ScratchHistoryStore.retentionDays = next.retentionDays.coerceIn(1, 365)
        ScratchHistoryStore.autoPurge = next.autoPurge
    }
}

object ScratchRepository {
    fun syncConfig(context: Context): Result<ScratchConfigPayload> {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return Result.failure(ApiException("AUTH_REQUIRED", "Please sign in again."))
        }
        return ScratchApi.getConfig(token).map { payload ->
            ScratchConfigCache.set(payload)
            payload
        }.onFailure { AppLog.e("ScratchRepository.syncConfig failed", it) }
    }

    fun rollDaily(context: Context): Result<ScratchRollResult> {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return Result.failure(
                ApiException("AUTH_REQUIRED", "Please sign in again to scratch.")
            )
        }
        return ScratchApi.roll(token).map { result ->
            DailyChallengeStore.setCoins(context, result.coins, result.rewardLabel)
            ScratchApi.getConfig(token).onSuccess { ScratchConfigCache.set(it) }
            result
        }
    }

    fun history(context: Context): Result<List<com.ffsensitivity.app.data.ScratchedCardEntry>> {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return Result.failure(ApiException("AUTH_REQUIRED", "Please sign in again."))
        }
        return ScratchApi.history(token).map { payload ->
            ScratchHistoryStore.retentionDays = payload.retentionDays.coerceIn(1, 365)
            payload.items
        }.onFailure { AppLog.e("ScratchRepository.history failed", it) }
    }
}
// --- End: Scratch live wire (Sachin) ---
