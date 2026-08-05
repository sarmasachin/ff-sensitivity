package com.ffsensitivity.app.data.remote

import android.content.Context
import android.os.Build
import com.ffsensitivity.app.BuildConfig
import com.ffsensitivity.app.data.DeviceInstallStore
import com.ffsensitivity.app.data.UserSessionStore
import com.ffsensitivity.app.util.AppLog

// --- Start: Devices live wire (Sachin) ---
object DeviceRepository {
    @Volatile
    var lastBlocked: Boolean = false
        private set

    @Volatile
    var lastBlockMessage: String = ""
        private set

    fun syncHeartbeat(context: Context): Result<DeviceHeartbeatResult> {
        val access = UserSessionStore(context).accessToken()
        if (access.isBlank()) {
            return Result.failure(IllegalStateException("Not signed in"))
        }
        return runCatching {
            val installId = DeviceInstallStore.installId(context)
            val fcm = PushRepository.cachedFcmToken(context)
            val hint = if (fcm.length >= 8) {
                "${fcm.take(4)}…${fcm.takeLast(4)}"
            } else {
                ""
            }
            val versionCode = runCatching {
                if (Build.VERSION.SDK_INT >= 28) {
                    context.packageManager.getPackageInfo(context.packageName, 0)
                        .longVersionCode.toInt()
                } else {
                    @Suppress("DEPRECATION")
                    context.packageManager.getPackageInfo(context.packageName, 0).versionCode
                }
            }.getOrDefault(BuildConfig.VERSION_CODE)
            val versionName = runCatching {
                context.packageManager.getPackageInfo(context.packageName, 0).versionName
            }.getOrNull().orEmpty().ifBlank { BuildConfig.VERSION_NAME }

            DeviceApi.heartbeat(
                accessToken = access,
                installId = installId,
                brand = Build.BRAND.orEmpty().take(40),
                model = Build.MODEL.orEmpty().take(60),
                androidVersion = Build.VERSION.RELEASE.orEmpty().take(20),
                appVersion = versionName.take(32),
                appVersionCode = versionCode,
                hasFcmToken = fcm.length >= 8,
                fcmTokenHint = hint
            ).getOrThrow()
        }.map { result ->
            lastBlocked = result.blocked
            lastBlockMessage = result.message
            result
        }.onFailure {
            AppLog.e("DeviceRepository.syncHeartbeat failed", it)
        }
    }
}
// --- End: Devices live wire (Sachin) ---
