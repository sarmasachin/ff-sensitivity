package com.ffsensitivity.app.data.remote

import com.ffsensitivity.app.data.CompareFeedback
import com.ffsensitivity.app.data.SensitivityValues
import com.ffsensitivity.app.util.AppLog
import org.json.JSONObject
import java.net.URLEncoder

data class SharedCompareEntry(
    val id: String,
    val displayName: String,
    val deviceLabel: String,
    val fingers: String,
    val role: String,
    val dpiPreference: String,
    val screenGuard: String,
    val feedback: CompareFeedback,
    val suggested: SensitivityValues,
    val actual: SensitivityValues,
    val createdAtMs: Long
) {
    val generalOffset: Int get() = actual.general - suggested.general
}

data class CompareListPayload(
    val averageGeneralOffset: Int?,
    val offsetFromMatch: Boolean,
    val items: List<SharedCompareEntry>
)

object CompareApi {
    fun list(accessToken: String, fingers: String, role: String): Result<CompareListPayload> {
        return runCatching {
            val path = "/api/v1/compare?fingers=${encode(fingers)}&role=${encode(role)}"
            val req = ApiClient.get(path, accessToken)
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) throw ApiClient.parseError(raw, resp.code)
                parseList(JSONObject(raw))
            }
        }.onFailure { AppLog.e("CompareApi.list failed", it) }
    }

    fun save(
        accessToken: String,
        deviceLabel: String,
        fingers: String,
        role: String,
        dpiPreference: String,
        screenGuard: String,
        suggested: SensitivityValues,
        actual: SensitivityValues,
        feedback: CompareFeedback
    ): Result<String> {
        return runCatching {
            val body = JSONObject()
                .put("deviceLabel", deviceLabel)
                .put("fingers", fingers)
                .put("role", role)
                .put("dpiPreference", dpiPreference)
                .put("screenGuard", screenGuard)
                .put("feedback", feedback.storageKey)
                .put("suggested", valuesJson(suggested))
                .put("actual", valuesJson(actual))
            val req = ApiClient.post("/api/v1/compare", body, accessToken)
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) throw ApiClient.parseError(raw, resp.code)
                JSONObject(raw).optString("id")
            }
        }.onFailure { AppLog.e("CompareApi.save failed", it) }
    }

    private fun parseList(root: JSONObject): CompareListPayload {
        val arr = root.optJSONArray("items") ?: org.json.JSONArray()
        val items = buildList {
            for (i in 0 until arr.length()) {
                val o = arr.optJSONObject(i) ?: continue
                val feedback = CompareFeedback.entries.firstOrNull {
                    it.storageKey == o.optString("feedback")
                } ?: continue
                val at = runCatching {
                    java.time.Instant.parse(o.getString("createdAt")).toEpochMilli()
                }.getOrNull() ?: continue
                val suggested = values(o.optJSONObject("suggested")) ?: continue
                val actual = values(o.optJSONObject("actual")) ?: continue
                add(
                    SharedCompareEntry(
                        id = o.getString("id"),
                        displayName = o.optString("displayName").ifBlank { "Player" },
                        deviceLabel = o.optString("deviceLabel"),
                        fingers = o.optString("fingers"),
                        role = o.optString("role"),
                        dpiPreference = o.optString("dpiPreference"),
                        screenGuard = o.optString("screenGuard"),
                        feedback = feedback,
                        suggested = suggested,
                        actual = actual,
                        createdAtMs = at
                    )
                )
            }
        }
        val avg = if (root.isNull("averageGeneralOffset")) {
            null
        } else {
            root.optInt("averageGeneralOffset")
        }
        return CompareListPayload(
            averageGeneralOffset = avg,
            offsetFromMatch = root.optString("offsetFrom") == "match",
            items = items
        )
    }

    private fun values(obj: JSONObject?): SensitivityValues? {
        if (obj == null) return null
        return runCatching {
            SensitivityValues(
                general = obj.getInt("general"),
                redDot = obj.getInt("redDot"),
                scope2x = obj.getInt("scope2x"),
                scope4x = obj.getInt("scope4x"),
                sniper = obj.getInt("sniper"),
                freeLook = obj.getInt("freeLook"),
                fireButton = obj.getInt("fireButton")
            )
        }.getOrNull()
    }

    private fun valuesJson(v: SensitivityValues): JSONObject = JSONObject()
        .put("general", v.general)
        .put("redDot", v.redDot)
        .put("scope2x", v.scope2x)
        .put("scope4x", v.scope4x)
        .put("sniper", v.sniper)
        .put("freeLook", v.freeLook)
        .put("fireButton", v.fireButton)

    private fun encode(value: String): String =
        URLEncoder.encode(value, Charsets.UTF_8.name())
}
