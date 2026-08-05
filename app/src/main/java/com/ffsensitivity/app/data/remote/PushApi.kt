package com.ffsensitivity.app.data.remote

import com.ffsensitivity.app.util.AppLog
import org.json.JSONArray
import org.json.JSONObject

// --- Start: Push live wire (Sachin) ---
data class PushInboxMessage(
    val id: String,
    val title: String,
    val body: String,
    val deepLink: String,
    val sentAt: String?
)

object PushApi {
    fun registerDevice(
        accessToken: String,
        token: String,
        platform: String = "android",
        topics: List<String> = emptyList(),
        installId: String? = null
    ): Result<Unit> {
        return runCatching {
            val body = JSONObject()
                .put("token", token)
                .put("platform", platform)
                .put("topics", JSONArray(topics))
            if (!installId.isNullOrBlank()) {
                body.put("installId", installId)
            }
            val req = ApiClient.post("/api/v1/push/device", body, accessToken)
            ApiClient.http.newCall(req).execute().use { res ->
                val raw = res.body?.string().orEmpty()
                if (!res.isSuccessful) throw ApiClient.parseError(raw, res.code)
            }
        }.onFailure { AppLog.e("PushApi.registerDevice failed", it) }
    }

    fun getInbox(accessToken: String): Result<List<PushInboxMessage>> {
        return runCatching {
            val req = ApiClient.get("/api/v1/push/inbox", accessToken)
            ApiClient.http.newCall(req).execute().use { res ->
                val raw = res.body?.string().orEmpty()
                if (!res.isSuccessful) throw ApiClient.parseError(raw, res.code)
                val root = JSONObject(raw)
                val arr = root.optJSONArray("messages") ?: JSONArray()
                buildList {
                    for (i in 0 until arr.length()) {
                        val o = arr.optJSONObject(i) ?: continue
                        val deep = o.optString("deepLink").trim()
                        if (!deep.startsWith("ffops://")) continue
                        add(
                            PushInboxMessage(
                                id = o.optString("id"),
                                title = o.optString("title"),
                                body = o.optString("body"),
                                deepLink = deep,
                                sentAt = o.optString("sentAt").ifBlank { null }
                            )
                        )
                    }
                }
            }
        }.onFailure { AppLog.e("PushApi.getInbox failed", it) }
    }
}
// --- End: Push live wire (Sachin) ---
