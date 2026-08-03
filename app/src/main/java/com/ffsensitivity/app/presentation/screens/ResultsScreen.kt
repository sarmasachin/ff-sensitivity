package com.ffsensitivity.app.presentation.screens

import android.content.Context
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.CompareArrows
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.Speed
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.engine.FullSettingsResult
import com.ffsensitivity.app.engine.SensitivityResult
import com.ffsensitivity.app.presentation.components.AtmosphereScaffold
import com.ffsensitivity.app.presentation.components.InlineErrorBanner
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.AmberHot
import com.ffsensitivity.app.presentation.theme.AmberSoft
import com.ffsensitivity.app.presentation.theme.Hairline
import com.ffsensitivity.app.presentation.theme.HairlineStrong
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.presentation.theme.SurfaceLift
import com.ffsensitivity.app.presentation.theme.VoidBlack
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.SafeOps

private enum class ResultsRetryKind { COPY, COMPARE }

private data class ResultsUiError(
    val code: String,
    val title: String,
    val message: String,
    val retryKind: ResultsRetryKind? = null
)

@Composable
fun ResultsScreen(
    featureId: String,
    result: FullSettingsResult,
    contentPadding: PaddingValues,
    onBack: () -> Boolean,
    onCompareWithFreeFire: () -> Boolean
) {
    val tabs = listOf("Sensitivity", "Custom HUD", "Graphics")
    val initial = when (featureId) {
        "hud" -> 1
        "graphics" -> 2
        "sensi", "dpi", "" -> 0
        else -> 0
    }.coerceIn(0, tabs.lastIndex)
    var selectedTab by remember { mutableIntStateOf(initial) }
    val context = LocalContext.current
    var actionError by remember { mutableStateOf<ResultsUiError?>(null) }
    var busy by remember { mutableStateOf(false) }

    fun clearError() {
        actionError = null
    }

    fun showError(
        code: String,
        title: String,
        message: String,
        retryKind: ResultsRetryKind? = null
    ) {
        actionError = ResultsUiError(code, title, message, retryKind)
    }

    fun showBusy() {
        showError(
            code = "RESULTS_BUSY",
            title = "Please wait",
            message = "Another action is already in progress."
        )
    }

    fun backSafe() {
        if (busy) {
            showBusy()
            return
        }
        clearError()
        val ok = runCatching { onBack() }.getOrElse {
            AppLog.e("Results back crashed", it)
            false
        }
        if (!ok) {
            showError(
                code = "RESULTS_BACK_FAILED",
                title = "Couldn’t go back",
                message = "Navigation failed. Try again."
            )
        }
    }

    fun copySafe() {
        if (busy) {
            showBusy()
            return
        }
        clearError()
        busy = true
        val ok = runCatching { copySensitivity(context, result) }.getOrElse {
            AppLog.e("Results copy crashed", it)
            false
        }
        busy = false
        if (ok) {
            SafeOps.toast(context, "Sensitivity copied")
        } else {
            showError(
                code = "RESULTS_COPY_FAILED",
                title = "Copy failed",
                message = "Could not copy settings to the clipboard. Try again.",
                retryKind = ResultsRetryKind.COPY
            )
        }
    }

    fun compareSafe() {
        if (busy) {
            showBusy()
            return
        }
        clearError()
        busy = true
        val ok = runCatching { onCompareWithFreeFire() }.getOrElse {
            AppLog.e("Results open compare crashed", it)
            false
        }
        busy = false
        if (!ok) {
            showError(
                code = "RESULTS_COMPARE_FAILED",
                title = "Couldn’t open compare",
                message = "Navigation to Free Fire compare failed. Try again.",
                retryKind = ResultsRetryKind.COMPARE
            )
        }
    }

    fun runRetry(error: ResultsUiError) {
        when (error.retryKind) {
            ResultsRetryKind.COPY -> copySafe()
            ResultsRetryKind.COMPARE -> compareSafe()
            null -> clearError()
        }
    }

    AtmosphereScaffold {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(contentPadding)
                .statusBarsPadding()
                .navigationBarsPadding()
        ) {
            ResultsTopBar(onBack = { backSafe() })

            actionError?.let { err ->
                InlineErrorBanner(
                    title = err.title,
                    message = err.message,
                    onDismiss = { clearError() },
                    retryLabel = if (err.retryKind != null) "Retry" else null,
                    onRetry = if (err.retryKind != null) {
                        { runRetry(err) }
                    } else {
                        null
                    },
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp)
                )
            }

            ResultsTabRow(
                tabs = tabs,
                selectedTab = selectedTab,
                onSelect = {
                    clearError()
                    selectedTab = it.coerceIn(0, tabs.lastIndex)
                }
            )

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                when (selectedTab) {
                    0 -> {
                        item {
                            SensitivityHero(
                                general = result.sensitivity.general,
                                deviceLabel = result.deviceLabel,
                                hardwareSummary = result.hardwareSummary,
                                playstyleSummary = result.playstyleSummary
                            )
                        }
                        item {
                            SensitivityGrid(result.sensitivity)
                        }
                        item {
                            FireButtonCard(percent = result.sensitivity.fireButton)
                        }
                        item {
                            CompareWithFreeFireButton(onClick = { compareSafe() })
                        }
                        item {
                            CopySettingsButton(onClick = { copySafe() })
                        }
                        item {
                            TipCard("Overshoot ho to General -5. Sirf body hit ho to General +5.")
                        }
                    }
                    1 -> {
                        val h = result.hud
                        item { SectionTitle("Custom HUD") }
                        item { PremiumResultRow("Right Fire", "${h.firePercent}%") }
                        item { PremiumResultRow("Fire Position", h.firePositionNote) }
                        item { PremiumResultRow("Gloo Wall", "${h.glooPercent}% · ${h.glooFingerLabel}") }
                        item { PremiumResultRow("Jump", "${h.jumpPercent}%") }
                        item { PremiumResultRow("Crouch", "${h.crouchPercent}%") }
                        item {
                            PremiumResultRow(
                                "Quick Weapon Switch",
                                if (h.quickWeaponSwitchOn) "ON · ${h.quickWeaponSwitchPercent}%"
                                else "OFF · ${h.quickWeaponSwitchPercent}%"
                            )
                        }
                        item { PremiumResultRow("Transparency", h.transparencyRange) }
                    }
                    else -> {
                        val g = result.graphics
                        item { SectionTitle("Graphics Settings") }
                        item { PremiumResultRow("Graphics Quality", g.quality) }
                        item { PremiumResultRow("High FPS", g.highFps) }
                        item { PremiumResultRow("High Resolution", g.highResolution) }
                        item { PremiumResultRow("Shadow", g.shadow) }
                        item { PremiumResultRow("Color Filter", g.colorFilter) }
                    }
                }
                item { Spacer(modifier = Modifier.height(20.dp)) }
            }
        }
    }
}

