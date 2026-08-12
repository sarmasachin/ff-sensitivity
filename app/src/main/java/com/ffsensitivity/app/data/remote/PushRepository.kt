package com.ffsensitivity.app.data.remote

import android.content.Context
import android.content.SharedPreferences
import com.ffsensitivity.app.data.DeviceInstallStore
import com.ffsensitivity.app.data.SecurePrefs
import com.ffsensitivity.app.data.UserSessionStore
import com.ffsensitivity.app.util.AppLog
import com.google.android.gms.tasks.Tasks
import com.google.firebase.messaging.FirebaseMessaging
import java.util.concurrent.TimeUnit

// --- Start: Push live wire (Sachin) ---
object PushInboxCache {
    @Volatile
    var messages: List<PushInboxMessage> = emptyList()
        private set

    fun set(next: List<PushInboxMessage>) {
        messages = next
    }
}

object PushRepository {
    private const val PREFS_ENC = "ff_push_fcm_v2_enc"
    private const val PREFS_LEGACY = "ff_push_fcm_v1"
    private const val KEY_TOKEN = "fcm_token"
    private val defaultTopics = listOf("feature_names", "all_users")

    private fun prefs(context: Context): SharedPreferences =
        SecurePrefs.open(
            context = context,
            encryptedName = PREFS_ENC,
            legacyName = PREFS_LEGACY,
            migrateKeys = listOf(KEY_TOKEN),
        )

    fun storeFcmToken(context: Context, token: String) {
        val t = token.trim()
        if (t.length < 8) return
        prefs(context).edit().putString(KEY_TOKEN, t).apply()
    }

    fun cachedFcmToken(context: Context): String =
        prefs(context).getString(KEY_TOKEN, "").orEmpty()

    /** Fetch FCM registration token (blocks; call off main thread). */
    fun fetchFcmToken(context: Context): String {
        val cached = cachedFcmToken(context)
        return runCatching {
            val token = Tasks.await(
                FirebaseMessaging.getInstance().token,
                15,
                TimeUnit.SECONDS
            )
            if (!token.isNullOrBlank()) {
                storeFcmToken(context, token)
                token
            } else {
                cached
            }
        }.getOrElse {
            AppLog.e("FCM token fetch failed", it)
            cached
        }
    }

    private fun subscribeTopics() {
        for (topic in defaultTopics) {
            runCatching {
                Tasks.await(
                    FirebaseMessaging.getInstance().subscribeToTopic(topic),
                    10,
                    TimeUnit.SECONDS
                )
            }.onFailure { AppLog.e("FCM subscribe $topic failed", it) }
        }
    }

    /** Token + topic subscribe (works even before JWT). Needed for tray topic pushes. */
    fun ensureFcmSubscribed(context: Context): String {
        val fcm = fetchFcmToken(context)
        if (fcm.length >= 8) subscribeTopics()
        return fcm
    }

    fun registerAndSync(context: Context): Result<List<PushInboxMessage>> {
        return runCatching {
            val fcm = ensureFcmSubscribed(context)
            if (fcm.length < 8) {
                throw IllegalStateException("FCM token unavailable")
            }
            val access = UserSessionStore(context).accessToken()
            if (access.isBlank()) {
                throw IllegalStateException("Not signed in")
            }
            PushApi.registerDevice(
                accessToken = access,
                token = fcm,
                topics = defaultTopics,
                installId = DeviceInstallStore.installId(context)
            ).getOrThrow()
            // Heartbeat may be DEVICE_OWNED after account switch — push token is enough.
            runCatching { DeviceRepository.syncHeartbeat(context) }
            refreshInbox(context).getOrElse { emptyList() }
        }.onFailure {
            AppLog.e("PushRepository.registerAndSync failed", it)
        }
    }

    /** Reload inbox messages for the signed-in user (call off main thread). */
    fun refreshInbox(context: Context): Result<List<PushInboxMessage>> {
        val access = UserSessionStore(context).accessToken()
        if (access.isBlank()) {
            return Result.failure(IllegalStateException("Not signed in"))
        }
        return PushApi.getInbox(access).map { list ->
            PushInboxCache.set(list)
            PushInboxBadge.recount(context, list)
            list
        }.onFailure {
            AppLog.e("PushRepository.refreshInbox failed", it)
        }
    }

    fun routeForDeepLink(deepLink: String): String? =
        PromoRepository.routeForDeepLink(deepLink)
}
// --- End: Push live wire (Sachin) ---
