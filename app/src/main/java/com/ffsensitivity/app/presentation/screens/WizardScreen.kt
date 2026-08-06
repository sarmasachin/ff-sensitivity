package com.ffsensitivity.app.presentation.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.CenterFocusStrong
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.FilterNone
import androidx.compose.material.icons.outlined.GpsFixed
import androidx.compose.material.icons.outlined.Layers
import androidx.compose.material.icons.outlined.PhoneAndroid
import androidx.compose.material.icons.outlined.Route
import androidx.compose.material.icons.outlined.Speed
import androidx.compose.material.icons.outlined.TouchApp
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material3.Icon
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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.AppSession
import com.ffsensitivity.app.data.DpiPreference
import com.ffsensitivity.app.data.FingerCount
import com.ffsensitivity.app.data.PlayerRole
import com.ffsensitivity.app.data.ScreenGuard
import com.ffsensitivity.app.data.WizardAnswers
import com.ffsensitivity.app.presentation.components.AtmosphereScaffold
import com.ffsensitivity.app.presentation.components.InlineErrorBanner
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.AmberHot
import com.ffsensitivity.app.presentation.theme.AmberSoft
import com.ffsensitivity.app.presentation.theme.Hairline
import com.ffsensitivity.app.presentation.theme.HairlineStrong
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.presentation.theme.SurfaceLift
import com.ffsensitivity.app.presentation.theme.VoidBlack
import com.ffsensitivity.app.util.AppLog

private data class WizardStepMeta(
    val eyebrow: String,
    val title: String,
    val question: String,
    val hint: String
)

private enum class WizardRetryKind { CALCULATE }

private data class WizardUiError(
    val code: String,
    val title: String,
    val message: String,
    val retryKind: WizardRetryKind? = null
)

private val wizardSteps = listOf(
    WizardStepMeta(
        eyebrow = "PROFILE 01",
        title = "Finger setup",
        question = "How many fingers do you play with?",
        hint = "This shapes fire-button size and claw layout."
    ),
    WizardStepMeta(
        eyebrow = "PROFILE 02",
        title = "Player role",
        question = "What is your main playstyle?",
        hint = "We tune aim speed and scopes to your role."
    ),
    WizardStepMeta(
        eyebrow = "PROFILE 03",
        title = "DPI preference",
        question = "Do you change DPI in Developer Options?",
        hint = "DPI changes drag speed — we compensate safely."
    ),
    WizardStepMeta(
        eyebrow = "PROFILE 04",
        title = "Screen guard",
        question = "What screen protector do you use?",
        hint = "Matte and glass change touch glide feel."
    )
)

