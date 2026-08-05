package com.ffsensitivity.app

import android.content.Context
import androidx.navigation.NavHostController
import com.ffsensitivity.app.data.AppLinks
import com.ffsensitivity.app.data.remote.AppConfigRepository
import com.ffsensitivity.app.presentation.components.AppDrawerAction
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.SafeOps

internal fun handleDrawerAction(
    action: AppDrawerAction,
    context: Context,
    navController: NavHostController,
    closeMenu: () -> Unit,
    goHome: () -> Unit,
    onSignOutRequest: () -> Unit
) {
    closeMenu()
    when (action) {
        AppDrawerAction.HOME -> goHome()
        AppDrawerAction.DAILY_CHALLENGE -> {
            if (!AppConfigRepository.routeAllowed("daily_challenge")) {
                SafeOps.toast(context, "Daily Challenge is temporarily unavailable")
                return
            }
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
            if (!AppConfigRepository.routeAllowed("redeem")) {
                SafeOps.toast(context, "Redeem is temporarily unavailable")
                return
            }
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
            if (!AppConfigRepository.routeAllowed("stylish")) {
                SafeOps.toast(context, "Stylish Names is temporarily unavailable")
                return
            }
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
            if (!AppConfigRepository.routeAllowed("scratch_cards")) {
                SafeOps.toast(context, "Scratch Cards is temporarily unavailable")
                return
            }
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
            if (!AppConfigRepository.routeAllowed("coin_shop")) {
                SafeOps.toast(context, "Coin Shop is temporarily unavailable")
                return
            }
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
            if (!AppConfigRepository.featureOn("share")) {
                SafeOps.toast(context, "Share is temporarily unavailable")
                return
            }
            runCatching {
                val copy = com.ffsensitivity.app.data.remote.CopyRepository.snapshot()
                val ok = SafeOps.shareText(
                    context,
                    copy.share.sheetTitle.ifBlank { "Share FF Sensitivity" },
                    com.ffsensitivity.app.data.remote.CopyRepository.appShareText()
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
            if (!AppConfigRepository.routeAllowed("contact")) {
                SafeOps.toast(context, "Support is temporarily unavailable")
                return
            }
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
        AppDrawerAction.SIGN_OUT -> {
            onSignOutRequest()
        }
    }
}
