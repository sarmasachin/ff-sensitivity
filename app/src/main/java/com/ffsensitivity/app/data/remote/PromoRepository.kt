package com.ffsensitivity.app.data.remote

import com.ffsensitivity.app.util.AppLog

// --- Start: Promos live wire (Sachin) ---
object PromoCatalogCache {
    @Volatile
    var promos: List<PromoPayload> = emptyList()
        private set

    fun set(next: List<PromoPayload>) {
        promos = next
    }

    fun banners(): List<PromoPayload> =
        promos.filter { it.placement == "HOME_BANNER" }

    fun strips(): List<PromoPayload> =
        promos.filter { it.placement == "HOME_STRIP" }
}

object PromoRepository {
    fun syncLive(): Result<List<PromoPayload>> {
        return PromoApi.getLive().map { list ->
            PromoCatalogCache.set(list)
            list
        }.onFailure {
            AppLog.e("PromoRepository.syncLive failed — keeping last cache", it)
        }
    }

    /** Map allowlisted ffops:// path → NavHost route. */
    fun routeForDeepLink(deepLink: String): String? {
        val raw = deepLink.trim().lowercase()
        if (!raw.startsWith("ffops://")) return null
        val path = raw.removePrefix("ffops://").substringBefore('/').substringBefore('?')
        return when (path) {
            "home" -> "home"
            "challenge", "daily_challenge" -> "daily_challenge"
            "scratch" -> "scratch_cards"
            "shop", "coin_shop" -> "coin_shop"
            "redeem" -> "redeem"
            "names", "stylish" -> "stylish"
            "inbox", "notifications", "push_inbox" -> "push_inbox"
            "contact", "support" -> "contact"
            "about" -> "about"
            "share", "share_sensi" -> "share_sensi"
            "sensi" -> "device_fetch/sensi"
            "hud" -> "device_fetch/hud"
            "graphics" -> "device_fetch/graphics"
            "dpi" -> "device_fetch/dpi"
            else -> null
        }
    }
}
// --- End: Promos live wire (Sachin) ---
