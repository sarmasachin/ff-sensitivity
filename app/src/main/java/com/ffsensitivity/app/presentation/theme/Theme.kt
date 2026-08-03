package com.ffsensitivity.app.presentation.theme

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val Scheme = darkColorScheme(
    primary = Amber,
    onPrimary = VoidBlack,
    secondary = Ember,
    background = VoidBlack,
    surface = SurfaceCard,
    onBackground = InkPrimary,
    onSurface = InkPrimary,
    outline = Hairline
)

@Composable
fun FFSensitivityTheme(content: @Composable () -> Unit) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = view.context.findActivity()?.window ?: return@SideEffect
            WindowCompat.getInsetsController(window, view).apply {
                // Dark app chrome → light (white) status/nav icons so clock & battery stay visible.
                isAppearanceLightStatusBars = false
                isAppearanceLightNavigationBars = false
            }
        }
    }
    MaterialTheme(
        colorScheme = Scheme.copy(surfaceVariant = SurfaceLift),
        typography = AppTypography,
        content = content
    )
}

private fun Context.findActivity(): Activity? {
    var ctx: Context? = this
    while (ctx is ContextWrapper) {
        if (ctx is Activity) return ctx
        ctx = ctx.baseContext
    }
    return ctx as? Activity
}
