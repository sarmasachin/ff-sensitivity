package com.ffsensitivity.app.presentation.screens

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.engine.DpiResult
import com.ffsensitivity.app.presentation.components.AtmosphereScaffold
import com.ffsensitivity.app.presentation.components.InlineErrorBanner
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.AmberHot
import com.ffsensitivity.app.presentation.theme.AmberSoft
import com.ffsensitivity.app.presentation.theme.Danger
import com.ffsensitivity.app.presentation.theme.Hairline
import com.ffsensitivity.app.presentation.theme.HairlineStrong
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.presentation.theme.Success
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.presentation.theme.SurfaceLift
import com.ffsensitivity.app.util.AppLog

private enum class DpiRetryKind { CHECK }

private data class DpiUiError(
    val code: String,
    val title: String,
    val message: String,
    val retryKind: DpiRetryKind? = null
)

@Composable
fun DpiResultScreen(
    result: DpiResult,
    contentPadding: PaddingValues,
    onBack: () -> Boolean
) {
    var customInput by remember { mutableStateOf("") }
    var customStatus by remember { mutableStateOf<CustomDpiStatus?>(null) }
    var actionError by remember { mutableStateOf<DpiUiError?>(null) }
    var busy by remember { mutableStateOf(false) }

    fun clearError() {
        actionError = null
    }

    fun showError(
        code: String,
        title: String,
        message: String,
        retryKind: DpiRetryKind? = null
    ) {
        actionError = DpiUiError(code, title, message, retryKind)
    }

    fun showBusy() {
        showError(
            code = "DPI_BUSY",
            title = "Please wait",
            message = "Another action is already in progress."
        )
    }

    fun evaluateCustomSafe(input: String): CustomDpiStatus? {
        val customValue = runCatching { input.toIntOrNull() }.getOrElse {
            AppLog.e("DPI custom parse crashed", it)
            showError(
                code = "DPI_CHECK_PARSE_FAILED",
                title = "Couldn’t read DPI",
                message = "Custom Smallest Width could not be parsed. Clear and type again.",
                retryKind = DpiRetryKind.CHECK
            )
            return null
        }
        return runCatching { evaluateCustomDpi(customValue, result) }.getOrElse {
            AppLog.e("DPI custom check crashed", it)
            showError(
                code = "DPI_CHECK_FAILED",
                title = "DPI check failed",
                message = "Could not evaluate this Smallest Width. Try again.",
                retryKind = DpiRetryKind.CHECK
            )
            null
        }
    }

    fun applyCustomInput(raw: String) {
        if (busy) {
            showBusy()
            return
        }
        clearError()
        val filtered = runCatching { raw.filter { it.isDigit() }.take(4) }.getOrElse {
            AppLog.e("DPI input filter crashed", it)
            showError(
                code = "DPI_INPUT_FAILED",
                title = "Invalid input",
                message = "Could not update the DPI field. Try typing again."
            )
            return
        }
        customInput = filtered
        customStatus = evaluateCustomSafe(filtered)
    }

    fun backSafe() {
        if (busy) {
            showBusy()
            return
        }
        clearError()
        busy = true
        val ok = runCatching { onBack() }.getOrElse {
            AppLog.e("DPI back crashed", it)
            false
        }
        busy = false
        if (!ok) {
            showError(
                code = "DPI_BACK_FAILED",
                title = "Couldn’t go back",
                message = "Navigation failed. Try again."
            )
        }
    }

    fun runRetry(error: DpiUiError) {
        when (error.retryKind) {
            DpiRetryKind.CHECK -> {
                clearError()
                customStatus = evaluateCustomSafe(customInput)
            }
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
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(SurfaceLift)
                        .border(1.dp, Hairline, RoundedCornerShape(12.dp))
                        .clickable(onClick = { backSafe() }),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.AutoMirrored.Outlined.ArrowBack,
                        contentDescription = "Back",
                        tint = InkPrimary
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = "DPI TOOL",
                        color = Amber,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.6.sp
                    )
                    Text(
                        text = "DPI & Resolution",
                        color = InkPrimary,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

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
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    InfoBlock(
                        title = "Original Phone DPI (Default Smallest Width)",
                        value = "${result.originalDpi}",
                        note = "Detected base — restore to this after gaming"
                    )
                }
                item {
                    InfoBlock(
                        title = "Screen Resolution",
                        value = result.resolutionLabel,
                        note = "${result.ramLabel} · ${result.refreshLabel}"
                    )
                }
                item {
                    InfoBlock(
                        title = "System DPI",
                        value = "Now ${result.currentDensityDpi} / Factory ${result.stableDensityDpi}",
                        note = "Current Smallest Width: ${result.currentSmallestWidthDp}"
                    )
                }
                item {
                    InfoBlock(
                        title = "Safe Max DPI (for this phone)",
                        value = "${result.safeMaxDpi}",
                        note = "Default × multiplier · ${result.safeMultiplierLabel}"
                    )
                }

                item {
                    Text(
                        text = "RECOMMENDED GAMING DPI",
                        color = Amber,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.2.sp
                    )
                }
                item {
                    DpiValueCard(
                        title = "Safe / Balanced",
                        value = "${result.balancedDpi}",
                        note = "Smooth aim · Default + 60",
                        accent = Success
                    )
                }
                item {
                    val extremeNote = if (result.extremeDpi > result.safeMaxDpi) {
                        "Default × 1.3 · exceeds Safe Max ${result.safeMaxDpi} — prefer Safe Max"
                    } else {
                        "Best sensitivity · Default × 1.3"
                    }
                    DpiValueCard(
                        title = "Extreme Headshot",
                        value = "${result.extremeDpi}",
                        note = extremeNote,
                        accent = if (result.extremeDpi > result.safeMaxDpi) AmberHot else Amber
                    )
                }
                item {
                    DpiValueCard(
                        title = "Danger / Max Limit",
                        value = "${result.dangerDpi}",
                        note = "Do NOT Cross! · Default × 1.5",
                        accent = Danger
                    )
                }

                item {
                    Text(
                        text = "CUSTOM DPI CHECKER",
                        color = Amber,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.2.sp
                    )
                }
                item {
                    Text(
                        text = "Type any Smallest Width to check if it is safe for this phone.",
                        color = InkSecondary,
                        fontSize = 13.sp,
                        lineHeight = 18.sp
                    )
                }
                item {
                    OutlinedTextField(
                        value = customInput,
                        onValueChange = { raw -> applyCustomInput(raw) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        label = { Text("Custom Smallest Width") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        shape = RoundedCornerShape(14.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = InkPrimary,
                            unfocusedTextColor = InkPrimary,
                            focusedBorderColor = Amber,
                            unfocusedBorderColor = HairlineStrong,
                            focusedLabelColor = Amber,
                            unfocusedLabelColor = InkMuted,
                            cursorColor = Amber,
                            focusedContainerColor = SurfaceCard,
                            unfocusedContainerColor = SurfaceCard
                        )
                    )
                }
                if (customStatus != null) {
                    item {
                        CustomDpiStatusCard(status = customStatus!!)
                    }
                }

                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(AmberSoft)
                            .border(1.dp, Amber.copy(alpha = 0.35f), RoundedCornerShape(16.dp))
                            .padding(14.dp)
                    ) {
                        Column {
                            Text(
                                text = "HOW TO APPLY",
                                color = Amber,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.1.sp
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Settings → System → Developer Options → Smallest Width",
                                color = InkPrimary,
                                fontSize = 13.sp,
                                lineHeight = 18.sp
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "After gaming, set Smallest Width back to Default (${result.originalDpi}).",
                                color = InkSecondary,
                                fontSize = 12.sp,
                                lineHeight = 16.sp
                            )
                        }
                    }
                }
                item {
                    Text(
                        text = "WARNING: Smallest Width ${result.crashWarningThreshold}+ (Default × 1.6) can crash / black-screen your phone.",
                        color = Danger,
                        fontSize = 12.sp,
                        lineHeight = 16.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                item { Spacer(modifier = Modifier.height(24.dp)) }
            }
        }
    }
}

