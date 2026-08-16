package com.ffsensitivity.app.data

import android.content.Context
import android.content.SharedPreferences
import com.ffsensitivity.app.data.remote.ChallengeTodayPayload
import com.ffsensitivity.app.util.AppLog
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

object DailyChallengeStore {

    private const val PREFS = "daily_challenge_v1"
    private const val KEY_COINS = "coins"
    private const val KEY_STREAK = "streak"
    private const val KEY_CHECKIN = "checkin_date"
    private const val KEY_QUIZ = "quiz_date"
    private const val KEY_QUIZ_OK = "quiz_correct"
    private const val KEY_QUIZ_LOCK_UNTIL = "quiz_lock_until"
    private const val KEY_QUIZ_OPEN_UNTIL = "quiz_open_until"
    private const val KEY_QUIZ_SECOND_UNLOCKED = "quiz_second_unlocked"
    private const val KEY_QUIZ_CLOSED = "quiz_second_closed"
    private const val KEY_AD = "ad_date"
    /** Epoch ms when next Watch Ad Bonus unlocks; 0 = available now. */
    private const val KEY_AD_NEXT_MS = "ad_next_available_ms"
    private const val KEY_LAST_REWARD = "last_reward"
    private const val KEY_CLAIMED = "claimed_milestones"
    private const val KEY_PENDING_SCRATCH = "pending_scratch_days"
    private const val COINS_MIN = -9_999_999
    private const val COINS_MAX = 9_999_999

    private fun clampCoins(value: Int): Int = value.coerceIn(COINS_MIN, COINS_MAX)

    private val fmt = DateTimeFormatter.ISO_LOCAL_DATE

    data class Snapshot(
        val coins: Int,
        val streak: Int,
        val checkedInToday: Boolean,
        val quizDoneToday: Boolean,
        val quizCorrectToday: Boolean?,
        /** True while ad bonus cooldown is active (compat / green check). */
        val adDoneToday: Boolean,
        val lastRewardNote: String,
        val claimedMilestones: Set<Int> = emptySet(),
        val quizPhase: QuizUiPhase = QuizUiPhase.AVAILABLE,
        /** Epoch ms for active countdown (lock end or open-window end). 0 = none. */
        val quizCountdownEndsAtMs: Long = 0L,
        /** Epoch ms when Watch Ad Bonus unlocks again; 0 = available now. */
        val nextAdAvailableAtMs: Long = 0L,
        val adBonusEnabled: Boolean = true
    ) {
        val todayDoneCount: Int
            get() = listOf(checkedInToday, quizDoneToday).count { it }

        val adAvailable: Boolean
            get() = adBonusEnabled &&
                (nextAdAvailableAtMs <= 0L || System.currentTimeMillis() >= nextAdAvailableAtMs)
    }

    data class Result(
        val ok: Boolean,
        val message: String,
        val snapshot: Snapshot
    )

    fun snapshot(context: Context): Snapshot {
        return runCatching {
            val prefs = prefs(context)
            val today = today()
            val quizToday = prefs.getString(KEY_QUIZ, null) == today
            val quizOk = if (quizToday) prefs.getBoolean(KEY_QUIZ_OK, false) else null
            val timing = resolveQuizTiming(prefs, quizToday, quizOk)
            val nextAd = prefs.getLong(KEY_AD_NEXT_MS, 0L).coerceAtLeast(0L)
            val now = System.currentTimeMillis()
            val onCooldown = nextAd > now
            Snapshot(
                coins = clampCoins(prefs.getInt(KEY_COINS, 0)),
                streak = prefs.getInt(KEY_STREAK, 0).coerceAtLeast(0),
                checkedInToday = prefs.getString(KEY_CHECKIN, null) == today,
                quizDoneToday = timing.countsAsDone,
                quizCorrectToday = quizOk,
                adDoneToday = onCooldown,
                lastRewardNote = prefs.getString(KEY_LAST_REWARD, "").orEmpty(),
                claimedMilestones = readClaimed(prefs),
                quizPhase = timing.phase,
                quizCountdownEndsAtMs = timing.countdownEndsAtMs,
                nextAdAvailableAtMs = if (onCooldown) nextAd else 0L,
                adBonusEnabled = ChallengeQuizTimingConfig.adBonusOptional
            )
        }.getOrElse {
            AppLog.e("DailyChallenge snapshot failed", it)
            Snapshot(0, 0, false, false, null, false, "", emptySet())
        }
    }

