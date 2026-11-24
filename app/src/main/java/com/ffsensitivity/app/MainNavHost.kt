package com.ffsensitivity.app

import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.ffsensitivity.app.data.UserSessionStore
import com.ffsensitivity.app.presentation.screens.AboutScreen
import com.ffsensitivity.app.presentation.screens.ContactScreen
import com.ffsensitivity.app.presentation.screens.HomeScreen
import com.ffsensitivity.app.presentation.screens.PushInboxScreen
import com.ffsensitivity.app.presentation.screens.RedeemCommentsScreen
import com.ffsensitivity.app.presentation.screens.RedeemScreen
import com.ffsensitivity.app.presentation.screens.StylishNameScreen
import com.ffsensitivity.app.presentation.screens.login.LoginScreen
import com.ffsensitivity.app.push.PushDeepLinkBus
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.SafeOps
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

@Composable
internal fun MainNavHost(
    navController: NavHostController,
    startDestination: String,
    padding: PaddingValues,
    appVersion: String,
    activity: ComponentActivity,
    sessionStore: UserSessionStore,
    onSignedIn: () -> Unit,
    onSessionExpired: () -> Unit,
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
                    navController.navigatePushDeepLink(
                        route = route,
                        accessToken = sessionStore.accessToken()
                    )
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
            var lastLoginBackAtMs by remember { mutableLongStateOf(0L) }
            BackHandler {
                // Mid-session auth (e.g. Share Community) → pop back.
                // Cold-start login root → confirm before exit.
                if (navController.popBackStack()) return@BackHandler
                val now = System.currentTimeMillis()
                if (now - lastLoginBackAtMs <= 2_000L) {
                    activity.finish()
                } else {
                    lastLoginBackAtMs = now
                    SafeOps.toast(activity, "Press back again to exit FF Sensitivity")
                }
            }
            LoginScreen(
                initialMessage = if (com.ffsensitivity.app.data.remote.SessionExpiry.wasForced()) {
                    com.ffsensitivity.app.data.remote.SessionExpiry.LOGIN_MESSAGE
                } else {
                    null
                },
                onContinueWithGoogle = { google, session ->
                    runCatching {
                        sessionStore.signInLocal(
                            displayName = session.displayName.ifBlank { google.displayName },
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
                        // Must not block Main — was freezing login spinner while
                        // signedIn flip could flash the bottom bar early.
                        withContext(Dispatchers.IO) {
                            com.ffsensitivity.app.data.remote.EconomyRepository.refreshWallet(context)
                        }
                        // --- End: Economy live wire (Sachin) ---
                        // --- Start: Push live wire (Sachin) ---
                        Thread {
                            com.ffsensitivity.app.data.remote.PushRepository.registerAndSync(context)
                        }.start()
                        // --- End: Push live wire (Sachin) ---
                        navController.navigate("home") {
                            popUpTo("login") { inclusive = true }
                            launchSingleTop = true
                        }
                        onSignedIn()
                    }.onFailure {
                        AppLog.e("Local sign-in failed", it)
                        SafeOps.toast(context, "Could not sign in")
                    }
                }
            )
        }
        composable("home") {
            DoubleBackToExitHandler(activity)
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
                        navController.navigatePushDeepLink(
                            route = route,
                            accessToken = sessionStore.accessToken()
                        )
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
                                // Classic path — never use Premium engines here.
                                com.ffsensitivity.app.data.AppSession.clearPremiumSensitivity()
                                navController.navigate(
                                    "device_fetch/" + feature.id
                                )
                                true
                            }.getOrElse {
                                AppLog.e("Open feature failed", it)
                                false
                            }
                        }
                        "sensi_pro" -> {
                            runCatching {
                                navController.navigate("sensi_pro") {
                                    launchSingleTop = true
                                }
                                true
                            }.getOrElse {
                                AppLog.e("Open sensi pro unlock failed", it)
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
        profileDestination(navController, padding)
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
        composable("push_inbox") {
            PushInboxScreen(
                contentPadding = padding,
                onBack = {
                    runCatching {
                        navController.popBackStack()
                        true
                    }.getOrElse {
                        AppLog.e("Push inbox back failed", it)
                        false
                    }
                },
                onOpenDeepLink = { deepLink ->
                    val route =
                        com.ffsensitivity.app.data.remote.PushRepository.routeForDeepLink(deepLink)
                    if (route == null) {
                        SafeOps.toast(context, "Link unavailable")
                        return@PushInboxScreen false
                    }
                    if (route == "push_inbox") {
                        return@PushInboxScreen true
                    }
                    if (!com.ffsensitivity.app.data.remote.AppConfigRepository.routeAllowed(route)) {
                        SafeOps.toast(context, "That screen is temporarily unavailable")
                        return@PushInboxScreen false
                    }
                    runCatching {
                        navController.navigatePushDeepLink(
                            route = route,
                            accessToken = sessionStore.accessToken()
                        )
                        true
                    }.getOrElse {
                        AppLog.e("Push inbox open deep link failed", it)
                        false
                    }
                }
            )
        }
        mainNavToolDestinations(
            navController = navController,
            padding = padding,
            onSessionExpired = onSessionExpired,
            goHome = goHome
        )
    }
}
