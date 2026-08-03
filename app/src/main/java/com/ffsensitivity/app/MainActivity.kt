package com.ffsensitivity.app

import android.graphics.Color as AndroidColor
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CardGiftcard
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.TextFields
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.ffsensitivity.app.data.AppLinks
import com.ffsensitivity.app.data.AppSession
import com.ffsensitivity.app.data.DeviceInfo
import com.ffsensitivity.app.data.WizardAnswers
import com.ffsensitivity.app.engine.DpiResult
import com.ffsensitivity.app.engine.FullSettingsResult
import com.ffsensitivity.app.engine.SettingsEngine
import com.ffsensitivity.app.presentation.components.AppDrawerAction
import com.ffsensitivity.app.presentation.components.AppDrawerContent
import com.ffsensitivity.app.presentation.components.ErrorStateScreen
import com.ffsensitivity.app.presentation.screens.AboutScreen
import com.ffsensitivity.app.presentation.screens.CoinShopScreen
import com.ffsensitivity.app.presentation.screens.CompareSensitivityScreen
import com.ffsensitivity.app.presentation.screens.ContactScreen
import com.ffsensitivity.app.presentation.screens.DailyChallengeScreen
import com.ffsensitivity.app.presentation.screens.DeviceFetchScreen
import com.ffsensitivity.app.presentation.screens.DpiResultScreen
import com.ffsensitivity.app.presentation.screens.HomeScreen
import com.ffsensitivity.app.presentation.screens.RedeemCommentsScreen
import com.ffsensitivity.app.presentation.screens.RedeemScreen
import com.ffsensitivity.app.presentation.screens.ResultsScreen
import com.ffsensitivity.app.presentation.screens.ScratchCardsScreen
import com.ffsensitivity.app.presentation.screens.ShareSensitivityScreen
import com.ffsensitivity.app.presentation.screens.StylishNameScreen
import com.ffsensitivity.app.presentation.screens.WizardScreen
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.FFSensitivityTheme
import com.ffsensitivity.app.presentation.theme.Hairline
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.SurfaceDeep
import com.ffsensitivity.app.presentation.theme.VoidBlack
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.SafeOps
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Dark chrome → light status/nav icons (clock, battery stay visible outdoors/indoors).
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(AndroidColor.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(AndroidColor.TRANSPARENT)
        )
        setContent {
            FFSensitivityTheme {
                val navController = rememberNavController()
                val backStack by navController.currentBackStackEntryAsState()
                val route = backStack?.destination?.route ?: "home"
                val showBottomBar = route == "home" || route == "redeem" || route == "stylish"
                val drawerState = rememberDrawerState(DrawerValue.Closed)
                val scope = rememberCoroutineScope()
                val context = LocalContext.current
                val appVersion = remember {
                    runCatching {
                        packageManager.getPackageInfo(packageName, 0).versionName
                    }.getOrNull().orEmpty().ifBlank { BuildConfig.VERSION_NAME }
                }

                fun goHome() {
                    runCatching {
                        navController.navigate("home") {
                            popUpTo("home") { inclusive = true }
                            launchSingleTop = true
                        }
                    }.onFailure { AppLog.e("Navigate home failed", it) }
                }

                fun openMenu() {
                    scope.launch {
                        runCatching { drawerState.open() }
                            .onFailure { AppLog.e("Open drawer failed", it) }
                    }
                }

                fun closeMenu() {
                    scope.launch {
                        runCatching { drawerState.close() }
                            .onFailure { AppLog.e("Close drawer failed", it) }
                    }
                }

                fun handleDrawerAction(action: AppDrawerAction) {
                    closeMenu()
                    when (action) {
                        AppDrawerAction.HOME -> goHome()
                        AppDrawerAction.DAILY_CHALLENGE -> {
                            runCatching {
                                navController.navigate("daily_challenge") {
                                    launchSingleTop = true
                                }
                            }.onFailure {
                                AppLog.e("Open daily challenge failed", it)
                                SafeOps.toast(context, "Could not open Daily Challenge")
                            }
                        }
                        AppDrawerAction.REDEEM -> {
                            runCatching {
                                navController.navigate("redeem") {
                                    popUpTo("home") { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }.onFailure {
                                AppLog.e("Open redeem failed", it)
                                SafeOps.toast(context, "Could not open Redeem")
                            }
                        }
                        AppDrawerAction.STYLISH -> {
                            runCatching {
                                navController.navigate("stylish") {
                                    popUpTo("home") { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }.onFailure {
                                AppLog.e("Open stylish failed", it)
                                SafeOps.toast(context, "Could not open Stylish Names")
                            }
                        }
                        AppDrawerAction.SCRATCH_CARDS -> {
                            runCatching {
                                navController.navigate("scratch_cards") {
                                    launchSingleTop = true
                                }
                            }.onFailure {
                                AppLog.e("Open scratch cards failed", it)
                                SafeOps.toast(context, "Could not open Scratch Cards")
                            }
                        }
                        AppDrawerAction.COIN_SHOP -> {
                            runCatching {
                                navController.navigate("coin_shop") {
                                    launchSingleTop = true
                                }
                            }.onFailure {
                                AppLog.e("Open coin shop failed", it)
                                SafeOps.toast(context, "Could not open Coin Shop")
                            }
                        }
                        AppDrawerAction.RATE_APP -> {
                            runCatching {
                                val ok = SafeOps.openUrl(context, AppLinks.PLAY_STORE)
                                if (!ok) SafeOps.toast(context, "Could not open Play Store")
                            }.onFailure {
                                AppLog.e("Rate app failed", it)
                                SafeOps.toast(context, "Could not open Play Store")
                            }
                        }
                        AppDrawerAction.SHARE_APP -> {
                            runCatching {
                                val ok = SafeOps.shareText(
                                    context,
                                    "Share FF Sensitivity",
                                    "Get pro Free Fire sensitivity tools:\n${AppLinks.PLAY_STORE}"
                                )
                                if (!ok) SafeOps.toast(context, "Could not share app")
                            }.onFailure {
                                AppLog.e("Share app failed", it)
                                SafeOps.toast(context, "Could not share app")
                            }
                        }
                        AppDrawerAction.WEBSITE -> {
                            runCatching {
                                val ok = SafeOps.openUrl(context, AppLinks.WEBSITE)
                                if (!ok) SafeOps.toast(context, "Could not open website")
                            }.onFailure {
                                AppLog.e("Open website failed", it)
                                SafeOps.toast(context, "Could not open website")
                            }
                        }
                        AppDrawerAction.PRIVACY -> {
                            runCatching {
                                val ok = SafeOps.openUrl(context, AppLinks.PRIVACY_POLICY)
                                if (!ok) SafeOps.toast(context, "Could not open Privacy Policy")
                            }.onFailure {
                                AppLog.e("Open privacy failed", it)
                                SafeOps.toast(context, "Could not open Privacy Policy")
                            }
                        }
                        AppDrawerAction.CONTACT_US -> {
                            runCatching {
                                navController.navigate("contact") {
                                    launchSingleTop = true
                                }
                            }.onFailure {
                                AppLog.e("Open contact failed", it)
                                SafeOps.toast(context, "Could not open Contact Us")
                            }
                        }
                        AppDrawerAction.ABOUT -> {
                            runCatching {
                                navController.navigate("about") {
                                    launchSingleTop = true
                                }
                            }.onFailure {
                                AppLog.e("Open about failed", it)
                                SafeOps.toast(context, "Could not open About")
                            }
                        }
                    }
                }

                ModalNavigationDrawer(
                    drawerState = drawerState,
                    gesturesEnabled = showBottomBar,
                    // Light enough that home peeks on the right; heavy scrim + dark drawer = "all black".
                    scrimColor = Color.Black.copy(alpha = 0.28f),
                    drawerContent = {
                        AppDrawerContent(
                            appVersion = appVersion,
                            selectedRoute = route.substringBefore('/'),
                            onAction = { handleDrawerAction(it) }
                        )
                    }
                ) {
                    Scaffold(
                        modifier = Modifier.fillMaxSize(),
                        containerColor = VoidBlack,
                        contentWindowInsets = WindowInsets(0, 0, 0, 0),
                        bottomBar = {
                            if (showBottomBar) {
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
                                        val items = listOf(
                                            Triple("home", "Home", Icons.Outlined.Home),
                                            Triple("redeem", "Redeem", Icons.Outlined.CardGiftcard),
                                            Triple("stylish", "Stylish", Icons.Outlined.TextFields)
                                        )
                                        items.forEach { (path, label, icon) ->
                                            val selected = route == path
                                            NavigationBarItem(
                                                selected = selected,
                                                alwaysShowLabel = true,
                                                onClick = {
                                                    if (route != path) {
                                                        runCatching {
                                                            navController.navigate(path) {
                                                                popUpTo("home") { saveState = true }
                                                                launchSingleTop = true
                                                                restoreState = true
                                                            }
                                                        }.onFailure {
                                                            AppLog.e("Bottom nav failed", it)
                                                            SafeOps.toast(
                                                                this@MainActivity,
                                                                "Could not open $label"
                                                            )
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
                        }
                    ) { padding ->
                        NavHost(
                            navController = navController,
                            startDestination = "home"
                        ) {
                            composable("home") {
                                HomeScreen(
                                    contentPadding = padding,
                                    onOpenMenu = {
                                        runCatching {
                                            openMenu()
                                            true
                                        }.getOrElse {
                                            AppLog.e("Open drawer from home failed", it)
                                            false
                                        }
                                    },
                                    onFeatureClick = { feature ->
                                        when (feature.id) {
                                            "share_sensi" -> {
                                                runCatching {
                                                    navController.navigate("share_sensi")
                                                    true
                                                }.getOrElse {
                                                    AppLog.e("Open share sensi failed", it)
                                                    false
                                                }
                                            }
                                            "coin_shop" -> {
                                                runCatching {
                                                    navController.navigate("coin_shop") {
                                                        launchSingleTop = true
                                                    }
                                                    true
                                                }.getOrElse {
                                                    AppLog.e("Open coin shop failed", it)
                                                    false
                                                }
                                            }
                                            "daily_challenge" -> {
                                                runCatching {
                                                    navController.navigate("daily_challenge")
                                                    true
                                                }.getOrElse {
                                                    AppLog.e("Open daily challenge failed", it)
                                                    false
                                                }
                                            }
                                            "sensi", "hud", "graphics", "dpi" -> {
                                                runCatching {
                                                    navController.navigate(
                                                        "device_fetch/" + feature.id
                                                    )
                                                    true
                                                }.getOrElse {
                                                    AppLog.e("Open feature failed", it)
                                                    false
                                                }
                                            }
                                            else -> {
                                                AppLog.w("Home refused unknown feature id=${feature.id}")
                                                false
                                            }
                                        }
                                    }
                                )
                            }
                            composable("redeem") {
                                RedeemScreen(
                                    contentPadding = padding,
                                    onOpenMenu = {
                                        runCatching {
                                            openMenu()
                                            true
                                        }.getOrElse {
                                            AppLog.e("Open drawer from redeem failed", it)
                                            false
                                        }
                                    },
                                    onOpenComments = { itemId ->
                                        if (itemId.isBlank() || itemId.contains('/')) {
                                            AppLog.w("Blocked redeem_comments navigate id=$itemId")
                                            false
                                        } else {
                                            runCatching {
                                                navController.navigate("redeem_comments/$itemId")
                                                true
                                            }.getOrElse {
                                                AppLog.e("Open redeem comments failed", it)
                                                false
                                            }
                                        }
                                    }
                                )
                            }
                            composable(
                                route = "redeem_comments/{itemId}",
                                arguments = listOf(
                                    navArgument("itemId") { type = NavType.StringType }
                                )
                            ) { entry ->
                                val itemId = entry.arguments?.getString("itemId").orEmpty()
                                RedeemCommentsScreen(
                                    itemId = itemId,
                                    contentPadding = padding,
                                    onBack = {
                                        runCatching {
                                            navController.popBackStack()
                                            true
                                        }.getOrElse {
                                            AppLog.e("Redeem comments back failed", it)
                                            false
                                        }
                                    }
                                )
                            }
                            composable("stylish") {
                                StylishNameScreen(
                                    contentPadding = padding,
                                    onOpenMenu = {
                                        runCatching {
                                            openMenu()
                                            true
                                        }.getOrElse {
                                            AppLog.e("Open drawer from stylish failed", it)
                                            false
                                        }
                                    }
                                )
                            }
                            composable("contact") {
                                ContactScreen(
                                    contentPadding = padding,
                                    appVersion = appVersion,
                                    onBack = {
                                        runCatching {
                                            navController.popBackStack()
                                            true
                                        }.getOrElse {
                                            AppLog.e("Contact back failed", it)
                                            false
                                        }
                                    }
                                )
                            }
                            composable("about") {
                                AboutScreen(
                                    contentPadding = padding,
                                    appVersion = appVersion,
                                    onBack = {
                                        runCatching {
                                            navController.popBackStack()
                                            true
                                        }.getOrElse {
                                            AppLog.e("About back failed", it)
                                            false
                                        }
                                    }
                                )
                            }
                            composable("scratch_cards") {
                                ScratchCardsScreen(
                                    contentPadding = padding,
                                    onBack = {
                                        runCatching {
                                            navController.popBackStack()
                                            true
                                        }.getOrElse {
                                            AppLog.e("Scratch cards back failed", it)
                                            false
                                        }
                                    }
                                )
                            }
                            composable("coin_shop") {
                                CoinShopScreen(
                                    contentPadding = padding,
                                    onBack = {
                                        runCatching {
                                            navController.popBackStack()
                                            true
                                        }.getOrElse {
                                            AppLog.e("Coin shop back failed", it)
                                            false
                                        }
                                    }
                                )
                            }
                            composable("share_sensi") {
                                ShareSensitivityScreen(
                                    contentPadding = padding,
                                    onBack = {
                                        runCatching {
                                            navController.popBackStack()
                                            true
                                        }.getOrElse {
                                            AppLog.e("Share sensi back failed", it)
                                            false
                                        }
                                    }
                                )
                            }
                            composable("daily_challenge") {
                                DailyChallengeScreen(
                                    contentPadding = padding,
                                    onBack = {
                                        runCatching {
                                            navController.popBackStack()
                                            true
                                        }.getOrElse {
                                            AppLog.e("Daily challenge back failed", it)
                                            false
                                        }
                                    }
                                )
                            }
                            composable(
                                route = "device_fetch/{featureId}",
                                arguments = listOf(
                                    navArgument("featureId") { type = NavType.StringType }
                                )
                            ) { entry ->
                                val featureId =
                                    entry.arguments?.getString("featureId") ?: "sensi"
                DeviceFetchScreen(
                                    featureId = featureId,
                                    contentPadding = padding,
                                    onBack = {
                                        runCatching {
                                            navController.popBackStack()
                                            true
                                        }.getOrElse {
                                            AppLog.e("Device fetch back failed", it)
                                            false
                                        }
                                    },
                                    onConfirm = { device ->
                                        runCatching {
                                            AppSession.deviceInfo = device
                                            AppSession.featureId = featureId
                                            if (featureId == "dpi") {
                                                navController.navigate("dpi_result")
                                            } else {
                                                navController.navigate("wizard")
                                            }
                                            true
                                        }.getOrElse {
                                            AppLog.e("Confirm device failed", it)
                                            false
                                        }
                                    }
                                )
                            }
                            composable("wizard") {
                                WizardScreen(
                                    contentPadding = padding,
                                    onBack = {
                                        runCatching {
                                            navController.popBackStack()
                                            true
                                        }.getOrElse {
                                            AppLog.e("Wizard back failed", it)
                                            false
                                        }
                                    },
                                    onCalculate = { answers ->
                                        runCatching {
                                            AppSession.wizardAnswers = answers
                                            navController.navigate("results")
                                            true
                                        }.getOrElse {
                                            AppLog.e("Navigate results failed", it)
                                            false
                                        }
                                    }
                                )
                            }
                            composable("results") {
                                val device = AppSession.deviceInfo
                                val answers = AppSession.wizardAnswers
                                if (device == null || answers == null) {
                                    ErrorStateScreen(
                                        title = "Session expired",
                                        message = "Device scan data is missing. Please start again from Home.",
                                        primaryAction = "Back to Home",
                                        contentPadding = padding,
                                        onPrimary = { goHome() }
                                    )
                                } else {
                                    val calc = remember(device, answers) {
                                        safeCalculateAll(device, answers)
                                    }
                                    calc.fold(
                                        onSuccess = { result ->
                                            ResultsScreen(
                                                featureId = AppSession.featureId,
                                                result = result,
                                                contentPadding = padding,
                                                onBack = {
                                                    runCatching {
                                                        navController.popBackStack()
                                                        true
                                                    }.getOrElse {
                                                        AppLog.e("Results back failed", it)
                                                        false
                                                    }
                                                },
                                                onCompareWithFreeFire = {
                                                    runCatching {
                                                        navController.navigate("compare_sensi") {
                                                            launchSingleTop = true
                                                        }
                                                        true
                                                    }.getOrElse {
                                                        AppLog.e("Open compare failed", it)
                                                        false
                                                    }
                                                }
                                            )
                                        },
                                        onFailure = {
                                            ErrorStateScreen(
                                                title = "Calculation failed",
                                                message = "Could not calculate settings for this device. Please scan again.",
                                                primaryAction = "Back to Home",
                                                contentPadding = padding,
                                                onPrimary = { goHome() },
                                                secondaryAction = "Go back",
                                                onSecondary = {
                                                    runCatching { navController.popBackStack() }
                                                }
                                            )
                                        }
                                    )
                                }
                            }
                            composable("compare_sensi") {
                                val device = AppSession.deviceInfo
                                val answers = AppSession.wizardAnswers
                                if (device == null || answers == null) {
                                    ErrorStateScreen(
                                        title = "Session expired",
                                        message = "Compare needs your calculated settings. Please start again from Home.",
                                        primaryAction = "Back to Home",
                                        contentPadding = padding,
                                        onPrimary = { goHome() }
                                    )
                                } else {
                                    val calc = remember(device, answers) {
                                        safeCalculateAll(device, answers)
                                    }
                                    calc.fold(
                                        onSuccess = { result ->
                                            CompareSensitivityScreen(
                                                result = result,
                                                answers = answers,
                                                contentPadding = padding,
                                                onBack = {
                                                    runCatching {
                                                        navController.popBackStack()
                                                        true
                                                    }.getOrElse {
                                                        AppLog.e("Compare back failed", it)
                                                        false
                                                    }
                                                }
                                            )
                                        },
                                        onFailure = {
                                            ErrorStateScreen(
                                                title = "Compare unavailable",
                                                message = "Could not load suggested sensitivity for compare.",
                                                primaryAction = "Back to Home",
                                                contentPadding = padding,
                                                onPrimary = { goHome() }
                                            )
                                        }
                                    )
                                }
                            }
                            composable("dpi_result") {
                                val device = AppSession.deviceInfo
                                if (device == null) {
                                    ErrorStateScreen(
                                        title = "Session expired",
                                        message = "DPI calculator needs a fresh device scan.",
                                        primaryAction = "Back to Home",
                                        contentPadding = padding,
                                        onPrimary = { goHome() }
                                    )
                                } else {
                                    val calc = remember(device) { safeCalculateDpi(device) }
                                    calc.fold(
                                        onSuccess = { result ->
                                            DpiResultScreen(
                                                result = result,
                                                contentPadding = padding,
                                                onBack = {
                                                    runCatching {
                                                        navController.popBackStack()
                                                        true
                                                    }.getOrElse {
                                                        AppLog.e("DPI result back failed", it)
                                                        false
                                                    }
                                                }
                                            )
                                        },
                                        onFailure = {
                                            ErrorStateScreen(
                                                title = "DPI calculation failed",
                                                message = "Could not calculate safe DPI for this phone. Please scan again.",
                                                primaryAction = "Back to Home",
                                                contentPadding = padding,
                                                onPrimary = { goHome() }
                                            )
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun safeCalculateAll(
    device: DeviceInfo,
    answers: WizardAnswers
): Result<FullSettingsResult> {
    return runCatching { SettingsEngine.calculateAll(device, answers) }
        .onFailure { AppLog.e("SettingsEngine.calculateAll failed", it) }
}

private fun safeCalculateDpi(device: DeviceInfo): Result<DpiResult> {
    return runCatching { SettingsEngine.calculateDpi(device) }
        .onFailure { AppLog.e("SettingsEngine.calculateDpi failed", it) }
}
