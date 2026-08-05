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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.MonetizationOn
import androidx.compose.material.icons.outlined.ShoppingBag
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.ShopCategory
import com.ffsensitivity.app.data.ShopItem
import com.ffsensitivity.app.data.ShopStore
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.AmberHot
import com.ffsensitivity.app.presentation.theme.AmberSoft
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
import java.util.Locale

@Composable
internal fun ShopTopBar(onBack: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
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
                Icons.AutoMirrored.Outlined.ArrowBack,
                contentDescription = "Back",
                tint = InkPrimary,
                modifier = Modifier.size(20.dp)
            )
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "COIN SHOP",
                color = Amber,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.5.sp
            )
            Text(
                text = "Spend & Unlock",
                color = InkPrimary,
                fontSize = 20.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
        Icon(
            Icons.Outlined.ShoppingBag,
            contentDescription = null,
            tint = AmberHot,
            modifier = Modifier.size(22.dp)
        )
    }
}

@Composable
internal fun ShopWalletHero(coins: Int, goldStyle: Boolean) {
    val borderColor = if (goldStyle) AmberHot.copy(alpha = 0.7f) else Amber.copy(alpha = 0.42f)
    val bg = if (goldStyle) {
        listOf(Color(0xFF2A2214), Color(0xFF1C2330), SurfaceCard)
    } else {
        listOf(Color(0xFF1A2230), SurfaceLift, SurfaceCard)
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(Brush.verticalGradient(bg))
            .border(1.dp, borderColor, RoundedCornerShape(22.dp))
            .padding(18.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(52.dp)
                .clip(RoundedCornerShape(99.dp))
                .background(Brush.radialGradient(listOf(AmberHot, Amber)))
                .border(
                    1.5.dp,
                    if (goldStyle) AmberHot else AmberHot.copy(alpha = 0.7f),
                    RoundedCornerShape(99.dp)
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Outlined.MonetizationOn,
                contentDescription = null,
                tint = VoidBlack,
                modifier = Modifier.size(28.dp)
            )
        }
        Spacer(modifier = Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = if (goldStyle) "GOLD WALLET" else "WALLET",
                color = Amber,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.4.sp
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = formatShopCoins(coins),
                color = InkPrimary,
                fontSize = 28.sp,
                fontWeight = FontWeight.Black
            )
            Text(
                text = if (goldStyle) {
                    "Gold chip active · earn & spend in-app"
                } else {
                    "Earn from Daily Challenge · spend here"
                },
                color = InkSecondary,
                fontSize = 12.sp
            )
        }
    }
}

@Composable
internal fun ShopTabRow(tab: ShopTab, onSelect: (ShopTab) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(SurfaceDeep)
            .border(1.dp, HairlineStrong, RoundedCornerShape(16.dp))
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        ShopTabPill(
            label = "Store",
            selected = tab == ShopTab.STORE,
            modifier = Modifier.weight(1f)
        ) { onSelect(ShopTab.STORE) }
        ShopTabPill(
            label = "Owned",
            selected = tab == ShopTab.OWNED,
            modifier = Modifier.weight(1f)
        ) { onSelect(ShopTab.OWNED) }
    }
}

@Composable
private fun ShopTabPill(
    label: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Box(
        modifier = modifier
            .height(40.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(if (selected) AmberSoft else Color.Transparent)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            color = if (selected) AmberHot else InkMuted,
            fontSize = 13.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium
        )
    }
}

@Composable
internal fun CategoryChips(
    selected: ShopCategory?,
    onSelect: (ShopCategory?) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        FilterChip("All", selected == null) { onSelect(null) }
        ShopCategory.entries.forEach { cat ->
            FilterChip(cat.label, selected == cat) { onSelect(cat) }
        }
    }
}

@Composable
private fun FilterChip(label: String, on: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(if (on) AmberSoft else SurfaceLift)
            .border(
                1.dp,
                if (on) Amber.copy(alpha = 0.55f) else HairlineStrong,
                RoundedCornerShape(12.dp)
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 9.dp)
    ) {
        Text(
            text = label,
            color = if (on) AmberHot else InkSecondary,
            fontSize = 12.sp,
            fontWeight = if (on) FontWeight.Bold else FontWeight.Medium
        )
    }
}

