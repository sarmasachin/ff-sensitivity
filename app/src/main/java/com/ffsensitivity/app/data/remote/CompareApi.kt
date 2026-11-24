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

data class ProMaxCommunityPayload(
    val n: Int,
    val weight: Double,
    val source: String,
    val averages: SensitivityValues
)

data class ProMaxFieldAgreementPayload(
    val general: Double = 1.0,
    val redDot: Double = 1.0,
    val scope2x: Double = 1.0,
    val scope4x: Double = 1.0,
    val sniper: Double = 1.0,
    val freeLook: Double = 1.0,
    val fireButton: Double = 1.0
)

data class ProMaxShareConflictPayload(
    val softGap: Double = 8.0,
    val hardGap: Double = 35.0,
    val maxShrink: Double = 0.75
)

data class ProMaxOffsetPayload(
    val offsetFrom: String,
    val matchCount: Int,
    val confidence: Double,
    val offsets: SensitivityValues,
    val blendFrom: String = "",
    val fieldAgreement: ProMaxFieldAgreementPayload = ProMaxFieldAgreementPayload(),
    val community: ProMaxCommunityPayload? = null,
    val shareConflict: ProMaxShareConflictPayload = ProMaxShareConflictPayload()
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

    fun promaxOffset(
        accessToken: String,
        fingers: String,
        role: String,
        deviceLabel: String,
        ramGb: Double,
        processorBrand: String,
        processorType: String,
        gpuLabel: String,
        gpuVendor: String,
        dpiPreference: String,
        screenGuard: String,
        refreshHz: Int,
        /** Peer product bucket: one_tap | promax */
        engine: String = "promax"
    ): Result<ProMaxOffsetPayload> {
        return runCatching {
            val path = buildString {
                append("/api/v1/compare/promax-offset?")
                append("fingers=${encode(fingers)}")
                append("&role=${encode(role)}")
                append("&deviceLabel=${encode(deviceLabel)}")
                append("&ramGb=${encode(ramGb.toString())}")
                append("&processorBrand=${encode(processorBrand)}")
                append("&processorType=${encode(processorType)}")
                append("&gpuLabel=${encode(gpuLabel)}")
                append("&gpuVendor=${encode(gpuVendor)}")
                append("&dpiPreference=${encode(dpiPreference)}")
                append("&screenGuard=${encode(screenGuard)}")
                append("&refreshHz=${encode(refreshHz.toString())}")
                append("&engine=${encode(engine.trim().ifBlank { "promax" })}")
            }
            val req = ApiClient.get(path, accessToken)
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) throw ApiClient.parseError(raw, resp.code)
                parseProMaxOffset(JSONObject(raw))
            }
        }.onFailure { AppLog.e("CompareApi.promaxOffset failed", it) }
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
        feedback: CompareFeedback,
        ramGb: Double? = null,
        processorBrand: String? = null,
        processorType: String? = null,
        gpuLabel: String? = null,
        gpuVendor: String? = null,
        refreshHz: Int? = null,
        /** Product bucket tag stored on SensitivityCompare.engine */
        engine: String? = null
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
            if (ramGb != null && ramGb > 0) body.put("ramGb", ramGb)
            if (!processorBrand.isNullOrBlank()) body.put("processorBrand", processorBrand.trim())
            if (!processorType.isNullOrBlank()) body.put("processorType", processorType.trim())
            if (!gpuLabel.isNullOrBlank()) body.put("gpuLabel", gpuLabel.trim())
            if (!gpuVendor.isNullOrBlank()) body.put("gpuVendor", gpuVendor.trim())
            if (refreshHz != null && refreshHz > 0) body.put("refreshHz", refreshHz)
            if (!engine.isNullOrBlank()) body.put("engine", engine.trim())
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

    private fun parseProMaxOffset(root: JSONObject): ProMaxOffsetPayload {
        val avg = root.optJSONObject("averageOffsets")
            ?: throw IllegalStateException("promax-offset missing averageOffsets")
        val offsets = values(avg)
            ?: throw IllegalStateException("promax-offset invalid averageOffsets")
        val communityObj = root.optJSONObject("community")
        val community = communityObj?.let { c ->
            val cAvg = values(c.optJSONObject("averages")) ?: return@let null
            val w = c.optDouble("weight", 0.0)
            val n = c.optInt("n", 0)
            if (w <= 0.0 || n < 2) return@let null
            ProMaxCommunityPayload(
                n = n,
                weight = w,
                source = c.optString("source").ifBlank { "none" },
                averages = cAvg
            )
        }
        val agreeObj = root.optJSONObject("fieldAgreement")
        val fieldAgreement = ProMaxFieldAgreementPayload(
            general = agreeObj?.optDouble("general", 1.0) ?: 1.0,
            redDot = agreeObj?.optDouble("redDot", 1.0) ?: 1.0,
            scope2x = agreeObj?.optDouble("scope2x", 1.0) ?: 1.0,
            scope4x = agreeObj?.optDouble("scope4x", 1.0) ?: 1.0,
            sniper = agreeObj?.optDouble("sniper", 1.0) ?: 1.0,
            freeLook = agreeObj?.optDouble("freeLook", 1.0) ?: 1.0,
            fireButton = agreeObj?.optDouble("fireButton", 1.0) ?: 1.0
        )
        val scObj = root.optJSONObject("shareConflict")
        val shareConflict = ProMaxShareConflictPayload(
            softGap = scObj?.optDouble("softGap", 8.0) ?: 8.0,
            hardGap = scObj?.optDouble("hardGap", 35.0) ?: 35.0,
            maxShrink = scObj?.optDouble("maxShrink", 0.75) ?: 0.75
        )
        return ProMaxOffsetPayload(
            offsetFrom = root.optString("offsetFrom").ifBlank { "none" },
            matchCount = root.optInt("matchCount", 0),
            confidence = root.optDouble("confidence", 0.0),
            offsets = offsets,
            blendFrom = root.optString("blendFrom").orEmpty(),
            fieldAgreement = fieldAgreement,
            community = community,
            shareConflict = shareConflict
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
