package com.ffsensitivity.app.data

/**
 * Dynamic shop category (from Nest catalog).
 */
data class ShopCategoryRef(
    val id: String,
    val label: String
)

/**
 * One sellable shop row.
 */
data class ShopItem(
    val id: String,
    val title: String,
    val subtitle: String,
    val categoryId: String,
    val categoryLabel: String,
    val priceCoins: Int,
    val enabled: Boolean = true,
    val oneTime: Boolean = true,
    val stockLimit: Int? = null,
    val rewardTag: String
)
