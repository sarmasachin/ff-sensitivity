package com.ffsensitivity.app.presentation.screens

import android.content.Context
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import com.ffsensitivity.app.data.ShopCategoryRef
import com.ffsensitivity.app.data.ShopItem
import com.ffsensitivity.app.data.ShopStore
import com.ffsensitivity.app.util.AppLog

internal fun LazyListScope.coinShopStoreSection(
    context: Context,
    categories: List<ShopCategoryRef>,
    categoryId: String?,
    onSelectCategory: (String?) -> Unit,
    catalogLoadFailed: Boolean,
    catalogEmpty: Boolean,
    filtered: List<ShopItem>,
    coins: Int,
    buyingId: String?,
    walletFrozen: Boolean,
    onBuy: (ShopItem) -> Unit
) {
    item {
        CategoryChips(
            categories = categories,
            selectedId = categoryId,
            onSelect = onSelectCategory
        )
    }
    when {
        catalogLoadFailed && catalogEmpty -> {
            item { EmptyShopBlock("Catalog failed to load. Use Retry above.") }
        }
        filtered.isEmpty() -> {
            item { EmptyShopBlock("No items in this category.") }
        }
        else -> {
            items(filtered, key = { it.id }) { item ->
                val ownedOnce = runCatching {
                    ShopStore.isOwned(context, item)
                }.getOrDefault(false)
                val count = runCatching {
                    ShopStore.buyCount(context, item.id)
                }.getOrDefault(0)
                val (canBuy, reason) = runCatching {
                    ShopStore.canBuy(context, item, coins)
                }.getOrElse {
                    AppLog.e("Shop canBuy failed id=${item.id}", it)
                    false to "Unavailable right now"
                }
                val buyEnabled = canBuy && buyingId == null && !walletFrozen
                ShopProductCard(
                    item = item,
                    ownedOnce = ownedOnce,
                    buyCount = count,
                    canBuy = buyEnabled,
                    blockedReason = when {
                        walletFrozen -> "Wallet frozen"
                        canBuy -> null
                        else -> reason
                    },
                    busy = buyingId == item.id,
                    onBuy = { onBuy(item) }
                )
            }
        }
    }
}

internal fun LazyListScope.coinShopOwnedSection(owned: List<ShopStore.OwnedItem>) {
    if (owned.isEmpty()) {
        item { EmptyShopBlock("No purchases yet. Buy items from the Store tab.") }
    } else {
        items(owned, key = { "${it.itemId}_${it.purchasedAtMs}" }) { row ->
            OwnedProductCard(row)
        }
    }
}
