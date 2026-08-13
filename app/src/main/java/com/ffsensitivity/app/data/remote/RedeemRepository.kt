package com.ffsensitivity.app.data.remote

import android.content.Context
import com.ffsensitivity.app.data.DailyChallengeStore
import com.ffsensitivity.app.data.RedeemCatalogCache
import com.ffsensitivity.app.data.RedeemCatalogPayload
import com.ffsensitivity.app.data.RedeemCodeItem
import com.ffsensitivity.app.data.RedeemMode
import com.ffsensitivity.app.data.RedeemStatus
import com.ffsensitivity.app.data.UserSessionStore
import java.util.UUID

// --- Start: Redeem live wire (Sachin) ---
object RedeemRepository {
    fun loadCatalog(context: Context): Result<RedeemCatalogPayload> {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return Result.failure(
                ApiException("AUTH_REQUIRED", "Please sign in again to load rewards.")
            )
        }
        return RedeemApi.catalog(token).onSuccess { payload ->
            RedeemCatalogCache.putAll(payload.items)
        }
    }

    fun findInCatalog(context: Context, itemId: String): Result<RedeemCodeItem?> {
        RedeemCatalogCache.get(itemId)?.let { return Result.success(it) }
        return loadCatalog(context).map { payload ->
            payload.items.firstOrNull { it.id == itemId }
        }
    }

    /**
     * Local gate before opening scratch dialog.
     * Failures should show on Redeem Now — do not open the card.
     */
    fun precheckScratch(
        context: Context,
        item: RedeemCodeItem,
        alreadyUnlockedLocally: Boolean
    ): Result<Unit> {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return Result.failure(
                ApiException("AUTH_REQUIRED", "Please sign in again to unlock this reward.")
            )
        }
        if (item.status != RedeemStatus.ACTIVE) {
            return Result.failure(
                ApiException("REDEEM_ALREADY_CLAIMED", "This reward is not available right now.")
            )
        }
        if (item.isScratchReward) {
            if (!item.canScratch && !item.needsAd) {
                return Result.failure(
                    ApiException(
                        "REDEEM_SCRATCH_BLOCKED",
                        "This scratch card is not available right now."
                    )
                )
            }
            return Result.success(Unit)
        }
        if (alreadyUnlockedLocally || item.serverUnlocked) {
            return Result.failure(
                ApiException(
                    "REDEEM_ALREADY_UNLOCKED",
                    "Already unlocked. Use Copy Code on this card."
                )
            )
        }
        val stock = item.stockLeft
        if (stock != null && stock <= 0) {
            return Result.failure(
                ApiException("REDEEM_OUT_OF_STOCK", "This reward is out of stock.")
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
        return Result.success(Unit)
    }

    fun claimCode(context: Context, item: RedeemCodeItem): Result<RedeemClaimResult> {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return Result.failure(
                ApiException("AUTH_REQUIRED", "Please sign in again to unlock this code.")
            )
        }
        if (item.mode == RedeemMode.SCRATCH_REWARD) {
            return Result.failure(
                ApiException(
                    "REDEEM_USE_SCRATCH",
                    "Scratch this card to earn coins."
                )
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

    fun scratchReward(
        context: Context,
        item: RedeemCodeItem,
        attemptKey: String = UUID.randomUUID().toString().replace("-", "").take(32)
    ): Result<RedeemScratchResult> {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return Result.failure(
                ApiException("AUTH_REQUIRED", "Please sign in again to scratch.")
            )
        }
        return RedeemApi.scratch(token, item.id, attemptKey).mapCatching { result ->
            result.coinsRemaining?.let { remaining ->
                DailyChallengeStore.setCoins(
                    context,
                    remaining,
                    "+${result.coinsGranted} coins · ${item.title}"
                )
            }
            result
        }
    }

    fun unlockScratchAfterAd(context: Context, item: RedeemCodeItem): Result<Unit> {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return Result.failure(
                ApiException("AUTH_REQUIRED", "Please sign in again.")
            )
        }
        return RedeemApi.scratchAdUnlock(token, item.id)
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
