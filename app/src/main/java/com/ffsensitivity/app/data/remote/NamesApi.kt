package com.ffsensitivity.app.data.remote

import com.ffsensitivity.app.util.AppLog
import org.json.JSONArray
import org.json.JSONObject

// --- Start: Names live wire (Sachin) ---
data class NamesFramePayload(
    val id: String,
    val label: String,
    val prefix: String,
    val suffix: String,
    val premium: Boolean
)

data class NamesFontPayload(
    val id: String,
    val label: String,
    val sample: String
)

data class NamesPolicyPayload(
    val maxNameChars: Int,
    val maxBatchSize: Int,
    val blockSpaces: Boolean,
    val requireStyleWrap: Boolean
)

data class NamesCatalogPayload(
    val policy: NamesPolicyPayload,
    val frames: List<NamesFramePayload>,
    val fonts: List<NamesFontPayload>
)

object NamesApi {
    fun getCatalog(): Result<NamesCatalogPayload> {
        return runCatching {
            val req = ApiClient.get("/api/v1/names/catalog", bearer = null)
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) throw ApiClient.parseError(raw, resp.code)
                val root = JSONObject(raw)
                val policyObj = root.optJSONObject("policy") ?: JSONObject()
                val framesArr = root.optJSONArray("frames") ?: JSONArray()
                val fontsArr = root.optJSONArray("fonts") ?: JSONArray()
                val frames = ArrayList<NamesFramePayload>(framesArr.length())
                for (i in 0 until framesArr.length()) {
                    val o = framesArr.optJSONObject(i) ?: continue
                    val id = o.optString("id").trim()
                    if (id.isEmpty()) continue
                    frames.add(
                        NamesFramePayload(
                            id = id,
                            label = o.optString("label").ifBlank { id },
                            prefix = o.optString("prefix").take(32),
                            suffix = o.optString("suffix").take(32),
                            premium = o.optBoolean("premium", false)
                        )
                    )
                }
                val fonts = ArrayList<NamesFontPayload>(fontsArr.length())
                for (i in 0 until fontsArr.length()) {
                    val o = fontsArr.optJSONObject(i) ?: continue
                    val id = o.optString("id").trim()
                    if (id.isEmpty()) continue
                    fonts.add(
                        NamesFontPayload(
                            id = id,
                            label = o.optString("label").ifBlank { id },
                            sample = o.optString("sample")
                        )
                    )
                }
                NamesCatalogPayload(
                    policy = NamesPolicyPayload(
                        maxNameChars = policyObj.optInt("maxNameChars", 12).coerceIn(1, 12),
                        maxBatchSize = policyObj.optInt("maxBatchSize", 100).coerceIn(10, 200),
                        blockSpaces = policyObj.optBoolean("blockSpaces", true),
                        requireStyleWrap = policyObj.optBoolean("requireStyleWrap", true)
                    ),
                    frames = frames,
                    fonts = fonts
                )
            }
        }.onFailure { AppLog.e("NamesApi.getCatalog failed", it) }
    }
}
// --- End: Names live wire (Sachin) ---
