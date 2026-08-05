package com.ffsensitivity.app.data.remote

import com.ffsensitivity.app.data.SharedSensiCard
import com.ffsensitivity.app.util.AppLog
import org.json.JSONArray
import org.json.JSONObject

// --- Start: Community live wire (Sachin) ---
data class CommunitySubmitResult(
    val id: String,
    val status: String,
    val message: String
)

object CommunityApi {
    fun feed(accessToken: String): Result<List<SharedSensiCard>> {
        return runCatching {
            val req = ApiClient.get("/api/v1/community/feed", accessToken)
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) {
                    throw ApiClient.parseError(raw, resp.code)
                }
                val arr = JSONArray(raw)
                buildList {
                    for (i in 0 until arr.length()) {
                        val o = arr.getJSONObject(i)
                        add(parseCard(o))
                    }
                }
            }
        }.onFailure {
            AppLog.e("CommunityApi.feed failed", it)
        }
    }

    fun submit(accessToken: String, card: SharedSensiCard): Result<CommunitySubmitResult> {
        return runCatching {
            val body = JSONObject()
                .put("name", card.name)
                .put("freeFireId", card.freeFireId)
                .put("rank", card.rank)
                .put("role", card.role)
                .put("deviceLabel", card.deviceLabel)
                .put("deviceMeta", card.deviceMeta)
                .put("matches", card.matches)
                .put("kills", card.kills)
                .put("headshots", card.headshots)
                .put("general", card.general)
                .put("redDot", card.redDot)
                .put("scope2x", card.scope2x)
                .put("scope4x", card.scope4x)
                .put("awm", card.awm)
                .put("freeLook", card.freeLook)
            val req = ApiClient.post("/api/v1/community/posts", body, accessToken)
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) {
                    throw ApiClient.parseError(raw, resp.code)
                }
                val root = JSONObject(raw)
                CommunitySubmitResult(
                    id = root.getString("id"),
                    status = root.optString("status"),
                    message = root.optString(
                        "message",
                        "Submitted for review."
                    )
                )
            }
        }.onFailure {
            AppLog.e("CommunityApi.submit failed", it)
        }
    }

    fun report(accessToken: String, postId: String): Result<Unit> {
        return runCatching {
            val req = ApiClient.post(
                "/api/v1/community/posts/${postId.trim()}/report",
                JSONObject(),
                accessToken
            )
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) {
                    throw ApiClient.parseError(raw, resp.code)
                }
            }
        }.onFailure {
            AppLog.e("CommunityApi.report failed", it)
        }
    }

    private fun parseCard(o: JSONObject): SharedSensiCard {
        return SharedSensiCard(
            id = o.getString("id"),
            name = o.optString("name"),
            freeFireId = o.optString("freeFireId"),
            rank = o.optString("rank"),
            role = o.optString("role"),
            deviceLabel = o.optString("deviceLabel"),
            deviceMeta = o.optString("deviceMeta"),
            matches = o.optInt("matches"),
            kills = o.optInt("kills"),
            headshots = o.optInt("headshots"),
            general = o.optInt("general"),
            redDot = o.optInt("redDot"),
            scope2x = o.optInt("scope2x"),
            scope4x = o.optInt("scope4x"),
            awm = o.optInt("awm"),
            freeLook = o.optInt("freeLook")
        )
    }
}
// --- End: Community live wire (Sachin) ---