    /**
     * Align local prefs with Nest GET /challenge/today (UTC day + streak + flags).
     * Call after a successful sync — server is source of truth for today.
     */
    fun applyRemoteToday(context: Context, payload: ChallengeTodayPayload): Snapshot {
        return runCatching {
            synchronized(this) {
                val prefs = prefs(context)
                val today = payload.dayKey.trim().ifBlank { today() }
                val editor = prefs.edit()

                payload.streakDays?.let { days ->
                    editor.putInt(KEY_STREAK, days.coerceAtLeast(0))
                }

                payload.checkinDone?.let { done ->
                    if (done) {
                        editor.putString(KEY_CHECKIN, today)
                    } else if (prefs.getString(KEY_CHECKIN, null) == today) {
                        editor.remove(KEY_CHECKIN)
                    }
                }

                when {
                    payload.adAvailable == true -> {
                        editor.putLong(KEY_AD_NEXT_MS, 0L)
                        editor.remove(KEY_AD)
                    }
                    payload.nextAdAvailableAtMs != null && payload.nextAdAvailableAtMs > 0L -> {
                        editor.putLong(KEY_AD_NEXT_MS, payload.nextAdAvailableAtMs)
                    }
                    payload.adDone == true -> {
                        // Older API: once/day flag → treat as cooldown until local hours elapse.
                        val fallback =
                            System.currentTimeMillis() +
                                ChallengeQuizTimingConfig.adCooldownDurationMs()
                        editor.putLong(KEY_AD_NEXT_MS, fallback)
                        editor.putString(KEY_AD, today)
                    }
                    payload.adDone == false -> {
                        editor.putLong(KEY_AD_NEXT_MS, 0L)
                        if (prefs.getString(KEY_AD, null) == today) {
                            editor.remove(KEY_AD)
                        }
                    }
                }

                when {
                    payload.alreadyCorrect -> {
                        editor.putString(KEY_QUIZ, today)
                            .putBoolean(KEY_QUIZ_OK, true)
                            .putBoolean(KEY_QUIZ_SECOND_UNLOCKED, false)
                            .putBoolean(KEY_QUIZ_CLOSED, false)
                            .putLong(KEY_QUIZ_LOCK_UNTIL, 0L)
                            .putLong(KEY_QUIZ_OPEN_UNTIL, 0L)
                    }
                    payload.wrongAttempts >= 2 -> {
                        editor.putString(KEY_QUIZ, today)
                            .putBoolean(KEY_QUIZ_OK, false)
                            .putBoolean(KEY_QUIZ_CLOSED, true)
                            .putBoolean(KEY_QUIZ_SECOND_UNLOCKED, true)
                    }
                    payload.wrongAttempts > 0 -> {
                        val lock = payload.quizLockUntilMs ?: 0L
                        editor.putString(KEY_QUIZ, today)
                            .putBoolean(KEY_QUIZ_OK, false)
                            .putBoolean(KEY_QUIZ_CLOSED, false)
                        if (payload.secondChanceUnlocked == true) {
                            editor.putBoolean(KEY_QUIZ_SECOND_UNLOCKED, true)
                                .putLong(KEY_QUIZ_LOCK_UNTIL, 0L)
                        } else if (lock > 0L) {
                            editor.putBoolean(KEY_QUIZ_SECOND_UNLOCKED, false)
                                .putLong(KEY_QUIZ_LOCK_UNTIL, lock)
                                .putLong(KEY_QUIZ_OPEN_UNTIL, 0L)
                        }
                    }
                }

                payload.claimedMilestoneDays?.let { remoteClaimed ->
                    if (remoteClaimed.isNotEmpty()) {
                        val merged = readClaimed(prefs) + remoteClaimed
                        val claimedStrings = HashSet<String>(merged.size).apply {
                            merged.forEach { add(it.toString()) }
                        }
                        editor.putStringSet(KEY_CLAIMED, claimedStrings)
                        val pending = HashSet(
                            prefs.getStringSet(KEY_PENDING_SCRATCH, null) ?: emptySet()
                        )
                        var pendingChanged = false
                        remoteClaimed.forEach { day ->
                            if (pending.remove(day.toString())) pendingChanged = true
                        }
                        if (pendingChanged) {
                            editor.putStringSet(KEY_PENDING_SCRATCH, pending)
                        }
                    }
                }

                val saved = editor.commit()
                if (!saved) {
                    AppLog.w("DailyChallenge applyRemoteToday commit failed")
                }
                snapshot(context)
            }
        }.getOrElse {
            AppLog.e("DailyChallenge applyRemoteToday failed", it)
            snapshot(context)
        }
    }

