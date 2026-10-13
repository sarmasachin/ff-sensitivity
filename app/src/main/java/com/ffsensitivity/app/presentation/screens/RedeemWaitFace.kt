package com.ffsensitivity.app.presentation.screens

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import kotlinx.coroutines.delay

internal data class RedeemWaitFace(
    val label: String,
    val ready: Boolean
)

/** Countdown for the admin window. At zero the next action is an ad or a scratch. */
@Composable
internal fun redeemWaitFace(
    waitUntilMs: Long?,
    nextIsAd: Boolean,
    onReady: (() -> Unit)? = null
): RedeemWaitFace {
    val until = waitUntilMs ?: 0L
    var now by remember(until) { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(until) {
        if (until <= 0L) return@LaunchedEffect
        while (System.currentTimeMillis() < until) {
            now = System.currentTimeMillis()
            delay(1_000)
        }
        now = until
        onReady?.invoke()
    }
    if (until <= 0L) {
        return RedeemWaitFace(label = "WAIT", ready = false)
    }
    val left = until - now
    if (left <= 0L) {
        return RedeemWaitFace(
            label = if (nextIsAd) "WATCH AD" else "SCRATCH",
            ready = true
        )
    }
    return RedeemWaitFace(label = formatRedeemWait(left), ready = false)
}

internal fun formatRedeemWait(leftMs: Long): String {
    val totalSec = (leftMs / 1000L).coerceAtLeast(0L)
    val hours = totalSec / 3600L
    val minutes = (totalSec % 3600L) / 60L
    val seconds = totalSec % 60L
    return if (hours > 0L) {
        "%d:%02d:%02d".format(hours, minutes, seconds)
    } else {
        "%02d:%02d".format(minutes, seconds)
    }
}
