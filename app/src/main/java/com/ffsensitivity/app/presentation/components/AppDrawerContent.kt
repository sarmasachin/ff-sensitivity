package com.ffsensitivity.app.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
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
import androidx.compose.material.icons.outlined.Mail
import androidx.compose.material.icons.outlined.Policy
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.ShoppingBag
import androidx.compose.material.icons.outlined.StarRate
import androidx.compose.material.icons.outlined.Style
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
import kotlin.math.roundToInt

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
    ABOUT
}

@Composable
fun AppDrawerContent(
    appVersion: String,
    selectedRoute: String,
    onAction: (AppDrawerAction) -> Unit,
    modifier: Modifier = Modifier
) {
    // Material default max width is 360.dp (~87% phone) + near-black sheet = "full black screen".
    // Also avoid Modifier.weight inside ModalDrawerSheet — some devices get bad height constraints
    // and the menu list collapses to empty (black panel, no labels).
    val screenWidthDp = LocalConfiguration.current.screenWidthDp
    val drawerWidth = (screenWidthDp * 0.72f).roundToInt().coerceIn(260, 300).dp
    val drawerShape = RoundedCornerShape(topEnd = 20.dp, bottomEnd = 20.dp)

    ModalDrawerSheet(
        modifier = modifier
            .width(drawerWidth)
            .fillMaxHeight()
            .clip(drawerShape)
            .border(1.dp, Amber.copy(alpha = 0.28f), drawerShape),
        drawerShape = drawerShape,
        drawerContainerColor = SurfaceLift,
        drawerContentColor = InkPrimary
    ) {
        // No weight(): scroll the whole sheet so items always lay out.
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight()
                .background(Brush.verticalGradient(listOf(SurfaceLift, SurfaceCard)))
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
                    text = "FREE FIRE SENSITIVITY",
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

            DrawerItem(
                label = "Home",
                icon = Icons.Outlined.Home,
                selected = selectedRoute == "home"
            ) { onAction(AppDrawerAction.HOME) }
            DrawerItem(
                label = "Scratch Cards",
                icon = Icons.Outlined.Style,
                selected = selectedRoute == "scratch_cards"
            ) { onAction(AppDrawerAction.SCRATCH_CARDS) }
            DrawerItem(
                label = "Coin Shop",
                icon = Icons.Outlined.ShoppingBag,
                selected = selectedRoute == "coin_shop"
            ) { onAction(AppDrawerAction.COIN_SHOP) }
            Spacer(modifier = Modifier.height(8.dp))
            Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(Hairline))
            Spacer(modifier = Modifier.height(8.dp))
            DrawerItem("Rate App", Icons.Outlined.StarRate, selected = false) {
                onAction(AppDrawerAction.RATE_APP)
            }
            DrawerItem("Share App", Icons.Outlined.Share, selected = false) {
                onAction(AppDrawerAction.SHARE_APP)
            }
            DrawerItem("Our Website", Icons.Outlined.Language, selected = false) {
                onAction(AppDrawerAction.WEBSITE)
            }
            DrawerItem("Privacy Policy", Icons.Outlined.Policy, selected = false) {
                onAction(AppDrawerAction.PRIVACY)
            }
            DrawerItem(
                label = "Contact Us",
                icon = Icons.Outlined.Mail,
                selected = selectedRoute == "contact"
            ) { onAction(AppDrawerAction.CONTACT_US) }
            DrawerItem(
                label = "About",
                icon = Icons.Outlined.Info,
                selected = selectedRoute == "about"
            ) { onAction(AppDrawerAction.ABOUT) }

            Spacer(modifier = Modifier.height(20.dp))
            val versionNumber = if (appVersion.startsWith("v", ignoreCase = true)) {
                appVersion.removePrefix("v").removePrefix("V")
            } else {
                appVersion
            }
            Text(
                text = "Version $versionNumber",
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