    fun isMilestoneScratchPending(context: Context, days: Int): Boolean {
        return synchronized(this) {
            days.toString() in (prefs(context).getStringSet(KEY_PENDING_SCRATCH, null) ?: emptySet())
        }
    }

    fun markMilestoneScratchPending(context: Context, days: Int) {
        synchronized(this) {
            val prefs = prefs(context)
            val next = HashSet(prefs.getStringSet(KEY_PENDING_SCRATCH, null) ?: emptySet())
            next.add(days.toString())
            prefs.edit().putStringSet(KEY_PENDING_SCRATCH, next).apply()
        }
    }

    fun clearMilestoneScratchPending(context: Context, days: Int) {
        synchronized(this) {
            val prefs = prefs(context)
            val next = HashSet(prefs.getStringSet(KEY_PENDING_SCRATCH, null) ?: emptySet())
            if (next.remove(days.toString())) {
                prefs.edit().putStringSet(KEY_PENDING_SCRATCH, next).apply()
            }
        }
    }

    fun claimCheckIn(context: Context): Result {
        return runCatching {
            synchronized(this) {
                val prefs = prefs(context)
                val today = today()
                if (prefs.getString(KEY_CHECKIN, null) == today) {
                    return Result(false, "Already checked in today", snapshot(context))
                }
            }
            // --- Start: Economy live wire (Sachin) ---
            val remote = com.ffsensitivity.app.data.remote.EconomyRepository.earnCheckIn(context)
            val earn = remote.getOrElse {
                AppLog.e("Check-in economy earn failed", it)
                val msg = (it as? com.ffsensitivity.app.data.remote.ApiException)?.message
                    ?: "Check-in failed. Check connection."
                return Result(false, msg, snapshot(context))
            }
            // --- End: Economy live wire (Sachin) ---
            synchronized(this) {
                val prefs = prefs(context)
                val today = today()
                if (earn.alreadyApplied) {
                    // Server already credited — sync local flag, never inflate streak.
                    val saved = prefs.edit()
                        .putString(KEY_CHECKIN, today)
                        .putString(KEY_LAST_REWARD, "Already checked in today")
                        .commit()
                    if (!saved) {
                        return@synchronized Result(false, "Could not save check-in", snapshot(context))
                    }
                    return@synchronized Result(
                        true,
                        "Already checked in today",
                        snapshot(context)
                    )
                }
                if (prefs.getString(KEY_CHECKIN, null) == today) {
                    return@synchronized Result(true, "Already checked in today", snapshot(context))
                }
                val last = prefs.getString(KEY_CHECKIN, null)
                val streak = when {
                    last == null -> 1
                    last == yesterday() -> (prefs.getInt(KEY_STREAK, 0) + 1).coerceAtLeast(1)
                    else -> 1
                }
                val boosted = earn.reason.contains("boost")
                val note = if (boosted) {
                    "Check-in +${earn.delta} (Plus boost)"
                } else {
                    "Check-in +${earn.delta}"
                }
                val saved = prefs.edit()
                    .putString(KEY_CHECKIN, today)
                    .putInt(KEY_STREAK, streak)
                    .putString(KEY_LAST_REWARD, note)
                    .commit()
                if (!saved) return@synchronized Result(false, "Could not save check-in", snapshot(context))
                val msg = if (boosted) {
                    "+${earn.delta} coins · streak $streak · Plus boost"
                } else {
                    "+${earn.delta} coins · streak $streak"
                }
                Result(true, msg, snapshot(context))
            }
        }.getOrElse {
            AppLog.e("DailyChallenge check-in failed", it)
            Result(false, "Check-in failed. Try again.", snapshot(context))
        }
    }

