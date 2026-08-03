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
import androidx.compose.material.icons.automirrored.outlined.CompareArrows
import androidx.compose.material.icons.outlined.Save
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.CompareFeedback
import com.ffsensitivity.app.data.CompareSensitivityStore
import com.ffsensitivity.app.data.SensitivityCompareEntry
import com.ffsensitivity.app.data.SensitivityValues
import com.ffsensitivity.app.data.WizardAnswers
import com.ffsensitivity.app.engine.FullSettingsResult
import com.ffsensitivity.app.engine.SensitivityResult
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
import com.ffsensitivity.app.presentation.theme.VoidBlack
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.SafeOps

private enum class CompareRetryKind { COMPARE, SAVE }

private data class CompareUiError(
    val code: String,
    val title: String,
    val message: String,
    val retryKind: CompareRetryKind? = null
)

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

@Composable
private fun CompareTopBar(onBack: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(42.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(SurfaceLift)
                .border(1.dp, Hairline, RoundedCornerShape(14.dp))
                .clickable(onClick = onBack),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.AutoMirrored.Outlined.ArrowBack,
                contentDescription = "Back",
                tint = InkPrimary
            )
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "CROSS-CHECK",
                color = Amber,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.8.sp
            )
            Text(
                text = "Compare with Free Fire",
                color = InkPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun SuggestedSummaryCard(suggested: SensitivityValues, deviceLabel: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(SurfaceCard)
            .border(1.dp, HairlineStrong, RoundedCornerShape(18.dp))
            .padding(16.dp)
    ) {
        Text(
            text = "APP SUGGESTION",
            color = Amber,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.4.sp
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(text = deviceLabel, color = InkMuted, fontSize = 12.sp)
        Spacer(modifier = Modifier.height(10.dp))
        Text(
            text = "G ${suggested.general} · RD ${suggested.redDot} · 2x ${suggested.scope2x} · " +
                "4x ${suggested.scope4x} · SN ${suggested.sniper} · FL ${suggested.freeLook} · " +
                "Fire ${suggested.fireButton}",
            color = InkPrimary,
            fontSize = 13.sp,
            lineHeight = 18.sp
        )
    }
}

@Composable
private fun CompareField(label: String, value: String, onChange: (String) -> Unit) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        modifier = Modifier.fillMaxWidth(),
        singleLine = true,
        label = { Text(label) },
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

@Composable
private fun DiffCard(
    suggested: SensitivityValues,
    actual: SensitivityValues,
    diff: SensitivityValues
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(SurfaceCard)
            .border(1.dp, Amber.copy(alpha = 0.35f), RoundedCornerShape(18.dp))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = "COMPARISON RESULT",
            color = Amber,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.4.sp
        )
        DiffHeader()
        DiffRow("General", suggested.general, actual.general, diff.general)
        DiffRow("Red Dot", suggested.redDot, actual.redDot, diff.redDot)
        DiffRow("2x Scope", suggested.scope2x, actual.scope2x, diff.scope2x)
        DiffRow("4x Scope", suggested.scope4x, actual.scope4x, diff.scope4x)
        DiffRow("Sniper", suggested.sniper, actual.sniper, diff.sniper)
        DiffRow("Free Look", suggested.freeLook, actual.freeLook, diff.freeLook)
        DiffRow("Fire Button", suggested.fireButton, actual.fireButton, diff.fireButton)
    }
}

@Composable
private fun DiffHeader() {
    Row(modifier = Modifier.fillMaxWidth()) {
        Text("Setting", color = InkMuted, fontSize = 11.sp, modifier = Modifier.weight(1.2f))
        Text("App", color = InkMuted, fontSize = 11.sp, modifier = Modifier.weight(0.7f), textAlign = TextAlign.End)
        Text("Yours", color = InkMuted, fontSize = 11.sp, modifier = Modifier.weight(0.7f), textAlign = TextAlign.End)
        Text("Diff", color = InkMuted, fontSize = 11.sp, modifier = Modifier.weight(0.7f), textAlign = TextAlign.End)
    }
}

