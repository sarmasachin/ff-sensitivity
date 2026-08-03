package com.ffsensitivity.app.presentation.components

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.DeviceLiveMetrics
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.Danger
import com.ffsensitivity.app.presentation.theme.Ember
import com.ffsensitivity.app.presentation.theme.HairlineStrong
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.Success
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import java.util.Locale

/**
 * Hardware card: title left · live ping center · live battery °C right (color by band).
 */
@Composable
fun HardwareSectionCard(content: @Composable () -> Unit) {
    val context = LocalContext.current
    var tempC by remember { mutableStateOf<Float?>(null) }
    var pingMs by remember { mutableStateOf<Int?>(null) }

    DisposableEffect(Unit) {
        val filter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context?, intent: Intent?) {
                tempC = DeviceLiveMetrics.batteryCelsiusFrom(intent)
            }
        }
        val sticky = if (Build.VERSION.SDK_INT >= 33) {
            context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            context.registerReceiver(receiver, filter)
        }
        tempC = DeviceLiveMetrics.batteryCelsiusFrom(sticky)
            ?: DeviceLiveMetrics.readBatteryCelsius(context)
        onDispose {
            runCatching { context.unregisterReceiver(receiver) }
        }
    }

    LaunchedEffect(Unit) {
        while (isActive) {
            pingMs = DeviceLiveMetrics.measurePingMs()
            delay(2000L)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(SurfaceCard)
            .border(1.dp, HairlineStrong, RoundedCornerShape(20.dp))
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "HARDWARE",
                color = Amber,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.2.sp,
                textAlign = TextAlign.Start,
                modifier = Modifier.weight(1f)
            )
            Text(
                text = formatPing(pingMs),
                color = pingColor(pingMs),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center,
                modifier = Modifier.weight(1f)
            )
            Text(
                text = formatTemp(tempC),
                color = tempColor(tempC),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.End,
                modifier = Modifier.weight(1f)
            )
        }
        Spacer(modifier = Modifier.height(12.dp))
        content()
    }
}

private fun formatPing(ms: Int?): String {
    return if (ms == null) "Ping: —" else "Ping: $ms ms"
}

private fun formatTemp(c: Float?): String {
    return if (c == null) {
        "Temp: —"
    } else {
        String.format(Locale.US, "Temp: %.1f°C", c)
    }
}

/** Cool / normal / elevated / hot — battery °C bands. */
private fun tempColor(c: Float?): Color {
    if (c == null) return InkMuted
    return when {
        c < 30f -> Success
        c < 40f -> Amber
        c < 45f -> Ember
        else -> Danger
    }
}

/** Low / average / high latency bands for HTTP RTT. */
private fun pingColor(ms: Int?): Color {
    if (ms == null) return InkMuted
    return when {
        ms < 60 -> Success
        ms < 120 -> Amber
        else -> Danger
    }
}
