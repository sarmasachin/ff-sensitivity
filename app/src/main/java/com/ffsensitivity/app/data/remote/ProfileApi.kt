package com.ffsensitivity.app.data.remote

import com.ffsensitivity.app.util.AppLog
import org.json.JSONObject

data class UserProfile(
    val userId: String,
    val googleName: String,
    val email: String,
    val photoUrl: String,
    val displayName: String,
    val ffUid: String,
    val playRole: String,
    val region: String,
    val notifyPush: Boolean,
    val coins: Int,
    val streakDays: Int
)

object ProfileApi {
    fun get(token: String): Result<UserProfile> = call(ApiClient.get("/api/v1/user/profile", token))

    fun save(token: String, profile: UserProfile): Result<UserProfile> {
        val body = JSONObject()
            .put("displayName", profile.displayName)
            .put("ffUid", profile.ffUid)
            .put("playRole", profile.playRole)
            .put("region", profile.region)
            .put("notifyPush", profile.notifyPush)
        return call(ApiClient.patch("/api/v1/user/profile", body, token))
    }

    fun deleteAccount(token: String): Result<Unit> {
        return runCatching {
            ApiClient.http.newCall(
                ApiClient.post("/api/v1/user/profile/delete", JSONObject(), token)
            ).execute().use { resp ->
                val text = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) throw ApiClient.parseError(text, resp.code)
            }
        }.onFailure { AppLog.e("Profile delete failed", it) }
    }

    private fun call(request: okhttp3.Request): Result<UserProfile> {
        return runCatching {
            ApiClient.http.newCall(request).execute().use { resp ->
                val text = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) throw ApiClient.parseError(text, resp.code)
                parse(JSONObject(text).getJSONObject("profile"))
            }
        }.onFailure { AppLog.e("Profile request failed", it) }
    }

    private fun parse(o: JSONObject) = UserProfile(
        userId = "",
        googleName = o.optString("googleName"),
        email = o.optString("email"),
        photoUrl = o.optString("photoUrl"),
        displayName = o.optString("displayName"),
        ffUid = o.optString("ffUid"),
        playRole = o.optString("playRole"),
        region = o.optString("region"),
        notifyPush = o.optBoolean("notifyPush", true),
        coins = o.optInt("coins"),
        streakDays = o.optInt("streakDays")
    )
}
