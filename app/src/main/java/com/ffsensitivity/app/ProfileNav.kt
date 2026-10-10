package com.ffsensitivity.app

import androidx.compose.foundation.layout.PaddingValues
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.ffsensitivity.app.presentation.screens.ProfileScreen
import com.ffsensitivity.app.util.AppLog

internal fun NavGraphBuilder.profileDestination(
    navController: NavHostController,
    padding: PaddingValues
) {
    composable("profile") {
        ProfileScreen(
            contentPadding = padding,
            onBack = {
                runCatching {
                    navController.popBackStack()
                    true
                }.getOrElse {
                    AppLog.e("Profile back failed", it)
                    false
                }
            }
        )
    }
}
