package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CardGiftcard
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.Key
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.RocketLaunch
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material.icons.outlined.ThumbDown
import androidx.compose.material.icons.outlined.ThumbUp
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.RedeemCodeItem
import com.ffsensitivity.app.data.RedeemStatus
import com.ffsensitivity.app.data.RedeemType
import com.ffsensitivity.app.presentation.components.AppScreenHeader
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.AmberHot
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
internal fun RedeemTabRow(
    selected: RedeemTab,
    onSelect: (RedeemTab) -> Unit,
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
        RedeemTabChip(
            label = "Daily",
            selected = selected == RedeemTab.DAILY,
            onClick = { onSelect(RedeemTab.DAILY) },
            modifier = Modifier.weight(1f)
        )
        RedeemTabChip(
            label = "Weekly",
            selected = selected == RedeemTab.WEEKLY,
            onClick = { onSelect(RedeemTab.WEEKLY) },
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
private fun RedeemTabChip(
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
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            maxLines = 1
        )
    }
}

@Composable
internal fun RedeemTabEmptyPane(tab: RedeemTab) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(SurfaceCard)
            .border(1.dp, HairlineStrong, RoundedCornerShape(16.dp))
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = if (tab == RedeemTab.DAILY) "No daily rewards yet" else "No weekly rewards yet",
            color = InkPrimary,
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = if (tab == RedeemTab.DAILY) {
                "Complete today’s challenge, then check back here."
            } else {
                "Keep a 7-day streak to unlock weekly gift chances."
            },
            color = InkMuted,
            fontSize = 12.sp,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
