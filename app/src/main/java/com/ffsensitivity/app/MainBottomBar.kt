package com.ffsensitivity.app

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CardGiftcard
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.TextFields
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.ffsensitivity.app.data.remote.AppConfigRepository
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.Hairline
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.SurfaceDeep
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.SafeOps

@Composable
internal fun MainBottomBar(
    route: String,
    navController: NavHostController,
    context: Context,
    configTick: Int = 0
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .clip(RoundedCornerShape(24.dp))
            .background(SurfaceDeep.copy(alpha = 0.96f))
            .border(1.dp, Hairline, RoundedCornerShape(24.dp))
    ) {
        NavigationBar(
            containerColor = Color.Transparent,
            tonalElevation = 0.dp,
            windowInsets = WindowInsets(0, 0, 0, 0)
        ) {
            val items = remember(configTick) {
                buildList {
                    add(Triple("home", "Home", Icons.Outlined.Home))
                    if (AppConfigRepository.featureOn("redeem") &&
                        AppConfigRepository.navOn("homeRedeem")
                    ) {
                        add(Triple("redeem", "Redeem", Icons.Outlined.CardGiftcard))
                    }
                    if (AppConfigRepository.featureOn("names") &&
                        AppConfigRepository.navOn("homeNames")
                    ) {
                        add(Triple("stylish", "Stylish", Icons.Outlined.TextFields))
                    }
                }
            }
            items.forEach { (path, label, icon) ->
                val selected = route == path
                NavigationBarItem(
                    selected = selected,
                    alwaysShowLabel = true,
                    onClick = {
                        if (route != path) {
                            if (!AppConfigRepository.routeAllowed(path)) {
                                SafeOps.toast(context, "$label is temporarily unavailable")
                                return@NavigationBarItem
                            }
                            runCatching {
                                navController.navigate(path) {
                                    popUpTo("home") { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }.onFailure {
                                AppLog.e("Bottom nav failed", it)
                                SafeOps.toast(context, "Could not open $label")
                            }
                        }
                    },
                    icon = {
                        Icon(
                            icon,
                            contentDescription = label,
                            tint = if (selected) Amber else InkMuted
                        )
                    },
                    label = {
                        Text(
                            text = label,
                            color = if (selected) Amber else InkMuted,
                            fontSize = 11.sp,
                            fontWeight = if (selected) {
                                FontWeight.Bold
                            } else {
                                FontWeight.Medium
                            },
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    },
                    colors = NavigationBarItemDefaults.colors(
                        indicatorColor = Amber.copy(alpha = 0.16f),
                        selectedIconColor = Amber,
                        selectedTextColor = Amber,
                        unselectedIconColor = InkMuted,
                        unselectedTextColor = InkMuted
                    )
                )
            }
        }
    }
}
