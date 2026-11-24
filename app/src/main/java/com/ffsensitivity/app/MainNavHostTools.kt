package com.ffsensitivity.app

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.runtime.remember
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.ffsensitivity.app.data.AppSession
import com.ffsensitivity.app.presentation.components.ErrorStateScreen
import com.ffsensitivity.app.presentation.screens.CoinShopScreen
import com.ffsensitivity.app.presentation.screens.CompareSensitivityScreen
import com.ffsensitivity.app.presentation.screens.DailyChallengeScreen
import com.ffsensitivity.app.presentation.screens.DeviceFetchScreen
import com.ffsensitivity.app.presentation.screens.DpiResultScreen
import com.ffsensitivity.app.presentation.screens.PremiumSensiUnlockScreen
import com.ffsensitivity.app.presentation.screens.ResultsScreen
import com.ffsensitivity.app.presentation.screens.ScratchCardsScreen
import com.ffsensitivity.app.presentation.screens.ShareSensitivityScreen
import com.ffsensitivity.app.presentation.screens.WizardScreen
import com.ffsensitivity.app.util.AppLog

/** Economy + sensitivity-tool routes extracted so MainNavHost stays under 400 lines. */
internal fun NavGraphBuilder.mainNavToolDestinations(
    navController: NavHostController,
    padding: PaddingValues,
    onSessionExpired: () -> Unit,
    goHome: () -> Unit
) {
    composable("sensi_pro") {
        PremiumSensiUnlockScreen(
            contentPadding = padding,
            onBack = {
                runCatching {
                    navController.popBackStack()
                    true
                }.getOrElse {
                    AppLog.e("Premium sensi unlock back failed", it)
                    false
                }
            },
            onBestPremiumUnlocked = {
                runCatching {
                    AppSession.sensitivityEngine =
                        com.ffsensitivity.app.data.SensitivityEngineKind.BEST_PREMIUM
                    AppSession.proMaxCrowdOffsets =
                        com.ffsensitivity.app.data.ProMaxCrowdOffsets()
                    AppSession.oneTapCrowdOffsets =
                        com.ffsensitivity.app.data.ProMaxCrowdOffsets()
                    AppSession.oneTapPersonalPrior =
                        com.ffsensitivity.app.data.ProMaxPersonalPrior()
                    AppSession.proMaxSharePullWeight = null
                    AppSession.oneTapSharePullWeight = null
                    AppSession.featureId = "sensi"
                    navController.navigate("device_fetch/sensi") {
                        launchSingleTop = true
                    }
                    true
                }.getOrElse {
                    AppLog.e("Open Pro sensi flow after unlock failed", it)
                    false
                }
            },
            onPremiumProMaxUnlocked = {
                runCatching {
                    AppSession.sensitivityEngine =
                        com.ffsensitivity.app.data.SensitivityEngineKind.PREMIUM_PRO_MAX
                    // Deep peer match runs on results (needs device + wizard answers).
                    AppSession.proMaxCrowdOffsets =
                        com.ffsensitivity.app.data.ProMaxCrowdOffsets()
                    AppSession.oneTapCrowdOffsets =
                        com.ffsensitivity.app.data.ProMaxCrowdOffsets()
                    AppSession.oneTapPersonalPrior =
                        com.ffsensitivity.app.data.ProMaxPersonalPrior()
                    AppSession.proMaxSharePullWeight = null
                    AppSession.oneTapSharePullWeight = null
                    AppSession.featureId = "sensi"
                    navController.navigate("device_fetch/sensi") {
                        launchSingleTop = true
                    }
                    true
                }.getOrElse {
                    AppLog.e("Open ProMax sensi flow after unlock failed", it)
                    false
                }
            },
            onOneTapPremiumUnlocked = {
                runCatching {
                    AppSession.sensitivityEngine =
                        com.ffsensitivity.app.data.SensitivityEngineKind.ONE_TAP_PREMIUM
                    AppSession.proMaxCrowdOffsets =
                        com.ffsensitivity.app.data.ProMaxCrowdOffsets()
                    // One-Tap Headshot peer bucket loads on results.
                    AppSession.oneTapCrowdOffsets =
                        com.ffsensitivity.app.data.ProMaxCrowdOffsets()
                    AppSession.oneTapPersonalPrior =
                        com.ffsensitivity.app.data.ProMaxPersonalPrior()
                    AppSession.proMaxSharePullWeight = null
                    AppSession.oneTapSharePullWeight = null
                    AppSession.featureId = "sensi"
                    navController.navigate("device_fetch/sensi") {
                        launchSingleTop = true
                    }
                    true
                }.getOrElse {
                    AppLog.e("Open One Tap Premium sensi flow after unlock failed", it)
                    false
                }
            },
            onOpenDailyChallenge = {
                runCatching {
                    if (!com.ffsensitivity.app.data.remote.AppConfigRepository.routeAllowed(
                            "daily_challenge"
                        )
                    ) {
                        return@runCatching false
                    }
                    navController.navigate("daily_challenge") {
                        launchSingleTop = true
                    }
                    true
                }.getOrElse {
                    AppLog.e("Premium unlock → Daily Challenge failed", it)
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
                    onSessionExpired()
                    true
                }.getOrElse {
                    AppLog.e("Coin shop session expired nav failed", it)
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
                    onSessionExpired()
                    true
                }.getOrElse {
                    AppLog.e("Share sensi session expired nav failed", it)
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
                    onSessionExpired()
                    true
                }.getOrElse {
                    AppLog.e("Daily challenge session expired nav failed", it)
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
        } else if (AppSession.sensitivityEngine ==
            com.ffsensitivity.app.data.SensitivityEngineKind.PREMIUM_PRO_MAX
        ) {
            // Only Pro Max uses saved Compare crowd data.
            ProMaxResultsDestination(
                device = device,
                answers = answers,
                padding = padding,
                navController = navController,
                goHome = goHome
            )
        } else if (AppSession.sensitivityEngine ==
            com.ffsensitivity.app.data.SensitivityEngineKind.ONE_TAP_PREMIUM
        ) {
            // One Tap Premium — separate One-Tap Headshot peer bucket.
            OneTapResultsDestination(
                device = device,
                answers = answers,
                padding = padding,
                navController = navController,
                goHome = goHome
            )
        } else {
            // Classic + Best Premium — unchanged (no crowd loader).
            val engineKind = AppSession.sensitivityEngine
            val calc = remember(device, answers, engineKind) {
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
                        },
                        onGoHome = {
                            runCatching {
                                goHome()
                                true
                            }.getOrElse {
                                AppLog.e("Results goHome failed", it)
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