internal fun RedeemCatalogErrorPane(
    contentPadding: PaddingValues,
    error: RedeemUiError,
    onOpenMenu: () -> Unit,
    onRetry: (() -> Unit)? = null
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(contentPadding)
            .statusBarsPadding()
            .padding(horizontal = 20.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        AppScreenHeader(
            title = "Gift Codes",
            onOpenMenu = onOpenMenu
        )
        Spacer(modifier = Modifier.height(24.dp))
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(SurfaceCard)
                .border(1.dp, HairlineStrong, RoundedCornerShape(16.dp))
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = error.title,
                color = InkPrimary,
                fontSize = 17.sp,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = error.message,
                color = InkSecondary,
                fontSize = 13.sp,
                lineHeight = 18.sp,
                textAlign = TextAlign.Center
            )
            if (onRetry != null) {
                Spacer(modifier = Modifier.height(16.dp))
                TextButton(onClick = onRetry) {
                    Text(
                        text = "Retry",
                        color = Amber,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
internal fun RedeemCodeCard(
    item: RedeemCodeItem,
    unlocked: Boolean,
    revealed: Boolean,
    vote: Boolean?,
    onToggleReveal: () -> Unit,
    onCopy: () -> Unit,
    onRedeem: () -> Unit,
    onVote: (Boolean) -> Unit,
    onOpenComment: () -> Unit
) {
    val active = item.status == RedeemStatus.ACTIVE
    val displayCode = when {
        unlocked && revealed -> item.code
        unlocked -> maskCode(item.code)
        else -> maskCode(item.code)
    }
    val typeIcon = if (item.type == RedeemType.GOOGLE_PLAY) {
        Icons.Outlined.CardGiftcard
    } else {
        Icons.Outlined.Star
    }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(Brush.verticalGradient(listOf(SurfaceLift, SurfaceCard)))
            .border(1.dp, HairlineStrong, RoundedCornerShape(22.dp))
            .padding(18.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                Icon(typeIcon, null, tint = Amber, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = item.title,
                    color = InkPrimary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.6.sp,
                    maxLines = 1
                )
            }
            StatusChip(active = active)
        }
        Spacer(modifier = Modifier.height(12.dp))
        Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(Hairline))
        Spacer(modifier = Modifier.height(14.dp))
        Text(
            text = "Value : ${item.valueLabel}",
            color = InkPrimary,
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold
        )
        if (item.coinCost != null || item.stockLeft != null) {
            Spacer(modifier = Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                item.coinCost?.let { MetaPill("Cost: $it Coins") }
                item.stockLeft?.let { MetaPill("Only $it left today") }
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                if (unlocked) Icons.Outlined.Key else Icons.Outlined.Lock,
                null,
                tint = if (unlocked) InkMuted else Amber,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "Code :  [ $displayCode ]",
                color = InkPrimary,
                fontSize = 14.sp,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Medium
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        TextButton(onClick = onToggleReveal, contentPadding = PaddingValues(0.dp)) {
            Icon(
                imageVector = when {
                    !unlocked -> Icons.Outlined.Lock
                    revealed -> Icons.Outlined.VisibilityOff
                    else -> Icons.Outlined.Visibility
                },
                contentDescription = null,
                tint = Amber,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = when {
                    !unlocked -> "Locked · scratch Redeem Now"
                    revealed -> "Hide Code"
                    else -> "Show Code"
                },
                color = Amber,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
        Spacer(modifier = Modifier.height(10.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            ActionPill(
                pillModifier = Modifier.weight(1f),
                label = if (unlocked) "COPY CODE" else "LOCKED",
                icon = if (unlocked) Icons.Outlined.ContentCopy else Icons.Outlined.Lock,
                enabled = active && unlocked,
                filled = false,
                onClick = onCopy
            )
            ActionPill(
                pillModifier = Modifier.weight(1f),
                label = if (unlocked) "UNLOCKED" else "REDEEM NOW",
                icon = Icons.Outlined.RocketLaunch,
                enabled = active && !unlocked,
                filled = true,
                onClick = onRedeem
            )
        }
        Spacer(modifier = Modifier.height(14.dp))
        Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(Hairline))
        Spacer(modifier = Modifier.height(12.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Outlined.Schedule, null, tint = InkMuted, modifier = Modifier.size(14.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text("Expires: ${item.expiresLabel}", color = InkSecondary, fontSize = 11.sp)
            Text("  |  ", color = InkMuted, fontSize = 11.sp)
            Text(
                text = "Tip: ${item.tip}",
                color = InkSecondary,
                fontSize = 11.sp,
                modifier = Modifier.weight(1f)
            )
        }
        Spacer(modifier = Modifier.height(14.dp))
        Text("Did this code work?", color = InkMuted, fontSize = 12.sp)
        Spacer(modifier = Modifier.height(8.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                VoteChip("YES", vote == true, true) { onVote(true) }
                VoteChip("NO", vote == false, false) { onVote(false) }
            }
            if (item.type == RedeemType.GOOGLE_PLAY) {
                CommentChip(onClick = onOpenComment)
            }
        }
    }
}

@Composable
private fun CommentChip(onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(Amber.copy(alpha = 0.16f))
            .border(1.dp, Amber.copy(alpha = 0.55f), RoundedCornerShape(12.dp))
            .clickable(
                indication = null,
                interactionSource = remember { MutableInteractionSource() },
                onClick = onClick
            )
            .padding(horizontal = 14.dp, vertical = 8.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                Icons.Outlined.ChatBubbleOutline,
                contentDescription = null,
                tint = Amber,
                modifier = Modifier.size(14.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = "COMMENT",
                color = Amber,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun StatusChip(active: Boolean) {
    val bg = if (active) Success.copy(alpha = 0.15f) else Danger.copy(alpha = 0.15f)
    val fg = if (active) Success else Danger
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(bg)
            .border(1.dp, fg.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
            .padding(horizontal = 10.dp, vertical = 5.dp)
    ) {
        Text(
            text = if (active) "ACTIVE" else "CLAIMED",
            color = fg,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 0.8.sp
        )
    }
}

@Composable
private fun MetaPill(text: String) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(VoidBlack.copy(alpha = 0.45f))
            .border(1.dp, Hairline, RoundedCornerShape(8.dp))
            .padding(horizontal = 10.dp, vertical = 5.dp)
    ) {
        Text(text, color = InkSecondary, fontSize = 11.sp)
    }
}

@Composable
private fun ActionPill(
    pillModifier: Modifier = Modifier,
    label: String,
    icon: ImageVector,
    enabled: Boolean,
    filled: Boolean,
    onClick: () -> Unit
) {
    val shape = RoundedCornerShape(14.dp)
    val bg = when {
        !enabled -> InkMuted.copy(alpha = 0.15f)
        filled -> Amber
        else -> VoidBlack.copy(alpha = 0.5f)
    }
    val fg = when {
        !enabled -> InkMuted
        filled -> VoidBlack
        else -> InkPrimary
    }
    Box(
        modifier = pillModifier
            .height(46.dp)
            .clip(shape)
            .background(bg)
            .border(1.dp, if (filled && enabled) Amber else HairlineStrong, shape)
            .then(
                if (enabled) {
                    Modifier.clickable(
                        indication = null,
                        interactionSource = remember { MutableInteractionSource() },
                        onClick = onClick
                    )
                } else Modifier
            ),
        contentAlignment = Alignment.Center
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = fg, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = label,
                color = fg,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.6.sp
            )
        }
    }
}

@Composable
private fun VoteChip(label: String, selected: Boolean, positive: Boolean, onClick: () -> Unit) {
    val accent = if (positive) Success else Danger
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(if (selected) accent.copy(alpha = 0.2f) else SurfaceLift)
            .border(1.dp, if (selected) accent else Hairline, RoundedCornerShape(12.dp))
            .clickable(
                indication = null,
                interactionSource = remember { MutableInteractionSource() },
                onClick = onClick
            )
            .padding(horizontal = 14.dp, vertical = 8.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                if (positive) Icons.Outlined.ThumbUp else Icons.Outlined.ThumbDown,
                null,
                tint = if (selected) accent else InkMuted,
                modifier = Modifier.size(14.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = label,
                color = if (selected) accent else InkSecondary,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}
