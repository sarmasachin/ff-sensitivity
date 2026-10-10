package com.ffsensitivity.app.data

import com.ffsensitivity.app.data.remote.ShopCatalogRemoteItem
import com.ffsensitivity.app.util.AppLog

/**
 * Live shop catalog from Nest. No hardcoded offline seed.
 */
object ShopCatalogCache {
    @Volatile
    private var remoteItems: List<ShopItem> = emptyList()

    @Volatile
    private var remoteCategories: List<ShopCategoryRef> = emptyList()

    fun items(): List<ShopItem> =
        remoteItems.filter { it.enabled && it.priceCoins > 0 }

    fun categories(): List<ShopCategoryRef> = remoteCategories

    fun findById(id: String): ShopItem? = items().firstOrNull { it.id == id }

    /** This device just bought one unit — other sessions learn it from the next catalog fetch. */
    fun recordSale(itemId: String) {
        remoteItems = remoteItems.map { item ->
            if (item.id == itemId) item.copy(stockSold = item.stockSold + 1) else item
        }
    }

    fun markSoldOut(itemId: String) {
        remoteItems = remoteItems.map { item ->
            if (item.id != itemId) item
            else {
                val limit = item.stockLimit
                if (limit == null) item
                else item.copy(stockSold = maxOf(item.stockSold, limit))
            }
        }
    }

    fun applyRemote(
        rows: List<ShopCatalogRemoteItem>,
        categories: List<Pair<String, String>> = emptyList()
    ) {
        runCatching {
            remoteItems = rows.mapNotNull { row ->
                val id = row.id.trim()
                if (id.isBlank() || row.priceCoins <= 0) return@mapNotNull null
                val catId = row.category.trim().ifBlank { "OTHER" }
                ShopItem(
                    id = id,
                    title = row.title.trim().ifBlank { id },
                    subtitle = row.subtitle.trim(),
                    categoryId = catId,
                    categoryLabel = row.categoryLabel.trim().ifBlank { catId },
                    priceCoins = row.priceCoins,
                    enabled = row.enabled,
                    oneTime = row.oneTime,
                    stockLimit = row.stockLimit,
                    stockSold = row.stockSold.coerceAtLeast(0),
                    rewardTag = row.rewardTag.trim().ifBlank { "ITEM" }
                )
            }
            remoteCategories = if (categories.isNotEmpty()) {
                categories.map { (cid, label) ->
                    ShopCategoryRef(cid, label.ifBlank { cid })
                }
            } else {
                remoteItems
                    .map { it.categoryId to it.categoryLabel }
                    .distinctBy { it.first }
                    .map { ShopCategoryRef(it.first, it.second) }
            }
        }.onFailure {
            AppLog.e("ShopCatalogCache.applyRemote failed", it)
        }
    }
}
