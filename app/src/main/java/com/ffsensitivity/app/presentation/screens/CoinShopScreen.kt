package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.ffsensitivity.app.data.DailyChallengeStore
import com.ffsensitivity.app.data.ShopAdminTable
import com.ffsensitivity.app.data.ShopCategory
import com.ffsensitivity.app.data.ShopItem
import com.ffsensitivity.app.data.ShopStore
import com.ffsensitivity.app.presentation.components.AtmosphereScaffold
import com.ffsensitivity.app.presentation.components.InlineErrorBanner
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.SafeOps

@Composable
fun CoinShopScreen(
    contentPadding: PaddingValues,
    onBack: () -> Boolean
) {
    val context = LocalContext.current
    var tab by remember { mutableStateOf(ShopTab.STORE) }
    var category by remember { mutableStateOf<ShopCategory?>(null) }
    var coins by remember { mutableIntStateOf(0) }
    var catalog by remember { mutableStateOf<List<ShopItem>>(emptyList()) }
    var owned by remember { mutableStateOf<List<ShopStore.OwnedItem>>(emptyList()) }
    var buyingId by remember { mutableStateOf<String?>(null) }
    var actionError by remember { mutableStateOf<ShopUiError?>(null) }
    var goldWallet by remember { mutableStateOf(false) }
    var catalogLoadFailed by remember { mutableStateOf(false) }

    fun clearError() {
        actionError = null
    }

    fun showError(
        code: String,
        title: String,
        message: String,
        retryKind: ShopRetryKind? = null,
        retryItemId: String? = null
    ) {
        actionError = ShopUiError(code, title, message, retryKind, retryItemId)
    }

    fun showBusy() {
        showError(
            code = "SHOP_BUSY",
            title = "Please wait",
            message = "A purchase is already in progress. Try again in a moment."
        )
    }

    fun refresh(): Boolean {
        return runCatching {
            coins = DailyChallengeStore.snapshot(context).coins
            catalog = ShopAdminTable.items()
            owned = ShopStore.myItems(context)
            goldWallet = ShopStore.hasGoldWalletStyle(context)
            catalogLoadFailed = false
            true
        }.getOrElse {
            AppLog.e("Shop refresh failed", it)
            catalogLoadFailed = true
            showError(
                code = "SHOP_REFRESH_FAILED",
                title = "Shop unavailable",
                message = "Could not load wallet or catalog. Try again.",
                retryKind = ShopRetryKind.REFRESH
            )
            false
        }
    }

    fun backSafe() {
        if (buyingId != null) {
            showBusy()
            return
        }
        clearError()
        val ok = runCatching { onBack() }.getOrElse {
            AppLog.e("Shop back crashed", it)
            false
        }
        if (!ok) {
            showError(
                code = "SHOP_BACK_FAILED",
                title = "Couldn’t go back",
                message = "Navigation failed. Try again."
            )
        }
    }

    fun buyItem(item: ShopItem) {
        if (buyingId != null) {
            showBusy()
            return
        }
        if (item.id.isBlank()) {
            showError(
                code = "SHOP_ITEM_INVALID",
                title = "Item unavailable",
                message = "This product cannot be purchased."
            )
            return
        }
        clearError()
        buyingId = item.id
        val result = runCatching {
            ShopStore.purchase(context, item.id)
        }.getOrElse {
            AppLog.e("Shop buy UI failed", it)
            null
        }
        buyingId = null
        when {
            result == null -> {
                showError(
                    code = "SHOP_BUY_CRASHED",
                    title = "Purchase failed",
                    message = "Something went wrong while buying. Try again.",
                    retryKind = ShopRetryKind.BUY,
                    retryItemId = item.id
                )
            }
            result.ok -> {
                SafeOps.toast(context, result.message)
                coins = result.coinsLeft
                runCatching {
                    catalog = ShopAdminTable.items()
                    owned = ShopStore.myItems(context)
                    goldWallet = ShopStore.hasGoldWalletStyle(context)
                }.onFailure {
                    AppLog.e("Shop refresh after buy failed", it)
                    showError(
                        code = "SHOP_POST_BUY_REFRESH_FAILED",
                        title = "Purchase saved, refresh failed",
                        message = "Item was purchased, but the list didn’t refresh. Pull Retry.",
                        retryKind = ShopRetryKind.REFRESH
                    )
                }
            }
            else -> {
                showError(
                    code = "SHOP_BUY_REJECTED",
                    title = "Couldn’t buy",
                    message = result.message.ifBlank { "Purchase was declined." },
                    retryKind = ShopRetryKind.BUY,
                    retryItemId = item.id
                )
                coins = result.coinsLeft
            }
        }
    }

    fun runRetry(error: ShopUiError) {
        when (error.retryKind) {
            ShopRetryKind.REFRESH -> {
                clearError()
                refresh()
            }
            ShopRetryKind.BUY -> {
                val id = error.retryItemId ?: return
                val item = catalog.firstOrNull { it.id == id }
                    ?: ShopAdminTable.findById(id)
                if (item == null) {
                    showError(
                        code = "SHOP_ITEM_INVALID",
                        title = "Item unavailable",
                        message = "This product is no longer in the catalog."
                    )
                } else {
                    buyItem(item)
                }
            }
            null -> Unit
        }
    }

    LaunchedEffect(Unit) {
        refresh()
    }

    val filtered = remember(catalog, category) {
        runCatching {
            if (category == null) catalog else catalog.filter { it.category == category }
        }.getOrElse {
            AppLog.e("Shop filter failed", it)
            catalog
        }
    }

    AtmosphereScaffold {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(contentPadding)
                .statusBarsPadding()
                .navigationBarsPadding()
        ) {
            ShopTopBar(onBack = { backSafe() })
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                actionError?.let { err ->
                    item(key = "shop_error_${err.code}") {
                        InlineErrorBanner(
                            title = err.title,
                            message = err.message,
                            onDismiss = { clearError() },
                            retryLabel = if (err.retryKind != null) "Retry" else null,
                            onRetry = if (err.retryKind != null) {
                                { runRetry(err) }
                            } else {
                                null
                            }
                        )
                    }
                }
                item {
                    ShopWalletHero(coins = coins, goldStyle = goldWallet)
                }
                item {
                    ShopTabRow(
                        tab = tab,
                        onSelect = {
                            clearError()
                            tab = it
                        }
                    )
                }
                if (tab == ShopTab.STORE) {
                    item {
                        CategoryChips(
                            selected = category,
                            onSelect = {
                                clearError()
                                category = it
                            }
                        )
                    }
                    when {
                        catalogLoadFailed && catalog.isEmpty() -> {
                            item {
                                EmptyShopBlock("Catalog failed to load. Use Retry above.")
                            }
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
                                ShopProductCard(
                                    item = item,
                                    ownedOnce = ownedOnce,
                                    buyCount = count,
                                    canBuy = canBuy && buyingId == null,
                                    blockedReason = if (canBuy) null else reason,
                                    busy = buyingId == item.id,
                                    onBuy = { buyItem(item) }
                                )
                            }
                        }
                    }
                } else {
                    if (owned.isEmpty()) {
                        item {
                            EmptyShopBlock("No purchases yet. Buy items from the Store tab.")
                        }
                    } else {
                        items(owned, key = { "${it.itemId}_${it.purchasedAtMs}" }) { row ->
                            OwnedProductCard(row)
                        }
                    }
                }
                item { Spacer(modifier = Modifier.height(24.dp)) }
            }
        }
    }
}
