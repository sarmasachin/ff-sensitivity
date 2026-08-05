package com.ffsensitivity.app.data.remote

import com.ffsensitivity.app.util.AppLog
import org.json.JSONObject

// --- Start: Scratch live wire (Sachin) ---
data class ScratchEligibility(
    val checkinDone: Boolean,
    val cardsPerDay: Int,
    val rollsUsed: Int,
    val rollsLeft: Int,
    val canRoll: Boolean
)

data class ScratchConfigPayload(
    val retentionDays: Int,
    val autoPurge: Boolean,
    val showExpired: Boolean,
    val coinsPercent: Int,
    val redeemPercent: Int,
    val coinAmount: Int,
    val eligibility: ScratchEligibility
)

data class ScratchRollResult(
    val outcome: String,
    val alreadyApplied: Boolean,
    val coins: Int,
    val coinDelta: Int,
    val title: String,
    val rewardLabel: String,
    val redeemCodeId: String?,
    val code: String?
)

object ScratchApi {
    fun getConfig(accessToken: String): Result<ScratchConfigPayload> {
        return runCatching {
            val req = ApiClient.get("/api/v1/scratch/config", accessToken)
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) throw ApiClient.parseError(raw, resp.code)
                val root = JSONObject(raw)
                val policy = root.optJSONObject("policy")
                val odds = root.optJSONObject("outcomeOdds")
                val el = root.optJSONObject("eligibility")
                ScratchConfigPayload(
                    retentionDays = policy?.optInt("retentionDays", 30) ?: 30,
                    autoPurge = policy?.optBoolean("autoPurge", true) != false,
                    showExpired = policy?.optBoolean("showExpired", false) == true,
                    coinsPercent = odds?.optInt("coinsPercent", 55) ?: 55,
                    redeemPercent = odds?.optInt("redeemPercent", 45) ?: 45,
                    coinAmount = odds?.optInt("coinAmount", 50) ?: 50,
                    eligibility = ScratchEligibility(
                        checkinDone = el?.optBoolean("checkinDone") == true,
                        cardsPerDay = el?.optInt("cardsPerDay", 1) ?: 1,
                        rollsUsed = el?.optInt("rollsUsed", 0) ?: 0,
                        rollsLeft = el?.optInt("rollsLeft", 0) ?: 0,
                        canRoll = el?.optBoolean("canRoll") == true
                    )
                )
            }
        }.onFailure { AppLog.e("ScratchApi.getConfig failed", it) }
    }

    fun roll(accessToken: String): Result<ScratchRollResult> {
        return runCatching {
            val req = ApiClient.post("/api/v1/scratch/roll", JSONObject(), accessToken)
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) throw ApiClient.parseError(raw, resp.code)
                val root = JSONObject(raw)
                ScratchRollResult(
                    outcome = root.optString("outcome"),
                    alreadyApplied = root.optBoolean("alreadyApplied", false),
                    coins = root.optInt("coins", 0),
                    coinDelta = root.optInt("coinDelta", 0),
                    title = root.optString("title"),
                    rewardLabel = root.optString("rewardLabel"),
                    redeemCodeId = root.optString("redeemCodeId").takeIf {
                        it.isNotBlank() && it != "null"
                    },
                    code = root.optString("code").takeIf { it.isNotBlank() && it != "null" }
                )
            }
        }.onFailure { AppLog.e("ScratchApi.roll failed", it) }
    }
}
// --- End: Scratch live wire (Sachin) ---
