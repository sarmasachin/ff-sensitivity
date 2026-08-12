package com.ffsensitivity.app.data.remote

import com.ffsensitivity.app.util.AppLog
import org.json.JSONObject

// --- Start: Economy live wire (Sachin) ---
data class EconomyWallet(
    val coins: Int,
    val frozen: Boolean = false,
    val boosts: Map<String, Int> = emptyMap(),
    /** One-time shop items already purchased (server ledger). */
    val ownedShopIds: List<String> = emptyList(),
    /** Per-item purchase counts from ledger (stock / inventory sync). */
    val shopBuyCounts: Map<String, Int> = emptyMap()
)

data class EconomyEarnResult(
    val coins: Int,
    val delta: Int,
    val alreadyApplied: Boolean,
    val reason: String,
    val nextAdAvailableAtMs: Long? = null
)

data class EconomyPurchaseResult(
    val coins: Int,
    val itemId: String,
    val alreadyApplied: Boolean
)

data class ShopCatalogRemoteItem(
    val id: String,
    val title: String,
    val subtitle: String,
    val category: String,
    val categoryLabel: String,
    val priceCoins: Int,
    val enabled: Boolean,
    val oneTime: Boolean,
    val stockLimit: Int?,
    val rewardTag: String
)

data class ShopCatalogPayload(
    val items: List<ShopCatalogRemoteItem>,
    val categories: List<Pair<String, String>>
)

object EconomyApi {
    fun getWallet(accessToken: String): Result<EconomyWallet> {
        return runCatching {
            val req = ApiClient.get("/api/v1/economy/wallet", accessToken)
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) throw ApiClient.parseError(raw, resp.code)
                val root = JSONObject(raw)
                val boostsObj = root.optJSONObject("boosts")
                val boosts = mutableMapOf<String, Int>()
                if (boostsObj != null) {
                    val keys = boostsObj.keys()
                    while (keys.hasNext()) {
                        val k = keys.next()
                        boosts[k] = boostsObj.optInt(k, 0)
                    }
                }
                val ownedArr = root.optJSONArray("ownedShopIds")
                val ownedShopIds = buildList {
                    if (ownedArr != null) {
                        for (i in 0 until ownedArr.length()) {
                            val id = ownedArr.optString(i).trim()
                            if (id.isNotBlank()) add(id)
                        }
                    }
                }
                val countsObj = root.optJSONObject("shopBuyCounts")
                val shopBuyCounts = mutableMapOf<String, Int>()
                if (countsObj != null) {
                    val keys = countsObj.keys()
                    while (keys.hasNext()) {
                        val k = keys.next()
                        val n = countsObj.optInt(k, 0)
                        if (n > 0) shopBuyCounts[k] = n
                    }
                }
                EconomyWallet(
                    coins = root.optInt("coins", 0),
                    frozen = root.optBoolean("frozen", false),
                    boosts = boosts,
                    ownedShopIds = ownedShopIds,
                    shopBuyCounts = shopBuyCounts
                )
            }
        }.onFailure { AppLog.e("EconomyApi.getWallet failed", it) }
    }

    fun earnChallenge(
        accessToken: String,
        kind: String,
        correct: Boolean? = null,
        milestoneDays: Int? = null
    ): Result<EconomyEarnResult> {
        return runCatching {
            val body = JSONObject().put("kind", kind)
            if (correct != null) body.put("correct", correct)
            if (milestoneDays != null) body.put("milestoneDays", milestoneDays)
            val req = ApiClient.post("/api/v1/economy/challenge/earn", body, accessToken)
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) throw ApiClient.parseError(raw, resp.code)
                val root = JSONObject(raw)
                EconomyEarnResult(
                    coins = root.optInt("coins", 0),
                    delta = root.optInt("delta", 0),
                    alreadyApplied = root.optBoolean("alreadyApplied", false),
                    reason = root.optString("reason"),
                    nextAdAvailableAtMs = if (
                        root.has("nextAdAvailableAtMs") && !root.isNull("nextAdAvailableAtMs")
                    ) {
                        root.optLong("nextAdAvailableAtMs")
                    } else {
                        null
                    }
                )
            }
        }.onFailure { AppLog.e("EconomyApi.earnChallenge failed", it) }
    }

    fun purchaseShop(
        accessToken: String,
        itemId: String,
        requestId: String
    ): Result<EconomyPurchaseResult> {
        return runCatching {
            val body = JSONObject()
                .put("itemId", itemId)
                .put("requestId", requestId)
            val req = ApiClient.post("/api/v1/economy/shop/purchase", body, accessToken)
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) throw ApiClient.parseError(raw, resp.code)
                val root = JSONObject(raw)
                EconomyPurchaseResult(
                    coins = root.optInt("coins", 0),
                    itemId = root.optString("itemId", itemId),
                    alreadyApplied = root.optBoolean("alreadyApplied", false)
                )
            }
        }.onFailure { AppLog.e("EconomyApi.purchaseShop failed", it) }
    }

    fun shopCatalog(accessToken: String): Result<ShopCatalogPayload> {
        return runCatching {
            val req = ApiClient.get("/api/v1/economy/shop/catalog", accessToken)
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) throw ApiClient.parseError(raw, resp.code)
                val root = JSONObject(raw)
                val catsArr = root.optJSONArray("categories")
                val categories = buildList {
                    if (catsArr != null) {
                        for (i in 0 until catsArr.length()) {
                            val o = catsArr.optJSONObject(i) ?: continue
                            val cid = o.optString("id").trim()
                            if (cid.isBlank()) continue
                            add(cid to o.optString("label").trim().ifBlank { cid })
                        }
                    }
                }
                val arr = root.optJSONArray("items")
                val items = buildList {
                    if (arr != null) {
                        for (i in 0 until arr.length()) {
                            val o = arr.optJSONObject(i) ?: continue
                            val id = o.optString("id").trim()
                            if (id.isBlank()) continue
                            val stock = if (o.has("stockLimit") && !o.isNull("stockLimit")) {
                                o.optInt("stockLimit")
                            } else {
                                null
                            }
                            val cat = o.optString("category")
                            add(
                                ShopCatalogRemoteItem(
                                    id = id,
                                    title = o.optString("title"),
                                    subtitle = o.optString("subtitle"),
                                    category = cat,
                                    categoryLabel = o.optString("categoryLabel").ifBlank { cat },
                                    priceCoins = o.optInt("priceCoins", 0),
                                    enabled = o.optBoolean("enabled", true),
                                    oneTime = o.optBoolean("oneTime", true),
                                    stockLimit = stock,
                                    rewardTag = o.optString("rewardTag")
                                )
                            )
                        }
                    }
                }
                ShopCatalogPayload(items = items, categories = categories)
            }
        }.onFailure { AppLog.e("EconomyApi.shopCatalog failed", it) }
    }
}
// --- End: Economy live wire (Sachin) ---