@Composable
private fun ResultsTopBar(onBack: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(42.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(SurfaceLift)
                .border(1.dp, Hairline, RoundedCornerShape(14.dp))
                .clickable(onClick = onBack),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.AutoMirrored.Outlined.ArrowBack,
                contentDescription = "Back",
                tint = InkPrimary
            )
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "CALCULATED SETTINGS",
                color = Amber,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.8.sp
            )
            Text(
                text = "Best match for your phone",
                color = InkPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun ResultsTabRow(
    tabs: List<String>,
    selectedTab: Int,
    onSelect: (Int) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(SurfaceCard)
            .border(1.dp, HairlineStrong, RoundedCornerShape(16.dp))
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        tabs.forEachIndexed { index, label ->
            val selected = selectedTab == index
            val bg by animateColorAsState(
                targetValue = if (selected) AmberSoft else SurfaceCard,
                label = "tab-bg"
            )
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(12.dp))
                    .background(bg)
                    .clickable { onSelect(index) }
                    .padding(vertical = 11.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = label,
                    color = if (selected) Amber else InkMuted,
                    fontSize = 11.sp,
                    fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

@Composable
private fun SensitivityHero(
    general: Int,
    deviceLabel: String,
    hardwareSummary: String,
    playstyleSummary: String
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .background(
                Brush.linearGradient(
                    listOf(
                        Amber.copy(alpha = 0.20f),
                        SurfaceCard,
                        SurfaceLift
                    )
                )
            )
            .border(1.dp, Amber.copy(alpha = 0.35f), RoundedCornerShape(24.dp))
            .padding(20.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(Amber.copy(alpha = 0.16f))
                    .border(1.dp, Amber.copy(alpha = 0.35f), RoundedCornerShape(14.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Outlined.Speed, null, tint = Amber, modifier = Modifier.size(22.dp))
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = "GENERAL SENSITIVITY",
                    color = Amber,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.6.sp
                )
                Text(
                    text = deviceLabel,
                    color = InkSecondary,
                    fontSize = 12.sp
                )
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = general.toString(),
            color = AmberHot,
            fontSize = 56.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = (-1).sp
        )
        Spacer(modifier = Modifier.height(14.dp))
        Text(text = hardwareSummary, color = InkSecondary, fontSize = 12.sp)
        Spacer(modifier = Modifier.height(4.dp))
        Text(text = playstyleSummary, color = InkMuted, fontSize = 12.sp)
    }
}

@Composable
private fun SensitivityGrid(s: SensitivityResult) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            ScopeTile("Red Dot", s.redDot.toString(), Modifier.weight(1f))
            ScopeTile("2x Scope", s.scope2x.toString(), Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            ScopeTile("4x Scope", s.scope4x.toString(), Modifier.weight(1f))
            ScopeTile("Sniper", s.sniper.toString(), Modifier.weight(1f))
        }
        ScopeTile("Free Look", s.freeLook.toString(), Modifier.fillMaxWidth())
    }
}