@Composable
fun WizardScreen(
    contentPadding: PaddingValues,
    onBack: () -> Boolean,
    onCalculate: (WizardAnswers) -> Boolean
) {
    var step by remember { mutableIntStateOf(0) }
    var fingers by remember { mutableStateOf<FingerCount?>(null) }
    var role by remember { mutableStateOf<PlayerRole?>(null) }
    var dpiPref by remember { mutableStateOf<DpiPreference?>(null) }
    var guard by remember { mutableStateOf<ScreenGuard?>(null) }
    var actionError by remember { mutableStateOf<WizardUiError?>(null) }
    var submitting by remember { mutableStateOf(false) }

    val safeStep = step.coerceIn(0, wizardSteps.lastIndex)
    val current = wizardSteps[safeStep]
    val canContinue = when (safeStep) {
        0 -> fingers != null
        1 -> role != null
        2 -> dpiPref != null
        3 -> guard != null
        else -> false
    }

    fun clearError() {
        actionError = null
    }

    fun showError(
        code: String,
        title: String,
        message: String,
        retryKind: WizardRetryKind? = null
    ) {
        actionError = WizardUiError(code, title, message, retryKind)
    }

    fun showBusy() {
        showError(
            code = "WIZARD_BUSY",
            title = "Please wait",
            message = "Settings are being prepared. Try again in a moment."
        )
    }

    fun buildAnswers(): WizardAnswers? {
        val f = fingers
        val r = role
        val d = dpiPref
        val g = guard
        if (f == null || r == null || d == null || g == null) return null
        return WizardAnswers(
            fingers = f,
            role = r,
            dpiPreference = d,
            screenGuard = g
        )
    }

    fun submitCalculate() {
        if (submitting) {
            showBusy()
            return
        }
        clearError()
        if (AppSession.deviceInfo == null) {
            showError(
                code = "WIZARD_SESSION_EXPIRED",
                title = "Session expired",
                message = "Device scan data is missing. Go back and scan your device again."
            )
            return
        }
        val answers = buildAnswers()
        if (answers == null) {
            showError(
                code = "WIZARD_INCOMPLETE",
                title = "Answer all questions",
                message = "Please complete every playstyle step before calculating."
            )
            return
        }
        submitting = true
        val ok = runCatching { onCalculate(answers) }.getOrElse {
            AppLog.e("Wizard calculate navigate crashed", it)
            false
        }
        submitting = false
        if (!ok) {
            showError(
                code = "WIZARD_CALCULATE_FAILED",
                title = "Couldn’t open results",
                message = "Navigation failed. Try Calculate again.",
                retryKind = WizardRetryKind.CALCULATE
            )
        }
    }

    fun goBackSafe() {
        if (submitting) {
            showBusy()
            return
        }
        clearError()
        if (safeStep > 0) {
            step = (safeStep - 1).coerceAtLeast(0)
            return
        }
        val ok = runCatching { onBack() }.getOrElse {
            AppLog.e("Wizard back crashed", it)
            false
        }
        if (!ok) {
            showError(
                code = "WIZARD_BACK_FAILED",
                title = "Couldn’t go back",
                message = "Navigation failed. Try again."
            )
        }
    }

    fun continueOrCalculate() {
        if (submitting) {
            showBusy()
            return
        }
        clearError()
        if (!canContinue) {
            showError(
                code = "WIZARD_STEP_REQUIRED",
                title = "Select an option",
                message = "Choose one option on this step to continue."
            )
            return
        }
        if (safeStep < 3) {
            step = (safeStep + 1).coerceAtMost(3)
        } else {
            submitCalculate()
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
            WizardTopBar(
                step = safeStep,
                title = current.title,
                onBack = { goBackSafe() }
            )

            WizardProgress(step = safeStep)

            actionError?.let { err ->
                InlineErrorBanner(
                    title = err.title,
                    message = err.message,
                    onDismiss = { clearError() },
                    retryLabel = if (err.retryKind != null) "Retry" else null,
                    onRetry = if (err.retryKind == WizardRetryKind.CALCULATE) {
                        { submitCalculate() }
                    } else {
                        null
                    },
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp)
            ) {
                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = current.eyebrow,
                    color = Amber,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.8.sp
                )
                Spacer(modifier = Modifier.height(10.dp))

                AnimatedContent(
                    targetState = safeStep,
                    transitionSpec = {
                        if (targetState > initialState) {
                            (slideInHorizontally { it / 5 } + fadeIn(tween(220))) togetherWith
                                (slideOutHorizontally { -it / 5 } + fadeOut(tween(180)))
                        } else {
                            (slideInHorizontally { -it / 5 } + fadeIn(tween(220))) togetherWith
                                (slideOutHorizontally { it / 5 } + fadeOut(tween(180)))
                        }
                    },
                    label = "wizard-step"
                ) { animatedStep ->
                    val s = wizardSteps[animatedStep.coerceIn(0, wizardSteps.lastIndex)]
                    Column {
                        Text(
                            text = s.question,
                            color = InkPrimary,
                            fontSize = 26.sp,
                            fontWeight = FontWeight.SemiBold,
                            lineHeight = 32.sp
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = s.hint,
                            color = InkSecondary,
                            fontSize = 14.sp,
                            lineHeight = 20.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(22.dp))

                AnimatedContent(
                    targetState = safeStep,
                    transitionSpec = {
                        fadeIn(tween(200)) togetherWith fadeOut(tween(140))
                    },
                    label = "wizard-options"
                ) { animatedStep ->
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        when (animatedStep) {
                            0 -> FingerCount.entries.forEach { option ->
                                PremiumChoiceCard(
                                    title = option.label,
                                    subtitle = fingerSubtitle(option),
                                    icon = Icons.Outlined.TouchApp,
                                    selected = fingers == option,
                                    onClick = {
                                        clearError()
                                        fingers = option
                                    }
                                )
                            }
                            1 -> PlayerRole.entries.forEach { option ->
                                PremiumChoiceCard(
                                    title = option.label,
                                    subtitle = roleSubtitle(option),
                                    icon = roleIcon(option),
                                    selected = role == option,
                                    onClick = {
                                        clearError()
                                        role = option
                                    }
                                )
                            }
                            2 -> DpiPreference.entries.forEach { option ->
                                PremiumChoiceCard(
                                    title = option.label,
                                    subtitle = dpiSubtitle(option),
                                    icon = dpiIcon(option),
                                    selected = dpiPref == option,
                                    onClick = {
                                        clearError()
                                        dpiPref = option
                                    }
                                )
                            }
                            3 -> ScreenGuard.entries.forEach { option ->
                                PremiumChoiceCard(
                                    title = option.label,
                                    subtitle = guardSubtitle(option),
                                    icon = guardIcon(option),
                                    selected = guard == option,
                                    onClick = {
                                        clearError()
                                        guard = option
                                    }
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
            }

            WizardBottomCta(
                enabled = canContinue && !submitting,
                label = when {
                    submitting -> "Calculating…"
                    safeStep < 3 -> "Continue"
                    else -> "Calculate Best Settings"
                },
                onClick = { continueOrCalculate() }
            )
        }
    }
}

@Composable
private fun WizardTopBar(
    step: Int,
    title: String,
    onBack: () -> Unit
) {
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
                text = "PLAYSTYLE PROFILE",
                color = Amber,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.8.sp
            )
            Text(
                text = title,
                color = InkPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(999.dp))
                .background(AmberSoft)
                .border(1.dp, Amber.copy(alpha = 0.35f), RoundedCornerShape(999.dp))
                .padding(horizontal = 12.dp, vertical = 7.dp)
        ) {
            Text(
                text = "${step + 1} / 4",
                color = Amber,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
private fun WizardProgress(step: Int) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            repeat(4) { i ->
                val active = i <= step
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(5.dp)
                        .clip(RoundedCornerShape(3.dp))
                        .then(
                            if (i == step) {
                                Modifier.background(
                                    Brush.horizontalGradient(listOf(Amber, AmberHot)),
                                    RoundedCornerShape(3.dp)
                                )
                            } else {
                                Modifier.background(
                                    if (active) Amber else HairlineStrong,
                                    RoundedCornerShape(3.dp)
                                )
                            }
                        )
                )
            }
        }
        Spacer(modifier = Modifier.height(10.dp))
        Text(
            text = "Device locked in · answer 4 quick questions",
            color = InkMuted,
            fontSize = 12.sp
        )
    }
}

@Composable
private fun WizardBottomCta(
    enabled: Boolean,
    label: String,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 14.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
                .clip(RoundedCornerShape(18.dp))
                .background(
                    if (enabled) {
                        Brush.horizontalGradient(listOf(Amber, AmberHot))
                    } else {
                        Brush.horizontalGradient(listOf(SurfaceLift, SurfaceLift))
                    }
                )
                .then(
                    if (enabled) Modifier.clickable(onClick = onClick) else Modifier
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = label,
                color = if (enabled) VoidBlack else InkMuted,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.3.sp
            )
        }
        if (!enabled) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Select an option to continue",
                color = InkMuted,
                fontSize = 12.sp,
                modifier = Modifier.align(Alignment.CenterHorizontally)
            )
        }
    }
}

