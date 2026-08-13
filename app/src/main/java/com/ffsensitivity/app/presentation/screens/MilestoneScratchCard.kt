package com.ffsensitivity.app.presentation.screens

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.MonetizationOn
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.ffsensitivity.app.data.ShopStore
import com.ffsensitivity.app.data.StreakMilestone
import com.ffsensitivity.app.presentation.components.PremiumWinConfetti
import com.ffsensitivity.app.presentation.components.ScratchMysteryUnderlay
import com.ffsensitivity.app.presentation.components.ScratchRevealOutcome
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.AmberHot
import com.ffsensitivity.app.presentation.theme.Danger
import com.ffsensitivity.app.presentation.theme.HairlineStrong
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.presentation.theme.Success
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.presentation.theme.SurfaceDeep
import com.ffsensitivity.app.presentation.theme.SurfaceLift
import com.ffsensitivity.app.presentation.theme.VoidBlack
import com.ffsensitivity.app.util.AppLog
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import java.util.Locale
import kotlin.math.min

private const val SCRATCH_COLS = 20
private const val SCRATCH_ROWS = 14
private const val SCRATCH_UNLOCK_RATIO = 0.40f
private const val SCRATCH_BRUSH_DP = 28f

@Composable
fun MilestoneScratchCardDialog(
    milestone: StreakMilestone,
    onDismiss: () -> Unit,
    /** True when user already scratched but claim failed — foil stays open across reopen. */
    startRevealed: Boolean = false,
    onRevealed: () -> Unit = {},
    /** Server claim — coins only when this returns true. */
    onClaim: suspend () -> ScratchClaimUiResult
) {
    val context = LocalContext.current
    val obsidianFoil = remember(context) { ShopStore.hasObsidianFoil(context) }
    var revealed by remember { mutableStateOf(startRevealed) }
    var unlockInFlight by remember { mutableStateOf(false) }
    var claimOk by remember { mutableStateOf(false) }
    var claimError by remember { mutableStateOf<String?>(null) }
    var revealPreview by remember {
        mutableStateOf(
            if (startRevealed) ScratchRevealOutcome.WIN else ScratchRevealOutcome.PENDING
        )
    }
    val foilAlpha = remember { Animatable(if (startRevealed) 0f else 1f) }
    val foilAlphaValue = foilAlpha.value
    val scope = rememberCoroutineScope()
    val canDismiss = !unlockInFlight
    val outcome = when {
        claimOk || revealed -> ScratchRevealOutcome.WIN
        revealPreview != ScratchRevealOutcome.PENDING -> revealPreview
        else -> ScratchRevealOutcome.PENDING
    }

    fun runClaim() {
        if (unlockInFlight || claimOk) return
        unlockInFlight = true
        claimError = null
        scope.launch {
            try {
                val result = runCatching { onClaim() }.getOrElse {
                    AppLog.e("Scratch claim callback failed", it)
                    ScratchClaimUiResult(
                        ok = false,
                        message = "Claim failed. Try again."
                    )
                }
                if (result.ok) {
                    claimOk = true
                    claimError = null
                } else {
                    // Keep foil open — user already scratched; allow Retry claim.
                    claimError = result.message.ifBlank { "Claim failed. Try again." }
                }
            } catch (ce: CancellationException) {
                throw ce
            } catch (t: Throwable) {
                AppLog.e("Scratch claim failed", t)
                claimError = "Claim failed. Try again."
            } finally {
                unlockInFlight = false
            }
        }
    }

    fun finishReveal() {
        if (revealed || unlockInFlight || claimOk) return
        revealed = true
        unlockInFlight = true
        claimError = null
        onRevealed()
        scope.launch {
            revealPreview = ScratchRevealOutcome.WIN
            try {
                foilAlpha.animateTo(0f, tween(420))
            } catch (ce: CancellationException) {
                throw ce
            } catch (t: Throwable) {
                AppLog.e("Scratch foil animate failed", t)
            }
            unlockInFlight = false
            // Foil stays cleared even if claim fails.
            runClaim()
        }
    }

    LaunchedEffect(startRevealed) {
        if (startRevealed && !claimOk) {
            revealed = true
            revealPreview = ScratchRevealOutcome.WIN
            if (foilAlpha.value > 0.02f) {
                runCatching { foilAlpha.snapTo(0f) }
            }
            runClaim()
        }
    }

    Dialog(
        onDismissRequest = { if (canDismiss) onDismiss() },
        properties = DialogProperties(
            dismissOnBackPress = canDismiss,
            dismissOnClickOutside = false,
            usePlatformDefaultWidth = false
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .clip(RoundedCornerShape(24.dp))
                .background(Brush.verticalGradient(listOf(SurfaceLift, SurfaceCard)))
                .border(1.dp, Amber.copy(alpha = 0.42f), RoundedCornerShape(24.dp))
                .padding(18.dp)
        ) {
            ScratchDialogHeader(
                title = when {
                    claimOk -> "REWARD CLAIMED"
                    claimError != null -> "CLAIM PENDING"
                    revealed -> "PRIZE REVEALED"
                    else -> "SCRATCH REWARD"
                },
                subtitle = "Day ${milestone.days} · ${milestone.title}",
                canClose = canDismiss,
                onClose = onDismiss
            )
            Spacer(modifier = Modifier.height(14.dp))
            Text(
                text = when {
                    unlockInFlight && !revealed -> "Revealing…"
                    unlockInFlight -> "Claiming reward…"
                    claimOk -> "You won · close when ready"
                    claimError != null -> "Prize revealed · claim to collect coins"
                    else -> "Scratch the foil · unlocks at 40%"
                },
                color = when {
                    claimOk -> Success
                    claimError != null -> AmberHot
                    else -> InkSecondary
                },
                fontSize = 12.sp,
                fontWeight = if (claimOk || claimError != null) {
                    FontWeight.SemiBold
                } else {
                    FontWeight.Normal
                },
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(14.dp))

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(220.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .border(
                        1.dp,
                        when {
                            claimOk -> AmberHot.copy(alpha = 0.55f)
                            claimError != null -> Amber.copy(alpha = 0.5f)
                            else -> Amber.copy(alpha = 0.35f)
                        },
                        RoundedCornerShape(20.dp)
                    )
            ) {
                when (outcome) {
                    ScratchRevealOutcome.WIN -> PrizeUnderlay(
                        milestone = milestone,
                        celebrating = claimOk
                    )
                    ScratchRevealOutcome.PENDING -> ScratchMysteryUnderlay()
                }
                if (foilAlphaValue > 0.02f) {
                    ScratchFoilLayer(
                        alpha = foilAlphaValue,
                        enabled = !revealed,
                        obsidian = obsidianFoil,
                        onProgress = { ratio ->
                            if (ratio >= SCRATCH_UNLOCK_RATIO) finishReveal()
                        }
                    )
                }
                PremiumWinConfetti(
                    active = claimOk,
                    modifier = Modifier.fillMaxSize()
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            if (claimError != null && !claimOk) {
                Text(
                    text = claimError.orEmpty(),
                    color = Danger,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(10.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Brush.horizontalGradient(listOf(Amber, AmberHot)))
                        .clickable(enabled = !unlockInFlight, onClick = { runClaim() })
                        .padding(vertical = 12.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (unlockInFlight) "Claiming…" else "Retry claim",
                        color = VoidBlack,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Foil stays open · reopen keeps prize · coins only after claim succeeds",
                    color = InkMuted,
                    fontSize = 11.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            } else {
                Text(
                    text = when {
                        unlockInFlight && revealed -> "Securing coins on server…"
                        unlockInFlight -> "Almost there…"
                        claimOk -> "Tap ✕ to close"
                        else -> "Finger scratch · premium foil clears at 40%"
                    },
                    color = if (claimOk) Success else InkMuted,
                    fontSize = 11.sp,
                    fontWeight = if (claimOk) FontWeight.SemiBold else FontWeight.Normal,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}

/** Result of post-scratch server claim (coins/code only when ok). */
data class ScratchClaimUiResult(
    val ok: Boolean,
    val message: String = "",
    /** Redeem: real gift code after successful claim (optional for Type B). */
    val revealedCode: String? = null,
    /** Type B: coins granted on this scratch. */
    val coinsGranted: Int = 0
)

@Composable
private fun ScratchDialogHeader(
    title: String,
    subtitle: String,
    canClose: Boolean,
    onClose: () -> Unit
) {
    Box(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.align(Alignment.CenterStart).padding(end = 40.dp)) {
            Text(
                text = title,
                color = Amber,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.5.sp
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = subtitle,
                color = InkPrimary,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .size(36.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(SurfaceDeep)
                .border(1.dp, HairlineStrong, RoundedCornerShape(10.dp))
                .clickable(enabled = canClose, onClick = onClose),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Outlined.Close,
                contentDescription = "Close",
                tint = if (canClose) InkPrimary else InkMuted,
                modifier = Modifier.size(18.dp)
            )
        }
    }
}

@Composable
private fun PrizeUnderlay(
    milestone: StreakMilestone,
    celebrating: Boolean
) {
    val pop = remember { Animatable(0.92f) }
    LaunchedEffect(celebrating) {
        if (celebrating) {
            pop.snapTo(0.86f)
            pop.animateTo(1.06f, tween(280, easing = FastOutSlowInEasing))
            pop.animateTo(1f, tween(180))
        } else {
            pop.snapTo(0.92f)
        }
    }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(
                        Color(0xFF1C2330),
                        Color(0xFF12161E),
                        Color(0xFF0E1116)
                    )
                )
            )
            .padding(18.dp)
            .scale(pop.value),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(56.dp)
                .clip(RoundedCornerShape(99.dp))
                .background(Brush.radialGradient(listOf(AmberHot, Amber)))
                .border(1.5.dp, AmberHot.copy(alpha = 0.75f), RoundedCornerShape(99.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Outlined.MonetizationOn,
                contentDescription = null,
                tint = VoidBlack,
                modifier = Modifier.size(30.dp)
            )
        }
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = "YOU WON",
            color = if (celebrating) AmberHot else Amber,
            fontSize = if (celebrating) 18.sp else 12.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = 1.8.sp
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "+${formatScratchCoins(milestone.coinReward)}",
            color = AmberHot,
            fontSize = 36.sp,
            fontWeight = FontWeight.Black
        )
        Text(
            text = "coins",
            color = InkPrimary,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = milestone.title,
            color = InkSecondary,
            fontSize = 12.sp,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        if (!milestone.badge.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Badge · ${milestone.badge}",
                color = Success,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun ScratchFoilLayer(
    alpha: Float,
    enabled: Boolean,
    obsidian: Boolean,
    onProgress: (Float) -> Unit
) {
    val scratched = remember { BooleanArray(SCRATCH_COLS * SCRATCH_ROWS) }
    var progress by remember { mutableFloatStateOf(0f) }
    val paths = remember { mutableListOf<Path>() }
    var currentPath by remember { mutableStateOf<Path?>(null) }
    var canvasSize by remember { mutableStateOf(Size.Zero) }
    var strokeVersion by remember { mutableIntStateOf(0) }
    val foilColors = if (obsidian) {
        listOf(
            Color(0xFF2A2E36),
            Color(0xFF3A404C),
            Color(0xFF1A1D24),
            Color(0xFF4A5160),
            Color(0xFF12151A)
        )
    } else {
        listOf(
            Color(0xFFC9A227),
            Color(0xFFE8C547),
            Color(0xFF9A7B1A),
            Color(0xFFF0D56A),
            Color(0xFFB8912E)
        )
    }
    val hintColor = if (obsidian) Color(0xFFE8E8EA).copy(alpha = 0.8f) else VoidBlack.copy(alpha = 0.72f)

    LaunchedEffect(progress) {
        if (progress >= SCRATCH_UNLOCK_RATIO) onProgress(progress)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .graphicsLayer {
                this.alpha = alpha
                compositingStrategy = CompositingStrategy.Offscreen
            }
    ) {
        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .then(
                    if (enabled) {
                        Modifier.pointerInput(Unit) {
                            detectDragGestures(
                                onDragStart = { offset ->
                                    val p = Path().apply { moveTo(offset.x, offset.y) }
                                    currentPath = p
                                    paths.add(p)
                                    markScratch(scratched, canvasSize, offset) { progress = it }
                                    strokeVersion++
                                },
                                onDrag = { change, _ ->
                                    change.consume()
                                    val pos = change.position
                                    currentPath?.lineTo(pos.x, pos.y)
                                    markScratch(scratched, canvasSize, pos) { progress = it }
                                    strokeVersion++
                                },
                                onDragEnd = { currentPath = null },
                                onDragCancel = { currentPath = null }
                            )
                        }
                    } else {
                        Modifier
                    }
                )
        ) {
            strokeVersion
            canvasSize = size
            drawRect(
                brush = Brush.linearGradient(
                    colors = foilColors,
                    start = Offset.Zero,
                    end = Offset(size.width, size.height)
                )
            )
            drawRect(
                brush = Brush.linearGradient(
                    colors = listOf(
                        Color(0x33FFFFFF),
                        Color(0x00FFFFFF),
                        Color(0x22FFFFFF)
                    ),
                    start = Offset(0f, 0f),
                    end = Offset(size.width, size.height * 0.4f)
                )
            )
            val stroke = Stroke(
                width = SCRATCH_BRUSH_DP * density,
                cap = StrokeCap.Round,
                join = StrokeJoin.Round
            )
            paths.forEach { path ->
                drawPath(
                    path = path,
                    color = Color.Transparent,
                    style = stroke,
                    blendMode = BlendMode.Clear
                )
            }
        }

        if (enabled && progress < 0.02f) {
            Column(
                modifier = Modifier
                    .align(Alignment.Center)
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "SCRATCH HERE",
                    color = hintColor,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 2.sp
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = if (obsidian) "Obsidian foil · uncover reward" else "Reveal your coin prize",
                    color = hintColor.copy(alpha = 0.75f),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }

        if (enabled && progress > 0.02f && progress < SCRATCH_UNLOCK_RATIO) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(10.dp)
                    .clip(RoundedCornerShape(99.dp))
                    .background(VoidBlack.copy(alpha = 0.55f))
                    .padding(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Text(
                    text = "${(progress * 100).toInt()}% · need 40%",
                    color = AmberHot,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

private fun markScratch(
    scratched: BooleanArray,
    size: Size,
    point: Offset,
    onRatio: (Float) -> Unit
) {
    if (size.width <= 0f || size.height <= 0f) return
    val cellW = size.width / SCRATCH_COLS
    val cellH = size.height / SCRATCH_ROWS
    val brush = min(cellW, cellH) * 1.35f
    val minX = ((point.x - brush) / cellW).toInt().coerceIn(0, SCRATCH_COLS - 1)
    val maxX = ((point.x + brush) / cellW).toInt().coerceIn(0, SCRATCH_COLS - 1)
    val minY = ((point.y - brush) / cellH).toInt().coerceIn(0, SCRATCH_ROWS - 1)
    val maxY = ((point.y + brush) / cellH).toInt().coerceIn(0, SCRATCH_ROWS - 1)
    var changed = false
    for (y in minY..maxY) {
        for (x in minX..maxX) {
            val cx = (x + 0.5f) * cellW
            val cy = (y + 0.5f) * cellH
            val dx = cx - point.x
            val dy = cy - point.y
            if (dx * dx + dy * dy <= brush * brush) {
                val idx = y * SCRATCH_COLS + x
                if (!scratched[idx]) {
                    scratched[idx] = true
                    changed = true
                }
            }
        }
    }
    if (changed) {
        val count = scratched.count { it }
        onRatio(count.toFloat() / scratched.size.toFloat())
    }
}

private fun formatScratchCoins(value: Int): String =
    String.format(Locale.US, "%,d", value.coerceAtLeast(0))
