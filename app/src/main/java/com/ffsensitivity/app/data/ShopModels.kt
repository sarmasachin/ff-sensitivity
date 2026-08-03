package com.ffsensitivity.app.data

/**
 * Shop item categories — used for filters + admin table grouping.
 */
enum class ShopCategory(val label: String) {
    PRIZE("Prizes"),
    BOOST("Boosts"),
    UNLOCK("Unlocks"),
    PACK("Packs"),
    COSMETIC("Cosmetics")
}

/**
 * One sellable row in the admin shop table.
 *
 * @param id Stable unique key (never reuse after live users bought it).
 * @param title Short product name.
 * @param subtitle What the user gets.
 * @param category Filter group.
 * @param priceCoins Coin cost (must be > 0).
 * @param enabled Admin on/off switch without deleting the row.
 * @param oneTime If true, user can buy only once.
 * @param stockLimit Max total purchases app-wide for this device (null = unlimited).
 * @param rewardTag Short chip on the card (e.g. "BADGE", "2X").
 */
data class ShopItem(
    val id: String,
    val title: String,
    val subtitle: String,
    val category: ShopCategory,
    val priceCoins: Int,
    val enabled: Boolean = true,
    val oneTime: Boolean = true,
    val stockLimit: Int? = null,
    val rewardTag: String
)
