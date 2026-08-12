package com.ffsensitivity.app.data

import android.content.Context
import com.ffsensitivity.app.util.AppLog
import org.json.JSONArray
import org.json.JSONObject

/** SharedPreferences I/O for [ShopStore]. */
internal object ShopStoreIo {
    const val PREFS = "coin_shop_v1"
    const val KEY_OWNED = "owned_ids"
    const val KEY_COUNTS = "buy_counts_json"
    const val KEY_HISTORY = "history_json"
    const val KEY_BOOSTS = "boost_charges_json"
    const val KEY_PENDING_REQ = "pending_buy_req_json"

    fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun readOwned(context: Context): Set<String> =
        prefs(context).getStringSet(KEY_OWNED, null)?.let { HashSet(it) }.orEmpty()

    fun writeOwned(context: Context, owned: Set<String>) {
        prefs(context).edit().putStringSet(KEY_OWNED, HashSet(owned)).apply()
    }

    fun readCounts(context: Context): Map<String, Int> {
        val raw = prefs(context).getString(KEY_COUNTS, null).orEmpty()
        if (raw.isBlank()) return emptyMap()
        return runCatching {
            val o = JSONObject(raw)
            o.keys().asSequence().associateWith { o.optInt(it, 0) }
        }.getOrDefault(emptyMap())
    }

    fun writeCounts(context: Context, counts: Map<String, Int>) {
        val o = JSONObject()
        counts.forEach { (k, v) -> o.put(k, v) }
        prefs(context).edit().putString(KEY_COUNTS, o.toString()).apply()
    }

    fun readHistory(context: Context): List<ShopStore.OwnedItem> {
        val raw = prefs(context).getString(KEY_HISTORY, null).orEmpty()
        if (raw.isBlank()) return emptyList()
        return runCatching {
            val arr = JSONArray(raw)
            buildList {
                for (i in 0 until arr.length()) {
                    val o = arr.optJSONObject(i) ?: continue
                    val catId = o.optString("categoryId").ifBlank {
                        o.optString("category").ifBlank { "OTHER" }
                    }
                    val catLabel = o.optString("categoryLabel").ifBlank { catId }
                    add(
                        ShopStore.OwnedItem(
                            itemId = o.getString("itemId"),
                            title = o.optString("title"),
                            rewardTag = o.optString("rewardTag"),
                            categoryId = catId,
                            categoryLabel = catLabel,
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

    fun writeHistory(context: Context, history: List<ShopStore.OwnedItem>) {
        val arr = JSONArray()
        history.forEach { e ->
            arr.put(
                JSONObject()
                    .put("itemId", e.itemId)
                    .put("title", e.title)
                    .put("rewardTag", e.rewardTag)
                    .put("categoryId", e.categoryId)
                    .put("categoryLabel", e.categoryLabel)
                    .put("category", e.categoryId)
                    .put("purchasedAtMs", e.purchasedAtMs)
                    .put("qty", e.qty)
            )
        }
        prefs(context).edit().putString(KEY_HISTORY, arr.toString()).apply()
    }

    fun readBoosts(context: Context): Map<String, Int> {
        val raw = prefs(context).getString(KEY_BOOSTS, null).orEmpty()
        if (raw.isBlank()) return emptyMap()
        return runCatching {
            val o = JSONObject(raw)
            o.keys().asSequence().associateWith { o.optInt(it, 0) }
                .filterValues { it > 0 }
        }.getOrDefault(emptyMap())
    }

    fun writeBoosts(context: Context, boosts: Map<String, Int>) {
        val o = JSONObject()
        boosts.filterValues { it > 0 }.forEach { (k, v) -> o.put(k, v) }
        prefs(context).edit().putString(KEY_BOOSTS, o.toString()).apply()
    }

    fun readPendingRequests(context: Context): Map<String, String> {
        val raw = prefs(context).getString(KEY_PENDING_REQ, null).orEmpty()
        if (raw.isBlank()) return emptyMap()
        return runCatching {
            val o = JSONObject(raw)
            o.keys().asSequence().associateWith { o.optString(it) }
                .filterValues { it.length in 8..80 }
        }.getOrDefault(emptyMap())
    }

    fun writePendingRequests(context: Context, pending: Map<String, String>) {
        val o = JSONObject()
        pending.forEach { (k, v) -> o.put(k, v) }
        prefs(context).edit().putString(KEY_PENDING_REQ, o.toString()).apply()
    }
}