    fun submitQuiz(context: Context, questionId: String, selectedIndex: Int): Result {
        return runCatching {
            synchronized(this) {
                val prefs = prefs(context)
                val today = today()
                val quizToday = prefs.getString(KEY_QUIZ, null) == today
                val quizOk = if (quizToday) prefs.getBoolean(KEY_QUIZ_OK, false) else null
                if (quizOk == true) {
                    return Result(false, "Quiz already answered today", snapshot(context))
                }
                val timing = resolveQuizTiming(prefs, quizToday, quizOk)
                when (timing.phase) {
                    QuizUiPhase.LOCKED ->
                        return Result(false, "Quiz locked — wait for countdown", snapshot(context))
                    QuizUiPhase.AWAITING_AD ->
                        return Result(
                            false,
                            "Watch a rewarded ad to unlock a new question",
                            snapshot(context)
                        )
                    QuizUiPhase.CLOSED ->
                        return Result(false, "Quiz closed for today", snapshot(context))
                    QuizUiPhase.DONE_CORRECT ->
                        return Result(false, "Quiz already answered today", snapshot(context))
                    QuizUiPhase.AVAILABLE, QuizUiPhase.OPEN -> Unit
                }
            }
            // --- Start: Challenge live wire (Sachin) ---
            val remote = com.ffsensitivity.app.data.remote.ChallengeRepository.submitQuiz(
                context,
                questionId,
                selectedIndex
            )
            val earn = remote.getOrElse {
                AppLog.e("Quiz challenge submit failed", it)
                val msg = (it as? com.ffsensitivity.app.data.remote.ApiException)?.message
                    ?: "Quiz submit failed. Check connection."
                return Result(false, msg, snapshot(context))
            }
            val correct = earn.correct
            // --- End: Challenge live wire (Sachin) ---
            synchronized(this) {
                val prefs = prefs(context)
                val today = today()
                val now = System.currentTimeMillis()
                val boosted = earn.reason.contains("boost")
                val deltaLabel = ChallengeQuizTimingConfig.signedCoins(earn.delta)
                if (correct) {
                    val note = if (boosted) "Quiz $deltaLabel (2× boost)" else "Quiz $deltaLabel"
                    val saved = prefs.edit()
                        .putString(KEY_QUIZ, today)
                        .putBoolean(KEY_QUIZ_OK, true)
                        .putLong(KEY_QUIZ_LOCK_UNTIL, 0L)
                        .putLong(KEY_QUIZ_OPEN_UNTIL, 0L)
                        .putBoolean(KEY_QUIZ_SECOND_UNLOCKED, false)
                        .putBoolean(KEY_QUIZ_CLOSED, false)
                        .putString(KEY_LAST_REWARD, note)
                        .commit()
                    if (!saved) return@synchronized Result(false, "Could not save quiz", snapshot(context))
                    val msg = if (boosted) {
                        "$deltaLabel coins · correct · 2× boost!"
                    } else {
                        "$deltaLabel coins · correct!"
                    }
                    Result(true, msg, snapshot(context))
                } else {
                    val alreadySecond = prefs.getBoolean(KEY_QUIZ_SECOND_UNLOCKED, false)
                    if (alreadySecond) {
                        val note = "Quiz $deltaLabel · no more chances today"
                        val saved = prefs.edit()
                            .putString(KEY_QUIZ, today)
                            .putBoolean(KEY_QUIZ_OK, false)
                            .putBoolean(KEY_QUIZ_CLOSED, true)
                            .putLong(KEY_QUIZ_LOCK_UNTIL, 0L)
                            .putString(KEY_LAST_REWARD, note)
                            .commit()
                        if (!saved) return@synchronized Result(false, "Could not save quiz", snapshot(context))
                        Result(true, "$deltaLabel coins · wrong · closed today", snapshot(context))
                    } else {
                        val lockUntil = earn.lockUntilMs
                            ?: (now + ChallengeQuizTimingConfig.lockDurationMs())
                        val mins = ChallengeQuizTimingConfig.wrongAnswerLockMinutes
                        val note = "Quiz $deltaLabel · locked ${mins}m · then Watch Ad"
                        val saved = prefs.edit()
                            .putString(KEY_QUIZ, today)
                            .putBoolean(KEY_QUIZ_OK, false)
                            .putBoolean(KEY_QUIZ_SECOND_UNLOCKED, false)
                            .putBoolean(KEY_QUIZ_CLOSED, false)
                            .putLong(KEY_QUIZ_LOCK_UNTIL, lockUntil)
                            .putLong(KEY_QUIZ_OPEN_UNTIL, 0L)
                            .putString(KEY_LAST_REWARD, note)
                            .commit()
                        if (!saved) return@synchronized Result(false, "Could not save quiz", snapshot(context))
                        Result(
                            true,
                            "$deltaLabel coins · wrong · retry in ${mins}m via Watch Ad",
                            snapshot(context)
                        )
                    }
                }
            }
        }.getOrElse {
            AppLog.e("DailyChallenge quiz failed", it)
            Result(false, "Quiz submit failed. Try again.", snapshot(context))
        }
    }

