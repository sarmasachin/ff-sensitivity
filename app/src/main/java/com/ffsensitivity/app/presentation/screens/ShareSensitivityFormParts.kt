package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Smartphone
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.AppSession
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

internal enum class ShareTab { SHARE_MINE, COMMUNITY }

@Composable
internal fun LiveProPreviewCard(
    name: String,
    freeFireId: String,
    rank: String,
    role: String,
    device: String,
    matches: String,
    kills: String,
    headshots: String,
    kd: String
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(
                Brush.verticalGradient(listOf(SurfaceLift, SurfaceCard))
            )
            .border(1.dp, Amber.copy(alpha = 0.35f), RoundedCornerShape(20.dp))
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "PRO SETUP",
                color = Amber,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.4.sp
            )
            Text(
                text = "LIVE PREVIEW",
                color = InkMuted,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.2.sp
            )
        }
        Spacer(modifier = Modifier.height(10.dp))
        Text(
            text = name,
            color = InkPrimary,
            fontSize = 22.sp,
            fontWeight = FontWeight.Black,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = "ID Â· $freeFireId",
            color = InkSecondary,
            fontSize = 12.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        Spacer(modifier = Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            MiniChip(rank)
            MiniChip(role)
        }
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = device,
            color = InkSecondary,
            fontSize = 13.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        Spacer(modifier = Modifier.height(10.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            PreviewStat("Matches", matches)
            PreviewStat("Kills", kills)
            PreviewStat("HS", headshots)
            PreviewStat("KD", kd)
        }
        Spacer(modifier = Modifier.height(12.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(AmberSoft)
                .border(1.dp, Amber.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                .padding(vertical = 10.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "View Sensitivity Settings",
                color = AmberHot,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
internal fun MiniChip(text: String) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(SurfaceLift)
            .border(1.dp, HairlineStrong, RoundedCornerShape(8.dp))
            .padding(horizontal = 10.dp, vertical = 5.dp)
    ) {
        Text(
            text = text,
            color = InkSecondary,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
internal fun PreviewStat(label: String, value: String) {
    Column {
        Text(text = label, color = InkMuted, fontSize = 10.sp)
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = value,
            color = InkPrimary,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
internal fun ShareTopBar(onBack: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(42.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(SurfaceCard)
                .border(1.dp, HairlineStrong, RoundedCornerShape(12.dp))
                .clickable(onClick = onBack),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Outlined.ArrowBack,
                contentDescription = "Back",
                tint = InkPrimary,
                modifier = Modifier.size(20.dp)
            )
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(
                text = "PRO SHARE",
                color = Amber,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.5.sp
            )
            Text(
                text = "Sensitivity Cards",
                color = InkPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
internal fun ShareTabRow(
    selected: ShareTab,
    onSelect: (ShareTab) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(SurfaceCard)
            .border(1.dp, HairlineStrong, RoundedCornerShape(16.dp))
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        ShareTabChip(
            label = "Share Mine",
            selected = selected == ShareTab.SHARE_MINE,
            onClick = { onSelect(ShareTab.SHARE_MINE) },
            modifier = Modifier.weight(1f)
        )
        ShareTabChip(
            label = "Community",
            selected = selected == ShareTab.COMMUNITY,
            onClick = { onSelect(ShareTab.COMMUNITY) },
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
internal fun ShareTabChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .height(42.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (selected) Brush.horizontalGradient(listOf(Amber, AmberHot))
                else Brush.horizontalGradient(listOf(SurfaceCard, SurfaceCard))
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            color = if (selected) VoidBlack else InkSecondary,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
internal fun ShareSectionLabel(text: String) {
    Text(
        text = text.uppercase(),
        color = InkMuted,
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 1.3.sp
    )
}

@Composable
internal fun ShareField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    placeholder: String,
    keyboardType: KeyboardType = KeyboardType.Text,
    modifier: Modifier = Modifier
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        singleLine = true,
        label = { Text(label) },
        placeholder = { Text(placeholder) },
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        shape = RoundedCornerShape(14.dp),
        colors = shareFieldColors()
    )
}

@Composable
internal fun ChipRow(
    options: List<String>,
    selected: String?,
    onSelect: (String) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        options.forEach { option ->
            val isOn = option == selected
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (isOn) AmberSoft else SurfaceLift)
                    .border(
                        1.dp,
                        if (isOn) Amber.copy(alpha = 0.55f) else HairlineStrong,
                        RoundedCornerShape(12.dp)
                    )
                    .clickable { onSelect(option) }
                    .padding(horizontal = 14.dp, vertical = 10.dp)
            ) {
                Text(
                    text = option,
                    color = if (isOn) AmberHot else InkSecondary,
                    fontSize = 13.sp,
                    fontWeight = if (isOn) FontWeight.Bold else FontWeight.Medium
                )
            }
        }
    }
}

@Composable
internal fun KdBadge(kdText: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(
                Brush.horizontalGradient(
                    listOf(SurfaceLift, SurfaceCard)
                )
            )
            .border(1.dp, HairlineStrong, RoundedCornerShape(14.dp))
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = "KD Ratio",
            color = InkSecondary,
            fontSize = 13.sp,
            fontWeight = FontWeight.Medium
        )
        Text(
            text = kdText,
            color = AmberHot,
            fontSize = 18.sp,
            fontWeight = FontWeight.Black
        )
    }
}

@Composable
internal fun DeviceAutoCard(
    label: String,
    meta: String,
    showRetry: Boolean,
    onRetry: () -> Unit,
    onEnterManual: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(SurfaceCard)
            .border(1.dp, Amber.copy(alpha = 0.28f), RoundedCornerShape(16.dp))
            .padding(14.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(AmberSoft)
                    .border(1.dp, Amber.copy(alpha = 0.35f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Outlined.Smartphone,
                    contentDescription = null,
                    tint = Amber,
                    modifier = Modifier.size(22.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "AUTO DETECTED",
                    color = Amber,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.2.sp
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = label,
                    color = InkPrimary,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                if (meta.isNotBlank()) {
                    Text(
                        text = meta,
                        color = InkMuted,
                        fontSize = 12.sp
                    )
                }
            }
        }
        if (showRetry) {
            Spacer(modifier = Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                SmallActionChip(text = "Retry", onClick = onRetry)
                SmallActionChip(text = "Enter manually", onClick = onEnterManual)
            }
        }
    }
}

@Composable
internal fun SmallActionChip(text: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(10.dp))
            .background(SurfaceLift)
            .border(1.dp, HairlineStrong, RoundedCornerShape(10.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 8.dp)
    ) {
        Text(
            text = text,
            color = AmberHot,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
internal fun SensiGrid(
    general: String,
    redDot: String,
    scope2x: String,
    scope4x: String,
    awm: String,
    freeLook: String,
    onGeneral: (String) -> Unit,
    onRedDot: (String) -> Unit,
    on2x: (String) -> Unit,
    on4x: (String) -> Unit,
    onAwm: (String) -> Unit,
    onFreeLook: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(SurfaceCard)
            .border(1.dp, HairlineStrong, RoundedCornerShape(18.dp))
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SensiCell("General", general, onGeneral, Modifier.weight(1f))
            SensiCell("Red Dot", redDot, onRedDot, Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SensiCell("2x", scope2x, on2x, Modifier.weight(1f))
            SensiCell("4x", scope4x, on4x, Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SensiCell("AWM", awm, onAwm, Modifier.weight(1f))
            SensiCell("Free Look", freeLook, onFreeLook, Modifier.weight(1f))
        }
    }
}

@Composable
internal fun SensiCell(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier,
        singleLine = true,
        label = { Text(label) },
        placeholder = { Text("0â€“200") },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        shape = RoundedCornerShape(12.dp),
        colors = shareFieldColors()
    )
}

@Composable
internal fun SubmitProButton(enabled: Boolean, label: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(54.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(
                if (enabled) Brush.horizontalGradient(listOf(Amber, AmberHot))
                else Brush.horizontalGradient(listOf(SurfaceLift, SurfaceLift))
            )
            .border(
                1.dp,
                if (enabled) Amber.copy(alpha = 0.4f) else Hairline,
                RoundedCornerShape(16.dp)
            )
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            color = if (enabled) VoidBlack else InkMuted,
            fontSize = 15.sp,
            fontWeight = FontWeight.Black,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
internal fun shareFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = InkPrimary,
    unfocusedTextColor = InkPrimary,
    focusedBorderColor = Amber,
    unfocusedBorderColor = HairlineStrong,
    focusedContainerColor = SurfaceLift,
    unfocusedContainerColor = SurfaceLift,
    cursorColor = Amber,
    focusedLabelColor = Amber,
    unfocusedLabelColor = InkMuted,
    focusedPlaceholderColor = InkMuted,
    unfocusedPlaceholderColor = InkMuted
)

internal fun deviceMetaFromSession(): String {
    val info = AppSession.deviceInfo ?: return ""
    return listOfNotNull(
        info.ramLabel.takeIf { it.isNotBlank() },
        info.maxRefreshLabel.takeIf { it.isNotBlank() }
    ).joinToString(" Â· ")
}

internal fun missingSubmitHint(
    name: String,
    ffIdOk: Boolean,
    rank: String?,
    role: String?,
    matchesOk: Boolean,
    killsOk: Boolean,
    headshotsOk: Boolean,
    deviceOk: Boolean,
    sensiOk: Boolean
): String {
    val missing = buildList {
        if (name.trim().isEmpty()) add("name")
        if (!ffIdOk) add("Free Fire ID")
        if (rank == null) add("rank")
        if (role == null) add("role")
        if (!matchesOk) add("matches")
        if (!killsOk) add("kills")
        if (!headshotsOk) add("total headshots")
        if (!deviceOk) add("device")
        if (!sensiOk) add("all sensitivity values (0-200)")
    }
    return if (missing.isEmpty()) {
        "Complete all fields to submit"
    } else {
        "Still needed: " + missing.joinToString(", ")
    }
}

internal fun clampSensiInput(raw: String): String {
    val digits = raw.filter(Char::isDigit).take(3)
    if (digits.isEmpty()) return ""
    val n = digits.toIntOrNull() ?: return ""
    return n.coerceIn(0, 200).toString()
}

internal fun isSensiValue(raw: String): Boolean {
    val n = raw.toIntOrNull() ?: return false
    return n in 0..200
}
