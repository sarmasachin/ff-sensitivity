package com.ffsensitivity.app.data

import android.content.Context
import com.ffsensitivity.app.util.AppLog

/**
 * Owns purchases + inventory for Coin Shop.
 */
object ShopStore {


    const val ID_BOOST_QUIZ_DOUBLE = "boost_quiz_double"
    const val ID_BOOST_CHECKIN_PLUS = "boost_checkin_plus"
    const val ID_COSMETIC_GOLD_WALLET = "cosmetic_gold_wallet"
    const val ID_COSMETIC_FOIL_OBSIDIAN = "cosmetic_foil_obsidian"
    const val ID_PACK_SCRATCH_BONUS = "pack_scratch_bonus"

    data class OwnedItem(
        val itemId: String,
        val title: String,
        val rewardTag: String,
        val categoryId: String,
        val categoryLabel: String,
        val purchasedAtMs: Long,
        val qty: Int
    )

    data class BuyResult(
        val ok: Boolean,
        val message: String,
        val coinsLeft: Int,
        val errorCode: String? = null
    )

    fun ownedIds(context: Context): Set<String> = ShopStoreIo.readOwned(context)

    fun buyCount(context: Context, itemId: String): Int =
        ShopStoreIo.readCounts(context)[itemId] ?: 0

    fun isOwned(context: Context, item: ShopItem): Boolean {
        if (!item.oneTime) return false
        return item.id in ShopStoreIo.readOwned(context)
    }

    fun ownsItemId(context: Context, itemId: String): Boolean =
        itemId in ShopStoreIo.readOwned(context)

    fun hasGoldWalletStyle(context: Context): Boolean =
        ownsItemId(context, ID_COSMETIC_GOLD_WALLET)

    fun hasObsidianFoil(context: Context): Boolean =
        ownsItemId(context, ID_COSMETIC_FOIL_OBSIDIAN)

    fun boostCharges(context: Context, itemId: String): Int =
        ShopStoreIo.readBoosts(context)[itemId] ?: 0

    // --- Start: Economy live wire (Sachin) ---
    /** Replace local boost UI cache from Nest wallet. */
    fun replaceBoostCharges(context: Context, charges: Map<String, Int>) {
        synchronized(this) {
            ShopStoreIo.writeBoosts(context, charges.filterValues { it > 0 })
        }
    }

    /**
     * Merge server ledger ownership into local prefs (reinstall / multi-device restore).
     * Server counts win for known shop ids; local-only keys are kept if server omits them.
     */
    fun syncInventoryFromServer(
        context: Context,
        ownedShopIds: List<String>,
        shopBuyCounts: Map<String, Int>
    ) {
        runCatching {
            synchronized(this) {
                val owned = ShopStoreIo.readOwned(context).toMutableSet()
                owned.addAll(ownedShopIds.filter { it.isNotBlank() })
                ShopStoreIo.writeOwned(context, owned)

                val counts = ShopStoreIo.readCounts(context).toMutableMap()
                shopBuyCounts.forEach { (id, n) ->
                    if (id.isBlank() || n <= 0) return@forEach
                    counts[id] = n
                }
                ShopStoreIo.writeCounts(context, counts.filterValues { it > 0 })
            }
        }.onFailure {
            AppLog.e("Shop syncInventoryFromServer failed", it)
        }
    }

    /** Persisted idempotency id for in-flight / Retry buys (survives leaving the shop). */
    fun peekPendingRequestId(context: Context, itemId: String): String? {
        if (itemId.isBlank()) return null
        return synchronized(this) {
            ShopStoreIo.readPendingRequests(context)[itemId]?.takeIf { it.length in 8..80 }
        }
    }

    fun putPendingRequestId(context: Context, itemId: String, requestId: String) {
        val safeItem = itemId.trim()
        val safeReq = requestId.trim()
        if (safeItem.isBlank() || safeReq.length < 8 || safeReq.length > 80) return
        synchronized(this) {
            val map = ShopStoreIo.readPendingRequests(context).toMutableMap()
            map[safeItem] = safeReq
            ShopStoreIo.writePendingRequests(context, map)
        }
    }