@Composable
private fun PremiumChoiceCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    selected: Boolean,
    onClick: () -> Unit
) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.98f else 1f,
        animationSpec = tween(120),
        label = "choice-scale"
    )

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .scale(scale)
            .clip(RoundedCornerShape(20.dp))
            .background(
                if (selected) {
                    Brush.linearGradient(listOf(AmberSoft, SurfaceCard))
                } else {
                    Brush.linearGradient(listOf(SurfaceCard, SurfaceCard))
                }
            )
            .border(
                width = if (selected) 1.5.dp else 1.dp,
                color = if (selected) Amber else HairlineStrong,
                shape = RoundedCornerShape(20.dp)
            )
            .clickable(
                interactionSource = interaction,
                indication = null,
                onClick = onClick
            )
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(if (selected) Amber.copy(alpha = 0.18f) else SurfaceLift)
                .border(
                    1.dp,
                    if (selected) Amber.copy(alpha = 0.4f) else Hairline,
                    RoundedCornerShape(14.dp)
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = if (selected) Amber else InkSecondary,
                modifier = Modifier.size(24.dp)
            )
        }
        Spacer(modifier = Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                color = if (selected) AmberHot else InkPrimary,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(3.dp))
            Text(
                text = subtitle,
                color = InkSecondary,
                fontSize = 12.sp,
                lineHeight = 16.sp
            )
        }
        if (selected) {
            Icon(
                imageVector = Icons.Outlined.CheckCircle,
                contentDescription = null,
                tint = Amber,
                modifier = Modifier.size(22.dp)
            )
        } else {
            Box(
                modifier = Modifier
                    .size(22.dp)
                    .clip(CircleShape)
                    .border(1.5.dp, HairlineStrong, CircleShape)
            )
        }
    }
}