@Composable
private fun FireButtonCard(percent: Int) {
    val tone = fireButtonTone(percent)
    val buttonSize = (56 + ((percent.coerceIn(40, 60) - 40) * 2.8f)).dp

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(SurfaceCard)
            .border(1.dp, tone.accent.copy(alpha = 0.40f), RoundedCornerShape(20.dp))
            .padding(18.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "FIRE BUTTON",
            color = tone.accent,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.6.sp
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = tone.label,
            color = InkMuted,
            fontSize = 12.sp
        )
        Spacer(modifier = Modifier.height(16.dp))
        Box(
            modifier = Modifier
                .size(buttonSize)
                .clip(RoundedCornerShape(percent = 50))
                .background(
                    Brush.radialGradient(
                        listOf(tone.fill, tone.fillDark)
                    )
                )
                .border(2.dp, tone.accent, RoundedCornerShape(percent = 50)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "$percent%",
                color = Color.White,
                fontSize = (14 + ((percent.coerceIn(40, 60) - 40) * 0.35f)).sp,
                fontWeight = FontWeight.Bold
            )
        }
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = "Recommended size for your setup",
            color = InkSecondary,
            fontSize = 12.sp
        )
    }
}

private data class FireButtonTone(
    val label: String,
    val accent: Color,
    val fill: Color,
    val fillDark: Color
)