    fun claimAdBonus(context: Context): Result {
        return runCatching {
            if (!ChallengeQuizTimingConfig.adBonusOptional) {
                return Result(false, "Ad bonus is disabled.", snapshot(context))
            }
            synchronized(this) {
                val next = prefs(context).getLong(KEY_AD_NEXT_MS, 0L)
                if (next > System.currentTimeMillis()) {
                    return Result(
                        false,
                        "Ad bonus is on cooldown.",
                        snapshot(context)
                    )
                }
            }
            val remote = com.ffsensitivity.app.data.remote.EconomyRepository.earnAd(context)
            val earn = remote.getOrElse { err ->
                AppLog.e("Ad bonus economy earn failed", err)
                val api = err as? com.ffsensitivity.app.data.remote.ApiException
                if (api?.code == "ECONOMY_AD_COOLDOWN") {
                    val nextAt = api.detailLong("nextAdAvailableAtMs")
                        ?: (System.currentTimeMillis() +
                            ChallengeQuizTimingConfig.adCooldownDurationMs())
                    synchronized(this) {
                        prefs(context).edit().putLong(KEY_AD_NEXT_MS, nextAt).commit()
                    }
                }
                val msg = api?.message ?: "Ad bonus failed. Check connection."
                return Result(false, msg, snapshot(context))
            }
            synchronized(this) {
                val nextAt = earn.nextAdAvailableAtMs
                    ?: (System.currentTimeMillis() +
                        ChallengeQuizTimingConfig.adCooldownDurationMs())
                val note = "Ad bonus +${earn.delta}"
                val saved = prefs(context).edit()
                    .putLong(KEY_AD_NEXT_MS, nextAt)
                    .putString(KEY_LAST_REWARD, note)
                    .remove(KEY_AD)
                    .commit()
                if (!saved) {
                    return@synchronized Result(false, "Could not save ad bonus", snapshot(context))
                }
                Result(true, "+${earn.delta} coins · ad bonus", snapshot(context))
            }
        }.getOrElse {
            AppLog.e("DailyChallenge ad bonus failed", it)
            Result(false, "Ad bonus failed. Try again.", snapshot(context))
        }
    }

