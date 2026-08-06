package com.ffsensitivity.app

import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.ffsensitivity.app.data.AppSession
import com.ffsensitivity.app.data.UserSessionStore
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
import com.ffsensitivity.app.presentation.screens.login.LoginScreen
import com.ffsensitivity.app.push.PushDeepLinkBus
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.SafeOps
import kotlinx.coroutines.delay

@Composable
internal fun MainNavHost(
    navController: NavHostController,
    startDestination: String,
    padding: PaddingValues,
    appVersion: String,
    activity: ComponentActivity,
    sessionStore: UserSessionStore,
    onSignedIn: () -> Unit,
    openMenu: () -> Unit,
    goHome: () -> Unit
) {
    val context = activity
    // --- Start: Push FCM live wire (Sachin) ---
    LaunchedEffect(Unit) {
        while (true) {
            val deep = PushDeepLinkBus.consume()
            if (deep != null) {
                val route =
                    com.ffsensitivity.app.data.remote.PushRepository.routeForDeepLink(deep)
                if (route != null && sessionStore.isSignedIn()) {
                    runCatching {
                        navController.navigate(route) { launchSingleTop = true }
                    }.onFailure { AppLog.e("Push deep link navigate failed", it) }
                }
            }
            delay(400)
        }
    }
    // --- End: Push FCM live wire (Sachin) ---

    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable("login") {
            BackHandler {
                // Mid-session auth (e.g. Share Community) → pop back.
                // Cold-start login root → leave the app.
                if (!navController.popBackStack()) {
                    activity.finish()
                }
            }
            LoginScreen(
                onContinueWithGoogle = { google, session ->
                    runCatching {
                        sessionStore.signInLocal(
                            displayName = google.displayName,
                            email = google.email,
                            idToken = google.idToken,
                            // --- Start: Redeem live wire (Sachin) ---
                            accessToken = session.accessToken,
                            // --- End: Redeem live wire (Sachin) ---
                            // --- Start: Users admin live wire (Sachin) ---
                            userId = session.userId
                            // --- End: Users admin live wire (Sachin) ---
                        )
                        // --- Start: Economy live wire (Sachin) ---
                        com.ffsensitivity.app.data.remote.EconomyRepository.refreshWallet(context)
                        // --- End: Economy live wire (Sachin) ---
                        // --- Start: Push live wire (Sachin) ---
                        Thread {
                            com.ffsensitivity.app.data.remote.PushRepository.registerAndSync(context)
                        }.start()
                        // --- End: Push live wire (Sachin) ---
                        onSignedIn()
                        navController.navigate("home") {
                            popUpTo("login") { inclusive = true }
                            launchSingleTop = true
                        }
                    }.onFailure {
                        AppLog.e("Local sign-in failed", it)
                        SafeOps.toast(context, "Could not sign in")
                    }
                }
            )
        }
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
                onPromoDeepLink = { deepLink ->
                    val route = com.ffsensitivity.app.data.remote.PromoRepository.routeForDeepLink(deepLink)
                        ?: return@HomeScreen false
                    if (!com.ffsensitivity.app.data.remote.AppConfigRepository.routeAllowed(route)) {
                        return@HomeScreen false
                    }
                    runCatching {
                        when (route) {
                            "home" -> {
                                navController.navigate("home") {
                                    launchSingleTop = true
                                }
                            }
                            else -> {
                                navController.navigate(route) {
                                    launchSingleTop = true
                                }
                            }
                        }
                        true
                    }.getOrElse {
                        AppLog.e("Open promo deep link failed route=$route", it)
                        false
                    }
                },
                onFeatureClick = { feature ->
                    if (!com.ffsensitivity.app.data.remote.AppConfigRepository.homeTileVisible(feature.id) &&
                        feature.id in setOf("share_sensi", "coin_shop", "daily_challenge")
                    ) {
                        return@HomeScreen false
                    }
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
                },
                onRequireSignIn = {
                    runCatching {
                        navController.navigate("login") {
                            launchSingleTop = true
                        }
                        true
                    }.getOrElse {
                        AppLog.e("Coin shop open login failed", it)
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
                },
                onRequireSignIn = {
                    runCatching {
                        navController.navigate("login") {
                            launchSingleTop = true
                        }
                        true
                    }.getOrElse {
                        AppLog.e("Share sensi open login failed", it)
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
                },
                onRequireSignIn = {
                    runCatching {
                        navController.navigate("login") {
                            launchSingleTop = true
                        }
                        true
                    }.getOrElse {
                        AppLog.e("Daily challenge open login failed", it)
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