private fun fireButtonTone(percent: Int): FireButtonTone = when {
    percent < 44 -> FireButtonTone(
        label = "Compact · precise tap",
        accent = Color(0xFF4FC3F7),
        fill = Color(0xFF0288D1),
        fillDark = Color(0xFF01579B)
    )
    percent < 48 -> FireButtonTone(
        label = "Balanced · smooth spray",
        accent = Color(0xFF66BB6A),
        fill = Color(0xFF2E7D32),
        fillDark = Color(0xFF1B5E20)
    )
    percent < 52 -> FireButtonTone(
        label = "Standard · all-rounder",
        accent = Color(0xFFE8A838),
        fill = Color(0xFFC67C12),
        fillDark = Color(0xFF8A5408)
    )
    percent < 55 -> FireButtonTone(
        label = "Aggressive · fast fire",
        accent = Color(0xFFFF8A3D),
        fill = Color(0xFFE65100),
        fillDark = Color(0xFFBF360C)
    )
    else -> FireButtonTone(
        label = "Max reach · rush style",
        accent = Color(0xFFFF5252),
        fill = Color(0xFFD32F2F),
        fillDark = Color(0xFFB71C1C)
    )
}

@Composable
private fun ScopeTile(label: String, value: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(18.dp))
            .background(SurfaceCard)
            .border(1.dp, HairlineStrong, RoundedCornerShape(18.dp))
            .padding(horizontal = 14.dp, vertical = 16.dp)
    ) {
        Text(text = label, color = InkMuted, fontSize = 11.sp, fontWeight = FontWeight.Medium)
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = value,
            color = InkPrimary,
            fontSize = 26.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun CompareWithFreeFireButton(onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(SurfaceCard)
            .border(1.dp, Amber.copy(alpha = 0.40f), RoundedCornerShape(18.dp))
            .clickable(onClick = onClick)
            .padding(16.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(AmberSoft)
                    .border(1.dp, Amber.copy(alpha = 0.35f), RoundedCornerShape(14.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.AutoMirrored.Outlined.CompareArrows,
                    contentDescription = null,
                    tint = Amber,
                    modifier = Modifier.size(22.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "COMPARE WITH FREE FIRE",
                    color = Amber,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.4.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Enter your current FF sensitivity to cross-check with the app",
                    color = InkSecondary,
                    fontSize = 13.sp,
                    lineHeight = 17.sp
                )
            }
        }
    }
}

@Composable
private fun CopySettingsButton(onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(Brush.horizontalGradient(listOf(Amber, AmberHot)))
            .clickable(onClick = onClick),
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
                text = "Copy All Sensitivity",
                color = VoidBlack,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(
        text = text.uppercase(),
        color = Amber,
        fontSize = 10.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 1.4.sp,
        modifier = Modifier.padding(top = 4.dp, bottom = 2.dp)
    )
}

@Composable
private fun PremiumResultRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(SurfaceCard)
            .border(1.dp, HairlineStrong, RoundedCornerShape(16.dp))
            .padding(horizontal = 16.dp, vertical = 15.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = label, color = InkSecondary, fontSize = 13.sp, modifier = Modifier.weight(1f))
        Text(
            text = value,
            color = InkPrimary,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.End
        )
    }
}

@Composable
private fun TipCard(text: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(AmberSoft)
            .border(1.dp, Amber.copy(alpha = 0.35f), RoundedCornerShape(16.dp))
            .padding(14.dp)
    ) {
        Text(text = text, color = Amber, fontSize = 13.sp, lineHeight = 18.sp)
    }
}

private fun copySensitivity(context: Context, result: FullSettingsResult): Boolean {
    return runCatching {
        val s = result.sensitivity
        val text = buildString {
            appendLine("FF Sensitivity — ${result.deviceLabel}")
            appendLine("General: ${s.general}")
            appendLine("Red Dot: ${s.redDot}")
            appendLine("2x: ${s.scope2x}")
            appendLine("4x: ${s.scope4x}")
            appendLine("Sniper: ${s.sniper}")
            appendLine("Free Look: ${s.freeLook}")
            appendLine("Fire Button: ${s.fireButton}")
            appendLine("Playstyle: ${result.playstyleSummary}")
        }.trim()
        if (text.isBlank()) {
            AppLog.w("Results copy blocked: empty text")
            false
        } else {
            SafeOps.copyText(context, "FF Sensitivity", text)
        }
    }.getOrElse {
        AppLog.e("Results copySensitivity failed", it)
        false
    }
}
