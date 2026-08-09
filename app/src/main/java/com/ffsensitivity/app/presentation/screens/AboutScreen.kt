package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.AppLinks
import com.ffsensitivity.app.presentation.components.AtmosphereScaffold
import com.ffsensitivity.app.presentation.components.InlineErrorBanner
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.AmberHot
import com.ffsensitivity.app.presentation.theme.HairlineStrong
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.presentation.theme.SurfaceLift
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.SafeOps

private enum class AboutRetryKind { OPEN_WEBSITE, OPEN_PRIVACY }

private data class AboutUiError(
    val code: String,
    val title: String,
    val message: String,
    val retryKind: AboutRetryKind? = null
)

@Composable
fun AboutScreen(
    contentPadding: PaddingValues,
    appVersion: String,
    onBack: () -> Boolean
) {
    val context = LocalContext.current
    var actionError by remember { mutableStateOf<AboutUiError?>(null) }
    var isBusy by remember { mutableStateOf(false) }

    val safeVersion = remember(appVersion) {
        runCatching {
            appVersion.trim().ifBlank { "—" }
        }.getOrElse {
            AppLog.e("About version parse failed", it)
            "—"
        }
    }

    val copy = com.ffsensitivity.app.data.remote.CopyRepository.snapshot()
    // App About is owned by the Android app — not website CMS one-liners.
    val appAbout = remember {
        com.ffsensitivity.app.data.remote.CopyDefaults.bundle().about
    }

    val websiteHost = remember {
        runCatching {
            AppLinks.WEBSITE.removePrefix("https://").removePrefix("http://").ifBlank { AppLinks.WEBSITE }
        }.getOrElse {
            AppLog.e("About website label failed", it)
            "Website"
        }
    }

    val privacyHost = remember {
        runCatching {
            AppLinks.PRIVACY_POLICY
                .removePrefix("https://")
                .removePrefix("http://")
                .ifBlank { AppLinks.PRIVACY_POLICY }
        }.getOrElse {
            AppLog.e("About privacy label failed", it)
            "app.sensitivitysettings.com/privacy"
        }
    }

    fun clearError() {
        actionError = null
    }

    fun showError(
        code: String,
        title: String,
        message: String,
        retryKind: AboutRetryKind? = null
    ) {
        actionError = AboutUiError(code, title, message, retryKind)
    }

    fun showBusy() {
        showError(
            code = "ABOUT_BUSY",
            title = "Please wait",
            message = "Another action is already in progress. Try again in a moment."
        )
    }

    fun backSafe() {
        if (isBusy) {
            showBusy()
            return
        }
        clearError()
        val ok = runCatching { onBack() }.getOrElse {
            AppLog.e("About back crashed", it)
            false
        }
        if (!ok) {
            showError(
                code = "ABOUT_BACK_FAILED",
                title = "Couldn’t go back",
                message = "Navigation failed. Try again."
            )
        }
    }

    fun openLink(url: String, kind: AboutRetryKind, label: String) {
        if (isBusy) {
            showBusy()
            return
        }
        clearError()
        if (url.isBlank() || !(url.startsWith("https://") || url.startsWith("http://"))) {
            showError(
                code = "ABOUT_LINK_INVALID",
                title = "Link unavailable",
                message = "$label link is not configured correctly."
            )
            AppLog.w("About blocked invalid url for $label")
            return
        }
        isBusy = true
        val ok = runCatching { SafeOps.openUrl(context, url) }.getOrElse {
            AppLog.e("About open $label crashed", it)
            false
        }
        isBusy = false
        if (!ok) {
            showError(
                code = when (kind) {
                    AboutRetryKind.OPEN_WEBSITE -> "ABOUT_WEBSITE_FAILED"
                    AboutRetryKind.OPEN_PRIVACY -> "ABOUT_PRIVACY_FAILED"
                },
                title = "Couldn’t open $label",
                message = "No browser available or the link failed. Try again.",
                retryKind = kind
            )
        }
    }

    fun openWebsite() = openLink(AppLinks.WEBSITE, AboutRetryKind.OPEN_WEBSITE, "website")

    fun openPrivacy() = openLink(
        AppLinks.PRIVACY_POLICY,
        AboutRetryKind.OPEN_PRIVACY,
        "Privacy Policy"
    )

    fun runRetry(error: AboutUiError) {
        when (error.retryKind) {
            AboutRetryKind.OPEN_WEBSITE -> openWebsite()
            AboutRetryKind.OPEN_PRIVACY -> openPrivacy()
            null -> Unit
        }
    }

    AtmosphereScaffold {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(contentPadding)
                .statusBarsPadding()
                .navigationBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 12.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(42.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(SurfaceCard)
                        .border(1.dp, HairlineStrong, RoundedCornerShape(12.dp))
                        .clickable(onClick = { backSafe() }),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.AutoMirrored.Outlined.ArrowBack,
                        contentDescription = "Back",
                        tint = InkPrimary,
                        modifier = Modifier.size(20.dp)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = "ABOUT",
                        color = Amber,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.4.sp
                    )
                    Text(
                        text = appAbout.headline,
                        color = InkPrimary,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            actionError?.let { err ->
                Spacer(modifier = Modifier.height(14.dp))
                InlineErrorBanner(
                    title = err.title,
                    message = err.message,
                    onDismiss = { clearError() },
                    retryLabel = if (err.retryKind != null) "Retry" else null,
                    onRetry = if (err.retryKind != null) {
                        { runRetry(err) }
                    } else {
                        null
                    }
                )
            }

            Spacer(modifier = Modifier.height(20.dp))
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .background(Brush.verticalGradient(listOf(SurfaceLift, SurfaceCard)))
                    .border(1.dp, Amber.copy(alpha = 0.35f), RoundedCornerShape(20.dp))
                    .padding(18.dp)
            ) {
                Text(
                    text = "Made for Free Fire players",
                    color = InkPrimary,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = appAbout.blurb,
                    color = InkSecondary,
                    fontSize = 13.sp,
                    lineHeight = 19.sp
                )
                Spacer(modifier = Modifier.height(14.dp))
                Text(
                    text = appAbout.websiteCta,
                    color = InkMuted,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = websiteHost,
                    color = AmberHot,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .clickable(onClick = { openWebsite() })
                        .padding(vertical = 2.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = copy.legal.privacyLabel.ifBlank { "Privacy Policy" },
                    color = InkMuted,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = privacyHost,
                    color = AmberHot,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .clickable(onClick = { openPrivacy() })
                        .padding(vertical = 2.dp)
                )
                Spacer(modifier = Modifier.height(14.dp))
                Text(
                    text = "${appAbout.versionPrefix} $safeVersion",
                    color = InkMuted,
                    fontSize = 12.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}
