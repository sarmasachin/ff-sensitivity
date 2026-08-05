package com.ffsensitivity.app.data.remote

import android.content.Context
import com.ffsensitivity.app.BuildConfig
import com.ffsensitivity.app.data.DeviceInstallStore
import com.ffsensitivity.app.data.UserSessionStore
import com.ffsensitivity.app.util.AppLog
import org.json.JSONObject

// --- Start: App analytics P1 live wire (Sachin) ---
object AnalyticsApi {
    fun track(
        accessToken: String,
        installId: String,
        name: String,
        props: JSONObject? = null
    ): Result<Boolean> {
        return runCatching {
            val body = JSONObject()
                .put("name", name)
                .put("installId", installId)
            if (props != null) body.put("props", props)
            val req = ApiClient.post("/api/v1/analytics/events", body, accessToken)
            ApiClient.http.newCall(req).execute().use { res ->
                val raw = res.body?.string().orEmpty()
                if (!res.isSuccessful) throw ApiClient.parseError(raw, res.code)
                true
            }
        }.onFailure { AppLog.e("AnalyticsApi.track failed", it) }
    }

    fun anonOpen(installId: String, appVersion: String): Result<Boolean> {
        return runCatching {
            val body = JSONObject()
                .put("installId", installId)
                .put("appVersion", appVersion)
            val req = ApiClient.post("/api/v1/analytics/anon-open", body, null)
            ApiClient.http.newCall(req).execute().use { res ->
                val raw = res.body?.string().orEmpty()
                if (!res.isSuccessful) throw ApiClient.parseError(raw, res.code)
                true
            }
        }.onFailure { AppLog.e("AnalyticsApi.anonOpen failed", it) }
    }
}

object AnalyticsRepository {
    private const val REVOKE_ATTEMPTS = 2
    private const val REVOKE_RETRY_DELAY_MS = 700L
    private const val SCREEN_MIN_MS = 1_000L
    private const val SCREEN_MAX_MS = 30 * 60 * 1_000L

    /**
     * Ends the session on Nest (bumps tokenVersion, records the logout event).
     * Returns true only when the JWT is known dead server-side — the caller
     * must keep the local session until then, otherwise a stolen token stays
     * usable for the rest of its 7-day lifetime.
     */
    fun revokeSession(context: Context): Boolean {
        val session = UserSessionStore(context)
        val token = session.accessToken()
        if (token.isBlank()) return true
        val installId = DeviceInstallStore.installId(context)

        for (attempt in 0 until REVOKE_ATTEMPTS) {
            val result = UserAuthApi.logout(token, installId)
            if (result.isSuccess) return true
            val error = result.exceptionOrNull()
            if (error != null && isTokenAlreadyDead(error)) return true
            if (attempt < REVOKE_ATTEMPTS - 1) {
                runCatching { Thread.sleep(REVOKE_RETRY_DELAY_MS) }
            }
        }
        return false
    }

    /** 401 means the server already rejects this JWT — clearing locally is safe. */
    private fun isTokenAlreadyDead(e: Throwable): Boolean {
        val code = (e as? ApiException)?.code ?: return false
        return code == "AUTH_REVOKED" || code == "AUTH_INVALID" || code == "HTTP_401"
    }

    /** Sends only bounded, non-PII screen timing for a registered user install. */
    fun trackScreenVisit(context: Context, visit: ScreenVisit) {
        if (visit.durationMs < SCREEN_MIN_MS) return
        val session = UserSessionStore(context)
        val token = session.accessToken()
        if (token.isBlank()) return
        val screen = visit.screen
            .trim()
            .lowercase()
            .replace(Regex("[^a-z0-9_]"), "_")
            .take(32)
        if (!screen.matches(Regex("^[a-z][a-z0-9_]{0,31}$"))) return
        val props = JSONObject()
            .put("screen", screen)
            .put("duration_ms", visit.durationMs.coerceAtMost(SCREEN_MAX_MS))
        AnalyticsApi.track(
            accessToken = token,
            installId = DeviceInstallStore.installId(context),
            name = "screen_session",
            props = props
        )
    }

    /** Pre-login open — never-signed-in installs still count toward DAU. */
    fun trackAnonOpenIfNeeded(context: Context) {
        val session = UserSessionStore(context)
        if (session.isSignedIn() && session.accessToken().isNotBlank()) return
        val installId = DeviceInstallStore.installId(context)
        AnalyticsApi.anonOpen(installId, BuildConfig.VERSION_NAME)
    }
}
// --- End: App analytics P1 live wire (Sachin) ---