@Composable
internal fun ShopProductCard(
    item: ShopItem,
    ownedOnce: Boolean,
    buyCount: Int,
    canBuy: Boolean,
    blockedReason: String?,
    busy: Boolean,
    onBuy: () -> Unit
) {
    val isPrize = item.category == ShopCategory.PRIZE
    val cardBorder = if (isPrize) AmberHot.copy(alpha = 0.48f) else Amber.copy(alpha = 0.38f)
    val cardBg = if (isPrize) {
        listOf(Color(0xFF241C12), Color(0xFF1C2330), SurfaceCard)
    } else {
        listOf(Color(0xFF1C2330), SurfaceLift, SurfaceCard)
    }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(Brush.verticalGradient(cardBg))
            .border(1.dp, cardBorder, RoundedCornerShape(22.dp))
            .padding(16.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(AmberSoft)
                    .border(1.dp, Amber.copy(alpha = 0.35f), RoundedCornerShape(8.dp))
                    .padding(horizontal = 8.dp, vertical = 5.dp)
            ) {
                Text(
                    text = item.rewardTag,
                    color = AmberHot,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 0.7.sp
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = item.category.label.uppercase(Locale.US),
                color = if (isPrize) Amber else InkMuted,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp
            )
            Spacer(modifier = Modifier.weight(1f))
            if (ownedOnce) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Outlined.CheckCircle,
                        contentDescription = null,
                        tint = Success,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Owned", color = Success, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                }
            } else if (buyCount > 0) {
                Text("×$buyCount", color = InkSecondary, fontSize = 11.sp)
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = item.title,
            color = InkPrimary,
            fontSize = 17.sp,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = item.subtitle,
            color = InkSecondary,
            fontSize = 13.sp,
            lineHeight = 18.sp,
            maxLines = 3,
            overflow = TextOverflow.Ellipsis
        )
        Spacer(modifier = Modifier.height(14.dp))
        Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(Hairline))
        Spacer(modifier = Modifier.height(12.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Outlined.MonetizationOn,
                contentDescription = null,
                tint = AmberHot,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = formatShopCoins(item.priceCoins),
                color = AmberHot,
                fontSize = 18.sp,
                fontWeight = FontWeight.Black
            )
            Spacer(modifier = Modifier.weight(1f))
            val label = when {
                busy -> "Buying…"
                ownedOnce -> "Owned"
                !canBuy -> blockedReason?.take(18) ?: "Locked"
                else -> "BUY"
            }
            val enabled = canBuy && !busy && !ownedOnce
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(
                        if (enabled) Brush.horizontalGradient(listOf(Amber, AmberHot))
                        else Brush.horizontalGradient(listOf(SurfaceDeep, SurfaceDeep))
                    )
                    .border(
                        1.dp,
                        if (enabled) Amber.copy(alpha = 0.4f) else Hairline,
                        RoundedCornerShape(12.dp)
                    )
                    .clickable(enabled = enabled, onClick = onBuy)
                    .padding(horizontal = 18.dp, vertical = 10.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (!enabled && !ownedOnce) {
                        Icon(
                            Icons.Outlined.Lock,
                            contentDescription = null,
                            tint = InkMuted,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                    }
                    Text(
                        text = label,
                        color = if (enabled) VoidBlack else InkMuted,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 0.6.sp,
                        maxLines = 1
                    )
                }
            }
        }
    }
}

@Composable
internal fun OwnedProductCard(row: ShopStore.OwnedItem) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(Brush.horizontalGradient(listOf(SurfaceLift, SurfaceCard)))
            .border(1.dp, HairlineStrong, RoundedCornerShape(18.dp))
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(42.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(Success.copy(alpha = 0.15f))
                .border(1.dp, Success.copy(alpha = 0.4f), RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Outlined.CheckCircle,
                contentDescription = null,
                tint = Success,
                modifier = Modifier.size(20.dp)
            )
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = row.title,
                color = InkPrimary,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = "${row.category.label} · ${row.rewardTag}" +
                    if (row.qty > 1) " · ×${row.qty}" else "",
                color = InkSecondary,
                fontSize = 12.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
internal fun EmptyShopBlock(message: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(SurfaceDeep.copy(alpha = 0.7f))
            .border(1.dp, HairlineStrong, RoundedCornerShape(18.dp))
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(text = message, color = InkMuted, fontSize = 13.sp)
    }
}