private fun roleIcon(option: PlayerRole): ImageVector = when (option) {
    PlayerRole.RUSHER -> Icons.Outlined.Bolt
    PlayerRole.ONE_TAP -> Icons.Outlined.CenterFocusStrong
    PlayerRole.SNIPER -> Icons.Outlined.GpsFixed
    PlayerRole.FLANKER -> Icons.Outlined.Route
}

private fun fingerSubtitle(option: FingerCount): String = when (option) {
    FingerCount.TWO -> "Classic thumbs — simple and stable"
    FingerCount.THREE -> "Claw hybrid — faster peeks and sprays"
    FingerCount.FOUR -> "Full claw — max control for ranked"
    FingerCount.FIVE -> "Advanced claw — high speed and movement"
    FingerCount.SIX -> "Pro claw — elite multi-finger control"
}

private fun roleSubtitle(option: PlayerRole): String = when (option) {
    PlayerRole.RUSHER -> "Close fights, aggressive entries"
    PlayerRole.ONE_TAP -> "Precise headshots and mid-range"
    PlayerRole.SNIPER -> "Long range, scoped tracking"
    PlayerRole.FLANKER -> "Rotations, surprise angles"
}

private fun dpiIcon(option: DpiPreference): ImageVector = when (option) {
    DpiPreference.NONE -> Icons.Outlined.PhoneAndroid
    DpiPreference.MID -> Icons.Outlined.Tune
    DpiPreference.HIGH -> Icons.Outlined.Speed
}

private fun dpiSubtitle(option: DpiPreference): String = when (option) {
    DpiPreference.NONE -> "Stock system DPI — safest default"
    DpiPreference.MID -> "Slightly raised DPI for faster drag"
    DpiPreference.HIGH -> "High DPI — we lower sensi to balance"
}

private fun guardIcon(option: ScreenGuard): ImageVector = when (option) {
    ScreenGuard.MATTE -> Icons.Outlined.Layers
    ScreenGuard.NORMAL -> Icons.Outlined.FilterNone
    ScreenGuard.NONE -> Icons.Outlined.PhoneAndroid
}

private fun guardSubtitle(option: ScreenGuard): String = when (option) {
    ScreenGuard.MATTE -> "More friction — slightly higher sensi help"
    ScreenGuard.NORMAL -> "Standard glass / HD film feel"
    ScreenGuard.NONE -> "Bare glass — smoothest glide"
}
