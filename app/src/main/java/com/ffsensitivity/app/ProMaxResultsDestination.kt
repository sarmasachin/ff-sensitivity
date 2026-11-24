package com.ffsensitivity.app

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.ffsensitivity.app.data.AppSession
import com.ffsensitivity.app.data.DeviceInfo
import com.ffsensitivity.app.data.ProMaxCrowdOffsetLoader
import com.ffsensitivity.app.data.WizardAnswers
import com.ffsensitivity.app.presentation.components.AtmosphereScaffold
import com.ffsensitivity.app.presentation.components.ErrorStateScreen
import com.ffsensitivity.app.presentation.screens.ResultsScreen
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.util.AppLog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Premium Sensi Pro Max results only: deep peer offsets
 * (model → CPU/GPU → RAM → playstyle → everyone), then [SettingsEngineProMax].
 */
@Composable
internal fun ProMaxResultsDestination(
    device: DeviceInfo,
    answers: WizardAnswers,
    padding: PaddingValues,
    navController: NavHostController,
    goHome: () -> Unit
) {
    val context = LocalContext.current.applicationContext
    var ready by remember(device.deviceLabel, answers.fingers, answers.role) { mutableStateOf(false) }
    var crowdTick by remember { mutableIntStateOf(0) }
    var crowdApplied by remember { mutableStateOf(AppSession.proMaxCrowdOffsets) }

    LaunchedEffect(
        device.deviceLabel,
        device.ramGb,
        device.processorType,
        device.gpuLabel,
        device.maxRefreshRateHz,
        answers.fingers.label,
        answers.role.label,
        answers.dpiPreference.label,
        answers.screenGuard.label
    ) {
        ready = false
        val offsets = withContext(Dispatchers.IO) {
            ProMaxCrowdOffsetLoader.resolve(
                context = context,
                device = device,
                fingers = answers.fingers.label,
                role = answers.role.label,
                dpiPreference = answers.dpiPreference.label,
                screenGuard = answers.screenGuard.label
            )
        }
        AppSession.proMaxCrowdOffsets = offsets
        crowdApplied = offsets
        crowdTick += 1
        ready = true
        AppLog.w(
            "ProMax crowd applied from=${offsets.matchFrom} n=${offsets.matchCount} " +
                "conf=${"%.2f".format(offsets.confidence)} " +
                "share=${offsets.community.source}×${offsets.community.matchCount}" +
                " w=${"%.2f".format(offsets.community.weight)} " +
                "g=${offsets.general} rd=${offsets.redDot} fl=${offsets.freeLook} " +
                "device=${device.deviceLabel} fingers=${answers.fingers.label} role=${answers.role.label}"
        )
    }

    if (!ready) {
        AtmosphereScaffold {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 28.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "PRO MAX",
                        color = Amber,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 2.sp
                    )
                    Text(
                        text = "Matching peers by model, CPU, GPU, RAM…",
                        color = InkSecondary,
                        fontSize = 14.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(top = 10.dp)
                    )
                }
            }
        }
        return
    }

    val calc = remember(device, answers, crowdApplied, crowdTick) {
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
                        AppLog.e("ProMax results back failed", it)
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
                        AppLog.e("ProMax open compare failed", it)
                        false
                    }
                },
                onGoHome = {
                    runCatching {
                        goHome()
                        true
                    }.getOrElse {
                        AppLog.e("ProMax results goHome failed", it)
                        false
                    }
                }
            )
        },
        onFailure = {
            ErrorStateScreen(
                title = "Calculation failed",
                message = "Could not calculate Pro Max settings. Please scan again.",
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
