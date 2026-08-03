package com.ffsensitivity.app.data

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.SystemClock
import com.ffsensitivity.app.util.AppLog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

/**
 * Live battery °C + HTTP RTT ping for device-scan header.
 * Kept separate from [DeviceInfoFetcher] (1000-line limit).
 */
object DeviceLiveMetrics {

    /** Battery EXTRA_TEMPERATURE is tenths of °C. */
    fun batteryCelsiusFrom(intent: Intent?): Float? {
        if (intent == null) return null
        val tenths = intent.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, Int.MIN_VALUE)
        if (tenths == Int.MIN_VALUE) return null
        return tenths / 10f
    }

    fun readBatteryCelsius(context: Context): Float? {
        return runCatching {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            val sticky = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            batteryCelsiusFrom(sticky)
        }.getOrElse {
            AppLog.e("Battery temperature read failed", it)
            null
        }
    }

    /**
     * HTTPS RTT to Google connectivity check (204).
     * This is app network latency in ms — not game-server ICMP ping.
     */
    suspend fun measurePingMs(): Int? = withContext(Dispatchers.IO) {
        runCatching {
            val url = URL("https://connectivitycheck.gstatic.com/generate_204")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                connectTimeout = 3000
                readTimeout = 3000
                instanceFollowRedirects = false
                useCaches = false
                requestMethod = "GET"
            }
            try {
                val start = SystemClock.elapsedRealtime()
                conn.connect()
                // Drain status; 204 is the expected success for this endpoint.
                val code = conn.responseCode
                val elapsed = (SystemClock.elapsedRealtime() - start).toInt()
                if (code == 204 || code in 200..399) elapsed else null
            } finally {
                runCatching { conn.disconnect() }
            }
        }.getOrElse {
            AppLog.e("Ping measure failed", it)
            null
        }
    }
}
