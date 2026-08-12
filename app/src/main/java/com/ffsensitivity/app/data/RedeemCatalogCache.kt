package com.ffsensitivity.app.data

/**
 * In-memory catalog keyed by live redeem id (cuid).
 * Filled on catalog fetch / claim so comments can resolve a live code id.
 */
// --- Start: Redeem live wire (Sachin) ---
object RedeemCatalogCache {

    @Volatile
    private var byId: Map<String, RedeemCodeItem> = emptyMap()

    fun putAll(items: List<RedeemCodeItem>) {
        byId = items
            .filter { it.id.isNotBlank() && !it.id.contains('/') }
            .associateBy { it.id }
    }

    fun put(item: RedeemCodeItem) {
        if (item.id.isBlank() || item.id.contains('/')) return
        byId = byId + (item.id to item)
    }

    fun get(id: String): RedeemCodeItem? {
        if (id.isBlank() || id.contains('/')) return null
        return byId[id]
    }
}
// --- End: Redeem live wire (Sachin) ---
