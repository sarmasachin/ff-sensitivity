package com.ffsensitivity.app.presentation.screens

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.CompareFeedback
import com.ffsensitivity.app.data.SensitivityValues
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.AmberHot
import com.ffsensitivity.app.presentation.theme.AmberSoft
import com.ffsensitivity.app.presentation.theme.Danger
import com.ffsensitivity.app.presentation.theme.Hairline
import com.ffsensitivity.app.presentation.theme.HairlineStrong
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.presentation.theme.Success
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.presentation.theme.SurfaceLift
import com.ffsensitivity.app.presentation.theme.VoidBlack

@Composable
internal fun CompareTopBar(onBack: () -> Unit) {
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
                text = "CROSS-CHECK",
                color = Amber,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.8.sp
            )
            Text(
                text = "Compare with Free Fire",
                color = InkPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
internal fun SuggestedSummaryCard(suggested: SensitivityValues, deviceLabel: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(SurfaceCard)
            .border(1.dp, HairlineStrong, RoundedCornerShape(18.dp))
            .padding(16.dp)
    ) {
        Text(
            text = "APP SUGGESTION",
            color = Amber,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.4.sp
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(text = deviceLabel, color = InkMuted, fontSize = 12.sp)
        Spacer(modifier = Modifier.height(10.dp))
        Text(
            text = "G ${suggested.general} · RD ${suggested.redDot} · 2x ${suggested.scope2x} · " +
                "4x ${suggested.scope4x} · SN ${suggested.sniper} · FL ${suggested.freeLook} · " +
                "Fire ${suggested.fireButton}",
            color = InkPrimary,
            fontSize = 13.sp,
            lineHeight = 18.sp
        )
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
internal fun CompareField(label: String, value: String, onChange: (String) -> Unit) {
    val bring = remember { BringIntoViewRequester() }
    var focused by remember { mutableStateOf(false) }
    val imeBottomPx = WindowInsets.ime.getBottom(LocalDensity.current)
    LaunchedEffect(focused, imeBottomPx) {
        if (focused && imeBottomPx > 0) {
            bring.bringIntoView()
        }
    }
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        modifier = Modifier
            .fillMaxWidth()
            .bringIntoViewRequester(bring)
            .onFocusChanged { focused = it.isFocused },
        singleLine = true,
        label = { Text(label) },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        shape = RoundedCornerShape(14.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedTextColor = InkPrimary,
            unfocusedTextColor = InkPrimary,
            focusedBorderColor = Amber,
            unfocusedBorderColor = HairlineStrong,
            focusedLabelColor = Amber,
            unfocusedLabelColor = InkMuted,
            cursorColor = Amber,
            focusedContainerColor = SurfaceCard,
            unfocusedContainerColor = SurfaceCard
        )
    )
}

@Composable
internal fun DiffCard(
    suggested: SensitivityValues,
    actual: SensitivityValues,
    diff: SensitivityValues
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(SurfaceCard)
            .border(1.dp, Amber.copy(alpha = 0.35f), RoundedCornerShape(18.dp))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = "COMPARISON RESULT",
            color = Amber,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.4.sp
        )
        DiffHeader()
        DiffRow("General", suggested.general, actual.general, diff.general)
        DiffRow("Red Dot", suggested.redDot, actual.redDot, diff.redDot)
        DiffRow("2x Scope", suggested.scope2x, actual.scope2x, diff.scope2x)
        DiffRow("4x Scope", suggested.scope4x, actual.scope4x, diff.scope4x)
        DiffRow("Sniper", suggested.sniper, actual.sniper, diff.sniper)
        DiffRow("Free Look", suggested.freeLook, actual.freeLook, diff.freeLook)
        DiffRow("Fire Button", suggested.fireButton, actual.fireButton, diff.fireButton)
    }
}

@Composable
private fun DiffHeader() {
    Row(modifier = Modifier.fillMaxWidth()) {
        Text("Setting", color = InkMuted, fontSize = 11.sp, modifier = Modifier.weight(1.2f))
        Text("App", color = InkMuted, fontSize = 11.sp, modifier = Modifier.weight(0.7f), textAlign = TextAlign.End)
        Text("Yours", color = InkMuted, fontSize = 11.sp, modifier = Modifier.weight(0.7f), textAlign = TextAlign.End)
        Text("Diff", color = InkMuted, fontSize = 11.sp, modifier = Modifier.weight(0.7f), textAlign = TextAlign.End)
    }
}

