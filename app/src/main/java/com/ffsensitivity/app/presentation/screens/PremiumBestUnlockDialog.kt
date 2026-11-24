package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.MonetizationOn
import androidx.compose.material.icons.outlined.PlayCircle
import androidx.compose.material.icons.outlined.WorkspacePremium
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.AmberHot
import com.ffsensitivity.app.presentation.theme.Danger
import com.ffsensitivity.app.presentation.theme.InfoBlue
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.presentation.theme.SurfaceDeep
import com.ffsensitivity.app.presentation.theme.SurfaceLift

internal const val BEST_PREMIUM_UNLOCK_COINS = 100
internal const val ONE_TAP_PREMIUM_UNLOCK_COINS = 150
internal const val PREMIUM_PRO_MAX_UNLOCK_COINS = 200

@Composable
internal fun PremiumBestUnlockDialog(
    busy: Boolean,
    errorMessage: String?,
    onDismiss: () -> Unit,
    onUnlockCoins: () -> Unit,
    onWatchAd: () -> Unit,
    title: String = "Best Premium Sensi Unlock",
    eyebrow: String = "PREMIUM UNLOCK",
    subtitle: String = "Pick coins or a short ad — both unlock the same Premium sensi.",
    coinCost: Int = BEST_PREMIUM_UNLOCK_COINS,
    showCoinUnlock: Boolean = true,
    showAdUnlock: Boolean = true
) {
    val shape = RoundedCornerShape(26.dp)
    val coinOn = showCoinUnlock
    val adOn = showAdUnlock

    Dialog(
        onDismissRequest = { if (!busy) onDismiss() },
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .clip(shape)
                .background(
                    Brush.verticalGradient(
                        listOf(
                            Color(0xFF1F2633),
                            SurfaceCard,
                            SurfaceDeep
                        )
                    )
                )
                .border(
                    width = 1.dp,
                    brush = Brush.verticalGradient(
                        listOf(AmberHot.copy(alpha = 0.55f), Amber.copy(alpha = 0.18f))
                    ),
                    shape = shape
                )
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .background(
                        Brush.horizontalGradient(
                            listOf(AmberHot, Amber, AmberHot.copy(alpha = 0.35f))
                        )
                    )
            )

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 22.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .size(58.dp)
                        .clip(RoundedCornerShape(18.dp))
                        .background(
                            Brush.verticalGradient(
                                listOf(Amber.copy(alpha = 0.28f), Amber.copy(alpha = 0.08f))
                            )
                        )
                        .border(1.dp, AmberHot.copy(alpha = 0.45f), RoundedCornerShape(18.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Outlined.WorkspacePremium,
                        contentDescription = null,
                        tint = AmberHot,
                        modifier = Modifier.size(28.dp)
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                Text(
                    text = eyebrow,
                    color = AmberHot,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 2.sp
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = title,
                    color = InkPrimary,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = (-0.3).sp,
                    textAlign = TextAlign.Center,
                    lineHeight = 26.sp
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = subtitle,
                    color = InkSecondary,
                    fontSize = 13.sp,
                    lineHeight = 19.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )

                if (!errorMessage.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = errorMessage,
                        color = Danger,
                        fontSize = 12.sp,
                        lineHeight = 17.sp,
                        textAlign = TextAlign.Center,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(Danger.copy(alpha = 0.10f))
                            .border(1.dp, Danger.copy(alpha = 0.28f), RoundedCornerShape(12.dp))
                            .padding(horizontal = 12.dp, vertical = 10.dp)
                    )
                }

                Spacer(modifier = Modifier.height(22.dp))

                if (coinOn) {
                    PremiumUnlockChoiceButton(
                        enabled = !busy,
                        busy = busy,
                        icon = Icons.Outlined.MonetizationOn,
                        title = if (busy) "Please wait…" else "Unlock with coins",
                        subtitle = "$coinCost coins",
                        iconTint = SurfaceDeep,
                        titleColor = SurfaceDeep,
                        subtitleColor = SurfaceDeep.copy(alpha = 0.72f),
                        containerBrush = Brush.horizontalGradient(listOf(AmberHot, Amber)),
                        borderColor = AmberHot.copy(alpha = 0.65f),
                        onClick = onUnlockCoins
                    )
                }

                if (coinOn && adOn) {
                    Spacer(modifier = Modifier.height(12.dp))
                }

                if (adOn) {
                    PremiumUnlockChoiceButton(
                        enabled = !busy,
                        busy = busy,
                        icon = Icons.Outlined.PlayCircle,
                        title = if (busy) "Please wait…" else "Watch ad to unlock",
                        subtitle = "Free · short rewarded ad",
                        iconTint = InfoBlue,
                        titleColor = InkPrimary,
                        subtitleColor = InkSecondary,
                        containerBrush = Brush.verticalGradient(
                            listOf(SurfaceLift, Color(0xFF121822))
                        ),
                        borderColor = InfoBlue.copy(alpha = 0.55f),
                        onClick = onWatchAd
                    )
                }

                if (!coinOn && !adOn) {
                    Text(
                        text = "Unlock is temporarily unavailable.",
                        color = Danger,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .clickable(
                            enabled = !busy,
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                            onClick = onDismiss
                        )
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Close,
                        contentDescription = null,
                        tint = InkMuted,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Cancel",
                        color = InkMuted,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
    }
}

@Composable
private fun PremiumUnlockChoiceButton(
    enabled: Boolean,
    busy: Boolean,
    icon: ImageVector,
    title: String,
    subtitle: String,
    iconTint: Color,
    titleColor: Color,
    subtitleColor: Color,
    containerBrush: Brush,
    borderColor: Color,
    onClick: () -> Unit
) {
    val shape = RoundedCornerShape(18.dp)
    val alpha = if (enabled) 1f else 0.45f

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(72.dp)
            .clip(shape)
            .background(containerBrush)
            .border(1.5.dp, borderColor.copy(alpha = borderColor.alpha * alpha), shape)
            .clickable(
                enabled = enabled,
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            )
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(Color.Black.copy(alpha = 0.18f))
                .border(1.dp, Color.White.copy(alpha = 0.10f), RoundedCornerShape(14.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = iconTint.copy(alpha = alpha),
                modifier = Modifier.size(24.dp)
            )
        }
        Spacer(modifier = Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                color = titleColor.copy(alpha = alpha),
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = (-0.2).sp
            )
            if (!busy) {
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = subtitle,
                    color = subtitleColor.copy(alpha = alpha),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}
