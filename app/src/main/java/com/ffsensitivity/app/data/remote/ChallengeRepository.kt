package com.ffsensitivity.app.data.remote

import android.content.Context
import com.ffsensitivity.app.data.DailyChallengeStore
import com.ffsensitivity.app.data.DailyQuizQuestion
import com.ffsensitivity.app.data.ShopStore
import com.ffsensitivity.app.data.StreakMilestone
import com.ffsensitivity.app.data.UserSessionStore
import com.ffsensitivity.app.util.AppLog

// --- Start: Challenge live wire (Sachin) ---
object ChallengeRemoteCache {
    @Volatile
    var todayQuestion: DailyQuizQuestion? = null
        private set

    @Volatile
    var milestones: List<StreakMilestone>? = null
        private set

    fun setToday(question: DailyQuizQuestion?, ms: List<StreakMilestone>) {
        todayQuestion = question
        milestones = ms
    }
}

object ChallengeRepository {
    fun syncToday(context: Context): Result<ChallengeTodayPayload> {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return Result.failure(ApiException("AUTH_REQUIRED", "Please sign in again."))
        }
        return ChallengeApi.getToday(token).map { payload ->
            ChallengeRemoteCache.setToday(payload.question, payload.milestones)
            DailyChallengeStore.applyRemoteToday(context, payload)
            payload
        }.onFailure { AppLog.e("ChallengeRepository.syncToday failed", it) }
    }

    fun submitQuiz(
        context: Context,
        questionId: String,
        selectedIndex: Int
    ): Result<ChallengeQuizSubmitResult> {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return Result.failure(
                ApiException("AUTH_REQUIRED", "Please sign in again to submit the quiz.")
            )
        }
        return ChallengeApi.submitQuiz(token, questionId, selectedIndex).map { result ->
            DailyChallengeStore.setCoins(context, result.coins, result.reason.ifBlank { "Quiz" })
            EconomyApi.getWallet(token).onSuccess { wallet ->
                runCatching {
                    ShopStore.replaceBoostCharges(
                        context,
                        mapOf(
                            ShopStore.ID_BOOST_CHECKIN_PLUS to
                                (wallet.boosts[ShopStore.ID_BOOST_CHECKIN_PLUS] ?: 0),
                            ShopStore.ID_BOOST_QUIZ_DOUBLE to
                                (wallet.boosts[ShopStore.ID_BOOST_QUIZ_DOUBLE] ?: 0)
                        )
                    )
                }.onFailure { AppLog.e("quiz boost sync failed", it) }
            }
            result
        }
    }

    fun unlockSecondChance(context: Context): Result<DailyQuizQuestion> {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return Result.failure(
                ApiException("AUTH_REQUIRED", "Please sign in again.")
            )
        }
        return ChallengeApi.unlockSecondChance(token).map { q ->
            ChallengeRemoteCache.setToday(q, ChallengeRemoteCache.milestones.orEmpty())
            DailyChallengeStore.markSecondChanceUnlocked(context)
            q
        }
    }
}
// --- End: Challenge live wire (Sachin) ---
