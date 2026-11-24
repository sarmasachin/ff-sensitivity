package com.ffsensitivity.app

import androidx.navigation.NavHostController
import com.ffsensitivity.app.data.remote.SessionExpiry
import com.ffsensitivity.app.util.AppLog

/** Bottom-bar tab routes that must stay rooted under Home. */
internal val MainTabRoutes = setOf("home", "redeem", "stylish")

/** True when push/tab navigation may call authed APIs (redeem catalog, etc.). */
internal fun hasLiveUserJwt(accessToken: String): Boolean =
    accessToken.isNotBlank() && !SessionExpiry.isJwtExpired(accessToken)

/**
 * Open Home reliably — including after a notification deep link landed on
 * Redeem/Stylish without a normal bottom-nav transition.
 *
 * Prefer popping back to an existing Home entry. If Home is missing from the
 * stack (deep-link edge cases), clear the graph and open a fresh Home.
 */
internal fun NavHostController.navigateToHomeSafe() {
    runCatching {
        if (popBackStack("home", inclusive = false)) return
        navigate("home") {
            popUpTo(0) { inclusive = true }
            launchSingleTop = true
        }
    }.onFailure { AppLog.e("Navigate home failed", it) }
}

/**
 * Bottom-bar / drawer tab navigation rooted at Home (same pattern as
 * Google's bottom-nav samples). Home uses [navigateToHomeSafe] so notification
 * deep links cannot leave Home taps as a no-op.
 */
internal fun NavHostController.navigateMainTab(route: String) {
    if (route == "home") {
        navigateToHomeSafe()
        return
    }
    runCatching {
        navigate(route) {
            popUpTo("home") { saveState = true }
            launchSingleTop = true
            restoreState = true
        }
    }.onFailure { err ->
        // Home missing from stack (notification cold-start edge case).
        AppLog.e("Main tab navigate failed route=$route — recovering via Home root", err)
        runCatching {
            navigate("home") {
                popUpTo(0) { inclusive = true }
                launchSingleTop = true
            }
            if (route != "home") {
                navigate(route) {
                    launchSingleTop = true
                }
            }
        }.onFailure { AppLog.e("Main tab recover failed route=$route", it) }
    }
}

/**
 * Push / inbox deep link → screen. Tab routes are opened like the bottom bar
 * so Home stays on the stack and the Home button keeps working.
 *
 * [accessToken] must be a live JWT for routes that hit authed APIs (e.g. Redeem).
 * Blank/expired tokens trigger login instead of a fake Redeem inventory error.
 */
internal fun NavHostController.navigatePushDeepLink(route: String, accessToken: String) {
    if (!hasLiveUserJwt(accessToken)) {
        AppLog.w("Push deep link blocked — no live JWT route=$route")
        SessionExpiry.notifyExpired()
        return
    }
    if (route in MainTabRoutes) {
        navigateMainTab(route)
        return
    }
    runCatching {
        navigate(route) { launchSingleTop = true }
    }.onFailure { AppLog.e("Push deep link navigate failed route=$route", it) }
}
