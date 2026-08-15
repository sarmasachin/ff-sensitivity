package com.ffsensitivity.app

import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.ffsensitivity.app.util.SafeOps

private const val EXIT_WINDOW_MS = 2_000L

/**
 * First back: toast. Second back within [EXIT_WINDOW_MS]: finish activity.
 */
@Composable
internal fun DoubleBackToExitHandler(activity: ComponentActivity) {
    var lastBackAtMs by remember { mutableLongStateOf(0L) }
    BackHandler {
        val now = System.currentTimeMillis()
        if (now - lastBackAtMs <= EXIT_WINDOW_MS) {
            activity.finish()
        } else {
            lastBackAtMs = now
            SafeOps.toast(activity, "Press back again to exit FF Sensitivity")
        }
    }
}
