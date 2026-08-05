package com.ffsensitivity.app.data.remote

import android.content.Context
import com.ffsensitivity.app.data.SharedSensiCard
import com.ffsensitivity.app.data.UserSessionStore

// --- Start: Community live wire (Sachin) ---
object CommunityRepository {
    fun feed(context: Context): Result<List<SharedSensiCard>> {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return Result.failure(ApiException("AUTH_REQUIRED", "Please sign in again."))
        }
        return CommunityApi.feed(token)
    }

    fun submit(context: Context, card: SharedSensiCard): Result<CommunitySubmitResult> {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return Result.failure(
                ApiException("AUTH_REQUIRED", "Please sign in again to share to Community.")
            )
        }
        return CommunityApi.submit(token, card)
    }

    fun report(context: Context, postId: String): Result<Unit> {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return Result.failure(ApiException("AUTH_REQUIRED", "Please sign in again."))
        }
        if (postId.isBlank() || postId.contains('/')) {
            return Result.failure(ApiException("COMMUNITY_BAD_ID", "Invalid post."))
        }
        return CommunityApi.report(token, postId)
    }
}
// --- End: Community live wire (Sachin) ---
