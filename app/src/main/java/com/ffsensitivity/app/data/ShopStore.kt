package com.ffsensitivity.app.data

import android.content.Context
import com.ffsensitivity.app.util.AppLog
import org.json.JSONArray
import org.json.JSONObject

/**
 * Owns purchases + inventory for Coin Shop.
 */
object ShopStore {

    private const val PREFS = "coin_shop_v1"
    private const val KEY_OWNED = "owned_ids"
    private const val KEY_COUNTS = "buy_counts_json"
    private const val KEY_HISTORY = "history_json"
    private const val KEY_BOOSTS = "boost_charges_json"

    const val ID_BOOST_QUIZ_DOUBLE = "boost_quiz_double"
    const val ID_BOOST_CHECKIN_PLUS = "boost_checkin_plus"
    const val ID_COSMETIC_GOLD_WALLET = "cosmetic_gold_wallet"
    const val ID_COSMETIC_FOIL_OBSIDIAN = "cosmetic_foil_obsidian"
    const val ID_PACK_SCRATCH_BONUS = "pack_scratch_bonus"

    data class OwnedItem(
        val itemId: String,
        val title: String,
        val rewardTag: String,
        val category: ShopCategory,
        val purchasedAtMs: Long,
        val qty: Int
    )

    data class BuyResult(
        val ok: Boolean,
        val message: String,
        val coinsLeft: Int
    )

    fun ownedIds(context: Context): Set<String> = readOwned(context)

    fun buyCount(context: Context, itemId: String): Int =
        readCounts(context)[itemId] ?: 0

    fun isOwned(context: Context, item: ShopItem): Boolean {
        if (!item.oneTime) return false
        return item.id in readOwned(context)
    }

    fun ownsItemId(context: Context, itemId: String): Boolean =
        itemId in readOwned(context)

    fun hasGoldWalletStyle(context: Context): Boolean =
        ownsItemId(context, ID_COSMETIC_GOLD_WALLET)

    fun hasObsidianFoil(context: Context): Boolean =
        ownsItemId(context, ID_COSMETIC_FOIL_OBSIDIAN)

    fun boostCharges(context: Context, itemId: String): Int =
        readBoosts(context)[itemId] ?: 0

    // --- Start: Economy live wire (Sachin) ---
    /** Replace local boost UI cache from Nest wallet. */
    fun replaceBoostCharges(context: Context, charges: Map<String, Int>) {
        synchronized(this) {
            writeBoosts(context, charges.filterValues { it > 0 })
        }
    }
    // --- End: Economy live wire (Sachin) ---

    /** Consume one pending boost charge. Returns true if a charge was used. */
    fun consumeBoostCharge(context: Context, itemId: String): Boolean {
        return runCatching {
            synchronized(this) {
                val map = readBoosts(context).toMutableMap()
                val left = map[itemId] ?: 0
                if (left <= 0) return false
                if (left == 1) map.remove(itemId) else map[itemId] = left - 1
                writeBoosts(context, map)
                true
            }
        }.getOrElse {
            AppLog.e("Shop consumeBoost failed", it)
            false
        }
    }

    private fun grantBoostCharge(context: Context, itemId: String) {
        val map = readBoosts(context).toMutableMap()
        map[itemId] = (map[itemId] ?: 0) + 1
        writeBoosts(context, map)
    }

    fun canBuy(context: Context, item: ShopItem, coins: Int): Pair<Boolean, String> {
        if (!item.enabled) return false to "Item unavailable"
        if (item.priceCoins <= 0) return false to "Invalid price"
        if (coins < item.priceCoins) return false to "Need ${item.priceCoins - coins} more coins"
        if (item.oneTime && item.id in readOwned(context)) return false to "Already owned"
        val limit = item.stockLimit
        if (limit != null && buyCount(context, item.id) >= limit) {
            return false to "Out of stock"
        }
        return true to "OK"
    }

    fun purchase(context: Context, itemId: String): BuyResult {
        return runCatching {
            val item = ShopAdminTable.findById(itemId)
                ?: return BuyResult(false, "Item not found", DailyChallengeStore.snapshot(context).coins)
            if (!item.enabled) {
                return BuyResult(false, "Item unavailable", DailyChallengeStore.snapshot(context).coins)
            }
            synchronized(this) {
                val snap = DailyChallengeStore.snapshot(context)
                val (ok, reason) = canBuy(context, item, snap.coins)
                if (!ok) return BuyResult(false, reason, snap.coins)
            }

            // --- Start: Economy live wire (Sachin) ---
            val remote = com.ffsensitivity.app.data.remote.EconomyRepository.purchaseShop(context, itemId)
            val paid = remote.getOrElse {
                AppLog.e("Shop economy purchase failed", it)
                val msg = (it as? com.ffsensitivity.app.data.remote.ApiException)?.message
                    ?: "Purchase failed. Check connection."
                return BuyResult(false, msg, DailyChallengeStore.snapshot(context).coins)
            }
            // --- End: Economy live wire (Sachin) ---

            synchronized(this) {
                val owned = readOwned(context).toMutableSet()
                if (item.oneTime) owned.add(item.id)
                val counts = readCounts(context).toMutableMap()
                counts[item.id] = (counts[item.id] ?: 0) + 1
                val history = readHistory(context).toMutableList()
                history.add(
                    0,
                    OwnedItem(
                        itemId = item.id,
                        title = item.title,
                        rewardTag = item.rewardTag,
                        category = item.category,
                        purchasedAtMs = System.currentTimeMillis(),
                        qty = counts[item.id] ?: 1
                    )
                )
                while (history.size > 100) history.removeAt(history.lastIndex)

                writeOwned(context, owned)
                writeCounts(context, counts)
                writeHistory(context, history)

                when (item.id) {
                    ID_PACK_SCRATCH_BONUS -> ScratchHistoryStore.addShopToken(context, item)
                    // Boost charges live on Nest; refresh local UI cache.
                    ID_BOOST_QUIZ_DOUBLE,
                    ID_BOOST_CHECKIN_PLUS -> {
                        com.ffsensitivity.app.data.remote.EconomyRepository.refreshWallet(context)
                    }
                }

                BuyResult(true, "Purchased · ${item.title}", paid.coins)
            }
        }.getOrElse {
            AppLog.e("Shop purchase failed", it)
            BuyResult(false, "Purchase failed. Try again.", DailyChallengeStore.snapshot(context).coins)
        }
    }

