package com.ffsensitivity.app.presentation.components

import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import kotlin.math.roundToInt

/**
 * Drawer that **overlays** the app instead of sliding the main content away.
 *
 * Material [androidx.compose.material3.ModalNavigationDrawer] translates the Scaffold
 * by ~drawer width. On our dark VoidBlack theme that peek looks like a black screen
 * (home cards gone, bottom bar strip still visible) — especially intermittent when
 * the sheet layout glitches empty. Overlay keeps Home fully visible under a light scrim.
 */
@Composable
fun OverlayAppDrawer(
    open: Boolean,
    onClose: () -> Unit,
    drawerContent: @Composable BoxScope.() -> Unit,
    content: @Composable () -> Unit
) {
    val progress by animateFloatAsState(
        targetValue = if (open) 1f else 0f,
        animationSpec = tween(durationMillis = 280, easing = FastOutSlowInEasing),
        label = "overlay_drawer"
    )
    val screenWidthDp = LocalConfiguration.current.screenWidthDp
    val drawerWidthDp = (screenWidthDp * 0.72f).roundToInt().coerceIn(260, 300)
    val density = LocalDensity.current
    val drawerWidthPx = with(density) { drawerWidthDp.dp.toPx() }

    Box(modifier = Modifier.fillMaxSize()) {
        // Main app never translates — home / bottom bar stay put.
        content()

        if (progress > 0.001f) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.42f * progress))
                    .clickable(
                        indication = null,
                        interactionSource = remember { MutableInteractionSource() },
                        onClick = onClose
                    )
            )
            // Consume taps on the panel (gaps between items) so they do not hit the scrim.
            Box(
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .fillMaxHeight()
                    .width(drawerWidthDp.dp)
                    .offset {
                        IntOffset(
                            x = (-drawerWidthPx * (1f - progress)).roundToInt(),
                            y = 0
                        )
                    }
                    .clickable(
                        indication = null,
                        interactionSource = remember { MutableInteractionSource() },
                        onClick = {}
                    ),
                content = drawerContent
            )
        }
    }

    // After content() so this wins over screen BackHandlers while the menu is open.
    BackHandler(enabled = open) { onClose() }
}