    /**
     * Local gate before opening the scratch dialog.
     * Failures should surface on the Scratch button — do not open the card.
     */
    fun precheckMilestoneScratch(context: Context, days: Int): Result {
        return runCatching {
            liveMilestoneByDays(days)
                ?: return Result(false, "Unknown milestone", snapshot(context))
            val token =
                com.ffsensitivity.app.data.UserSessionStore(context).accessToken()
            if (token.isBlank()) {
                return Result(
                    false,
                    "Please sign in again to claim rewards.",
                    snapshot(context)
                )
            }
            synchronized(this) {
                val prefs = prefs(context)
                val streak = prefs.getInt(KEY_STREAK, 0).coerceAtLeast(0)
                val claimed = readClaimed(prefs)
                when {
                    days in claimed ->
                        return Result(false, "Already claimed", snapshot(context))
                    streak < days ->
                        return Result(
                            false,
                            "Need $days-day streak first",
                            snapshot(context)
                        )
                }
            }
            Result(true, "Ready to scratch", snapshot(context))
        }.getOrElse {
            AppLog.e("Milestone scratch precheck failed", it)
            Result(false, "Can't open scratch card. Try again.", snapshot(context))
        }
    }

    fun claimMilestone(context: Context, days: Int): Result {
        return runCatching {
            val milestone = liveMilestoneByDays(days)
                ?: return Result(false, "Unknown milestone", snapshot(context))
            synchronized(this) {
                val prefs = prefs(context)
                val streak = prefs.getInt(KEY_STREAK, 0).coerceAtLeast(0)
                val claimed = readClaimed(prefs)
                when {
                    days in claimed -> {
                        clearMilestoneScratchPending(context, days)
                        return Result(true, "Already claimed · Day $days", snapshot(context))
                    }
                    streak < days ->
                        return Result(false, "Need $days-day streak first", snapshot(context))
                }
            }
            // --- Start: Economy live wire (Sachin) ---
            val remote = com.ffsensitivity.app.data.remote.EconomyRepository.earnMilestone(context, days)
            val earn = remote.getOrElse {
                AppLog.e("Milestone economy earn failed", it)
                val msg = (it as? com.ffsensitivity.app.data.remote.ApiException)?.message
                    ?: "Claim failed. Check connection."
                return Result(false, msg, snapshot(context))
            }
            // --- End: Economy live wire (Sachin) ---
            synchronized(this) {
                val prefs = prefs(context)
                val claimed = readClaimed(prefs)
                if (earn.alreadyApplied || days in claimed) {
                    val nextClaimed = claimed + days
                    val claimedStrings = HashSet<String>(nextClaimed.size).apply {
                        nextClaimed.forEach { add(it.toString()) }
                    }
                    prefs.edit()
                        .putStringSet(KEY_CLAIMED, claimedStrings)
                        .putString(KEY_LAST_REWARD, "Milestone ${days}d already claimed")
                        .commit()
                    clearMilestoneScratchPending(context, days)
                    return@synchronized Result(
                        true,
                        "Already claimed · Day $days",
                        snapshot(context)
                    )
                }
                val nextClaimed = claimed + days
                val claimedStrings = HashSet<String>(nextClaimed.size).apply {
                    nextClaimed.forEach { add(it.toString()) }
                }
                val note = "Milestone ${days}d +${earn.delta}"
                val saved = prefs.edit()
                    .putStringSet(KEY_CLAIMED, claimedStrings)
                    .putString(KEY_LAST_REWARD, note)
                    .commit()
                if (!saved) return@synchronized Result(false, "Could not claim reward", snapshot(context))
                clearMilestoneScratchPending(context, days)
                Result(true, "+${earn.delta} coins · ${milestone.title}", snapshot(context))
            }
        }.getOrElse {
            AppLog.e("DailyChallenge milestone claim failed", it)
            Result(false, "Claim failed. Try again.", snapshot(context))
        }
    }

    /** Align local wallet with server balance after claim / sync. */
    fun setCoins(context: Context, coins: Int, note: String): Result {
        return runCatching {
            synchronized(this) {
                val next = clampCoins(coins)
                val saved = prefs(context).edit()
                    .putInt(KEY_COINS, next)
                    .putString(KEY_LAST_REWARD, note)
                    .commit()
                if (!saved) return Result(false, "Could not update coins", snapshot(context))
                Result(true, note, snapshot(context))
            }
        }.getOrElse {
            AppLog.e("DailyChallenge setCoins failed", it)
            Result(false, "Update failed. Try again.", snapshot(context))
        }
    }

