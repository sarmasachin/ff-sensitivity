package com.ffsensitivity.app.data.remote

import com.ffsensitivity.app.util.AppLog
import org.json.JSONObject

// --- Start: Copy CMS live wire (Sachin) ---
data class CopyRateConfig(
    val enabled: Boolean,
    val title: String,
    val body: String,
    val primaryCta: String,
    val secondaryCta: String,
    val minSessions: Int
)

data class CopyShareConfig(
    val sheetTitle: String,
    val bodyTemplate: String,
    val footerLine: String,
    val hashtags: String
)

data class CopyAboutConfig(
    val headline: String,
    val blurb: String,
    val versionPrefix: String,
    val websiteCta: String,
    val privacyCta: String
)

data class CopyLegalConfig(
    val privacyLabel: String,
    val termsLabel: String,
    val supportLabel: String,
    val storeLabel: String
)

data class CopyRemoteConfig(
    val rate: CopyRateConfig,
    val share: CopyShareConfig,
    val about: CopyAboutConfig,
    val legal: CopyLegalConfig
)

object CopyApi {
    fun getLive(): Result<CopyRemoteConfig> {
        return runCatching {
            val req = ApiClient.get("/api/v1/app/copy", bearer = null)
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) throw ApiClient.parseError(raw, resp.code)
                parseBundle(JSONObject(raw))
            }
        }.onFailure { AppLog.e("CopyApi.getLive failed", it) }
    }

    private fun parseBundle(root: JSONObject): CopyRemoteConfig {
        val d = CopyDefaults.bundle()
        val rate = root.optJSONObject("rate") ?: JSONObject()
        val share = root.optJSONObject("share") ?: JSONObject()
        val about = root.optJSONObject("about") ?: JSONObject()
        val legal = root.optJSONObject("legal") ?: JSONObject()
        return CopyRemoteConfig(
            rate = CopyRateConfig(
                enabled = rate.optBoolean("enabled", d.rate.enabled),
                title = rate.optString("title").ifBlank { d.rate.title },
                body = rate.optString("body").ifBlank { d.rate.body },
                primaryCta = rate.optString("primaryCta").ifBlank { d.rate.primaryCta },
                secondaryCta = rate.optString("secondaryCta").ifBlank { d.rate.secondaryCta },
                minSessions = rate.optInt("minSessions", d.rate.minSessions).coerceIn(1, 100)
            ),
            share = CopyShareConfig(
                sheetTitle = share.optString("sheetTitle").ifBlank { d.share.sheetTitle },
                bodyTemplate = share.optString("bodyTemplate").ifBlank { d.share.bodyTemplate },
                footerLine = safeFooter(share.optString("footerLine"), d.share.footerLine),
                // Empty string is valid — do not resurrect defaults.
                hashtags = if (share.has("hashtags")) share.optString("hashtags") else d.share.hashtags
            ),
            about = CopyAboutConfig(
                headline = about.optString("headline").ifBlank { d.about.headline },
                blurb = about.optString("blurb").ifBlank { d.about.blurb },
                versionPrefix = about.optString("versionPrefix").ifBlank { d.about.versionPrefix },
                websiteCta = about.optString("websiteCta").ifBlank { d.about.websiteCta },
                privacyCta = about.optString("privacyCta").ifBlank { d.about.privacyCta }
            ),
            legal = CopyLegalConfig(
                privacyLabel = legal.optString("privacyLabel").ifBlank { d.legal.privacyLabel },
                termsLabel = legal.optString("termsLabel").ifBlank { d.legal.termsLabel },
                supportLabel = legal.optString("supportLabel").ifBlank { d.legal.supportLabel },
                storeLabel = legal.optString("storeLabel").ifBlank { d.legal.storeLabel }
            )
        )
    }

    private fun safeFooter(raw: String, fallback: String): String {
        val t = raw.trim()
        if (t.isBlank()) return fallback
        val lower = t.lowercase()
        if (
            lower.startsWith("http://") ||
            lower.startsWith("javascript:") ||
            lower.startsWith("data:") ||
            lower.contains("data:text/html")
        ) {
            return fallback
        }
        if (t.startsWith("https://", ignoreCase = true)) {
            // Block obvious private / loopback hosts on-device.
            val host = runCatching { java.net.URI(t).host?.lowercase().orEmpty() }
                .getOrDefault("")
            if (
                host.isBlank() ||
                host == "localhost" ||
                host.endsWith(".localhost") ||
                host.endsWith(".local") ||
                host == "127.0.0.1" ||
                host.startsWith("10.") ||
                host.startsWith("192.168.") ||
                host.startsWith("169.254.")
            ) {
                return fallback
            }
        }
        return t
    }
}

