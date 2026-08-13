package com.ffsensitivity.app.data.remote

import com.ffsensitivity.app.data.RedeemCadenceOption
import com.ffsensitivity.app.data.RedeemCatalogPayload
import com.ffsensitivity.app.data.RedeemCodeItem
import com.ffsensitivity.app.data.RedeemMode
import com.ffsensitivity.app.data.RedeemStatus
import com.ffsensitivity.app.data.RedeemTypeOption
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

data class RedeemScratchResult(
    val id: String,
    val coinsGranted: Int,
    val code: String?,
    val alreadyProcessed: Boolean,
    val coinsRemaining: Int?,
    val tip: String
)

object RedeemApi {
    fun catalog(accessToken: String): Result<RedeemCatalogPayload> {
        return runCatching {
            val req = ApiClient.get("/api/v1/redeem/catalog", accessToken)
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) {
                    throw ApiClient.parseError(raw, resp.code)
                }
                val root = JSONObject(raw)
                val items = root.optJSONArray("items") ?: JSONArray()
                val typesArr = root.optJSONArray("types") ?: JSONArray()
                val cadencesArr = root.optJSONArray("cadences") ?: JSONArray()
                val parsedItems = buildList {
                    for (i in 0 until items.length()) {
                        add(parseItem(items.getJSONObject(i)))
                    }
                }
                val types = buildList {
                    for (i in 0 until typesArr.length()) {
                        val o = typesArr.getJSONObject(i)
                        val id = o.optString("id").trim()
                        if (id.isNotBlank()) {
                            add(
                                RedeemTypeOption(
                                    id = id,
                                    label = o.optString("label").ifBlank { id }
                                )
                            )
                        }
                    }
                }
                val cadences = buildList {
                    for (i in 0 until cadencesArr.length()) {
                        val o = cadencesArr.getJSONObject(i)
                        val id = o.optString("id").trim()
                        if (id.isNotBlank()) {
                            add(
                                RedeemCadenceOption(
                                    id = id,
                                    label = o.optString("label").ifBlank { id },
                                    claimLimit = o.optInt("claimLimit", 3),
                                    windowHours = o.optInt("windowHours", 24)
                                )
                            )
                        }
                    }
                }
                RedeemCatalogPayload(
                    items = parsedItems,
                    types = types,
                    cadences = if (cadences.isNotEmpty()) {
                        cadences
                    } else {
                        listOf(
                            RedeemCadenceOption("DAILY", "Daily", 3, 24),
                            RedeemCadenceOption("WEEKLY", "Weekly", 2, 168)
                        )
                    }
                )
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

    fun scratch(
        accessToken: String,
        redeemId: String,
        attemptKey: String
    ): Result<RedeemScratchResult> {
        return runCatching {
            val req = ApiClient.post(
                path = "/api/v1/redeem/$redeemId/scratch",
                body = JSONObject().put("attemptKey", attemptKey),
                bearer = accessToken
            )
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) {
                    throw ApiClient.parseError(raw, resp.code)
                }
                val root = JSONObject(raw)
                RedeemScratchResult(
                    id = root.getString("id"),
                    coinsGranted = root.optInt("coinsGranted", 0),
                    code = root.optString("code").takeIf { it.isNotBlank() && !root.isNull("code") },
                    alreadyProcessed = root.optBoolean("alreadyProcessed", false),
                    coinsRemaining = if (root.has("coinsRemaining") && !root.isNull("coinsRemaining")) {
                        root.optInt("coinsRemaining")
                    } else {
                        null
                    },
                    tip = root.optString("tip").ifBlank {
                        "Scratch to earn Coins. Limited reward codes distributed via schedule."
                    }
                )
            }
        }.onFailure {
            AppLog.e("RedeemApi.scratch failed", it)
        }
    }

    fun scratchAdUnlock(accessToken: String, redeemId: String): Result<Unit> {
        return runCatching {
            val req = ApiClient.post(
                path = "/api/v1/redeem/$redeemId/scratch-ad-unlock",
                body = JSONObject(),
                bearer = accessToken
            )
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) {
                    throw ApiClient.parseError(raw, resp.code)
                }
            }
        }.onFailure {
            AppLog.e("RedeemApi.scratchAdUnlock failed", it)
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
        val type = o.optString("type").ifBlank { "GOOGLE_PLAY" }
        val status = when (o.optString("status")) {
            "ACTIVE" -> RedeemStatus.ACTIVE
            else -> RedeemStatus.CLAIMED
        }
        val cadence = o.optString("cadence").ifBlank { "DAILY" }
        val mode = when (o.optString("mode")) {
            "SCRATCH_REWARD" -> RedeemMode.SCRATCH_REWARD
            else -> RedeemMode.SINGLE
        }
        val secret = o.optString("code").takeIf { it.isNotBlank() }
        val masked = o.optString("codeMasked").ifBlank { "••••-••••-••••-••••" }
        val tipDefault =
            if (mode == RedeemMode.SCRATCH_REWARD) {
                "Scratch to earn Coins. Limited reward codes distributed via schedule."
            } else {
                "First Come, First Serve!"
            }
        return RedeemCodeItem(
            id = o.getString("id"),
            type = type,
            title = o.optString("title"),
            valueLabel = o.optString("valueLabel"),
            code = secret ?: masked,
            status = status,
            expiresLabel = o.optString("expiresLabel"),
            tip = o.optString("tip").ifBlank { tipDefault },
            redeemUrl = o.optString("redeemUrl").ifBlank { "https://play.google.com/redeem" },
            stockLeft = if (o.has("stockLeft") && !o.isNull("stockLeft")) o.optInt("stockLeft") else null,
            coinCost = if (o.has("coinCost") && !o.isNull("coinCost")) o.optInt("coinCost") else null,
            cadence = cadence,
            serverUnlocked = o.optBoolean("unlocked", secret != null),
            mode = mode,
            coinRewardMin = if (o.has("coinRewardMin") && !o.isNull("coinRewardMin")) {
                o.optInt("coinRewardMin")
            } else {
                null
            },
            coinRewardMax = if (o.has("coinRewardMax") && !o.isNull("coinRewardMax")) {
                o.optInt("coinRewardMax")
            } else {
                null
            },
            poolLeft = if (o.has("poolLeft") && !o.isNull("poolLeft")) o.optInt("poolLeft") else null,
            needsAd = o.optBoolean("needsAd", false),
            canScratch = o.optBoolean("canScratch", mode == RedeemMode.SINGLE)
        )
    }
}
// --- End: Redeem live wire (Sachin) ---
