package com.ffsensitivity.app.presentation.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.rotate
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.AmberHot
import com.ffsensitivity.app.presentation.theme.Success
import kotlin.math.PI
import kotlin.math.sin
import kotlin.random.Random

/**
 * Premium paper-strip confetti for win celebrations.
 * Brand-aligned palette (amber / gold / soft neutrals) — not cartoon clutter.
 */
@Composable
fun PremiumWinConfetti(
    active: Boolean,
    modifier: Modifier = Modifier,
    pieceCount: Int = 48
) {
    if (!active) return

    val pieces = remember {
        val rnd = Random(System.nanoTime())
        List(pieceCount) { i ->
            ConfettiPiece(
                xFrac = rnd.nextFloat(),
                delayFrac = rnd.nextFloat(),
                fallSpeed = 0.55f + rnd.nextFloat() * 0.55f,
                swayAmp = 0.02f + rnd.nextFloat() * 0.05f,
                swayFreq = 1.2f + rnd.nextFloat() * 2.4f,
                spin = (rnd.nextFloat() - 0.5f) * 420f,
                w = 5f + rnd.nextFloat() * 7f,
                h = 10f + rnd.nextFloat() * 14f,
                color = CONFETTI_COLORS[i % CONFETTI_COLORS.size],
                alpha = 0.72f + rnd.nextFloat() * 0.28f
            )
        }
    }

    val transition = rememberInfiniteTransition(label = "winConfetti")
    val t by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 4200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "confettiT"
    )

    Canvas(modifier = modifier.fillMaxSize()) {
        val w = size.width
        val h = size.height
        if (w <= 0f || h <= 0f) return@Canvas

        pieces.forEach { p ->
            val local = (t + p.delayFrac) % 1f
            val y = -40f + local * (h + 80f) * p.fallSpeed / 0.85f
            val sway = sin((local * p.swayFreq + p.delayFrac) * PI * 2).toFloat()
            val x = p.xFrac * w + sway * p.swayAmp * w
            val rot = p.spin * local
            val fade = when {
                local < 0.08f -> local / 0.08f
                local > 0.88f -> ((1f - local) / 0.12f).coerceIn(0f, 1f)
                else -> 1f
            }
            rotate(degrees = rot, pivot = Offset(x, y)) {
                drawRect(
                    color = p.color.copy(alpha = p.alpha * fade),
                    topLeft = Offset(x - p.w / 2f, y - p.h / 2f),
                    size = Size(p.w, p.h)
                )
            }
        }
    }
}

private data class ConfettiPiece(
    val xFrac: Float,
    val delayFrac: Float,
    val fallSpeed: Float,
    val swayAmp: Float,
    val swayFreq: Float,
    val spin: Float,
    val w: Float,
    val h: Float,
    val color: Color,
    val alpha: Float
)

private val CONFETTI_COLORS = listOf(
    AmberHot,
    Amber,
    Color(0xFFF5C56B),
    Color(0xFFFFE2A8),
    Color(0xFFF2F0EB),
    Color(0xFFE8A838),
    Success.copy(alpha = 0.95f),
    Color(0xFFD4AF37)
)