    fun clearPendingRequestId(context: Context, itemId: String) {
        val safeItem = itemId.trim()
        if (safeItem.isBlank()) return
        synchronized(this) {
            val map = ShopStoreIo.readPendingRequests(context).toMutableMap()
            if (map.remove(safeItem) != null) {
                ShopStoreIo.writePendingRequests(context, map)
            }
        }
    }
    // --- End: Economy live wire (Sachin) ---

    /** Consume one pending boost charge. Returns true if a charge was used. */
    fun consumeBoostCharge(context: Context, itemId: String): Boolean {
        return runCatching {
            synchronized(this) {
                val map = ShopStoreIo.readBoosts(context).toMutableMap()
                val left = map[itemId] ?: 0
                if (left <= 0) return false
                if (left == 1) map.remove(itemId) else map[itemId] = left - 1
                ShopStoreIo.writeBoosts(context, map)
                true
            }
        }.getOrElse {
            AppLog.e("Shop consumeBoost failed", it)
            false
        }
    }

    fun canBuy(context: Context, item: ShopItem, coins: Int): Pair<Boolean, String> {
        if (!item.enabled) return false to "Item unavailable"
        if (item.priceCoins <= 0) return false to "Invalid price"
        if (coins < item.priceCoins) return false to "Need ${item.priceCoins - coins} more coins"
        if (item.oneTime && item.id in ShopStoreIo.readOwned(context)) return false to "Already owned"
        val limit = item.stockLimit
        if (limit != null && buyCount(context, item.id) >= limit) {
            return false to "Out of stock"
        }
        return true to "OK"
    }

    /**
     * Purchase via Nest. Call from a background dispatcher (IO) — not Main.
     * [requestId] must be stable across Retry for the same attempt (idempotency).
     */
    fun purchase(context: Context, itemId: String, requestId: String): BuyResult {
        val coinsNow = { DailyChallengeStore.snapshot(context).coins }
        return runCatching {
            val item = ShopCatalogCache.findById(itemId)
                ?: return BuyResult(false, "Item not found", coinsNow())
            if (!item.enabled) {
                return BuyResult(false, "Item unavailable", coinsNow())
            }
            val safeReq = requestId.trim()
            if (safeReq.length < 8 || safeReq.length > 80) {
                return BuyResult(false, "Invalid purchase request. Try again.", coinsNow())
            }
            synchronized(this) {
                val snap = DailyChallengeStore.snapshot(context)
                val (ok, reason) = canBuy(context, item, snap.coins)
                if (!ok) return BuyResult(false, reason, snap.coins)
            }

            val remote = com.ffsensitivity.app.data.remote.EconomyRepository.purchaseShop(
                context,
                itemId,
                safeReq
            )
            val paid = remote.getOrElse { err ->
                AppLog.e("Shop economy purchase failed", err)
                val api = err as? com.ffsensitivity.app.data.remote.ApiException
                if (api?.code == "SHOP_ALREADY_OWNED") {
                    // Reinstall / desync: restore local one-time ownership without charging again.
                    runCatching {
                        synchronized(this) {
                            if (item.oneTime) {
                                val owned = ShopStoreIo.readOwned(context).toMutableSet()
                                owned.add(item.id)
                                ShopStoreIo.writeOwned(context, owned)
                                val counts = ShopStoreIo.readCounts(context).toMutableMap()
                                if ((counts[item.id] ?: 0) < 1) {
                                    counts[item.id] = 1
                                    ShopStoreIo.writeCounts(context, counts)
                                }
                            }
                        }
                    }.onFailure { AppLog.e("Shop restore owned failed", it) }
                }
                val msg = api?.message ?: "Purchase failed. Check connection."
                return BuyResult(false, msg, coinsNow(), errorCode = api?.code)
            }

            // Coins already updated by EconomyRepository. Local grant must not throw as "failed buy"
            // or Retry with a new requestId could double-charge stackable items.
            var refreshBoosts = false
            runCatching {
                synchronized(this) {
                    if (paid.alreadyApplied) {
                        // Idempotent replay — ensure one-time owned, do not bump counts/history again.
                        if (item.oneTime) {
                            val owned = ShopStoreIo.readOwned(context).toMutableSet()
                            owned.add(item.id)
                            ShopStoreIo.writeOwned(context, owned)
                        }
                        when (item.id) {
                            ID_PACK_SCRATCH_BONUS ->
                                ScratchHistoryStore.addShopToken(
                                    context,
                                    item,
                                    requestId = safeReq
                                )
                            ID_BOOST_QUIZ_DOUBLE,
                            ID_BOOST_CHECKIN_PLUS -> refreshBoosts = true
                        }
                    } else {
                        val owned = ShopStoreIo.readOwned(context).toMutableSet()
                        if (item.oneTime) owned.add(item.id)
                        val counts = ShopStoreIo.readCounts(context).toMutableMap()
                        counts[item.id] = (counts[item.id] ?: 0) + 1
                        val history = ShopStoreIo.readHistory(context).toMutableList()
                        history.add(
                            0,
                            OwnedItem(
                                itemId = item.id,
                                title = item.title,
                                rewardTag = item.rewardTag,
                                categoryId = item.categoryId,
                                categoryLabel = item.categoryLabel,
                                purchasedAtMs = System.currentTimeMillis(),
                                qty = counts[item.id] ?: 1
                            )
                        )
                        while (history.size > 100) history.removeAt(history.lastIndex)

                        ShopStoreIo.writeOwned(context, owned)
                        ShopStoreIo.writeCounts(context, counts)
                        ShopStoreIo.writeHistory(context, history)

                        when (item.id) {
                            ID_PACK_SCRATCH_BONUS ->
                                ScratchHistoryStore.addShopToken(
                                    context,
                                    item,
                                    requestId = safeReq
                                )
                            ID_BOOST_QUIZ_DOUBLE,
                            ID_BOOST_CHECKIN_PLUS -> refreshBoosts = true
                        }
                    }
                }
                if (refreshBoosts) {
                    com.ffsensitivity.app.data.remote.EconomyRepository.refreshWallet(context)
                }
            }.onFailure {
                AppLog.e("Shop local grant after paid failed", it)
            }

            val message = when {
                paid.alreadyApplied -> "Purchase confirmed"
                else -> "Purchased · ${item.title}"
            }
            BuyResult(true, message, paid.coins)
        }.getOrElse {
            AppLog.e("Shop purchase failed", it)
            BuyResult(false, "Purchase failed. Try again.", coinsNow())
        }
    }

