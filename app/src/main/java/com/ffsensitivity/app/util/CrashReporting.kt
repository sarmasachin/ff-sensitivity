package com.ffsensitivity.app.util

import android.content.Context
import com.ffsensitivity.app.BuildConfig
import com.ffsensitivity.app.data.DeviceInstallStore
import com.ffsensitivity.app.data.UserSessionStore
import com.google.firebase.crashlytics.FirebaseCrashlytics

/**
 * Crashlytics identity is pseudonymous only: no email, display name, JWT,
 * Google token, device model, or free-form user content is attached.
 */
object CrashReporting {
    fun initialize(context: Context) {
        runCatching {
            FirebaseCrashlytics.getInstance().apply {
                setCrashlyticsCollectionEnabled(!BuildConfig.DEBUG)
                setCustomKey("app_version", BuildConfig.VERSION_NAME)
                setCustomKey(
                    "install_id",
                    DeviceInstallStore.installId(context.applicationContext)
                )
            }
        }.onFailure { AppLog.e("Crashlytics init failed", it) }
    }

    fun syncUser(context: Context) {
        runCatching {
            val session = UserSessionStore(context)
            FirebaseCrashlytics.getInstance().setUserId(
                if (session.isSignedIn()) session.userId() else ""
            )
        }.onFailure { AppLog.e("Crashlytics user sync failed", it) }
    }

    fun clearUser() {
        runCatching { FirebaseCrashlytics.getInstance().setUserId("") }
            .onFailure { AppLog.e("Crashlytics user clear failed", it) }
    }
}
