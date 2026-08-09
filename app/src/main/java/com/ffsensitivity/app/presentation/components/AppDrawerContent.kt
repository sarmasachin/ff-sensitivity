package com.ffsensitivity.app.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.Logout
import androidx.compose.material.icons.outlined.Mail
import androidx.compose.material.icons.outlined.Policy
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.ShoppingBag
import androidx.compose.material.icons.outlined.StarRate
import androidx.compose.material.icons.outlined.Style
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
import com.ffsensitivity.app.data.remote.AppConfigRepository
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

enum class AppDrawerAction {
    HOME,
    DAILY_CHALLENGE,
    REDEEM,
    STYLISH,
    SCRATCH_CARDS,
    COIN_SHOP,
    RATE_APP,
    SHARE_APP,
    WEBSITE,
    PRIVACY,
    CONTACT_US,
    ABOUT,
    SIGN_OUT
}

@Composable
fun AppDrawerContent(
    appVersion: String,
    selectedRoute: String,
    onAction: (AppDrawerAction) -> Unit,
    modifier: Modifier = Modifier,
    configTick: Int = 0
) {
    // Parent OverlayAppDrawer already sizes + paints the panel. Do NOT combine
    // weight() with verticalScroll() — that measure path intermittently collapsed
    // the list to an empty dark panel (looked like a black screen with bottom bar).
    Column(
        modifier = modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(Brush.horizontalGradient(listOf(SurfaceCard, SurfaceLift)))
                .border(1.dp, Amber.copy(alpha = 0.45f), RoundedCornerShape(18.dp))
                .padding(16.dp)
        ) {
            Text(
                text = "FF SENSITIVITY",
                color = AmberHot,
                fontSize = 18.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 0.6.sp
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Tools · Rewards · Codes",
                color = InkSecondary,
                fontSize = 12.sp
            )
        }

        Spacer(modifier = Modifier.height(18.dp))
        Text(
            text = "MENU",
            color = Amber,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.5.sp
        )
        Spacer(modifier = Modifier.height(10.dp))

        val cfg = remember(configTick) { AppConfigRepository.snapshot() }
        val copy = remember(configTick) {
            com.ffsensitivity.app.data.remote.CopyRepository.snapshot()
        }
        val showScratch =
            cfg.features["scratch"] != false && cfg.navigation["homeScratch"] != false
        val showShop =
            cfg.features["shop"] != false && cfg.navigation["homeShop"] != false
        val showShare = cfg.features["share"] != false
        val showSupport =
            cfg.features["support"] != false && cfg.navigation["navSupport"] != false
        val showAbout = cfg.navigation["navAbout"] != false

        DrawerItem(
            label = "Home",
            icon = Icons.Outlined.Home,
            selected = selectedRoute == "home"
        ) { onAction(AppDrawerAction.HOME) }
        if (showScratch) {
            DrawerItem(
                label = "Scratch Cards",
                icon = Icons.Outlined.Style,
                selected = selectedRoute == "scratch_cards"
            ) { onAction(AppDrawerAction.SCRATCH_CARDS) }
        }
        if (showShop) {
            DrawerItem(
                label = "Coin Shop",
                icon = Icons.Outlined.ShoppingBag,
                selected = selectedRoute == "coin_shop"
            ) { onAction(AppDrawerAction.COIN_SHOP) }
        }
        Spacer(modifier = Modifier.height(8.dp))
        Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(Hairline))
        Spacer(modifier = Modifier.height(8.dp))
        DrawerItem(
            copy.legal.storeLabel.ifBlank { "Rate App" },
            Icons.Outlined.StarRate,
            selected = false
        ) {
            onAction(AppDrawerAction.RATE_APP)
        }
        if (showShare) {
            DrawerItem(
                copy.share.sheetTitle.ifBlank { "Share App" },
                Icons.Outlined.Share,
                selected = false
            ) {
                onAction(AppDrawerAction.SHARE_APP)
            }
        }
        DrawerItem(
            copy.about.websiteCta.ifBlank { "Our Website" },
            Icons.Outlined.Language,
            selected = false
        ) {
            onAction(AppDrawerAction.WEBSITE)
        }
        DrawerItem(
            copy.legal.privacyLabel.ifBlank { "Privacy Policy" },
            Icons.Outlined.Policy,
            selected = false
        ) {
            onAction(AppDrawerAction.PRIVACY)
        }
        if (showSupport) {
            DrawerItem(
                label = copy.legal.supportLabel.ifBlank { "Contact Us" },
                icon = Icons.Outlined.Mail,
                selected = selectedRoute == "contact"
            ) { onAction(AppDrawerAction.CONTACT_US) }
        }
        if (showAbout) {
            DrawerItem(
                label = "About",
                icon = Icons.Outlined.Info,
                selected = selectedRoute == "about"
            ) { onAction(AppDrawerAction.ABOUT) }
        }

        Spacer(modifier = Modifier.height(8.dp))
        Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(Hairline))
        Spacer(modifier = Modifier.height(8.dp))
        DrawerItem(
            label = "Sign out",
            icon = Icons.Outlined.Logout,
            selected = false
        ) { onAction(AppDrawerAction.SIGN_OUT) }

        Spacer(modifier = Modifier.height(20.dp))
        val versionNumber = if (appVersion.startsWith("v", ignoreCase = true)) {
            appVersion.removePrefix("v").removePrefix("V")
        } else {
            appVersion
        }
        Text(
            text = "${copy.about.versionPrefix.ifBlank { "Version" }} $versionNumber",
            color = InkMuted,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 4.dp)
        )
    }
}

@Composable
private fun DrawerItem(
    label: String,
    icon: ImageVector,
    selected: Boolean,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(if (selected) AmberSoft else Color.Transparent)
            .border(
                1.dp,
                if (selected) Amber.copy(alpha = 0.4f) else Color.Transparent,
                RoundedCornerShape(14.dp)
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(if (selected) Amber.copy(alpha = 0.18f) else SurfaceCard)
                .border(
                    1.dp,
                    if (selected) Amber.copy(alpha = 0.45f) else HairlineStrong,
                    RoundedCornerShape(10.dp)
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = if (selected) AmberHot else Amber,
                modifier = Modifier.size(18.dp)
            )
        }
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = label,
            color = if (selected) AmberHot else InkPrimary,
            fontSize = 14.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold
        )
    }
}

@Composable
fun MenuHamburgerButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .size(42.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(SurfaceCard)
            .border(1.dp, HairlineStrong, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            repeat(3) { i ->
                Box(
                    modifier = Modifier
                        .width(16.dp)
                        .height(2.dp)
                        .clip(RoundedCornerShape(99.dp))
                        .background(InkPrimary)
                )
                if (i < 2) Spacer(modifier = Modifier.height(3.dp))
            }
        }
    }
}
