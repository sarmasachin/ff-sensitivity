package com.ffsensitivity.app.data.remote

import android.content.Context
import com.ffsensitivity.app.data.DailyChallengeStore
import com.ffsensitivity.app.data.ShopStore
import com.ffsensitivity.app.data.UserSessionStore
import com.ffsensitivity.app.util.AppLog

// --- Start: Economy live wire (Sachin) ---
object EconomyRepository {
    @Volatile
    var lastFrozen: Boolean = false
        private set

    fun refreshWallet(context: Context): Result<Int> {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return Result.failure(ApiException("AUTH_REQUIRED", "Please sign in again."))
        }
        return EconomyApi.getWallet(token).map { wallet ->
            lastFrozen = wallet.frozen
            if (wallet.frozen) {
                AppLog.w("Wallet frozen by ops — earn/spend blocked server-side")
            }
            DailyChallengeStore.setCoins(context, wallet.coins, "Wallet synced")
            syncBoostsLocal(context, wallet.boosts)
            ShopStore.syncInventoryFromServer(
                context = context,
                ownedShopIds = wallet.ownedShopIds,
                shopBuyCounts = wallet.shopBuyCounts
            )
            wallet.coins
        }
    }

    fun earnCheckIn(context: Context): Result<EconomyEarnResult> =
        earn(context, "CHECKIN")

    fun earnQuiz(context: Context, correct: Boolean): Result<EconomyEarnResult> =
        Result.failure(
            ApiException(
                "ECONOMY_QUIZ_MOVED",
                "Quiz must be submitted via Challenge API."
            )
        )

    fun earnAd(context: Context): Result<EconomyEarnResult> =
        earn(context, "AD")

    fun earnMilestone(context: Context, days: Int): Result<EconomyEarnResult> =
        earn(context, "MILESTONE", milestoneDays = days)

    fun purchaseShop(
        context: Context,
        itemId: String,
        requestId: String
    ): Result<EconomyPurchaseResult> {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return Result.failure(
                ApiException("AUTH_REQUIRED", "Please sign in again to buy this item.")
            )
        }
        val safeReq = requestId.trim()
        if (safeReq.length < 8 || safeReq.length > 80) {
            return Result.failure(
                ApiException("SHOP_BAD_REQUEST", "Invalid purchase request. Try again.")
            )
        }
        return EconomyApi.purchaseShop(token, itemId, safeReq).map { result ->
            DailyChallengeStore.setCoins(context, result.coins, "Shop · $itemId")
            result
        }
    }

    private fun earn(
        context: Context,
        kind: String,
        correct: Boolean? = null,
        milestoneDays: Int? = null
    ): Result<EconomyEarnResult> {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return Result.failure(
                ApiException("AUTH_REQUIRED", "Please sign in again to earn coins.")
            )
        }
        return EconomyApi.earnChallenge(token, kind, correct, milestoneDays).map { result ->
            DailyChallengeStore.setCoins(context, result.coins, result.reason.ifBlank { "Earn" })
            // Refresh boost cache after earn (server may have consumed a charge).
            EconomyApi.getWallet(token).onSuccess { wallet ->
                syncBoostsLocal(context, wallet.boosts)
            }
            result
        }
    }

    /** Mirror server boost charges into local ShopStore for UI. */
    private fun syncBoostsLocal(context: Context, boosts: Map<String, Int>) {
        runCatching {
            ShopStore.replaceBoostCharges(
                context,
                mapOf(
                    ShopStore.ID_BOOST_CHECKIN_PLUS to (boosts[ShopStore.ID_BOOST_CHECKIN_PLUS] ?: 0),
                    ShopStore.ID_BOOST_QUIZ_DOUBLE to (boosts[ShopStore.ID_BOOST_QUIZ_DOUBLE] ?: 0)
                )
            )
        }.onFailure { AppLog.e("syncBoostsLocal failed", it) }
    }
}
// --- End: Economy live wire (Sachin) ---