object CopyDefaults {
    fun bundle(): CopyRemoteConfig = CopyRemoteConfig(
        rate = CopyRateConfig(
            enabled = true,
            title = "Enjoying FF Sensitivity?",
            body = "A quick Play Store rating helps more players find accurate sensitivity settings.",
            primaryCta = "Rate on Play Store",
            secondaryCta = "Not now",
            minSessions = 3
        ),
        share = CopyShareConfig(
            sheetTitle = "Share sensitivity",
            bodyTemplate =
                "My Free Fire sensitivity for {{device}} — generated with FF Sensitivity.\n\n{{settings}}\n\nGet yours:",
            footerLine = "https://sensitivitysettings.com",
            hashtags = "#FreeFire #FFSensitivity"
        ),
        about = CopyAboutConfig(
            headline = "FF Sensitivity Settings",
            blurb =
                "FF Sensitivity Settings is a mobile companion built for Free Fire players who want cleaner aim, smarter controls, and a faster setup — without guesswork.\n\n" +
                    "The app helps you find device-aware sensitivity, HUD and graphics guidance, safe DPI limits, stylish names, daily challenges with rewards, a coin shop, redeem codes, and shareable sensitivity cards — all in one place.\n\n" +
                    "This is an independent fan-made utility. It is not owned by, affiliated with, or endorsed by Garena or any game publisher. Always follow Free Fire’s rules and fair-play policy.",
            versionPrefix = "Version",
            websiteCta = "Our website",
            privacyCta = "Read privacy policy"
        ),
        legal = CopyLegalConfig(
            privacyLabel = "Privacy policy",
            termsLabel = "Terms of use",
            supportLabel = "Contact support",
            storeLabel = "Rate on Google Play"
        )
    )
}

object CopyRepository {
    @Volatile
    private var cache: CopyRemoteConfig = CopyDefaults.bundle()

    fun snapshot(): CopyRemoteConfig = cache

    fun syncLive(): Result<CopyRemoteConfig> {
        return CopyApi.getLive().map { next ->
            cache = next
            next
        }.onFailure {
            AppLog.e("CopyRepository.syncLive failed — keeping last cache", it)
        }
    }

    /** Safe placeholder fill — no eval; values cannot re-open placeholders. */
    fun formatShare(device: String, settings: String): String {
        val share = cache.share
        val template = share.bodyTemplate
            .replace(Regex("\\{\\{\\s*device\\s*\\}\\}"), "{{device}}")
            .replace(Regex("\\{\\{\\s*settings\\s*\\}\\}"), "{{settings}}")
        val safeDevice = scrubPlaceholderValue(device).ifBlank { "device" }
        val safeSettings = scrubPlaceholderValue(settings)
        val body = template
            .replace("{{device}}", safeDevice)
            .replace("{{settings}}", safeSettings)
            .replace(Regex("\\{\\{[^}]+\\}\\}"), "")
        return buildString {
            append(body.trim())
            append('\n')
            append(share.footerLine.trim())
            if (share.hashtags.isNotBlank()) {
                append('\n')
                append(share.hashtags.trim())
            }
        }.trim()
    }

    private fun scrubPlaceholderValue(raw: String): String {
        return raw.trim().replace(Regex("\\{\\{[^}]*\\}\\}"), "")
    }

    fun appShareText(): String {
        val about = cache.about
        val share = cache.share
        return buildString {
            append(about.headline)
            append('\n')
            append(about.blurb)
            append('\n')
            append(share.footerLine)
            if (share.hashtags.isNotBlank()) {
                append('\n')
                append(share.hashtags)
            }
        }.trim()
    }

    fun shouldShowRatePrompt(sessionCount: Int, dismissed: Boolean): Boolean {
        val rate = cache.rate
        return rate.enabled && !dismissed && sessionCount >= rate.minSessions
    }
}
// --- End: Copy CMS live wire (Sachin) ---
