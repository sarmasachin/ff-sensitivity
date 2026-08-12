package com.ffsensitivity.app.data

/**
 * Offline fallback only — empty by design.
 * Live catalog comes from Nest `/api/v1/economy/shop/catalog`.
 */
object ShopAdminTable {
    fun items(): List<ShopItem> = emptyList()

    fun findById(id: String): ShopItem? = null
}
