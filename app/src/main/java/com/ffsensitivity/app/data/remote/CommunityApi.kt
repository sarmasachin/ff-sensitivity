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
                        runCatching {
                            val o = arr.optJSONObject(i) ?: return@runCatching
                            parseCard(o)?.let { add(it) }
                        }.onFailure {
                            AppLog.e("CommunityApi.feed skip bad item[$i]", it)
                        }
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

    private fun parseCard(o: JSONObject): SharedSensiCard? {
        val id = o.optString("id").trim()
        if (id.isBlank()) return null
        fun mustInt(key: String): Int {
            if (!o.has(key) || o.isNull(key)) {
                throw IllegalArgumentException("missing $key")
            }
            return o.getInt(key)
        }
        return SharedSensiCard(
            id = id,
            name = o.optString("name"),
            freeFireId = o.optString("freeFireId"),
            rank = o.optString("rank"),
            role = o.optString("role"),
            deviceLabel = o.optString("deviceLabel"),
            deviceMeta = o.optString("deviceMeta"),
            matches = mustInt("matches"),
            kills = mustInt("kills"),
            headshots = mustInt("headshots"),
            general = mustInt("general"),
            redDot = mustInt("redDot"),
            scope2x = mustInt("scope2x"),
            scope4x = mustInt("scope4x"),
            awm = mustInt("awm"),
            freeLook = mustInt("freeLook")
        )
    }
}
// --- End: Community live wire (Sachin) ---
