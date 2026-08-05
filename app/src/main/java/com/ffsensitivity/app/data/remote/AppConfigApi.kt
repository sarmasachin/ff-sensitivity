package com.ffsensitivity.app.data.remote

import com.ffsensitivity.app.util.AppLog
import org.json.JSONObject

// --- Start: App remote config live wire (Sachin) ---
data class AppRemoteStatus(
    val maintenanceMode: Boolean,
    val maintenanceMessage: String,
    val forceUpdate: Boolean,
    val softUpdatePrompt: Boolean,
    val minVersionCode: Int,
    val minVersionName: String
)

data class AppRemoteLinks(
    val playStoreUrl: String,
    val privacyUrl: String,
    val websiteUrl: String,
    val supportEmail: String
)

data class AppRemoteConfig(
    val status: AppRemoteStatus,
    val features: Map<String, Boolean>,
    val navigation: Map<String, Boolean>,
    val links: AppRemoteLinks
)

object AppConfigApi {
    fun getLive(): Result<AppRemoteConfig> {
        return runCatching {
            val req = ApiClient.get("/api/v1/app/config", bearer = null)
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) throw ApiClient.parseError(raw, resp.code)
                parseBundle(JSONObject(raw))
            }
        }.onFailure { AppLog.e("AppConfigApi.getLive failed", it) }
    }

    private fun parseBundle(root: JSONObject): AppRemoteConfig {
        val st = root.optJSONObject("status") ?: JSONObject()
        val feat = root.optJSONObject("features") ?: JSONObject()
        val nav = root.optJSONObject("navigation") ?: JSONObject()
        val links = root.optJSONObject("links") ?: JSONObject()
        return AppRemoteConfig(
            status = AppRemoteStatus(
                maintenanceMode = st.optBoolean("maintenanceMode", false),
                maintenanceMessage = st.optString("maintenanceMessage").trim(),
                forceUpdate = st.optBoolean("forceUpdate", false),
                softUpdatePrompt = st.optBoolean("softUpdatePrompt", true),
                minVersionCode = st.optInt("minVersionCode", 1).coerceAtLeast(1),
                minVersionName = st.optString("minVersionName", "1.0.0").ifBlank { "1.0.0" }
            ),
            features = boolMap(feat),
            navigation = boolMap(nav),
            links = AppRemoteLinks(
                playStoreUrl = safeHttps(
                    links.optString("playStoreUrl"),
                    AppConfigDefaults.PLAY_STORE
                ),
                privacyUrl = safeHttps(
                    links.optString("privacyUrl"),
                    AppConfigDefaults.PRIVACY
                ),
                websiteUrl = safeHttps(
                    links.optString("websiteUrl"),
                    AppConfigDefaults.WEBSITE
                ),
                supportEmail = links.optString("supportEmail")
                    .trim()
                    .ifBlank { AppConfigDefaults.SUPPORT_EMAIL }
            )
        )
    }

    private fun boolMap(obj: JSONObject): Map<String, Boolean> {
        val out = LinkedHashMap<String, Boolean>()
        val keys = obj.keys()
        while (keys.hasNext()) {
            val k = keys.next()
            out[k] = obj.optBoolean(k, true)
        }
        return out
    }

    private fun safeHttps(raw: String, fallback: String): String {
        val t = raw.trim()
        return if (t.startsWith("https://", ignoreCase = true)) t else fallback
    }
}

object AppConfigDefaults {
    const val WEBSITE = "https://sensitivitysettings.com"
    const val PRIVACY = "https://sensitivitysettings.com/privacy-policy"
    const val PLAY_STORE =
        "https://play.google.com/store/apps/details?id=com.ffsensitivity.app"
    const val SUPPORT_EMAIL = "support@sensitivitysettings.com"

    fun bundle(): AppRemoteConfig = AppRemoteConfig(
        status = AppRemoteStatus(
            maintenanceMode = false,
            maintenanceMessage = "We are performing scheduled maintenance. Please try again shortly.",
            forceUpdate = false,
            softUpdatePrompt = true,
            minVersionCode = 1,
            minVersionName = "1.0.0"
        ),
        features = mapOf(
            "redeem" to true,
            "shop" to true,
            "challenge" to true,
            "scratch" to true,
            "share" to true,
            "names" to true,
            "community" to true,
            "support" to true
        ),
        navigation = mapOf(
            "homeRedeem" to true,
            "homeShop" to true,
            "homeChallenge" to true,
            "homeScratch" to true,
            "homeNames" to true,
            "homeShare" to true,
            "navCommunity" to true,
            "navSupport" to true,
            "navAbout" to true
        ),
        links = AppRemoteLinks(
            playStoreUrl = PLAY_STORE,
            privacyUrl = PRIVACY,
            websiteUrl = WEBSITE,
            supportEmail = SUPPORT_EMAIL
        )
    )
}
// --- End: App remote config live wire (Sachin) ---
