package com.ffsensitivity.app.data.remote

import com.ffsensitivity.app.util.AppLog
import org.json.JSONArray
import org.json.JSONObject

// --- Start: Promos live wire (Sachin) ---
data class PromoPayload(
    val id: String,
    val title: String,
    val subtitle: String,
    val imageLabel: String,
    val deepLink: String,
    val placement: String,
    val sortOrder: Int
)

object PromoApi {
    fun getLive(): Result<List<PromoPayload>> {
        return runCatching {
            val req = ApiClient.get("/api/v1/promos/live", bearer = null)
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) throw ApiClient.parseError(raw, resp.code)
                val root = JSONObject(raw)
                val arr = root.optJSONArray("promos") ?: JSONArray()
                val out = ArrayList<PromoPayload>(arr.length())
                for (i in 0 until arr.length()) {
                    val o = arr.optJSONObject(i) ?: continue
                    val id = o.optString("id").trim()
                    val deepLink = o.optString("deepLink").trim().lowercase()
                    if (id.isEmpty() || !deepLink.startsWith("ffops://")) continue
                    out.add(
                        PromoPayload(
                            id = id,
                            title = o.optString("title").ifBlank { id },
                            subtitle = o.optString("subtitle"),
                            imageLabel = o.optString("imageLabel"),
                            deepLink = deepLink,
                            placement = o.optString("placement", "HOME_BANNER"),
                            sortOrder = o.optInt("sortOrder", i + 1)
                        )
                    )
                }
                out.sortedBy { it.sortOrder }
            }
        }.onFailure { AppLog.e("PromoApi.getLive failed", it) }
    }
}
// --- End: Promos live wire (Sachin) ---