    fun myItems(context: Context): List<OwnedItem> {
        return runCatching {
            // Collapse history by itemId keeping latest + total qty from counts
            val counts = ShopStoreIo.readCounts(context)
            val owned = ShopStoreIo.readOwned(context)
            val history = ShopStoreIo.readHistory(context)
            val catalog = ShopCatalogCache.items().associateBy { it.id }
            val fromCounts = counts.keys.mapNotNull { id ->
                val item = catalog[id]
                val hist = history.firstOrNull { it.itemId == id }
                when {
                    item != null -> OwnedItem(
                        itemId = id,
                        title = item.title,
                        rewardTag = item.rewardTag,
                        categoryId = item.categoryId,
                        categoryLabel = item.categoryLabel,
                        purchasedAtMs = hist?.purchasedAtMs ?: System.currentTimeMillis(),
                        qty = counts[id] ?: 1
                    )
                    hist != null -> hist.copy(qty = counts[id] ?: hist.qty)
                    else -> null
                }
            }
            val oneTimeOnly = owned.filter { id -> fromCounts.none { it.itemId == id } }.mapNotNull { id ->
                val item = catalog[id]
                val hist = history.firstOrNull { it.itemId == id }
                when {
                    item != null -> OwnedItem(
                        itemId = id,
                        title = item.title,
                        rewardTag = item.rewardTag,
                        categoryId = item.categoryId,
                        categoryLabel = item.categoryLabel,
                        purchasedAtMs = hist?.purchasedAtMs ?: System.currentTimeMillis(),
                        qty = 1
                    )
                    hist != null -> hist
                    else -> null
                }
            }
            (fromCounts + oneTimeOnly).sortedByDescending { it.purchasedAtMs }
        }.getOrElse {
            AppLog.e("Shop myItems failed", it)
            emptyList()
        }
    }

}
