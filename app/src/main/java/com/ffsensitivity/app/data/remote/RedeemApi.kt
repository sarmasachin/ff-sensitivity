package com.ffsensitivity.app.data.remote

import com.ffsensitivity.app.data.RedeemCadence
import com.ffsensitivity.app.data.RedeemCodeItem
import com.ffsensitivity.app.data.RedeemStatus
import com.ffsensitivity.app.data.RedeemType
import com.ffsensitivity.app.util.AppLog
import org.json.JSONArray
import org.json.JSONObject

// --- Start: Redeem live wire (Sachin) ---
data class RedeemClaimResult(
    val id: String,
    val code: String,
    val alreadyClaimed: Boolean,
    val coinCost: Int?,
    val coinsRemaining: Int?
)

object RedeemApi {
    fun catalog(accessToken: String): Result<List<RedeemCodeItem>> {
        return runCatching {
            val req = ApiClient.get("/api/v1/redeem/catalog", accessToken)
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) {
                    throw ApiClient.parseError(raw, resp.code)
                }
                val items = JSONObject(raw).optJSONArray("items") ?: JSONArray()
                buildList {
                    for (i in 0 until items.length()) {
                        val o = items.getJSONObject(i)
                        add(parseItem(o))
                    }
                }
            }
        }.onFailure {
            AppLog.e("RedeemApi.catalog failed", it)
        }
    }

    fun claim(accessToken: String, redeemId: String): Result<RedeemClaimResult> {
        return runCatching {
            val req = ApiClient.post(
                path = "/api/v1/redeem/$redeemId/claim",
                body = JSONObject(),
                bearer = accessToken
            )
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) {
                    throw ApiClient.parseError(raw, resp.code)
                }
                val root = JSONObject(raw)
                RedeemClaimResult(
                    id = root.getString("id"),
                    code = root.getString("code"),
                    alreadyClaimed = root.optBoolean("alreadyClaimed", false),
                    coinCost = if (root.isNull("coinCost")) null else root.optInt("coinCost"),
                    coinsRemaining = if (root.has("coinsRemaining") && !root.isNull("coinsRemaining")) {
                        root.optInt("coinsRemaining")
                    } else {
                        null
                    }
                )
            }
        }.onFailure {
            AppLog.e("RedeemApi.claim failed", it)
        }
    }

    // --- Start: Claims live wire (Sachin) ---
    data class MyClaimRow(
        val id: String,
        val redeemCodeId: String,
        val title: String,
        val valueLabel: String,
        val code: String,
        val codeMasked: String,
        val createdAtMs: Long,
        val whenLabel: String
    )

    fun myClaims(accessToken: String): Result<List<MyClaimRow>> {
        return runCatching {
            val req = ApiClient.get("/api/v1/redeem/claims", accessToken)
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) {
                    throw ApiClient.parseError(raw, resp.code)
                }
                val arr = JSONArray(raw)
                buildList {
                    for (i in 0 until arr.length()) {
                        val o = arr.getJSONObject(i)
                        val iso = o.optString("createdAt")
                        val ms = runCatching {
                            java.time.Instant.parse(iso).toEpochMilli()
                        }.getOrDefault(System.currentTimeMillis())
                        add(
                            MyClaimRow(
                                id = o.getString("id"),
                                redeemCodeId = o.optString("redeemCodeId"),
                                title = o.optString("title"),
                                valueLabel = o.optString("valueLabel"),
                                code = o.optString("code"),
                                codeMasked = o.optString("codeMasked"),
                                createdAtMs = ms,
                                whenLabel = o.optString("whenLabel")
                            )
                        )
                    }
                }
            }
        }.onFailure {
            AppLog.e("RedeemApi.myClaims failed", it)
        }
    }
    // --- End: Claims live wire (Sachin) ---

    private fun parseItem(o: JSONObject): RedeemCodeItem {
        val type = when (o.optString("type")) {
            "FF_DIAMONDS" -> RedeemType.FF_DIAMONDS
            else -> RedeemType.GOOGLE_PLAY
        }
        val status = when (o.optString("status")) {
            "ACTIVE" -> RedeemStatus.ACTIVE
            else -> RedeemStatus.CLAIMED
        }
        val cadence = when (o.optString("cadence")) {
            "WEEKLY" -> RedeemCadence.WEEKLY
            else -> RedeemCadence.DAILY
        }
        val secret = o.optString("code").takeIf { it.isNotBlank() }
        val masked = o.optString("codeMasked").ifBlank { "••••-••••-••••-••••" }
        return RedeemCodeItem(
            id = o.getString("id"),
            type = type,
            title = o.optString("title"),
            valueLabel = o.optString("valueLabel"),
            code = secret ?: masked,
            status = status,
            expiresLabel = o.optString("expiresLabel"),
            tip = o.optString("tip").ifBlank { "First Come, First Serve!" },
            redeemUrl = o.optString("redeemUrl").ifBlank { "https://play.google.com/redeem" },
            stockLeft = if (o.has("stockLeft") && !o.isNull("stockLeft")) o.optInt("stockLeft") else null,
            coinCost = if (o.has("coinCost") && !o.isNull("coinCost")) o.optInt("coinCost") else null,
            cadence = cadence,
            serverUnlocked = o.optBoolean("unlocked", secret != null)
        )
    }
}
// --- End: Redeem live wire (Sachin) ---