@Composable
private fun DiffRow(label: String, app: Int, yours: Int, diff: Int) {
    val diffColor = when {
        diff == 0 -> Success
        diff > 0 -> AmberHot
        else -> Danger
    }
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, color = InkSecondary, fontSize = 13.sp, modifier = Modifier.weight(1.2f))
        Text("$app", color = InkPrimary, fontSize = 13.sp, modifier = Modifier.weight(0.7f), textAlign = TextAlign.End)
        Text("$yours", color = InkPrimary, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(0.7f), textAlign = TextAlign.End)
        Text(signed(diff), color = diffColor, fontSize = 13.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(0.7f), textAlign = TextAlign.End)
    }
}

@Composable
private fun FeedbackRow(
    selected: CompareFeedback,
    onSelect: (CompareFeedback) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        CompareFeedback.entries.forEach { item ->
            val isOn = selected == item
            val bg by animateColorAsState(
                targetValue = if (isOn) AmberSoft else SurfaceLift,
                label = "fb-bg"
            )
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(14.dp))
                    .background(bg)
                    .border(
                        1.dp,
                        if (isOn) Amber else HairlineStrong,
                        RoundedCornerShape(14.dp)
                    )
                    .clickable { onSelect(item) }
                    .padding(vertical = 12.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = item.label,
                    color = if (isOn) Amber else InkMuted,
                    fontSize = 12.sp,
                    fontWeight = if (isOn) FontWeight.Bold else FontWeight.Medium,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

@Composable
private fun PrimaryAction(
    label: String,
    onClick: () -> Unit,
    enabled: Boolean = true,
    icon: @Composable (() -> Unit)? = null
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(
                if (enabled) Brush.horizontalGradient(listOf(Amber, AmberHot))
                else Brush.horizontalGradient(listOf(SurfaceLift, SurfaceLift))
            )
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (icon != null) {
                icon()
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text(
                text = label,
                color = if (enabled) VoidBlack else InkMuted,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
private fun GhostAction(
    label: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Box(
        modifier = modifier
            .height(44.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(SurfaceLift)
            .border(1.dp, HairlineStrong, RoundedCornerShape(14.dp))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(text = label, color = InkPrimary, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun TipBanner(text: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(AmberSoft)
            .border(1.dp, Amber.copy(alpha = 0.35f), RoundedCornerShape(16.dp))
            .padding(14.dp)
    ) {
        Text(text = text, color = Amber, fontSize = 13.sp, lineHeight = 18.sp)
    }
}

private fun SensitivityResult.toValues(): SensitivityValues = SensitivityValues(
    general = general,
    redDot = redDot,
    scope2x = scope2x,
    scope4x = scope4x,
    sniper = sniper,
    freeLook = freeLook,
    fireButton = fireButton
)

private fun filterDigits(raw: String): String =
    raw.filter { it.isDigit() }.take(3)

private fun parseActual(
    general: String,
    redDot: String,
    scope2x: String,
    scope4x: String,
    sniper: String,
    freeLook: String,
    fireButton: String
): SensitivityValues? {
    fun scope(v: String): Int? = v.toIntOrNull()?.takeIf { it in 0..200 }
    fun fire(v: String): Int? = v.toIntOrNull()?.takeIf { it in 1..100 }
    return SensitivityValues(
        general = scope(general) ?: return null,
        redDot = scope(redDot) ?: return null,
        scope2x = scope(scope2x) ?: return null,
        scope4x = scope(scope4x) ?: return null,
        sniper = scope(sniper) ?: return null,
        freeLook = scope(freeLook) ?: return null,
        fireButton = fire(fireButton) ?: return null
    )
}

private fun signed(v: Int): String = if (v > 0) "+$v" else "$v"

private fun insightText(generalDiff: Int, feedback: CompareFeedback): String {
    val base = when {
        generalDiff == 0 -> "General matches exactly — solid baseline."
        generalDiff > 0 -> "You keep General ${signed(generalDiff)} faster than the app."
        else -> "You keep General ${signed(generalDiff)} slower than the app."
    }
    val feel = when (feedback) {
        CompareFeedback.TOO_SLOW -> " Feel tag: Too slow."
        CompareFeedback.TOO_FAST -> " Feel tag: Too fast."
        CompareFeedback.PERFECT -> " Feel tag: Perfect."
    }
    return base + feel + " Saved to local history for offset learning."
}