private data class CustomDpiStatus(
    val title: String,
    val message: String,
    val accent: Color,
    val background: Color
)

private fun evaluateCustomDpi(value: Int?, result: DpiResult): CustomDpiStatus? {
    if (value == null) return null
    return when {
        value < 240 -> CustomDpiStatus(
            title = "Too low",
            message = "Values below 240 are unusual and may break UI layout.",
            accent = AmberHot,
            background = AmberSoft
        )
        value > result.crashWarningThreshold -> CustomDpiStatus(
            title = "WARNING: This DPI can crash your phone!",
            message = "Above Absolute Danger Limit (${result.crashWarningThreshold} = Default × 1.6). Do not use.",
            accent = Danger,
            background = Danger.copy(alpha = 0.14f)
        )
        value > result.dangerDpi -> CustomDpiStatus(
            title = "Danger zone",
            message = "Above Danger / Max Limit (${result.dangerDpi} = Default × 1.5). High crash risk.",
            accent = Danger,
            background = Danger.copy(alpha = 0.14f)
        )
        value > result.safeMaxDpi -> CustomDpiStatus(
            title = "Above Safe Max",
            message = "Above this phone’s Safe Max (${result.safeMaxDpi}). Not recommended for daily use.",
            accent = AmberHot,
            background = AmberSoft
        )
        value == result.originalDpi -> CustomDpiStatus(
            title = "Default · Zero risk",
            message = "This is your original phone DPI.",
            accent = Success,
            background = Success.copy(alpha = 0.12f)
        )
        else -> CustomDpiStatus(
            title = "Within Safe Max",
            message = "At or below Safe Max (${result.safeMaxDpi}) for ${result.safeMultiplierLabel}.",
            accent = Success,
            background = Success.copy(alpha = 0.12f)
        )
    }
}

@Composable
private fun CustomDpiStatusCard(status: CustomDpiStatus) {
    val border by animateColorAsState(targetValue = status.accent.copy(alpha = 0.45f), label = "dpi-border")
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(status.background)
            .border(1.dp, border, RoundedCornerShape(16.dp))
            .padding(14.dp)
    ) {
        Text(
            text = status.title,
            color = status.accent,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = status.message,
            color = InkPrimary,
            fontSize = 13.sp,
            lineHeight = 18.sp
        )
    }
}

@Composable
private fun InfoBlock(title: String, value: String, note: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(SurfaceCard)
            .border(1.dp, HairlineStrong, RoundedCornerShape(18.dp))
            .padding(16.dp)
    ) {
        Text(text = title, color = InkMuted, fontSize = 12.sp)
        Spacer(modifier = Modifier.height(6.dp))
        Text(text = value, color = InkPrimary, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(4.dp))
        Text(text = note, color = InkSecondary, fontSize = 12.sp)
    }
}

@Composable
private fun DpiValueCard(
    title: String,
    value: String,
    note: String,
    accent: Color
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(SurfaceCard)
            .border(1.dp, HairlineStrong, RoundedCornerShape(16.dp))
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(text = title, color = InkPrimary, fontSize = 14.sp, fontWeight = FontWeight.Medium)
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = note, color = accent, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
        }
        Text(text = value, color = InkPrimary, fontSize = 16.sp, fontWeight = FontWeight.Bold)
    }
}
