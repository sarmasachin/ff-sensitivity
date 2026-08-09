package com.ffsensitivity.app.data.remote

import com.ffsensitivity.app.data.ChallengeQuizTimingConfig
import com.ffsensitivity.app.data.DailyQuizQuestion
import com.ffsensitivity.app.data.StreakMilestone
import com.ffsensitivity.app.util.AppLog
import org.json.JSONObject

// --- Start: Challenge live wire (Sachin) ---
data class ChallengeTodayPayload(
    val dayKey: String,
    val question: DailyQuizQuestion?,
    val milestones: List<StreakMilestone>,
    val alreadyCorrect: Boolean,
    val wrongAttempts: Int,
    /** null = field absent (older API) — do not overwrite local. */
    val streakDays: Int?,
    val checkinDone: Boolean?,
    val adDone: Boolean?,
    val adAvailable: Boolean?,
    val nextAdAvailableAtMs: Long?,
    val claimedMilestoneDays: Set<Int>?,
    val quizLockUntilMs: Long?,
    val quizOpenUntilMs: Long?,
    val secondChanceReady: Boolean? = null,
    val secondChanceUnlocked: Boolean? = null
)

data class ChallengeQuizSubmitResult(
    val coins: Int,
    val delta: Int,
    val alreadyApplied: Boolean,
    val reason: String,
    val correct: Boolean,
    val lockUntilMs: Long?,
    val openUntilMs: Long?
)