    /** Spend coins for Coin Shop (and other sinks). */
    fun spendCoins(context: Context, amount: Int, note: String): Result {
        return runCatching {
            synchronized(this) {
                if (amount <= 0) return Result(false, "Invalid amount", snapshot(context))
                val prefs = prefs(context)
                val current = clampCoins(prefs.getInt(KEY_COINS, 0))
                if (current < amount) {
                    return Result(false, "Not enough coins", snapshot(context))
                }
                val next = clampCoins(current - amount)
                val saved = prefs.edit()
                    .putInt(KEY_COINS, next)
                    .putString(KEY_LAST_REWARD, note)
                    .commit()
                if (!saved) return Result(false, "Could not spend coins", snapshot(context))
                Result(true, "Spent $amount coins", snapshot(context))
            }
        }.getOrElse {
            AppLog.e("DailyChallenge spendCoins failed", it)
            Result(false, "Spend failed. Try again.", snapshot(context))
        }
    }

    private data class QuizTiming(
        val phase: QuizUiPhase,
        val countdownEndsAtMs: Long,
        val countsAsDone: Boolean
    )

    private fun resolveQuizTiming(
        prefs: SharedPreferences,
        quizToday: Boolean,
        quizOk: Boolean?
    ): QuizTiming {
        if (quizOk == true) {
            return QuizTiming(QuizUiPhase.DONE_CORRECT, 0L, countsAsDone = true)
        }
        if (prefs.getBoolean(KEY_QUIZ_CLOSED, false)) {
            return QuizTiming(QuizUiPhase.CLOSED, 0L, countsAsDone = false)
        }
        val now = System.currentTimeMillis()
        val lockUntil = prefs.getLong(KEY_QUIZ_LOCK_UNTIL, 0L)
        val secondUnlocked = prefs.getBoolean(KEY_QUIZ_SECOND_UNLOCKED, false)
        // Wrong-answer cycle: lock → Watch Ad → new question (no same-Q reopen).
        if (quizToday && quizOk == false && lockUntil > 0L) {
            return when {
                now < lockUntil ->
                    QuizTiming(QuizUiPhase.LOCKED, lockUntil, countsAsDone = false)
                !secondUnlocked ->
                    QuizTiming(QuizUiPhase.AWAITING_AD, 0L, countsAsDone = false)
                else ->
                    QuizTiming(QuizUiPhase.AVAILABLE, 0L, countsAsDone = false)
            }
        }
        if (quizToday && quizOk == false && secondUnlocked) {
            return QuizTiming(QuizUiPhase.AVAILABLE, 0L, countsAsDone = false)
        }
        return QuizTiming(QuizUiPhase.AVAILABLE, 0L, countsAsDone = false)
    }

    fun markSecondChanceUnlocked(context: Context) {
        synchronized(this) {
            prefs(context).edit()
                .putBoolean(KEY_QUIZ_SECOND_UNLOCKED, true)
                .putLong(KEY_QUIZ_LOCK_UNTIL, 0L)
                .apply()
        }
    }

    private fun readClaimed(prefs: SharedPreferences): Set<Int> {
        // Copy out of prefs-owned set before mapping (Android StringSet contract).
        return prefs.getStringSet(KEY_CLAIMED, null)
            ?.let { HashSet(it) }
            ?.mapNotNull { it.toIntOrNull() }
            ?.toSet()
            .orEmpty()
    }

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /** UTC calendar date — matches Nest `utcDateKey()`. */
    private fun today(): String =
        Instant.now().atZone(ZoneOffset.UTC).toLocalDate().format(fmt)

    private fun yesterday(): String =
        Instant.now().atZone(ZoneOffset.UTC).toLocalDate().minus(1, ChronoUnit.DAYS).format(fmt)
}
