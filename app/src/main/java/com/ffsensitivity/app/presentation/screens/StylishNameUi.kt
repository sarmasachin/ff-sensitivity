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
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.StylishNameCatalog
import com.ffsensitivity.app.data.StylishNameCatalog.GeneratedName
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
import com.ffsensitivity.app.presentation.theme.SurfaceDeep
import com.ffsensitivity.app.presentation.theme.SurfaceLift
import com.ffsensitivity.app.presentation.theme.VoidBlack

@Composable
internal fun StylishNameComposer(
    baseName: String,
    onBaseNameChange: (String) -> Unit,
    catalogReady: Boolean,
    roundIndex: Int,
    remainingUnique: Int,
    resultCount: Int
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(Brush.verticalGradient(listOf(SurfaceLift, SurfaceCard)))
            .border(1.dp, HairlineStrong, RoundedCornerShape(18.dp))
            .padding(16.dp)
    ) {
        Text(
            text = "PLAYER TAG",
            color = Amber,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.6.sp
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = "Type a short name — we build FF-ready stylish variants.",
            color = InkSecondary,
            fontSize = 12.sp,
            lineHeight = 17.sp
        )
        Spacer(modifier = Modifier.height(14.dp))

        OutlinedTextField(
            value = baseName,
            onValueChange = onBaseNameChange,
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            enabled = catalogReady,
            label = { Text("Name") },
            placeholder = { Text("e.g. GHOST") },
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
            shape = RoundedCornerShape(12.dp),
            colors = stylishFieldColors()
        )

        if (baseName.isNotBlank() && (roundIndex > 0 || resultCount > 0)) {
            Spacer(modifier = Modifier.height(12.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(Hairline)
            )
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                StylishMetaPill(
                    label = "Batch",
                    value = if (roundIndex > 0) "#$roundIndex" else "—",
                    modifier = Modifier.weight(1f)
                )
                StylishMetaPill(
                    label = "Showing",
                    value = "$resultCount",
                    modifier = Modifier.weight(1f)
                )
                StylishMetaPill(
                    label = "Left",
                    value = "$remainingUnique",
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun StylishMetaPill(
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(SurfaceDeep.copy(alpha = 0.55f))
            .border(1.dp, Hairline, RoundedCornerShape(10.dp))
            .padding(horizontal = 10.dp, vertical = 8.dp)
    ) {
        Text(
            text = label.uppercase(),
            color = InkMuted,
            fontSize = 9.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 0.8.sp
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = value,
            color = InkPrimary,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            fontFamily = FontFamily.Monospace
        )
    }
}

@Composable
internal fun StylishNameHint(text: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(SurfaceCard)
            .border(1.dp, HairlineStrong, RoundedCornerShape(14.dp))
            .padding(horizontal = 16.dp, vertical = 18.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = text,
            color = InkMuted,
            fontSize = 13.sp,
            lineHeight = 18.sp,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
internal fun StylishNameResultRow(
    item: GeneratedName,
    onCopy: () -> Unit
) {
    val count = StylishNameCatalog.charCount(item.value)
    val fits = StylishNameCatalog.fitsFfLimit(item.value)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(SurfaceCard)
            .border(1.dp, HairlineStrong, RoundedCornerShape(14.dp))
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .width(3.dp)
                .height(44.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(if (fits) Amber.copy(alpha = 0.85f) else Danger.copy(alpha = 0.7f))
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = item.styleLabel.uppercase(),
                color = InkMuted,
                fontSize = 10.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 0.9.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(5.dp))
            Text(
                text = item.value,
                color = InkPrimary,
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium,
                letterSpacing = 0.2.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = if (fits) {
                    "$count / ${StylishNameCatalog.FF_NAME_MAX} · FF limit OK"
                } else {
                    "$count / ${StylishNameCatalog.FF_NAME_MAX} · over limit"
                },
                color = if (fits) Success.copy(alpha = 0.9f) else Danger,
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium
            )
        }
        Spacer(modifier = Modifier.width(10.dp))
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(10.dp))
                .background(SurfaceDeep.copy(alpha = 0.65f))
                .border(1.dp, Amber.copy(alpha = 0.45f), RoundedCornerShape(10.dp))
                .clickable(onClick = onCopy)
                .padding(horizontal = 12.dp, vertical = 10.dp),
            contentAlignment = Alignment.Center
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Outlined.ContentCopy,
                    contentDescription = null,
                    tint = Amber,
                    modifier = Modifier.size(15.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "Copy",
                    color = AmberHot,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}

@Composable
internal fun StylishNameShowMoreButton(onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(46.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(SurfaceLift)
            .border(1.dp, HairlineStrong, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "Show more",
            color = InkPrimary,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
internal fun StylishNameBatchCard(
    selectedFontId: String?,
    onSelectFont: (String?) -> Unit,
    hasMore: Boolean,
    onGenerate: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Brush.verticalGradient(listOf(SurfaceLift, SurfaceCard)))
            .border(1.dp, Amber.copy(alpha = 0.28f), RoundedCornerShape(16.dp))
            .padding(16.dp)
    ) {
        Text(
            text = "NEXT BATCH",
            color = Amber,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.5.sp
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "You hit this batch’s 100-style cap",
            color = InkPrimary,
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = "Pick a font filter, then generate a fresh set — no repeats from what you already saw.",
            color = InkSecondary,
            fontSize = 12.sp,
            lineHeight = 17.sp
        )
        Spacer(modifier = Modifier.height(14.dp))
        Text(
            text = "Font",
            color = InkMuted,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(modifier = Modifier.height(8.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            StylishChoiceChip(
                label = "All fonts",
                selected = selectedFontId == null,
                onClick = { onSelectFont(null) }
            )
            StylishNameCatalog.letterStyles.forEach { font ->
                StylishChoiceChip(
                    label = font.label,
                    selected = selectedFontId == font.id,
                    onClick = { onSelectFont(font.id) }
                )
            }
        }
        Spacer(modifier = Modifier.height(14.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(
                    if (hasMore) Brush.horizontalGradient(listOf(Amber, AmberHot))
                    else Brush.horizontalGradient(listOf(SurfaceLift, SurfaceLift))
                )
                .border(
                    1.dp,
                    if (hasMore) Amber.copy(alpha = 0.35f) else Hairline,
                    RoundedCornerShape(12.dp)
                )
                .clickable(enabled = hasMore, onClick = onGenerate),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = if (hasMore) "Generate unique styles" else "No more unique styles",
                color = if (hasMore) VoidBlack else InkMuted,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
private fun StylishChoiceChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(10.dp))
            .background(if (selected) AmberSoft else SurfaceDeep.copy(alpha = 0.5f))
            .border(
                1.dp,
                if (selected) Amber.copy(alpha = 0.55f) else HairlineStrong,
                RoundedCornerShape(10.dp)
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 8.dp)
    ) {
        Text(
            text = label,
            color = if (selected) AmberHot else InkSecondary,
            fontSize = 12.sp,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium
        )
    }
}

@Composable
private fun stylishFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = InkPrimary,
    unfocusedTextColor = InkPrimary,
    disabledTextColor = InkMuted,
    focusedBorderColor = Amber.copy(alpha = 0.7f),
    unfocusedBorderColor = HairlineStrong,
    disabledBorderColor = Hairline,
    focusedContainerColor = SurfaceDeep.copy(alpha = 0.35f),
    unfocusedContainerColor = SurfaceDeep.copy(alpha = 0.25f),
    disabledContainerColor = SurfaceDeep.copy(alpha = 0.15f),
    cursorColor = Amber,
    focusedLabelColor = Amber,
    unfocusedLabelColor = InkMuted,
    focusedPlaceholderColor = InkMuted,
    unfocusedPlaceholderColor = InkMuted
)
