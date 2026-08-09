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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.presentation.theme.SurfaceLift
import kotlin.math.roundToInt

/**
 * Drawer that **overlays** the app instead of sliding the main content away.
 *
 * Material [androidx.compose.material3.ModalNavigationDrawer] translates the Scaffold
 * by ~drawer width. On our dark VoidBlack theme that peek looks like a black screen
 * (home cards gone, bottom bar strip still visible).
 *
 * Panel keeps its **own opaque background** so a child measure glitch can never show
 * an empty black hole over home.
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
    val drawerShape = RoundedCornerShape(topEnd = 20.dp, bottomEnd = 20.dp)

    Box(modifier = Modifier.fillMaxSize()) {
        // Main app never translates — home / bottom bar stay put.
        content()

        if (progress > 0.001f) {
            // Light scrim — home cards must stay readable under the menu.
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.28f * progress))
                    .clickable(
                        indication = null,
                        interactionSource = remember { MutableInteractionSource() },
                        onClick = onClose
                    )
            )
            // Opaque panel shell (not transparent) — empty child ≠ black hole.
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
                    .clip(drawerShape)
                    .background(Brush.verticalGradient(listOf(SurfaceLift, SurfaceCard)))
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
