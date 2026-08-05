package com.ffsensitivity.app.data.remote

import com.ffsensitivity.app.util.AppLog

// --- Start: App remote config live wire (Sachin) ---
sealed class AppRemoteGate {
    data object None : AppRemoteGate()
    data class Maintenance(val message: String) : AppRemoteGate()
    data class ForceUpdate(
        val minVersionName: String,
        val playStoreUrl: String
    ) : AppRemoteGate()
}

object AppConfigRepository {
    @Volatile
    private var cache: AppRemoteConfig = AppConfigDefaults.bundle()

    fun snapshot(): AppRemoteConfig = cache

    fun syncLive(): Result<AppRemoteConfig> {
        return AppConfigApi.getLive().map { next ->
            cache = next
            next
        }.onFailure {
            AppLog.e("AppConfigRepository.syncLive failed — keeping last cache", it)
        }
    }

    fun featureOn(key: String): Boolean = cache.features[key] != false

    fun navOn(key: String): Boolean = cache.navigation[key] != false

    fun gate(versionCode: Int): AppRemoteGate {
        val st = cache.status
        if (st.maintenanceMode) {
            val msg = st.maintenanceMessage.ifBlank {
                "We are performing scheduled maintenance. Please try again shortly."
            }
            return AppRemoteGate.Maintenance(msg)
        }
        if (st.forceUpdate && versionCode < st.minVersionCode) {
            return AppRemoteGate.ForceUpdate(
                minVersionName = st.minVersionName,
                playStoreUrl = cache.links.playStoreUrl
            )
        }
        return AppRemoteGate.None
    }

    /** Home tile visibility (feature kill + nav toggle). */
    fun homeTileVisible(featureId: String): Boolean {
        return when (featureId) {
            "share_sensi" -> featureOn("share") && navOn("homeShare")
            "coin_shop" -> featureOn("shop") && navOn("homeShop")
            "daily_challenge" -> featureOn("challenge") && navOn("homeChallenge")
            else -> true
        }
    }

    fun routeAllowed(route: String): Boolean {
        val path = route.substringBefore('/').substringBefore('?')
        return when (path) {
            "redeem", "redeem_comments" -> featureOn("redeem")
            "stylish" -> featureOn("names")
            "scratch_cards" -> featureOn("scratch")
            "coin_shop" -> featureOn("shop")
            "daily_challenge" -> featureOn("challenge")
            "share_sensi" -> featureOn("share")
            "contact" -> featureOn("support")
            else -> true
        }
    }
}
// --- End: App remote config live wire (Sachin) ---