    fun myItems(context: Context): List<OwnedItem> {
        return runCatching {
            // Collapse history by itemId keeping latest + total qty from counts
            val counts = readCounts(context)
            val owned = readOwned(context)
            val catalog = ShopAdminTable.items().associateBy { it.id }
            val fromCounts = counts.keys.mapNotNull { id ->
                val item = catalog[id] ?: ShopAdminTable.findById(id) ?: return@mapNotNull null
                OwnedItem(
                    itemId = id,
                    title = item.title,
                    rewardTag = item.rewardTag,
                    category = item.category,
                    purchasedAtMs = readHistory(context).firstOrNull { it.itemId == id }?.purchasedAtMs
                        ?: System.currentTimeMillis(),
                    qty = counts[id] ?: 1
                )
            }
            val oneTimeOnly = owned.filter { id -> fromCounts.none { it.itemId == id } }.mapNotNull { id ->
                val item = catalog[id] ?: ShopAdminTable.findById(id) ?: return@mapNotNull null
                OwnedItem(
                    itemId = id,
                    title = item.title,
                    rewardTag = item.rewardTag,
                    category = item.category,
                    purchasedAtMs = System.currentTimeMillis(),
                    qty = 1
                )
            }
            (fromCounts + oneTimeOnly).sortedByDescending { it.purchasedAtMs }
        }.getOrElse {
            AppLog.e("Shop myItems failed", it)
            emptyList()
        }
    }

    private fun readOwned(context: Context): Set<String> {
        return prefs(context).getStringSet(KEY_OWNED, null)
            ?.let { HashSet(it) }
            .orEmpty()
    }

    private fun writeOwned(context: Context, owned: Set<String>) {
        prefs(context).edit().putStringSet(KEY_OWNED, HashSet(owned)).apply()
    }

    private fun readCounts(context: Context): Map<String, Int> {
        val raw = prefs(context).getString(KEY_COUNTS, null).orEmpty()
        if (raw.isBlank()) return emptyMap()
        return runCatching {
            val o = JSONObject(raw)
            o.keys().asSequence().associateWith { o.optInt(it, 0) }
        }.getOrDefault(emptyMap())
    }

    private fun writeCounts(context: Context, counts: Map<String, Int>) {
        val o = JSONObject()
        counts.forEach { (k, v) -> o.put(k, v) }
        prefs(context).edit().putString(KEY_COUNTS, o.toString()).apply()
    }

    private fun readHistory(context: Context): List<OwnedItem> {
        val raw = prefs(context).getString(KEY_HISTORY, null).orEmpty()
        if (raw.isBlank()) return emptyList()
        return runCatching {
            val arr = JSONArray(raw)
            buildList {
                for (i in 0 until arr.length()) {
                    val o = arr.optJSONObject(i) ?: continue
                    add(
                        OwnedItem(
                            itemId = o.getString("itemId"),
                            title = o.optString("title"),
                            rewardTag = o.optString("rewardTag"),
                            category = runCatching {
                                ShopCategory.valueOf(o.getString("category"))
                            }.getOrDefault(ShopCategory.PACK),
                            purchasedAtMs = o.getLong("purchasedAtMs"),
                            qty = o.optInt("qty", 1)
                        )
                    )
                }
            }
        }.getOrElse {
            AppLog.e("Shop history parse failed", it)
            emptyList()
        }
    }

    private fun writeHistory(context: Context, history: List<OwnedItem>) {
        val arr = JSONArray()
        history.forEach { e ->
            arr.put(
                JSONObject()
                    .put("itemId", e.itemId)
                    .put("title", e.title)
                    .put("rewardTag", e.rewardTag)
                    .put("category", e.category.name)
                    .put("purchasedAtMs", e.purchasedAtMs)
                    .put("qty", e.qty)
            )
        }
        prefs(context).edit().putString(KEY_HISTORY, arr.toString()).apply()
    }

    private fun readBoosts(context: Context): Map<String, Int> {
        val raw = prefs(context).getString(KEY_BOOSTS, null).orEmpty()
        if (raw.isBlank()) return emptyMap()
        return runCatching {
            val o = JSONObject(raw)
            o.keys().asSequence().associateWith { o.optInt(it, 0) }
                .filterValues { it > 0 }
        }.getOrDefault(emptyMap())
    }

    private fun writeBoosts(context: Context, boosts: Map<String, Int>) {
        val o = JSONObject()
        boosts.filterValues { it > 0 }.forEach { (k, v) -> o.put(k, v) }
        prefs(context).edit().putString(KEY_BOOSTS, o.toString()).apply()
    }

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
