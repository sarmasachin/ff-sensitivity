package com.ffsensitivity.app.presentation.screens

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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.PhoneAndroid
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import com.ffsensitivity.app.data.DeviceInfo
import com.ffsensitivity.app.data.DeviceInfoFetcher
import com.ffsensitivity.app.presentation.components.AtmosphereScaffold
import com.ffsensitivity.app.presentation.components.HardwareSectionCard
import com.ffsensitivity.app.presentation.components.InlineErrorBanner
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.AmberSoft
import com.ffsensitivity.app.presentation.theme.Hairline
import com.ffsensitivity.app.presentation.theme.HairlineStrong
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.presentation.theme.Success
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.presentation.theme.SurfaceLift
import com.ffsensitivity.app.presentation.theme.VoidBlack
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

private val AllowedDeviceFeatureIds = setOf("sensi", "hud", "graphics", "dpi")

private enum class DeviceScanRetryKind { RESCAN, CONFIRM }

private data class DeviceScanUiError(
    val code: String,
    val title: String,
    val message: String,
    val retryKind: DeviceScanRetryKind? = null
)

@Composable
fun DeviceFetchScreen(
    featureId: String,
    contentPadding: PaddingValues,
    onBack: () -> Boolean,
    onConfirm: (DeviceInfo) -> Boolean
) {
    val context = LocalContext.current
    var loading by remember { mutableStateOf(true) }
    var info by remember { mutableStateOf<DeviceInfo?>(null) }
    var scanError by remember { mutableStateOf<DeviceScanUiError?>(null) }
    var actionError by remember { mutableStateOf<DeviceScanUiError?>(null) }
    var refreshTick by remember { mutableStateOf(0) }
    var confirming by remember { mutableStateOf(false) }

    val safeFeatureId = remember(featureId) {
        featureId.trim().lowercase().takeIf { it in AllowedDeviceFeatureIds } ?: ""
    }
    val featureInvalid = safeFeatureId.isEmpty()

    val title = when (safeFeatureId) {
        "sensi" -> "Best Sensitivity"
        "hud" -> "Custom HUD"
        "graphics" -> "Graphics Settings"
        "dpi" -> "DPI and Resolution"
        else -> "Device Scan"
    }

    fun clearActionError() {
        actionError = null
    }

    fun showActionError(
        code: String,
        titleText: String,
        message: String,
        retryKind: DeviceScanRetryKind? = null
    ) {
        actionError = DeviceScanUiError(code, titleText, message, retryKind)
    }

    fun showBusy() {
        showActionError(
            code = "DEVICE_SCAN_BUSY",
            titleText = "Please wait",
            message = "A scan or continue action is already in progress."
        )
    }

    fun backSafe() {
        if (loading || confirming) {
            showBusy()
            return
        }
        clearActionError()
        val ok = runCatching { onBack() }.getOrElse {
            AppLog.e("Device fetch back crashed", it)
            false
        }
        if (!ok) {
            showActionError(
                code = "DEVICE_SCAN_BACK_FAILED",
                titleText = "Couldn’t go back",
                message = "Navigation failed. Try again."
            )
        }
    }

    fun rescan() {
        if (loading || confirming) {
            showBusy()
            return
        }
        clearActionError()
        scanError = null
        refreshTick++
    }

    fun confirmSafe(device: DeviceInfo) {
        if (loading || confirming) {
            showBusy()
            return
        }
        clearActionError()
        if (featureInvalid) {
            showActionError(
                code = "DEVICE_SCAN_FEATURE_INVALID",
                titleText = "Tool unavailable",
                message = "This scan target is not valid. Go back and open a tool from Home."
            )
            return
        }
        if (device.deviceLabel.isBlank()) {
            showActionError(
                code = "DEVICE_SCAN_INCOMPLETE",
                titleText = "Incomplete scan",
                message = "Device name is missing. Refresh the scan and try again.",
                retryKind = DeviceScanRetryKind.RESCAN
            )
            return
        }
        confirming = true
        val ok = runCatching { onConfirm(device) }.getOrElse {
            AppLog.e("Device confirm crashed", it)
            false
        }
        confirming = false
        if (!ok) {
            showActionError(
                code = "DEVICE_SCAN_CONFIRM_FAILED",
                titleText = "Couldn’t continue",
                message = "Navigation to the next step failed. Try again.",
                retryKind = DeviceScanRetryKind.CONFIRM
            )
        }
    }

    fun runRetry(error: DeviceScanUiError) {
        when (error.retryKind) {
            DeviceScanRetryKind.RESCAN -> rescan()
            DeviceScanRetryKind.CONFIRM -> info?.let { confirmSafe(it) }
            null -> clearActionError()
        }
    }

    LaunchedEffect(refreshTick, featureInvalid) {
        if (featureInvalid) {
            loading = false
            info = null
            scanError = DeviceScanUiError(
                code = "DEVICE_SCAN_FEATURE_INVALID",
                title = "Tool unavailable",
                message = "This scan link is invalid. Go back to Home and open a tool again."
            )
            return@LaunchedEffect
        }
        loading = true
        scanError = null
        clearActionError()
        val result = withContext(Dispatchers.Default) {
            runCatching { DeviceInfoFetcher.fetch(context) }
        }
        result.onSuccess { device ->
            if (device.deviceLabel.isBlank()) {
                AppLog.w("Device scan returned blank label")
                scanError = DeviceScanUiError(
                    code = "DEVICE_SCAN_INCOMPLETE",
                    title = "Incomplete scan",
                    message = "Hardware read finished but device name was empty. Try again.",
                    retryKind = DeviceScanRetryKind.RESCAN
                )
                info = null
            } else {
                info = device
                scanError = null
            }
            loading = false
        }.onFailure {
            AppLog.e("Device scan failed", it)
            scanError = DeviceScanUiError(
                code = "DEVICE_SCAN_FAILED",
                title = "Scan failed",
                message = it.message?.takeIf { msg -> msg.isNotBlank() }
                    ?: "Could not read device info. Please try again.",
                retryKind = DeviceScanRetryKind.RESCAN
            )
            loading = false
            info = null
        }
    }

    AtmosphereScaffold {
        Column(
            modifier = Modifier.fillMaxSize().padding(contentPadding).statusBarsPadding()
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
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
                    Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back")
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        "DEVICE SCAN",
                        color = Amber,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.6.sp
                    )
                    Text(title, color = InkPrimary, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                }
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(SurfaceLift)
                        .border(1.dp, Hairline, RoundedCornerShape(12.dp))
                        .clickable(enabled = !loading && !confirming && !featureInvalid) {
                            rescan()
                        }
                        .padding(horizontal = 10.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Refresh",
                        color = InkPrimary.copy(alpha = if (loading) 0.5f else 1f),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Icon(
                        Icons.Outlined.Refresh,
                        contentDescription = "Refresh",
                        tint = Amber,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            actionError?.let { err ->
                InlineErrorBanner(
                    title = err.title,
                    message = err.message,
                    onDismiss = { clearActionError() },
                    retryLabel = if (err.retryKind != null) "Retry" else null,
                    onRetry = if (err.retryKind != null) {
                        { runRetry(err) }
                    } else {
                        null
                    },
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                )
            }

            if (!loading && info != null) {
                BatteryHealthTopStrip(
                    verdict = info!!.batteryHealthVerdict,
                    healthLabel = info!!.batteryHealthLabel
                )
            }

            when {
                loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            CircularProgressIndicator(color = Amber)
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                "Reading your phone hardware...",
                                color = InkSecondary,
                                fontSize = 14.sp
                            )
                        }
                    }
                }
                scanError != null -> {
                    val err = scanError!!
                    Box(
                        modifier = Modifier.fillMaxSize().padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            InlineErrorBanner(
                                title = err.title,
                                message = err.message,
                                onDismiss = { scanError = null },
                                retryLabel = if (err.retryKind != null) "Try Again" else null,
                                onRetry = if (err.retryKind != null) {
                                    { runRetry(err) }
                                } else {
                                    null
                                }
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                            if (featureInvalid) {
                                Spacer(modifier = Modifier.height(16.dp))
                                PrimaryButton(text = "Back to Home") { backSafe() }
                            }
                        }
                    }
                }
                info != null -> {
                    val device = info!!
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        item { DeviceHeroCard(device) }
                        item {
                            HardwareSectionCard {
                                InfoRow("Device", device.deviceLabel)
                                InfoRow("Android", device.androidVersion)
                                InfoRow("Network", device.networkTypeLabel)
                                InfoRow("Hardware", device.hardware)
                                InfoRow("Processor Brand", device.processorBrand)
                                InfoRow("Processor Type", device.processorType)
                                InfoRow("Processor Core", device.processorCoreLabel)
                                InfoRow("Primary Clock Speed", device.primaryClockLabel)
                                InfoRow("Secondary Clock Speed", device.secondaryClockLabel)
                                InfoRow("Tertiary Clock Speed", device.tertiaryClockLabel)
                                InfoRow("GPU", device.gpuLabel)
                                InfoRow("GPU Vendor", device.gpuVendor)
                                InfoRow("Graphics API", device.gpuGlesVersion)
                                InfoRow("RAM", device.ramLabel)
                                InfoRow("Storage", device.storageLabel)
                                InfoRow("Device Age", device.deviceAgeLabel)
                            }
                        }
                        item {
                            SectionCard(title = "Display") {
                                InfoRow("Phone Refresh Rate", device.maxRefreshLabel)
                                InfoRow("Active Refresh Rate", device.activeRefreshLabel)
                                InfoRow("Touch Rate", device.touchRateLabel)
                                InfoRow("Phone Resolution", device.maxResolutionLabel)
                                InfoRow("Active Resolution", device.activeResolutionLabel)
                                InfoRow("System DPI (Current)", "${device.densityDpi} DPI")
                                InfoRow("Original DPI (Factory)", "${device.stableDensityDpi} DPI")
                                InfoRow("Smallest Width (Current)", "${device.smallestWidthDp}")
                                InfoRow("Default Smallest Width", "${device.defaultSmallestWidthDp}")
                                InfoRow("Screen Size", device.screenInchesLabel)
                                InfoRow("Aspect Ratio", device.aspectRatioLabel)
                                InfoRow("Display Type", device.displayTypeLabel)
                                InfoRow("HDR Support", device.displayHdrLabel)
                                InfoRow("Color Gamut", device.displayColorGamutLabel)
                                InfoRow("Gaming Mode", device.gamingModeLabel)
                            }
                        }
                        item {
                            SectionCard(title = "Sensors and Games") {
                                InfoRow(
                                    "Gyroscope",
                                    if (device.gyroAvailable) "Available" else "Not found"
                                )
                                GameRow("Free Fire", device.freeFireInstalled)
                                GameRow("Free Fire Max", device.freeFireMaxInstalled)
                            }
                        }
                        item {
                            Spacer(modifier = Modifier.height(4.dp))
                            PrimaryButton(
                                text = if (confirming) "Continuing…" else "Confirm and Continue"
                            ) {
                                confirmSafe(device)
                            }
                            Spacer(modifier = Modifier.height(10.dp))
                            Text(
                                "Next: answer 4 quick playstyle questions, then get your settings.",
                                color = InkMuted,
                                fontSize = 12.sp,
                                lineHeight = 16.sp
                            )
                            Spacer(modifier = Modifier.height(24.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BatteryHealthTopStrip(verdict: String, healthLabel: String) {
    // Show Healthy / Fair / Not Healthy / Unknown — never charging status.
    val subtitle = when {
        healthLabel != "Unknown" -> "Capacity $healthLabel of original"
        else -> "Capacity % not exposed by this device"
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(AmberSoft)
            .border(1.dp, Amber.copy(alpha = 0.35f), RoundedCornerShape(16.dp))
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                "BATTERY HEALTH",
                color = Amber,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.4.sp
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                subtitle,
                color = InkMuted,
                fontSize = 11.sp
            )
        }
        Text(
            verdict,
            color = InkPrimary,
            fontSize = 18.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun DeviceHeroCard(device: DeviceInfo) {
    Row(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp)).background(Brush.linearGradient(listOf(SurfaceLift, SurfaceCard))).border(1.dp, HairlineStrong, RoundedCornerShape(22.dp)).padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(modifier = Modifier.size(52.dp).clip(RoundedCornerShape(16.dp)).background(Amber.copy(alpha = 0.14f)).border(1.dp, Amber.copy(alpha = 0.35f), RoundedCornerShape(16.dp)), contentAlignment = Alignment.Center) {
            Icon(Icons.Outlined.PhoneAndroid, null, tint = Amber, modifier = Modifier.size(26.dp))
        }
        Spacer(modifier = Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(device.deviceLabel, color = InkPrimary, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "${device.networkTypeLabel} · ${device.ramLabel} · Max ${device.maxRefreshLabel}",
                color = InkSecondary,
                fontSize = 12.sp
            )
        }
    }
}

@Composable
private fun SectionCard(title: String, content: @Composable () -> Unit) {
    Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(SurfaceCard).border(1.dp, HairlineStrong, RoundedCornerShape(20.dp)).padding(16.dp)) {
        Text(title, color = Amber, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
        Spacer(modifier = Modifier.height(12.dp))
        content()
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 7.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = InkMuted, fontSize = 13.sp, modifier = Modifier.padding(end = 12.dp))
        Text(value, color = InkPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f), textAlign = TextAlign.End)
    }
    Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(Hairline.copy(alpha = 0.5f)))
}

@Composable
private fun GameRow(name: String, installed: Boolean) {
    val status = if (installed) "Installed" else "Not Installed"
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 7.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(name, color = InkMuted, fontSize = 13.sp, modifier = Modifier.padding(end = 12.dp))
        Text(
            status,
            color = if (installed) Success else InkPrimary,
            fontSize = 13.sp,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.weight(1f),
            textAlign = TextAlign.End
        )
    }
    Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(Hairline.copy(alpha = 0.5f)))
}

@Composable
private fun PrimaryButton(text: String, onClick: () -> Unit) {
    Box(modifier = Modifier.fillMaxWidth().height(52.dp).clip(RoundedCornerShape(16.dp)).background(Amber).clickable(onClick = onClick), contentAlignment = Alignment.Center) {
        Text(text, color = VoidBlack, fontSize = 14.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.4.sp)
    }
}
