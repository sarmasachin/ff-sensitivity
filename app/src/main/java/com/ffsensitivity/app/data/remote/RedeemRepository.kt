package com.ffsensitivity.app.data.remote

import android.content.Context
import com.ffsensitivity.app.data.DailyChallengeStore
import com.ffsensitivity.app.data.RedeemCatalogCache
import com.ffsensitivity.app.data.RedeemCodeItem
import com.ffsensitivity.app.data.UserSessionStore

// --- Start: Redeem live wire (Sachin) ---
object RedeemRepository {
    fun loadCatalog(context: Context): Result<List<RedeemCodeItem>> {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return Result.failure(
                ApiException("AUTH_REQUIRED", "Please sign in again to load gift codes.")
            )
        }
        return RedeemApi.catalog(token).onSuccess { list ->
            RedeemCatalogCache.putAll(list)
        }
    }

    fun findInCatalog(context: Context, itemId: String): Result<RedeemCodeItem?> {
        RedeemCatalogCache.get(itemId)?.let { return Result.success(it) }
        return loadCatalog(context).map { list ->
            list.firstOrNull { it.id == itemId }
        }
    }

    fun claimCode(context: Context, item: RedeemCodeItem): Result<RedeemClaimResult> {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return Result.failure(
                ApiException("AUTH_REQUIRED", "Please sign in again to unlock this code.")
            )
        }

        val cost = item.coinCost
        if (cost != null && cost > 0) {
            val coins = DailyChallengeStore.snapshot(context).coins
            if (coins < cost) {
                return Result.failure(
                    ApiException(
                        "NOT_ENOUGH_COINS",
                        "You need $cost coins to unlock this reward."
                    )
                )
            }
        }

        return RedeemApi.claim(token, item.id).mapCatching { result ->
            result.coinsRemaining?.let { remaining ->
                DailyChallengeStore.setCoins(
                    context,
                    remaining,
                    if (result.alreadyClaimed) "Wallet synced" else "Redeem · ${item.title}"
                )
            }
            result
        }
    }

    // --- Start: Claims live wire (Sachin) ---
    fun myClaims(context: Context): Result<List<RedeemApi.MyClaimRow>> {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return Result.failure(
                ApiException("AUTH_REQUIRED", "Please sign in again to load claim history.")
            )
        }
        return RedeemApi.myClaims(token)
    }
    // --- End: Claims live wire (Sachin) ---
}
// --- End: Redeem live wire (Sachin) ---
