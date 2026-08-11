package com.ffsensitivity.app.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.ffsensitivity.app.MainActivity
import com.ffsensitivity.app.R
import com.ffsensitivity.app.data.UserSessionStore
import com.ffsensitivity.app.data.remote.PushRepository
import com.ffsensitivity.app.util.AppLog
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

// --- Start: Push FCM live wire (Sachin) ---
class FfFirebaseMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        AppLog.e("FCM token refreshed")
        Thread {
            PushRepository.ensureFcmSubscribed(applicationContext)
            val access = UserSessionStore(applicationContext).accessToken()
            if (access.isNotBlank()) {
                PushRepository.registerAndSync(applicationContext)
            }
        }.start()
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        AppLog.e(
            "FCM onMessageReceived keys=${message.data.keys.joinToString()} hasNotif=${message.notification != null}"
        )
        val title =
            message.notification?.title
                ?: message.data["title"]
                ?: getString(R.string.app_name)
        val body =
            message.notification?.body
                ?: message.data["body"]
                ?: ""
        val deepLink =
            message.data["deepLink"]?.trim()?.ifBlank { null }
                ?: "ffops://home"
        val campaignId = message.data["campaignId"]?.trim().orEmpty()
        showTrayNotification(title, body, deepLink, campaignId)
    }

    private fun showTrayNotification(
        title: String,
        body: String,
        deepLink: String,
        campaignId: String = "",
    ) {
        ensureChannel(this)
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(EXTRA_DEEP_LINK, deepLink)
        }
        val pending = PendingIntent.getActivity(
            this,
            deepLink.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            // Status bar: white silhouette only (Android requirement).
            .setSmallIcon(R.drawable.ic_stat_ff_notification)
            .setColor(ContextCompat.getColor(this, R.color.ff_notification_accent))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pending)
        loadAppIconBitmap()?.let { builder.setLargeIcon(it) }
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N &&
            !nm.areNotificationsEnabled()
        ) {
            AppLog.e("Notifications disabled in system settings — tray skipped")
            return
        }
        val notifyId =
            if (campaignId.isNotEmpty()) {
                campaignId.hashCode()
            } else {
                (System.currentTimeMillis() % Int.MAX_VALUE).toInt()
            }
        nm.notify(notifyId, builder.build())
    }

    /** Full-color launcher art for the left notification circle. */
    private fun loadAppIconBitmap(): Bitmap? {
        return runCatching {
            val decoded =
                BitmapFactory.decodeResource(resources, R.mipmap.ic_launcher_foreground)
                    ?: BitmapFactory.decodeResource(resources, R.mipmap.ic_launcher)
            if (decoded != null) return@runCatching decoded
            val drawable = packageManager.getApplicationIcon(packageName)
            val size = 192
            Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888).also { bmp ->
                drawable.setBounds(0, 0, size, size)
                drawable.draw(Canvas(bmp))
            }
        }.onFailure {
            AppLog.e("Notification app icon bitmap failed", it)
        }.getOrNull()
    }

    companion object {
        const val CHANNEL_ID = "ff_ops_push"
        const val EXTRA_DEEP_LINK = "deepLink"

        /** Must exist before background FCM (system tray uses default_notification_channel_id). */
        fun ensureChannel(context: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
            val nm = context.getSystemService(NotificationManager::class.java) ?: return
            if (nm.getNotificationChannel(CHANNEL_ID) != null) return
            nm.createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    "FF Ops Push",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Campaign alerts from FF Sensitivity"
                }
            )
        }
    }
}
// --- End: Push FCM live wire (Sachin) ---
