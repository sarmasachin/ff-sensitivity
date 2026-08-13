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

data class AppRemoteAdPlacement(
    val enabled: Boolean,
    val cooldownHours: Int,
    val incompleteMessage: String,
    val buttonLabel: String
)

data class AppRemoteAds(
    val calculate: AppRemoteAdPlacement,
    val dpi: AppRemoteAdPlacement,
    val quiz: AppRemoteAdPlacement,
    val secondChance: AppRemoteAdPlacement,
    val adBonus: AppRemoteAdPlacement,
    val checkIn: AppRemoteAdPlacement,
    val redeemDaily: AppRemoteAdPlacement
)

data class AppRemoteConfig(
    val status: AppRemoteStatus,
    val features: Map<String, Boolean>,
    val navigation: Map<String, Boolean>,
    val ads: AppRemoteAds,
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
            ads = parseAds(root.optJSONObject("ads")),
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

    private fun parseAds(ads: JSONObject?): AppRemoteAds {
        val defaults = AppConfigDefaults.ads()
        return AppRemoteAds(
            calculate = parsePlacement(
                ads?.optJSONObject("calculate"),
                defaults.calculate
            ),
            dpi = parsePlacement(
                ads?.optJSONObject("dpi"),
                defaults.dpi
            ),
            quiz = parsePlacement(
                ads?.optJSONObject("quiz"),
                defaults.quiz
            ),
            secondChance = parsePlacement(
                ads?.optJSONObject("secondChance"),
                defaults.secondChance
            ),
            adBonus = parsePlacement(
                ads?.optJSONObject("adBonus"),
                defaults.adBonus
            ),
            checkIn = parsePlacement(
                ads?.optJSONObject("checkIn"),
                defaults.checkIn
            ),
            redeemDaily = parsePlacement(
                ads?.optJSONObject("redeemDaily"),
                defaults.redeemDaily
            )
        )
    }

    private fun parsePlacement(
        obj: JSONObject?,
        d: AppRemoteAdPlacement
    ): AppRemoteAdPlacement {
        val raw = obj ?: JSONObject()
        return AppRemoteAdPlacement(
            enabled = raw.optBoolean("enabled", d.enabled),
            cooldownHours = raw.optInt("cooldownHours", d.cooldownHours)
                .coerceIn(0, 168),
            incompleteMessage = raw.optString("incompleteMessage")
                .trim()
                .ifBlank { d.incompleteMessage }
                .take(200),
            buttonLabel = raw.optString("buttonLabel")
                .trim()
                .ifBlank { d.buttonLabel }
                .take(200)
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
    const val PRIVACY = "https://app.sensitivitysettings.com/privacy"
    const val PLAY_STORE =
        "https://play.google.com/store/apps/details?id=com.ffsensitivity.app"
    const val SUPPORT_EMAIL = "support@sensitivitysettings.com"

    fun ads(): AppRemoteAds = AppRemoteAds(
        calculate = AppRemoteAdPlacement(
            enabled = true,
            cooldownHours = 24,
            incompleteMessage = "Watch the full ad to see your settings.",
            buttonLabel = "Calculate Best Pro Settings · Watch Ad"
        ),
        dpi = AppRemoteAdPlacement(
            enabled = true,
            cooldownHours = 24,
            incompleteMessage = "Watch the full ad to see your DPI & Resolution result.",
            buttonLabel = "DPI & Resolution Result · Watch Ad"
        ),
        quiz = AppRemoteAdPlacement(
            enabled = true,
            cooldownHours = 24,
            incompleteMessage = "Watch the ad to submit the quiz.",
            buttonLabel = "Submit Answer · Watch Ad"
        ),
        secondChance = AppRemoteAdPlacement(
            enabled = true,
            cooldownHours = 0,
            incompleteMessage = "Watch the full ad to unlock a new question.",
            buttonLabel = "Watch Ad for New Question"
        ),
        adBonus = AppRemoteAdPlacement(
            enabled = true,
            cooldownHours = 4,
            incompleteMessage = "Watch the full ad to claim bonus coins.",
            buttonLabel = "Watch Ad for Bonus Coins"
        ),
        checkIn = AppRemoteAdPlacement(
            enabled = true,
            cooldownHours = 24,
            incompleteMessage = "Watch the ad to claim check-in.",
            buttonLabel = "Collect +20 · Watch Ad"
        ),
        redeemDaily = AppRemoteAdPlacement(
            enabled = true,
            cooldownHours = 24,
            incompleteMessage = "Watch the ad to scratch again and earn coins.",
            buttonLabel = "Scratch again · Watch Ad"
        )
    )

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
        ads = ads(),
        links = AppRemoteLinks(
            playStoreUrl = PLAY_STORE,
            privacyUrl = PRIVACY,
            websiteUrl = WEBSITE,
            supportEmail = SUPPORT_EMAIL
        )
    )
}
// --- End: App remote config live wire (Sachin) ---
