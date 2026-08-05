package com.ffsensitivity.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color as AndroidColor
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.Scaffold
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.ffsensitivity.app.data.UserSessionStore
import com.ffsensitivity.app.data.remote.AnalyticsRepository
import com.ffsensitivity.app.data.remote.AppConfigRepository
import com.ffsensitivity.app.data.remote.AppRemoteGate
import com.ffsensitivity.app.data.remote.ScreenSessionTracker
import com.ffsensitivity.app.presentation.components.AppDrawerContent
import com.ffsensitivity.app.presentation.components.AppRemoteGateOverlay
import com.ffsensitivity.app.presentation.components.SignOutConfirmDialog
import com.ffsensitivity.app.presentation.theme.FFSensitivityTheme
import com.ffsensitivity.app.presentation.theme.VoidBlack
import com.ffsensitivity.app.push.FfFirebaseMessagingService
import com.ffsensitivity.app.push.PushDeepLinkBus
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.CrashReporting
import com.ffsensitivity.app.util.SafeOps
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    private val screenSessionTracker = ScreenSessionTracker()

    private val requestNotifications = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { /* optional deny — token still registers */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        capturePushDeepLink(intent)
        maybeRequestNotificationPermission()
        // Dark chrome → light status/nav icons (clock, battery stay visible outdoors/indoors).
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(AndroidColor.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(AndroidColor.TRANSPARENT)
        )
        setContent {
            FFSensitivityTheme {
                val navController = rememberNavController()
                val backStack by navController.currentBackStackEntryAsState()
                val drawerState = rememberDrawerState(DrawerValue.Closed)
                val scope = rememberCoroutineScope()
                val context = LocalContext.current
                val sessionStore = remember { UserSessionStore(context) }
                var signedIn by remember { mutableStateOf(sessionStore.isSignedIn()) }
                var showSignOutConfirm by remember { mutableStateOf(false) }
                val startDestination = if (signedIn) "home" else "login"
                val route = backStack?.destination?.route ?: startDestination
                val showBottomBar =
                    route == "home" || route == "redeem" || route == "stylish"
                val versionCode = remember {
                    runCatching {
                        if (Build.VERSION.SDK_INT >= 28) {
                            packageManager.getPackageInfo(packageName, 0).longVersionCode.toInt()
                        } else {
                            @Suppress("DEPRECATION")
                            packageManager.getPackageInfo(packageName, 0).versionCode
                        }
                    }.getOrDefault(1)
                }
                var remoteGate by remember {
                    mutableStateOf<AppRemoteGate>(AppRemoteGate.None)
                }
                var configTick by remember { mutableStateOf(0) }
                val appVersion = remember {
                    runCatching {
                        packageManager.getPackageInfo(packageName, 0).versionName
                    }.getOrNull().orEmpty().ifBlank { BuildConfig.VERSION_NAME }
                }

                LaunchedEffect(Unit) {
                    withContext(Dispatchers.IO) {
                        AnalyticsRepository.trackAnonOpenIfNeeded(context)
                    }
                }

                LaunchedEffect(route, signedIn) {
                    val visit = screenSessionTracker.onScreenChanged(
                        analyticsScreen(route, signedIn)
                    )
                    if (visit != null) {
                        withContext(Dispatchers.IO) {
                            AnalyticsRepository.trackScreenVisit(context, visit)
                        }
                    }
                }

                LaunchedEffect(signedIn) {
                    if (!signedIn) return@LaunchedEffect
                    while (true) {
                        delay(SCREEN_CHECKPOINT_MS)
                        val visit = screenSessionTracker.checkpoint()
                        if (visit != null) {
                            withContext(Dispatchers.IO) {
                                AnalyticsRepository.trackScreenVisit(context, visit)
                            }
                        }
                    }
                }

                LaunchedEffect(signedIn) {
                    CrashReporting.syncUser(context)
                    if (!signedIn) {
                        remoteGate = AppRemoteGate.None
                        return@LaunchedEffect
                    }
                    withContext(Dispatchers.IO) {
                        AppConfigRepository.syncLive()
                        com.ffsensitivity.app.data.remote.CopyRepository.syncLive()
                    }
                    remoteGate = AppConfigRepository.gate(versionCode)
                    configTick += 1
                }

                fun goHome() {
                    runCatching {
                        navController.navigate("home") {
                            popUpTo("home") { inclusive = true }
                            launchSingleTop = true
                        }
                    }.onFailure { AppLog.e("Navigate home failed", it) }
                }

                fun goLogin() {
                    runCatching {
                        navController.navigate("login") {
                            popUpTo(0) { inclusive = true }
                            launchSingleTop = true
                        }
                    }.onFailure { AppLog.e("Navigate login failed", it) }
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

                if (showSignOutConfirm) {
                    SignOutConfirmDialog(
                        onDismiss = { showSignOutConfirm = false },
                        onConfirm = {
                            showSignOutConfirm = false
                            scope.launch {
                                runCatching {
                                    // Keep the local session until Nest revokes the
                                    // JWT, else the old token stays valid for days.
                                    val revoked = withContext(Dispatchers.IO) {
                                        screenSessionTracker.checkpoint()?.let {
                                            AnalyticsRepository.trackScreenVisit(context, it)
                                        }
                                        AnalyticsRepository.revokeSession(context)
                                    }
                                    if (revoked) {
                                        sessionStore.signOut()
                                        CrashReporting.clearUser()
                                        signedIn = false
                                        goLogin()
                                    } else {
                                        SafeOps.toast(
                                            context,
                                            "Could not end session. Check your connection and try again."
                                        )
                                    }
                                }.onFailure {
                                    AppLog.e("Sign out failed", it)
                                    SafeOps.toast(context, "Could not sign out")
                                }
                            }
                        }
                    )
                }

                if (signedIn && remoteGate !is AppRemoteGate.None) {
                    AppRemoteGateOverlay(gate = remoteGate)
                } else {
                ModalNavigationDrawer(
                    drawerState = drawerState,
                    gesturesEnabled = showBottomBar && route != "login",
                    // Light enough that home peeks on the right; heavy scrim + dark drawer = "all black".
                    scrimColor = Color.Black.copy(alpha = 0.28f),
                    drawerContent = {
                        // configTick forces drawer to re-read Nest kill-switches after sync
                        AppDrawerContent(
                            appVersion = appVersion,
                            selectedRoute = route.substringBefore('/'),
                            configTick = configTick,
                            onAction = { action ->
                                handleDrawerAction(
                                    action = action,
                                    context = context,
                                    navController = navController,
                                    closeMenu = { closeMenu() },
                                    goHome = { goHome() },
                                    onSignOutRequest = { showSignOutConfirm = true }
                                )
                            }
                        )
                    }
                ) {
                    Scaffold(
                        modifier = Modifier.fillMaxSize(),
                        containerColor = VoidBlack,
                        contentWindowInsets = WindowInsets(0, 0, 0, 0),
                        bottomBar = {
                            if (showBottomBar) {
                                MainBottomBar(
                                    route = route,
                                    navController = navController,
                                    context = this@MainActivity,
                                    configTick = configTick
                                )
                            }
                        }
                    ) { padding ->
                        MainNavHost(
                            navController = navController,
                            startDestination = startDestination,
                            padding = padding,
                            appVersion = appVersion,
                            activity = this@MainActivity,
                            sessionStore = sessionStore,
                            onSignedIn = { signedIn = true },
                            openMenu = { openMenu() },
                            goHome = { goHome() }
                        )
                    }
                }
                }
            }
        }
    }

    override fun onStart() {
        super.onStart()
        screenSessionTracker.onForeground()
    }

    override fun onStop() {
        screenSessionTracker.onBackground()?.let { visit ->
            lifecycleScope.launch(Dispatchers.IO) {
                AnalyticsRepository.trackScreenVisit(this@MainActivity, visit)
            }
        }
        super.onStop()
    }

    private fun analyticsScreen(route: String, signedIn: Boolean): String? {
        if (!signedIn || route == "login") return null
        val screen = route.substringBefore('/')
        return screen.takeIf { it in ANALYTICS_SCREENS }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        capturePushDeepLink(intent)
    }

    private fun capturePushDeepLink(intent: Intent?) {
        val link = intent?.getStringExtra(FfFirebaseMessagingService.EXTRA_DEEP_LINK)
            ?.trim()
            .orEmpty()
        if (link.isNotEmpty()) {
            PushDeepLinkBus.offer(link)
        }
    }

    private fun maybeRequestNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        val granted = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED
        if (!granted) {
            requestNotifications.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }
}

private val ANALYTICS_SCREENS = setOf(
    "home",
    "redeem",
    "redeem_comments",
    "stylish",
    "contact",
    "about",
    "scratch_cards",
    "coin_shop",
    "share_sensi",
    "daily_challenge",
    "device_fetch",
    "wizard",
    "results",
    "compare_sensi",
    "dpi_result"
)

private const val SCREEN_CHECKPOINT_MS = 5 * 60 * 1_000L