@Composable
private fun DiffRow(label: String, app: Int, yours: Int, diff: Int) {
    val diffColor = when {
        diff == 0 -> Success
        diff > 0 -> AmberHot
        else -> Danger
    }
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, color = InkSecondary, fontSize = 13.sp, modifier = Modifier.weight(1.2f))
        Text("$app", color = InkPrimary, fontSize = 13.sp, modifier = Modifier.weight(0.7f), textAlign = TextAlign.End)
        Text("$yours", color = InkPrimary, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(0.7f), textAlign = TextAlign.End)
        Text(signed(diff), color = diffColor, fontSize = 13.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(0.7f), textAlign = TextAlign.End)
    }
}

@Composable
internal fun FeedbackRow(
    selected: CompareFeedback,
    onSelect: (CompareFeedback) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        CompareFeedback.entries.forEach { item ->
            val isOn = selected == item
            val bg by animateColorAsState(
                targetValue = if (isOn) AmberSoft else SurfaceLift,
                label = "fb-bg"
            )
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(14.dp))
                    .background(bg)
                    .border(
                        1.dp,
                        if (isOn) Amber else HairlineStrong,
                        RoundedCornerShape(14.dp)
                    )
                    .clickable { onSelect(item) }
                    .padding(vertical = 12.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = item.label,
                    color = if (isOn) Amber else InkMuted,
                    fontSize = 12.sp,
                    fontWeight = if (isOn) FontWeight.Bold else FontWeight.Medium,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

@Composable
internal fun PrimaryAction(
    label: String,
    onClick: () -> Unit,
    enabled: Boolean = true,
    icon: @Composable (() -> Unit)? = null
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(
                if (enabled) Brush.horizontalGradient(listOf(Amber, AmberHot))
                else Brush.horizontalGradient(listOf(SurfaceLift, SurfaceLift))
            )
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (icon != null) {
                icon()
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text(
                text = label,
                color = if (enabled) VoidBlack else InkMuted,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
internal fun GhostAction(
    label: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Box(
        modifier = modifier
            .height(44.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(SurfaceLift)
            .border(1.dp, HairlineStrong, RoundedCornerShape(14.dp))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(text = label, color = InkPrimary, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
    }
}

internal enum class CompareSavedViewMode {
    ALL_IN_ONE,
    PER_PLAYER
}

@Composable
internal fun CompareSavedViewModeToggle(
    mode: CompareSavedViewMode,
    onMode: (CompareSavedViewMode) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        CompareSavedViewChip(
            label = "All in one",
            selected = mode == CompareSavedViewMode.ALL_IN_ONE,
            modifier = Modifier.weight(1f),
            onClick = { onMode(CompareSavedViewMode.ALL_IN_ONE) }
        )
        CompareSavedViewChip(
            label = "Per player",
            selected = mode == CompareSavedViewMode.PER_PLAYER,
            modifier = Modifier.weight(1f),
            onClick = { onMode(CompareSavedViewMode.PER_PLAYER) }
        )
    }
}

@Composable
private fun CompareSavedViewChip(
    label: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Text(
        text = label,
        color = if (selected) AmberHot else InkPrimary,
        fontSize = 13.sp,
        fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold,
        textAlign = TextAlign.Center,
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(if (selected) Amber.copy(alpha = 0.18f) else SurfaceLift)
            .border(
                1.dp,
                if (selected) Amber.copy(alpha = 0.45f) else HairlineStrong,
                RoundedCornerShape(12.dp)
            )
            .clickable(onClick = onClick)
            .padding(vertical = 10.dp, horizontal = 8.dp)
    )
}

@Composable
internal fun CompareSavedSensiTable(
    entries: List<com.ffsensitivity.app.data.remote.SharedCompareEntry>
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(SurfaceCard)
            .border(1.dp, HairlineStrong, RoundedCornerShape(16.dp))
            .padding(vertical = 10.dp)
    ) {
        Text(
            text = "LATEST ${entries.size} PLAYERS · SAVED FF SENSI",
            color = Amber,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.2.sp,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
        )
        Spacer(modifier = Modifier.height(6.dp))
        Column(modifier = Modifier.horizontalScroll(rememberScrollState())) {
            CompareSensiTableHeader(showPlayer = true)
            entries.forEachIndexed { index, entry ->
                CompareSensiTableRow(
                    entry = entry,
                    zebra = index % 2 == 1,
                    showPlayer = true
                )
            }
        }
    }
}

/** One table per player — same sensi columns, easier to read alone. */
@Composable
internal fun CompareSavedPerPlayerTables(
    entries: List<com.ffsensitivity.app.data.remote.SharedCompareEntry>
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text(
            text = "LATEST ${entries.size} PLAYERS · ONE TABLE EACH",
            color = Amber,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.2.sp
        )
        entries.forEach { entry ->
            CompareSavedSinglePlayerTable(entry = entry)
        }
    }
}

@Composable
private fun CompareSavedSinglePlayerTable(
    entry: com.ffsensitivity.app.data.remote.SharedCompareEntry
) {
    val name = entry.displayName.trim().ifBlank { "Player" }
    val meta = listOf(
        entry.deviceLabel.trim(),
        entry.fingers.trim(),
        entry.role.trim()
    ).filter { it.isNotEmpty() }.joinToString(" · ")

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(SurfaceCard)
            .border(1.dp, HairlineStrong, RoundedCornerShape(16.dp))
            .padding(vertical = 10.dp)
    ) {
        Text(
            text = name,
            color = InkPrimary,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(horizontal = 12.dp)
        )
        if (meta.isNotEmpty()) {
            Text(
                text = meta,
                color = InkMuted,
                fontSize = 11.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp)
            )
        }
        Spacer(modifier = Modifier.height(6.dp))
        Column(modifier = Modifier.horizontalScroll(rememberScrollState())) {
            CompareSensiTableHeader(showPlayer = false)
            CompareSensiTableRow(
                entry = entry,
                zebra = false,
                showPlayer = false
            )
        }
    }
}

@Composable
private fun CompareSensiTableHeader(showPlayer: Boolean) {
    Row(
        modifier = Modifier
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (showPlayer) {
            Text(
                text = "Player",
                color = InkMuted,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.width(88.dp),
                maxLines = 1
            )
        }
        CompareSensiColHeader("G")
        CompareSensiColHeader("RD")
        CompareSensiColHeader("2x")
        CompareSensiColHeader("4x")
        CompareSensiColHeader("SN")
        CompareSensiColHeader("FL")
        CompareSensiColHeader("Fire")
    }
}

@Composable
private fun CompareSensiColHeader(label: String) {
    Text(
        text = label,
        color = InkMuted,
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        textAlign = TextAlign.Center,
        modifier = Modifier.width(40.dp)
    )
}

@Composable
private fun CompareSensiTableRow(
    entry: com.ffsensitivity.app.data.remote.SharedCompareEntry,
    zebra: Boolean,
    showPlayer: Boolean
) {
    val a = entry.actual
    Row(
        modifier = Modifier
            .background(if (zebra) SurfaceLift.copy(alpha = 0.55f) else SurfaceCard)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (showPlayer) {
            Text(
                text = entry.displayName.trim().ifBlank { "Player" },
                color = InkPrimary,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.width(88.dp)
            )
        }
        CompareSensiColCell(a.general)
        CompareSensiColCell(a.redDot)
        CompareSensiColCell(a.scope2x)
        CompareSensiColCell(a.scope4x)
        CompareSensiColCell(a.sniper)
        CompareSensiColCell(a.freeLook)
        CompareSensiColCell(a.fireButton)
    }
}

@Composable
private fun CompareSensiColCell(value: Int) {
    Text(
        text = value.toString(),
        color = InkPrimary,
        fontSize = 12.sp,
        fontWeight = FontWeight.Medium,
        textAlign = TextAlign.Center,
        modifier = Modifier.width(40.dp)
    )
}

@Composable
internal fun TipBanner(text: String) {
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