object ChallengeApi {
    fun getToday(accessToken: String): Result<ChallengeTodayPayload> {
        return runCatching {
            val req = ApiClient.get("/api/v1/challenge/today", accessToken)
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) throw ApiClient.parseError(raw, resp.code)
                val root = JSONObject(raw)
                val rules = root.optJSONObject("rules")
                if (rules != null) {
                    ChallengeQuizTimingConfig.wrongAnswerLockMinutes =
                        rules.optInt("wrongAnswerLockMinutes", 20)
                    ChallengeQuizTimingConfig.wrongAnswerLockHours =
                        rules.optInt("wrongAnswerLockHours", 4)
                    ChallengeQuizTimingConfig.quizOpenWindowHours =
                        rules.optInt("quizOpenWindowHours", 2)
                    ChallengeQuizTimingConfig.quizCorrectCoins =
                        rules.optInt("quizCorrectCoins", 50)
                    ChallengeQuizTimingConfig.quizWrongCoins =
                        rules.optInt("quizWrongCoins", -10)
                    ChallengeQuizTimingConfig.adBonusOptional =
                        rules.optBoolean("adBonusOptional", true)
                    ChallengeQuizTimingConfig.adBonusCooldownHours =
                        rules.optInt("adBonusCooldownHours", 4)
                }
                val qObj = root.optJSONObject("question")
                val question = if (qObj != null) {
                    val opts = qObj.optJSONArray("options")
                    val list = mutableListOf<String>()
                    if (opts != null) {
                        for (i in 0 until opts.length()) {
                            list += opts.optString(i)
                        }
                    }
                    DailyQuizQuestion(
                        id = qObj.optString("id"),
                        question = qObj.optString("question"),
                        options = list,
                        correctIndex = -1
                    )
                } else null

                val msArr = root.optJSONArray("milestones")
                val milestones = mutableListOf<StreakMilestone>()
                if (msArr != null) {
                    for (i in 0 until msArr.length()) {
                        val m = msArr.optJSONObject(i) ?: continue
                        milestones += StreakMilestone(
                            days = m.optInt("days"),
                            title = m.optString("title"),
                            rewardLabel = m.optString("rewardLabel"),
                            coinReward = m.optInt("coinReward"),
                            badge = m.optString("badge").takeIf { it.isNotBlank() }
                        )
                    }
                }
                val state = root.optJSONObject("quizState")
                val claimedArr = root.optJSONArray("claimedMilestoneDays")
                val claimed: Set<Int>? = if (claimedArr != null) {
                    buildSet {
                        for (i in 0 until claimedArr.length()) {
                            val n = claimedArr.optInt(i, -1)
                            if (n > 0) add(n)
                        }
                    }
                } else {
                    null
                }
                ChallengeTodayPayload(
                    dayKey = root.optString("dayKey"),
                    question = question,
                    milestones = milestones,
                    alreadyCorrect = state?.optBoolean("alreadyCorrect") == true,
                    wrongAttempts = state?.optInt("wrongAttempts") ?: 0,
                    streakDays = if (root.has("streakDays")) root.optInt("streakDays") else null,
                    checkinDone = if (root.has("checkinDone")) root.optBoolean("checkinDone") else null,
                    adDone = if (root.has("adDone")) root.optBoolean("adDone") else null,
                    adAvailable = if (root.has("adAvailable")) root.optBoolean("adAvailable") else null,
                    nextAdAvailableAtMs = if (root.has("nextAdAvailableAtMs") && !root.isNull("nextAdAvailableAtMs")) {
                        root.optLong("nextAdAvailableAtMs")
                    } else {
                        null
                    },
                    claimedMilestoneDays = claimed,
                    quizLockUntilMs = state?.let {
                        if (it.isNull("lockUntilMs")) null else it.optLong("lockUntilMs")
                    },
                    quizOpenUntilMs = state?.let {
                        if (it.isNull("openUntilMs")) null else it.optLong("openUntilMs")
                    },
                    secondChanceReady = state?.let {
                        if (it.has("secondChanceReady")) it.optBoolean("secondChanceReady") else null
                    },
                    secondChanceUnlocked = state?.let {
                        if (it.has("secondChanceUnlocked")) it.optBoolean("secondChanceUnlocked") else null
                    }
                )
            }
        }.onFailure { AppLog.e("ChallengeApi.getToday failed", it) }
    }

    fun submitQuiz(
        accessToken: String,
        questionId: String,
        selectedIndex: Int
    ): Result<ChallengeQuizSubmitResult> {
        return runCatching {
            val body = JSONObject()
                .put("questionId", questionId)
                .put("selectedIndex", selectedIndex)
            val req = ApiClient.post("/api/v1/challenge/quiz/submit", body, accessToken)
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) throw ApiClient.parseError(raw, resp.code)
                val root = JSONObject(raw)
                ChallengeQuizSubmitResult(
                    coins = root.optInt("coins", 0),
                    delta = root.optInt("delta", 0),
                    alreadyApplied = root.optBoolean("alreadyApplied", false),
                    reason = root.optString("reason"),
                    correct = root.optBoolean("correct", false),
                    lockUntilMs = if (root.isNull("lockUntilMs")) null else root.optLong("lockUntilMs"),
                    openUntilMs = if (root.isNull("openUntilMs")) null else root.optLong("openUntilMs")
                )
            }
        }.onFailure { AppLog.e("ChallengeApi.submitQuiz failed", it) }
    }

    fun unlockSecondChance(accessToken: String): Result<DailyQuizQuestion> {
        return runCatching {
            val req = ApiClient.post(
                "/api/v1/challenge/quiz/second-chance",
                JSONObject(),
                accessToken
            )
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) throw ApiClient.parseError(raw, resp.code)
                val root = JSONObject(raw)
                val qObj = root.optJSONObject("question")
                    ?: throw ApiException("CHALLENGE_NO_QUIZ", "No second-chance question.")
                val opts = qObj.optJSONArray("options")
                val list = mutableListOf<String>()
                if (opts != null) {
                    for (i in 0 until opts.length()) {
                        list += opts.optString(i)
                    }
                }
                DailyQuizQuestion(
                    id = qObj.optString("id"),
                    question = qObj.optString("question"),
                    options = list,
                    correctIndex = -1
                )
            }
        }.onFailure { AppLog.e("ChallengeApi.unlockSecondChance failed", it) }
    }
}
// --- End: Challenge live wire (Sachin) ---
