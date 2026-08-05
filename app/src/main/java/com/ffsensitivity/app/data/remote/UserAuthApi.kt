package com.ffsensitivity.app.data.remote

import com.ffsensitivity.app.util.AppLog
import org.json.JSONObject

// --- Start: Redeem live wire (Sachin) ---
data class NestUserSession(
    val accessToken: String,
    val userId: String,
    val email: String,
    val displayName: String,
    // --- Start: Economy live wire (Sachin) ---
    val coins: Int = 0
    // --- End: Economy live wire (Sachin) ---
)

object UserAuthApi {
    fun loginWithGoogle(idToken: String): Result<NestUserSession> {
        return runCatching {
            val req = ApiClient.post(
                path = "/api/v1/user/auth/google",
                body = JSONObject().put("idToken", idToken),
                bearer = null
            )
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) {
                    throw ApiClient.parseError(raw, resp.code)
                }
                val root = JSONObject(raw)
                val user = root.getJSONObject("user")
                NestUserSession(
                    accessToken = root.getString("accessToken"),
                    userId = user.getString("id"),
                    email = user.getString("email"),
                    displayName = user.optString("displayName").ifBlank { "Google Player" },
                    coins = user.optInt("coins", 0)
                )
            }
        }.onFailure {
            AppLog.e("UserAuthApi.loginWithGoogle failed", it)
        }
    }

    // --- Start: App analytics P2 logout (Sachin) ---
    /** Server revoke — bumps tokenVersion so this JWT stops working. */
    fun logout(accessToken: String, installId: String): Result<Boolean> {
        return runCatching {
            val body = JSONObject().put("installId", installId)
            val req = ApiClient.post("/api/v1/user/auth/logout", body, accessToken)
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) {
                    throw ApiClient.parseError(raw, resp.code)
                }
                true
            }
        }.onFailure {
            AppLog.e("UserAuthApi.logout failed", it)
        }
    }
    // --- End: App analytics P2 logout (Sachin) ---
}
// --- End: Redeem live wire (Sachin) ---
