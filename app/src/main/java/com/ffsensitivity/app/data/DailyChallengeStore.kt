package com.ffsensitivity.app.data

import android.content.Context
import android.content.SharedPreferences
import com.ffsensitivity.app.util.AppLog
import java.time.LocalDate
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
    private const val KEY_AD = "ad_date"
    private const val KEY_LAST_REWARD = "last_reward"
    private const val KEY_CLAIMED = "claimed_milestones"
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
        val adDoneToday: Boolean,
        val lastRewardNote: String,
        val claimedMilestones: Set<Int> = emptySet(),
        val quizPhase: QuizUiPhase = QuizUiPhase.AVAILABLE,
        /** Epoch ms for active countdown (lock end or open-window end). 0 = none. */
        val quizCountdownEndsAtMs: Long = 0L
    ) {
        val todayDoneCount: Int
            get() = listOf(checkedInToday, quizDoneToday, adDoneToday).count { it }
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
            Snapshot(
                coins = clampCoins(prefs.getInt(KEY_COINS, 0)),
                streak = prefs.getInt(KEY_STREAK, 0).coerceAtLeast(0),
                checkedInToday = prefs.getString(KEY_CHECKIN, null) == today,
                quizDoneToday = timing.countsAsDone,
                quizCorrectToday = quizOk,
                adDoneToday = prefs.getString(KEY_AD, null) == today,
                lastRewardNote = prefs.getString(KEY_LAST_REWARD, "").orEmpty(),
                claimedMilestones = readClaimed(prefs),
                quizPhase = timing.phase,
                quizCountdownEndsAtMs = timing.countdownEndsAtMs
            )
        }.getOrElse {
            AppLog.e("DailyChallenge snapshot failed", it)
            Snapshot(0, 0, false, false, null, false, "", emptySet())
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
                    val lockUntil = earn.lockUntilMs
                        ?: (now + ChallengeQuizTimingConfig.lockDurationMs())
                    val openUntil = earn.openUntilMs
                        ?: (lockUntil + ChallengeQuizTimingConfig.openWindowMs())
                    val note =
                        "Quiz $deltaLabel · locked ${ChallengeQuizTimingConfig.wrongAnswerLockHours}h"
                    val saved = prefs.edit()
                        .putString(KEY_QUIZ, today)
                        .putBoolean(KEY_QUIZ_OK, false)
                        .putLong(KEY_QUIZ_LOCK_UNTIL, lockUntil)
                        .putLong(KEY_QUIZ_OPEN_UNTIL, openUntil)
                        .putString(KEY_LAST_REWARD, note)
                        .commit()
                    if (!saved) return@synchronized Result(false, "Could not save quiz", snapshot(context))
                    Result(
                        true,
                        "$deltaLabel coins · wrong · opens in ${ChallengeQuizTimingConfig.wrongAnswerLockHours}h",
                        snapshot(context)
                    )
                }
            }
        }.getOrElse {
            AppLog.e("DailyChallenge quiz failed", it)
            Result(false, "Quiz submit failed. Try again.", snapshot(context))
        }
    }

    fun claimAdBonus(context: Context): Result {
        return runCatching {
            synchronized(this) {
                val prefs = prefs(context)
                val today = today()
                if (prefs.getString(KEY_AD, null) == today) {
                    return Result(false, "Ad bonus already claimed today", snapshot(context))
                }
            }
            // --- Start: Economy live wire (Sachin) ---
            val remote = com.ffsensitivity.app.data.remote.EconomyRepository.earnAd(context)
            val earn = remote.getOrElse {
                AppLog.e("Ad economy earn failed", it)
                val msg = (it as? com.ffsensitivity.app.data.remote.ApiException)?.message
                    ?: "Ad bonus failed. Check connection."
                return Result(false, msg, snapshot(context))
            }
            // --- End: Economy live wire (Sachin) ---
            synchronized(this) {
                val prefs = prefs(context)
                val today = today()
                val note = "Ad bonus +${earn.delta}"
                val saved = prefs.edit()
                    .putString(KEY_AD, today)
                    .putString(KEY_LAST_REWARD, note)
                    .commit()
                if (!saved) return@synchronized Result(false, "Could not save ad bonus", snapshot(context))
                Result(true, "+${earn.delta} coins · ad bonus", snapshot(context))
            }
        }.getOrElse {
            AppLog.e("DailyChallenge ad bonus failed", it)
            Result(false, "Ad bonus failed. Try again.", snapshot(context))
        }
    }

    fun claimMilestone(context: Context, days: Int): Result {
        return runCatching {
            val milestone = streakMilestones.firstOrNull { it.days == days }
                ?: return Result(false, "Unknown milestone", snapshot(context))
            synchronized(this) {
                val prefs = prefs(context)
                val streak = prefs.getInt(KEY_STREAK, 0).coerceAtLeast(0)
                val claimed = readClaimed(prefs)
                when {
                    days in claimed ->
                        return Result(false, "Already claimed", snapshot(context))
                    streak < days && !ScratchCardDebug.isForceUnlocked(days) ->
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
        val now = System.currentTimeMillis()
        val lockUntil = prefs.getLong(KEY_QUIZ_LOCK_UNTIL, 0L)
        val openUntil = prefs.getLong(KEY_QUIZ_OPEN_UNTIL, 0L)
        // Wrong-answer cycle only applies when today's quiz was marked wrong with lock times.
        if (quizToday && quizOk == false && lockUntil > 0L && openUntil > 0L) {
            return when {
                now < lockUntil ->
                    QuizTiming(QuizUiPhase.LOCKED, lockUntil, countsAsDone = false)
                now < openUntil ->
                    QuizTiming(QuizUiPhase.OPEN, openUntil, countsAsDone = false)
                else ->
                    QuizTiming(QuizUiPhase.CLOSED, 0L, countsAsDone = false)
            }
        }
        // First attempt of the day (or no active lock cycle).
        return QuizTiming(QuizUiPhase.AVAILABLE, 0L, countsAsDone = false)
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

    private fun today(): String = LocalDate.now().format(fmt)

    private fun yesterday(): String = LocalDate.now().minus(1, ChronoUnit.DAYS).format(fmt)
}
