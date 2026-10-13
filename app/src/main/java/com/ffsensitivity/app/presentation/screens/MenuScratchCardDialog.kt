package com.ffsensitivity.app.presentation.screens

import androidx.compose.animation.core.Animatable
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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.ffsensitivity.app.data.ShopStore
import com.ffsensitivity.app.data.remote.ApiException
import com.ffsensitivity.app.presentation.components.PremiumWinConfetti
import com.ffsensitivity.app.presentation.components.ScratchMysteryUnderlay
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
import kotlin.math.min

private const val MENU_SCRATCH_COLS = 20
private const val MENU_SCRATCH_ROWS = 14
private const val MENU_SCRATCH_UNLOCK_RATIO = 0.40f
private const val MENU_SCRATCH_BRUSH_DP = 28f

data class MenuScratchPrize(
    val title: String,
    val rewardLabel: String,
    val code: String?,
    val coinDelta: Int
)

@Composable
fun MenuScratchCardDialog(
    onDismiss: () -> Unit,
    onRoll: suspend () -> Result<MenuScratchPrize>
) {
    val context = LocalContext.current
    val obsidianFoil = remember(context) { ShopStore.hasObsidianFoil(context) }
    var revealed by remember { mutableStateOf(false) }
    var unlockInFlight by remember { mutableStateOf(false) }
    var claimOk by remember { mutableStateOf(false) }
    var claimError by remember { mutableStateOf<String?>(null) }
    var prize by remember { mutableStateOf<MenuScratchPrize?>(null) }
    val foilAlpha = remember { Animatable(1f) }
    val foilAlphaValue = foilAlpha.value
    val scope = rememberCoroutineScope()
    val canDismiss = !unlockInFlight

    fun runRoll() {
        if (unlockInFlight || claimOk) return
        unlockInFlight = true
        claimError = null
        scope.launch {
            try {
                val result = runCatching { onRoll() }.getOrElse {
                    AppLog.e("Menu scratch roll callback failed", it)
                    Result.failure(it)
                }
                result.fold(
                    onSuccess = {
                        prize = it
                        claimOk = true
                        claimError = null
                    },
                    onFailure = { err ->
                        claimError = (err as? ApiException)?.message
                            ?: err.message?.takeIf { it.isNotBlank() }
                            ?: "Scratch failed. Try again."
                    }
                )
            } catch (ce: CancellationException) {
                throw ce
            } catch (t: Throwable) {
                AppLog.e("Menu scratch roll failed", t)
                claimError = "Scratch failed. Try again."
            } finally {
                unlockInFlight = false
            }
        }
    }

    fun finishReveal() {
        if (revealed || unlockInFlight || claimOk) return
        revealed = true
        unlockInFlight = true
        scope.launch {
            try {
                foilAlpha.animateTo(0f, tween(420))
            } catch (ce: CancellationException) {
                throw ce
            } catch (t: Throwable) {
                AppLog.e("Menu scratch foil animate failed", t)
            }
            unlockInFlight = false
            runRoll()
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
            MenuScratchDialogHeader(
                title = when {
                    claimOk -> "REWARD CLAIMED"
                    claimError != null -> "CLAIM PENDING"
                    revealed -> "PRIZE REVEALED"
                    else -> "SCRATCH REWARD"
                },
                subtitle = prize?.title?.ifBlank { "Daily scratch" } ?: "Daily scratch",
                canClose = canDismiss,
                onClose = onDismiss
            )
            Spacer(modifier = Modifier.height(14.dp))
            Text(
                text = when {
                    unlockInFlight -> "Securing reward on server…"
                    claimOk -> "You won · close when ready"
                    claimError != null -> "Prize scratched · retry to collect"
                    else -> "Scratch the foil · unlocks at 40%"
                },
                color = when {
                    claimOk -> Success
                    claimError != null -> AmberHot
                    else -> InkSecondary
                },
                fontSize = 12.sp,
                fontWeight = if (claimOk || claimError != null) FontWeight.SemiBold else FontWeight.Normal,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(14.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(220.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .border(1.dp, Amber.copy(alpha = 0.35f), RoundedCornerShape(20.dp))
            ) {
                val won = prize
                if (won != null) {
                    MenuScratchPrizeUnderlay(prize = won)
                } else {
                    ScratchMysteryUnderlay()
                }
                if (foilAlphaValue > 0.02f) {
                    MenuScratchFoilLayer(
                        alpha = foilAlphaValue,
                        enabled = !revealed,
                        obsidian = obsidianFoil,
                        onProgress = { ratio ->
                            if (ratio >= MENU_SCRATCH_UNLOCK_RATIO) finishReveal()
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
                        .clickable(enabled = !unlockInFlight, onClick = { runRoll() })
                        .padding(vertical = 12.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (unlockInFlight) "Retrying…" else "Retry",
                        color = VoidBlack,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Foil stays open · reward only after the server confirms",
                    color = InkMuted,
                    fontSize = 11.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            } else {
                Text(
                    text = when {
                        unlockInFlight -> "Securing reward on server…"
                        claimOk -> "Tap ✕ to close"
                        else -> "Finger scratch · foil clears at 40%"
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

@Composable
private fun MenuScratchDialogHeader(
    title: String,
    subtitle: String,
    canClose: Boolean,
    onClose: () -> Unit
) {
    Box(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier
                .align(Alignment.CenterStart)
                .padding(end = 40.dp)
        ) {
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
private fun MenuScratchPrizeUnderlay(prize: MenuScratchPrize) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(Color(0xFF1C2330), Color(0xFF12161E), Color(0xFF0E1116))
                )
            )
            .padding(18.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "YOU WON",
            color = AmberHot,
            fontSize = 12.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = 1.8.sp
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = prize.rewardLabel.ifBlank {
                if (prize.coinDelta > 0) "+${prize.coinDelta} coins" else prize.title
            },
            color = AmberHot,
            fontSize = 28.sp,
            fontWeight = FontWeight.Black,
            textAlign = TextAlign.Center,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )
        if (!prize.code.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = prize.code,
                color = InkPrimary,
                fontSize = 13.sp,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
private fun MenuScratchFoilLayer(
    alpha: Float,
    enabled: Boolean,
    obsidian: Boolean,
    onProgress: (Float) -> Unit
) {
    val scratched = remember { BooleanArray(MENU_SCRATCH_COLS * MENU_SCRATCH_ROWS) }
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
        if (progress >= MENU_SCRATCH_UNLOCK_RATIO) onProgress(progress)
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
                                    markMenuScratch(scratched, canvasSize, offset) { progress = it }
                                    strokeVersion++
                                },
                                onDrag = { change, _ ->
                                    change.consume()
                                    val pos = change.position
                                    currentPath?.lineTo(pos.x, pos.y)
                                    markMenuScratch(scratched, canvasSize, pos) { progress = it }
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
                    colors = listOf(Color(0x33FFFFFF), Color(0x00FFFFFF), Color(0x22FFFFFF)),
                    start = Offset(0f, 0f),
                    end = Offset(size.width, size.height * 0.4f)
                )
            )
            val stroke = Stroke(
                width = MENU_SCRATCH_BRUSH_DP * density,
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
                    text = if (obsidian) "Obsidian foil · uncover reward" else "Scratch to reveal reward",
                    color = hintColor.copy(alpha = 0.75f),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
        if (enabled && progress > 0.02f && progress < MENU_SCRATCH_UNLOCK_RATIO) {
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

private fun markMenuScratch(
    scratched: BooleanArray,
    size: Size,
    point: Offset,
    onRatio: (Float) -> Unit
) {
    if (size.width <= 0f || size.height <= 0f) return
    val cellW = size.width / MENU_SCRATCH_COLS
    val cellH = size.height / MENU_SCRATCH_ROWS
    val brush = min(cellW, cellH) * 1.35f
    val minX = ((point.x - brush) / cellW).toInt().coerceIn(0, MENU_SCRATCH_COLS - 1)
    val maxX = ((point.x + brush) / cellW).toInt().coerceIn(0, MENU_SCRATCH_COLS - 1)
    val minY = ((point.y - brush) / cellH).toInt().coerceIn(0, MENU_SCRATCH_ROWS - 1)
    val maxY = ((point.y + brush) / cellH).toInt().coerceIn(0, MENU_SCRATCH_ROWS - 1)
    var changed = false
    for (y in minY..maxY) {
        for (x in minX..maxX) {
            val cx = (x + 0.5f) * cellW
            val cy = (y + 0.5f) * cellH
            val dx = cx - point.x
            val dy = cy - point.y
            if (dx * dx + dy * dy <= brush * brush) {
                val idx = y * MENU_SCRATCH_COLS + x
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
