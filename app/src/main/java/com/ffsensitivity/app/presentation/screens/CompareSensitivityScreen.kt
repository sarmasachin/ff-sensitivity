package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.CompareArrows
import androidx.compose.material.icons.outlined.Save
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.CompareFeedback
import com.ffsensitivity.app.data.CompareSensitivityStore
import com.ffsensitivity.app.data.SensitivityCompareEntry
import com.ffsensitivity.app.data.SensitivityValues
import com.ffsensitivity.app.data.WizardAnswers
import com.ffsensitivity.app.engine.FullSettingsResult
import com.ffsensitivity.app.presentation.components.AtmosphereScaffold
import com.ffsensitivity.app.presentation.components.InlineErrorBanner
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.presentation.theme.VoidBlack
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.SafeOps

@Composable
fun CompareSensitivityScreen(
    result: FullSettingsResult,
    answers: WizardAnswers,
    contentPadding: PaddingValues,
    onBack: () -> Boolean
) {
    val context = LocalContext.current
    val suggested = remember(result.sensitivity) { result.sensitivity.toValues() }

    var general by remember { mutableStateOf("") }
    var redDot by remember { mutableStateOf("") }
    var scope2x by remember { mutableStateOf("") }
    var scope4x by remember { mutableStateOf("") }
    var sniper by remember { mutableStateOf("") }
    var freeLook by remember { mutableStateOf("") }
    var fireButton by remember { mutableStateOf("") }

    var compared by remember { mutableStateOf<SensitivityValues?>(null) }
    var feedback by remember { mutableStateOf(CompareFeedback.PERFECT) }
    var saved by remember { mutableStateOf(false) }
    var actionError by remember { mutableStateOf<CompareUiError?>(null) }
    var busy by remember { mutableStateOf(false) }
    var storeVersion by remember { mutableIntStateOf(0) }

    val priorOffset = remember(answers, storeVersion) {
        runCatching {
            CompareSensitivityStore.averageGeneralOffset(
                context,
                answers.fingers.label,
                answers.role.label
            )
        }.getOrElse {
            AppLog.e("Compare priorOffset failed", it)
            null
        }
    }

    fun clearError() {
        actionError = null
    }

    fun showError(
        code: String,
        title: String,
        message: String,
        retryKind: CompareRetryKind? = null
    ) {
        actionError = CompareUiError(code, title, message, retryKind)
    }

    fun showBusy() {
        showError(
            code = "COMPARE_BUSY",
            title = "Please wait",
            message = "Another action is already in progress."
        )
    }

    fun backSafe() {
        if (busy) {
            showBusy()
            return
        }
        clearError()
        val ok = runCatching { onBack() }.getOrElse {
            AppLog.e("Compare back crashed", it)
            false
        }
        if (!ok) {
            showError(
                code = "COMPARE_BACK_FAILED",
                title = "Couldn’t go back",
                message = "Navigation failed. Try again."
            )
        }
    }

    fun fillAppValuesSafe() {
        if (busy) {
            showBusy()
            return
        }
        clearError()
        general = suggested.general.toString()
        redDot = suggested.redDot.toString()
        scope2x = suggested.scope2x.toString()
        scope4x = suggested.scope4x.toString()
        sniper = suggested.sniper.toString()
        freeLook = suggested.freeLook.toString()
        fireButton = suggested.fireButton.toString()
        compared = null
        saved = false
    }

    fun clearFieldsSafe() {
        if (busy) {
            showBusy()
            return
        }
        clearError()
        general = ""
        redDot = ""
        scope2x = ""
        scope4x = ""
        sniper = ""
        freeLook = ""
        fireButton = ""
        compared = null
        saved = false
    }

    fun compareSafe() {
        if (busy) {
            showBusy()
            return
        }
        clearError()
        busy = true
        val parsed = runCatching {
            parseActual(general, redDot, scope2x, scope4x, sniper, freeLook, fireButton)
        }.getOrElse {
            AppLog.e("Compare parse crashed", it)
            null
        }
        busy = false
        if (parsed == null) {
            compared = null
            showError(
                code = "COMPARE_INVALID_INPUT",
                title = "Invalid values",
                message = "Enter all values in a valid range (General–Free Look 0–200, Fire 1–100).",
                retryKind = CompareRetryKind.COMPARE
            )
            return
        }
        compared = parsed
        saved = false
    }

    fun saveSafe(actual: SensitivityValues) {
        if (busy) {
            showBusy()
            return
        }
        if (saved) return
        clearError()
        busy = true
        val ok = runCatching {
            CompareSensitivityStore.save(
                context,
                SensitivityCompareEntry(
                    timestamp = System.currentTimeMillis(),
                    deviceLabel = result.deviceLabel,
                    fingers = answers.fingers.label,
                    role = answers.role.label,
                    dpiPreference = answers.dpiPreference.label,
                    screenGuard = answers.screenGuard.label,
                    suggested = suggested,
                    actual = actual,
                    feedback = feedback
                )
            )
        }.getOrElse {
            AppLog.e("Compare save crashed", it)
            false
        }
        busy = false
        if (ok) {
            saved = true
            storeVersion += 1
            SafeOps.toast(context, "Comparison saved on this device")
        } else {
            showError(
                code = "COMPARE_SAVE_FAILED",
                title = "Save failed",
                message = "Could not save this comparison on the device. Try again.",
                retryKind = CompareRetryKind.SAVE
            )
        }
    }

    fun runRetry(error: CompareUiError) {
        when (error.retryKind) {
            CompareRetryKind.COMPARE -> compareSafe()
            CompareRetryKind.SAVE -> compared?.let { saveSafe(it) } ?: clearError()
            null -> clearError()
        }
    }

    AtmosphereScaffold {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(contentPadding)
                .statusBarsPadding()
                .navigationBarsPadding()
        ) {
            CompareTopBar(onBack = { backSafe() })

            actionError?.let { err ->
                InlineErrorBanner(
                    title = err.title,
                    message = err.message,
                    onDismiss = { clearError() },
                    retryLabel = if (err.retryKind != null) "Retry" else null,
                    onRetry = if (err.retryKind != null) {
                        { runRetry(err) }
                    } else {
                        null
                    },
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp)
                )
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Text(
                        text = "Open Free Fire → Settings → Sensitivity. Enter your current values here, then compare with the app suggestion.",
                        color = InkSecondary,
                        fontSize = 13.sp,
                        lineHeight = 18.sp
                    )
                }

                item {
                    SuggestedSummaryCard(suggested = suggested, deviceLabel = result.deviceLabel)
                }

                if (priorOffset != null) {
                    item {
                        TipBanner(
                            text = "From saved compares, avg General offset is ${signed(priorOffset)}. " +
                                "Positive = you prefer faster than the app; negative = slower."
                        )
                    }
                }

                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        GhostAction(
                            label = "Fill app values",
                            modifier = Modifier.weight(1f),
                            onClick = { fillAppValuesSafe() }
                        )
                        GhostAction(
                            label = "Clear",
                            modifier = Modifier.weight(1f),
                            onClick = { clearFieldsSafe() }
                        )
                    }
                }

                item {
                    CompareField("General (0–200)", general) {
                        general = filterDigits(it)
                        compared = null
                        saved = false
                    }
                }
                item {
                    CompareField("Red Dot (0–200)", redDot) {
                        redDot = filterDigits(it)
                        compared = null
                        saved = false
                    }
                }
                item {
                    CompareField("2x Scope (0–200)", scope2x) {
                        scope2x = filterDigits(it)
                        compared = null
                        saved = false
                    }
                }
                item {
                    CompareField("4x Scope (0–200)", scope4x) {
                        scope4x = filterDigits(it)
                        compared = null
                        saved = false
                    }
                }
                item {
                    CompareField("Sniper (0–200)", sniper) {
                        sniper = filterDigits(it)
                        compared = null
                        saved = false
                    }
                }
                item {
                    CompareField("Free Look (0–200)", freeLook) {
                        freeLook = filterDigits(it)
                        compared = null
                        saved = false
                    }
                }
                item {
                    CompareField("Fire Button (1–100)", fireButton) {
                        fireButton = filterDigits(it)
                        compared = null
                        saved = false
                    }
                }

                item {
                    PrimaryAction(
                        label = "Compare now",
                        icon = {
                            Icon(
                                Icons.AutoMirrored.Outlined.CompareArrows,
                                contentDescription = null,
                                tint = VoidBlack,
                                modifier = Modifier.size(18.dp)
                            )
                        },
                        onClick = { compareSafe() }
                    )
                }

                val actual = compared
                if (actual != null) {
                    val diff = actual.diffAgainst(suggested)
                    item {
                        DiffCard(suggested = suggested, actual = actual, diff = diff)
                    }
                    item {
                        Text(
                            text = "App vs your values — overall feel?",
                            color = InkPrimary,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                    item {
                        FeedbackRow(
                            selected = feedback,
                            onSelect = {
                                feedback = it
                                saved = false
                            }
                        )
                    }
                    item {
                        PrimaryAction(
                            label = if (saved) "Saved ✓" else "Save comparison",
                            icon = {
                                Icon(
                                    Icons.Outlined.Save,
                                    contentDescription = null,
                                    tint = VoidBlack,
                                    modifier = Modifier.size(18.dp)
                                )
                            },
                            enabled = !saved,
                            onClick = { saveSafe(actual) }
                        )
                    }
                    item {
                        TipBanner(insightText(diff.general, feedback))
                    }
                }

                item { Spacer(modifier = Modifier.height(24.dp)) }
            }
        }
    }
}
