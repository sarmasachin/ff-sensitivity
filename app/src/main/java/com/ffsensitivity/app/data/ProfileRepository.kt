package com.ffsensitivity.app.data

import android.content.Context
import com.ffsensitivity.app.data.remote.ApiException
import com.ffsensitivity.app.data.remote.ProfileApi
import com.ffsensitivity.app.data.remote.UserProfile

object ProfileOptions {
    val roles = listOf("Rusher", "One-Tap Headshot", "Sniper", "Flanker")
    val regions = listOf(
        "India",
        "Brazil",
        "Middle East",
        "Singapore",
        "Indonesia",
        "North America",
        "Europe",
        "Latin America"
    )
}

object ProfileRepository {
    private const val PREFS = "ff_profile_cache_v1"

    fun cached(context: Context, userId: String): UserProfile? {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (prefs.getString("user_id", "") != userId) return null
        if (!prefs.contains("display_name")) return null
        return UserProfile(
            userId = userId,
            googleName = prefs.getString("google_name", "").orEmpty(),
            email = prefs.getString("email", "").orEmpty(),
            photoUrl = prefs.getString("photo_url", "").orEmpty(),
            displayName = prefs.getString("display_name", "").orEmpty(),
            ffUid = prefs.getString("ff_uid", "").orEmpty(),
            playRole = prefs.getString("play_role", "").orEmpty(),
            region = prefs.getString("region", "").orEmpty(),
            notifyPush = prefs.getBoolean("notify_push", true),
            coins = prefs.getInt("coins", 0),
            streakDays = prefs.getInt("streak", 0)
        )
    }

    fun load(context: Context): Result<UserProfile> {
        val session = UserSessionStore(context)
        val token = session.accessToken()
        if (token.isBlank()) {
            return Result.failure(ApiException("AUTH_REQUIRED", "Please sign in again."))
        }
        return ProfileApi.get(token).map { profile ->
            val saved = profile.copy(userId = session.userId())
            write(context, saved)
            if (saved.displayName.isNotBlank()) session.rename(saved.displayName)
            saved
        }
    }

    fun save(context: Context, profile: UserProfile): Result<UserProfile> {
        val session = UserSessionStore(context)
        val token = session.accessToken()
        if (token.isBlank()) {
            return Result.failure(ApiException("AUTH_REQUIRED", "Please sign in again."))
        }
        return ProfileApi.save(token, profile).map { remote ->
            val saved = remote.copy(userId = session.userId())
            write(context, saved)
            if (saved.displayName.isNotBlank()) {
                session.rename(saved.displayName)
            }
            saved
        }
    }

    fun deleteAccount(context: Context): Result<Unit> {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return Result.failure(ApiException("AUTH_REQUIRED", "Please sign in again."))
        }
        return ProfileApi.deleteAccount(token).onSuccess { clear(context) }
    }

    fun clear(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
    }

    private fun write(context: Context, profile: UserProfile) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString("user_id", profile.userId)
            .putString("google_name", profile.googleName)
            .putString("email", profile.email)
            .putString("photo_url", profile.photoUrl)
            .putString("display_name", profile.displayName)
            .putString("ff_uid", profile.ffUid)
            .putString("play_role", profile.playRole)
            .putString("region", profile.region)
            .putBoolean("notify_push", profile.notifyPush)
            .putInt("coins", profile.coins)
            .putInt("streak", profile.streakDays)
            .apply()
    }
}
