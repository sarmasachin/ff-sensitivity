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
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.Key
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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.ffsensitivity.app.data.RedeemCodeItem
import com.ffsensitivity.app.data.ShopStore
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
import com.ffsensitivity.app.util.SafeOps
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import kotlin.math.min

private const val REDEEM_SCRATCH_COLS = 20
private const val REDEEM_SCRATCH_ROWS = 14
private const val REDEEM_SCRATCH_UNLOCK = 0.40f
private const val REDEEM_SCRATCH_BRUSH = 28f

@Composable
fun RedeemScratchCardDialog(
    item: RedeemCodeItem,
    onDismiss: () -> Unit,
    onClaim: suspend () -> ScratchClaimUiResult
) {
    val context = LocalContext.current
    val obsidianFoil = remember(context) { ShopStore.hasObsidianFoil(context) }
    var revealed by remember { mutableStateOf(false) }
    var unlockInFlight by remember { mutableStateOf(false) }
    var claimOk by remember { mutableStateOf(false) }
    var claimError by remember { mutableStateOf<String?>(null) }
    var unlockedCode by remember { mutableStateOf<String?>(null) }
    var revealPreview by remember { mutableStateOf(ScratchRevealOutcome.PENDING) }
    val foilAlpha = remember { Animatable(1f) }
    val foilAlphaValue = foilAlpha.value
    val scope = rememberCoroutineScope()
    val canDismiss = !unlockInFlight
    val displayCode = unlockedCode?.takeIf { it.isNotBlank() } ?: "••••-••••-••••-••••"
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
                    AppLog.e("Redeem scratch claim callback failed", it)
                    ScratchClaimUiResult(
                        ok = false,
                        message = if (item.isScratchReward) {
                            "Couldn't secure coins. Try again."
                        } else {
                            "Couldn't unlock this code. Try again."
                        }
                    )
                }
                if (result.ok) {
                    claimOk = true
                    claimError = null
                    unlockedCode = result.revealedCode?.takeIf { it.isNotBlank() }
                } else {
                    claimError = result.message.ifBlank {
                        "Couldn't unlock this code. Try again."
                    }
                }
            } catch (ce: CancellationException) {
                throw ce
            } catch (t: Throwable) {
                AppLog.e("Redeem scratch claim failed", t)
                claimError = "Couldn't unlock this code. Try again."
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
        scope.launch {
            revealPreview = ScratchRevealOutcome.WIN
            try {
                foilAlpha.animateTo(0f, tween(420))
            } catch (ce: CancellationException) {
                throw ce
            } catch (t: Throwable) {
                AppLog.e("Redeem scratch foil animate failed", t)
            }
            unlockInFlight = false
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
            RedeemScratchHeader(
                title = when {
                    claimOk && item.isScratchReward && unlockedCode.isNullOrBlank() -> "COINS EARNED"
                    claimOk && item.isScratchReward -> "COINS + CODE"
                    claimOk -> "CODE UNLOCKED"
                    claimError != null -> "CLAIM PENDING"
                    revealed -> "PRIZE REVEALED"
                    item.isScratchReward -> "SCRATCH FOR COINS"
                    else -> "SCRATCH TO UNLOCK"
                },
                subtitle = item.title,
                canClose = canDismiss,
                onClose = onDismiss
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = when {
                    unlockInFlight && !revealed -> "Revealing…"
                    unlockInFlight -> if (item.isScratchReward) "Securing coins…" else "Unlocking code…"
                    claimOk && item.isScratchReward && unlockedCode.isNullOrBlank() ->
                        "Coins secured · watch ad to scratch again"
                    claimOk && item.isScratchReward ->
                        "Coins secured · bonus code ready to copy"
                    claimOk -> "You won · copy code, then close"
                    claimError != null -> if (item.isScratchReward) {
                        "Foil open · retry to secure coins"
                    } else {
                        "Foil open · retry to unlock the real code"
                    }
                    item.isScratchReward ->
                        item.tip.ifBlank {
                            "Scratch to earn Coins. Limited reward codes via schedule."
                        }
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
                    .height(230.dp)
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
                    ScratchRevealOutcome.WIN -> RedeemPrizeUnderlay(
                        code = displayCode,
                        valueLabel = item.valueLabel,
                        celebrating = claimOk
                    )
                    ScratchRevealOutcome.PENDING -> ScratchMysteryUnderlay()
                }
                if (foilAlphaValue > 0.02f) {
                    RedeemScratchFoil(
                        alpha = foilAlphaValue,
                        enabled = !revealed,
                        obsidian = obsidianFoil,
                        onProgress = { ratio ->
                            if (ratio >= REDEEM_SCRATCH_UNLOCK) finishReveal()
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
                        text = if (unlockInFlight) "Unlocking…" else "Retry unlock",
                        color = VoidBlack,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = if (item.isScratchReward) {
                        "Foil stays open · coins only after server confirms"
                    } else {
                        "Foil stays open · real code only after unlock succeeds"
                    },
                    color = InkMuted,
                    fontSize = 11.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            } else if (claimOk) {
                if (!unlockedCode.isNullOrBlank()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(Brush.horizontalGradient(listOf(Amber, AmberHot)))
                            .clickable {
                                runCatching {
                                    val code = unlockedCode.orEmpty()
                                    val ok = code.isNotBlank() &&
                                        SafeOps.copyText(context, "redeem_code", code)
                                    SafeOps.toast(
                                        context,
                                        if (ok) {
                                            "Code Copied Successfully!"
                                        } else {
                                            "Could not copy code. Try again."
                                        }
                                    )
                                }.onFailure {
                                    AppLog.e("Redeem scratch copy failed", it)
                                    SafeOps.toast(context, "Could not copy code. Try again.")
                                }
                            }
                            .padding(vertical = 14.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Outlined.ContentCopy,
                                contentDescription = null,
                                tint = VoidBlack,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "COPY CODE",
                                color = VoidBlack,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Black,
                                letterSpacing = 0.8.sp
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                }
                Text(
                    text = if (item.isScratchReward) {
                        "Tap ✕ to close · watch ad on card to scratch again"
                    } else {
                        "Tap ✕ to close"
                    },
                    color = Success,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            } else {
                Text(
                    text = when {
                        unlockInFlight && revealed && item.isScratchReward -> "Securing coins on server…"
                        unlockInFlight && revealed -> "Securing code on server…"
                        unlockInFlight -> "Almost there…"
                        item.isScratchReward ->
                            "Finger scratch · coins every time · limited codes by schedule"
                        else -> "Finger scratch · foil clears at 40%"
                    },
                    color = InkMuted,
                    fontSize = 11.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}

@Composable
private fun RedeemScratchHeader(
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
private fun RedeemPrizeUnderlay(
    code: String,
    valueLabel: String,
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
                .size(52.dp)
                .clip(RoundedCornerShape(99.dp))
                .background(Brush.radialGradient(listOf(AmberHot, Amber)))
                .border(1.5.dp, AmberHot.copy(alpha = 0.75f), RoundedCornerShape(99.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Outlined.Key,
                contentDescription = null,
                tint = VoidBlack,
                modifier = Modifier.size(26.dp)
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
        Spacer(modifier = Modifier.height(10.dp))
        Text(
            text = if (celebrating) code else "••••-••••-••••",
            color = AmberHot,
            fontSize = if (celebrating) 20.sp else 18.sp,
            fontWeight = FontWeight.Black,
            fontFamily = FontFamily.Monospace,
            textAlign = TextAlign.Center,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = valueLabel,
            color = if (celebrating) Success else InkSecondary,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun RedeemScratchFoil(
    alpha: Float,
    enabled: Boolean,
    obsidian: Boolean,
    onProgress: (Float) -> Unit
) {
    val scratched = remember { BooleanArray(REDEEM_SCRATCH_COLS * REDEEM_SCRATCH_ROWS) }
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
        if (progress >= REDEEM_SCRATCH_UNLOCK) onProgress(progress)
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
                                    markRedeemScratch(scratched, canvasSize, offset) { progress = it }
                                    strokeVersion++
                                },
                                onDrag = { change, _ ->
                                    change.consume()
                                    val pos = change.position
                                    currentPath?.lineTo(pos.x, pos.y)
                                    markRedeemScratch(scratched, canvasSize, pos) { progress = it }
                                    strokeVersion++
                                },
                                onDragEnd = { currentPath = null },
                                onDragCancel = { currentPath = null }
                            )
                        }
                    } else Modifier
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
                    start = Offset.Zero,
                    end = Offset(size.width, size.height * 0.4f)
                )
            )
            val stroke = Stroke(
                width = REDEEM_SCRATCH_BRUSH * density,
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
                modifier = Modifier.align(Alignment.Center).padding(16.dp),
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

        if (enabled && progress > 0.02f && progress < REDEEM_SCRATCH_UNLOCK) {
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

private fun markRedeemScratch(
    scratched: BooleanArray,
    size: Size,
    point: Offset,
    onRatio: (Float) -> Unit
) {
    if (size.width <= 0f || size.height <= 0f) return
    val cellW = size.width / REDEEM_SCRATCH_COLS
    val cellH = size.height / REDEEM_SCRATCH_ROWS
    val brush = min(cellW, cellH) * 1.35f
    val minX = ((point.x - brush) / cellW).toInt().coerceIn(0, REDEEM_SCRATCH_COLS - 1)
    val maxX = ((point.x + brush) / cellW).toInt().coerceIn(0, REDEEM_SCRATCH_COLS - 1)
    val minY = ((point.y - brush) / cellH).toInt().coerceIn(0, REDEEM_SCRATCH_ROWS - 1)
    val maxY = ((point.y + brush) / cellH).toInt().coerceIn(0, REDEEM_SCRATCH_ROWS - 1)
    var changed = false
    for (y in minY..maxY) {
        for (x in minX..maxX) {
            val cx = (x + 0.5f) * cellW
            val cy = (y + 0.5f) * cellH
            val dx = cx - point.x
            val dy = cy - point.y
            if (dx * dx + dy * dy <= brush * brush) {
                val idx = y * REDEEM_SCRATCH_COLS + x
                if (!scratched[idx]) {
                    scratched[idx] = true
                    changed = true
                }
            }
        }
    }
    if (changed) {
        onRatio(scratched.count { it }.toFloat() / scratched.size.toFloat())
    }
}
