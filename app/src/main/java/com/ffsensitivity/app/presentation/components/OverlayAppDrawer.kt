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
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.presentation.theme.SurfaceLift
import kotlin.math.roundToInt

/**
 * Side menu overlays home — main content never slides away.
 *
 * Why not Material [ModalNavigationDrawer]: it translates the Scaffold; on VoidBlack
 * that peek looks like a black screen (bottom bar still visible).
 *
 * Why not Popup: a separate window can paint opaque black over content while the
 * Scaffold bottom bar stays in the activity window — exact “black + bottom bar” bug.
 *
 * Slide uses [graphicsLayer] translation (GPU) instead of layout [offset] so opening
 * does not relayout the tree every frame (jank / ANR risk on weak devices).
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
    val panelVisible = progress > 0.001f

    Box(modifier = Modifier.fillMaxSize()) {
        // Home / bottom bar stay put under the overlay.
        content()

        if (panelVisible) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer { alpha = progress }
                    .background(Color.Black.copy(alpha = 0.28f))
                    .clickable(
                        indication = null,
                        interactionSource = remember { MutableInteractionSource() },
                        onClick = onClose
                    )
            )
            Box(
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .fillMaxHeight()
                    .width(drawerWidthDp.dp)
                    .graphicsLayer {
                        translationX = -drawerWidthPx * (1f - progress)
                    }
                    .clip(drawerShape)
                    // Opaque shell — empty child cannot show VoidBlack “hole”.
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

    BackHandler(enabled = open) { onClose() }
}
