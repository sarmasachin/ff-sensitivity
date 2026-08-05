package com.ffsensitivity.app.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
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
        PushRepository.storeFcmToken(applicationContext, token)
        val access = UserSessionStore(applicationContext).accessToken()
        if (access.isNotBlank()) {
            Thread {
                PushRepository.registerAndSync(applicationContext)
            }.start()
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
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
        showTrayNotification(title, body, deepLink)
    }

    private fun showTrayNotification(title: String, body: String, deepLink: String) {
        ensureChannel()
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
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_launcher_app)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pending)
            .build()
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        nm.notify((System.currentTimeMillis() % Int.MAX_VALUE).toInt(), notification)
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        val existing = nm.getNotificationChannel(CHANNEL_ID)
        if (existing != null) return
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

    companion object {
        const val CHANNEL_ID = "ff_ops_push"
        const val EXTRA_DEEP_LINK = "deepLink"
    }
}
// --- End: Push FCM live wire (Sachin) ---
