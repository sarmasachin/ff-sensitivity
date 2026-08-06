package com.ffsensitivity.app.presentation.screens

import androidx.activity.compose.BackHandler
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.AppSession
import com.ffsensitivity.app.data.DeviceInfoFetcher
import com.ffsensitivity.app.data.SharedSensiCard
import com.ffsensitivity.app.data.UserSessionStore
import com.ffsensitivity.app.data.remote.ApiException
import com.ffsensitivity.app.data.remote.CommunityRepository
import com.ffsensitivity.app.presentation.components.AtmosphereScaffold
import com.ffsensitivity.app.presentation.components.InlineErrorBanner
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.SafeOps
import com.ffsensitivity.app.util.ShareCardBitmap
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.Locale

private val RANK_OPTIONS = listOf(
    "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Heroic"
)

private val ROLE_OPTIONS = listOf(
    "Rusher", "Sniper", "Entry", "Support", "Mixed"
)

private enum class ShareRetryKind { LOAD_DEVICE, SHARE_CARD, SIGN_IN }

private data class ShareUiError(
    val code: String,
    val title: String,
    val message: String,
    val retryKind: ShareRetryKind? = null
)

@Composable
fun ShareSensitivityScreen(
    contentPadding: PaddingValues,
    onBack: () -> Boolean,
    onRequireSignIn: () -> Boolean = { false }
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var tab by remember { mutableStateOf(ShareTab.SHARE_MINE) }

    var name by remember { mutableStateOf("") }
    var freeFireId by remember { mutableStateOf("") }
    var rank by remember { mutableStateOf<String?>(null) }
    var role by remember { mutableStateOf<String?>(null) }
    var matches by remember { mutableStateOf("") }
    var kills by remember { mutableStateOf("") }
    var headshots by remember { mutableStateOf("") }
    var deviceLabel by remember { mutableStateOf(AppSession.deviceInfo?.deviceLabel.orEmpty()) }
    var deviceMeta by remember { mutableStateOf(deviceMetaFromSession()) }
    var deviceLoading by remember { mutableStateOf(false) }
    var deviceFailed by remember { mutableStateOf(false) }
    var deviceManual by remember { mutableStateOf(false) }

    var general by remember { mutableStateOf("") }
    var redDot by remember { mutableStateOf("") }
    var scope2x by remember { mutableStateOf("") }
    var scope4x by remember { mutableStateOf("") }
    var awm by remember { mutableStateOf("") }
    var freeLook by remember { mutableStateOf("") }
    var sharing by remember { mutableStateOf(false) }
    var actionError by remember { mutableStateOf<ShareUiError?>(null) }

    fun clearError() {
        actionError = null
    }

    fun showError(
        code: String,
        title: String,
        message: String,
        retryKind: ShareRetryKind? = null
    ) {
        actionError = ShareUiError(code, title, message, retryKind)
    }

    fun showBusy() {
        showError(
            code = "SHARE_BUSY",
            title = "Please wait",
            message = "Another action is already in progress. Try again in a moment."
        )
    }

    fun backSafe() {
        if (sharing || deviceLoading) {
            showBusy()
            return
        }
        clearError()
        val ok = runCatching { onBack() }.getOrElse {
            AppLog.e("Share back crashed", it)
            false
        }
        if (!ok) {
            showError(
                code = "SHARE_BACK_FAILED",
                title = "Couldn’t go back",
                message = "Navigation failed. Try again."
            )
        }
    }

    fun goSignIn() {
        clearError()
        val ok = runCatching { onRequireSignIn() }.getOrElse {
            AppLog.e("Share sign-in navigate failed", it)
            false
        }
        if (!ok) {
            showError(
                code = "AUTH_REQUIRED",
                title = "Sign in required",
                message = "Please sign in again to use Community share.",
                retryKind = ShareRetryKind.SIGN_IN
            )
        }
    }

    BackHandler {
        backSafe()
    }

    suspend fun loadDevice(force: Boolean = false) {
        if (!force && deviceLabel.isNotBlank()) return
        if (deviceLoading) return
        deviceLoading = true
        deviceFailed = false
        clearError()
        try {
            val info = withContext(Dispatchers.Default) {
                runCatching { DeviceInfoFetcher.fetch(context) }.getOrElse {
                    AppLog.e("Share device fetch failed", it)
                    null
                }
            }
            if (info != null && info.deviceLabel.isNotBlank()) {
                AppSession.deviceInfo = info
                deviceLabel = info.deviceLabel
                deviceMeta = listOfNotNull(
                    info.ramLabel.takeIf { it.isNotBlank() },
                    info.maxRefreshLabel.takeIf { it.isNotBlank() }
                ).joinToString(" · ")
                deviceFailed = false
                deviceManual = false
            } else {
                deviceFailed = true
                if (deviceLabel.isBlank()) {
                    showError(
                        code = "SHARE_DEVICE_FAILED",
                        title = "Device not detected",
                        message = "Could not detect your phone. Retry or enter the name manually.",
                        retryKind = ShareRetryKind.LOAD_DEVICE
                    )
                }
            }
        } finally {
            deviceLoading = false
        }
    }

    fun shareCard() {
        if (sharing) {
            showBusy()
            return
        }
        clearError()
        if (UserSessionStore(context).accessToken().isBlank()) {
            showError(
                code = "AUTH_REQUIRED",
                title = "Sign in required",
                message = "Please sign in again to share to Community.",
                retryKind = ShareRetryKind.SIGN_IN
            )
            return
        }
        val matchesNum = matches.toIntOrNull()
        val killsNum = kills.toIntOrNull()
        val headshotsNum = headshots.toIntOrNull()
        val effectiveDevice = deviceLabel.trim()
        val ffIdOk = freeFireId.trim().length in 5..15
        val statsOk = isStatValue(matches) && isStatValue(kills) && isStatValue(headshots)
        val canSubmit = name.trim().isNotEmpty() &&
            ffIdOk &&
            rank != null &&
            role != null &&
            statsOk &&
            effectiveDevice.isNotEmpty() &&
            effectiveDevice != "Device unavailable" &&
            listOf(general, redDot, scope2x, scope4x, awm, freeLook).all { isSensiValue(it) }

        if (!canSubmit) {
            showError(
                code = "SHARE_VALIDATION",
                title = "Form incomplete",
                message = missingSubmitHint(
                    name = name,
                    ffIdOk = ffIdOk,
                    rank = rank,
                    role = role,
                    matchesOk = isStatValue(matches),
                    killsOk = isStatValue(kills),
                    headshotsOk = isStatValue(headshots),
                    deviceOk = effectiveDevice.isNotEmpty(),
                    sensiOk = listOf(general, redDot, scope2x, scope4x, awm, freeLook)
                        .all { isSensiValue(it) }
                )
            )
            return
        }

        sharing = true
        scope.launch {
            try {
                val card = SharedSensiCard(
                    id = "mine_${System.currentTimeMillis()}",
                    name = name.trim().take(24),
                    freeFireId = freeFireId.trim(),
                    rank = rank.orEmpty(),
                    role = role.orEmpty(),
                    deviceLabel = effectiveDevice.take(80),
                    deviceMeta = deviceMeta.trim().take(80),
                    matches = matchesNum ?: 0,
                    kills = killsNum ?: 0,
                    headshots = headshotsNum ?: 0,
                    general = general.toInt(),
                    redDot = redDot.toInt(),
                    scope2x = scope2x.toInt(),
                    scope4x = scope4x.toInt(),
                    awm = awm.toInt(),
                    freeLook = freeLook.toInt()
                )

                val nest = withContext(Dispatchers.IO) {
                    CommunityRepository.submit(context, card)
                }
                nest.fold(
                    onSuccess = { submitted ->
                        val shared = runCatching {
                            val bmp = withContext(Dispatchers.Default) {
                                ShareCardBitmap.render(card)
                            }
                            try {
                                val file = withContext(Dispatchers.IO) {
                                    SafeOps.writeSharePng(context, bmp)
                                } ?: return@runCatching false
                                SafeOps.shareImageFile(
                                    context = context,
                                    title = "Share sensitivity card",
                                    file = file,
                                    caption = ShareCardBitmap.captionText(card)
                                )
                            } finally {
                                runCatching { bmp.recycle() }
                            }
                        }.getOrElse {
                            AppLog.e("Share card image failed", it)
                            false
                        }
                        SafeOps.toast(
                            context,
                            if (shared) {
                                "Submitted for review · share sheet opened"
                            } else {
                                submitted.message.ifBlank { "Submitted for review." }
                            }
                        )
                    },
                    onFailure = { err ->
                        AppLog.e("Community submit failed", err)
                        val auth = err is ApiException && err.code == "AUTH_REQUIRED"
                        showError(
                            code = when (err) {
                                is ApiException -> err.code
                                else -> "SHARE_SUBMIT_FAILED"
                            },
                            title = if (auth) "Sign in required" else "Couldn’t submit to Community",
                            message = when (err) {
                                is ApiException -> err.message
                                is java.net.ConnectException,
                                is java.net.SocketTimeoutException,
                                is java.net.UnknownHostException,
                                is java.io.IOException ->
                                    "Can't reach the server. Check your connection and try again."
                                else -> "Submit failed. Try again."
                            },
                            retryKind = if (auth) {
                                ShareRetryKind.SIGN_IN
                            } else {
                                ShareRetryKind.SHARE_CARD
                            }
                        )
                    }
                )
            } finally {
                sharing = false
            }
        }
    }

    fun runRetry(error: ShareUiError) {
        when (error.retryKind) {
            ShareRetryKind.LOAD_DEVICE -> {
                if (deviceLoading) {
                    showBusy()
                    return
                }
                scope.launch { loadDevice(force = true) }
            }
            ShareRetryKind.SHARE_CARD -> shareCard()
            ShareRetryKind.SIGN_IN -> goSignIn()
            null -> Unit
        }
    }

    LaunchedEffect(Unit) {
        loadDevice(force = false)
    }

    val matchesNum = matches.toIntOrNull()
    val killsNum = kills.toIntOrNull()
    val headshotsNum = headshots.toIntOrNull()
    val kdText = when {
        matchesNum != null && matchesNum > 0 && killsNum != null ->
            String.format(Locale.US, "%.2f", killsNum.toDouble() / matchesNum.toDouble())
        else -> "—"
    }

    val effectiveDevice = deviceLabel.trim()
    val ffIdOk = freeFireId.trim().length in 5..15
    val canSubmit = name.trim().isNotEmpty() &&
        ffIdOk &&
        rank != null &&
        role != null &&
        isStatValue(matches) &&
        isStatValue(kills) &&
        isStatValue(headshots) &&
        effectiveDevice.isNotEmpty() &&
        effectiveDevice != "Device unavailable" &&
        listOf(general, redDot, scope2x, scope4x, awm, freeLook).all { isSensiValue(it) }

    val submitHint = remember(
        name, freeFireId, rank, role, matchesNum, killsNum, headshotsNum, effectiveDevice,
        general, redDot, scope2x, scope4x, awm, freeLook, canSubmit
    ) {
        if (canSubmit) null else missingSubmitHint(
            name = name,
            ffIdOk = ffIdOk,
            rank = rank,
            role = role,
            matchesOk = isStatValue(matches),
            killsOk = isStatValue(kills),
            headshotsOk = isStatValue(headshots),
            deviceOk = effectiveDevice.isNotEmpty(),
            sensiOk = listOf(general, redDot, scope2x, scope4x, awm, freeLook).all { isSensiValue(it) }
        )
    }

    AtmosphereScaffold {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(contentPadding)
                .statusBarsPadding()
                .navigationBarsPadding()
        ) {
            ShareTopBar(onBack = { backSafe() })
            Spacer(modifier = Modifier.height(12.dp))

            actionError?.let { err ->
                InlineErrorBanner(
                    title = err.title,
                    message = err.message,
                    onDismiss = { clearError() },
                    retryLabel = when (err.retryKind) {
                        ShareRetryKind.SIGN_IN -> "Sign in"
                        null -> null
                        else -> "Retry"
                    },
                    onRetry = if (err.retryKind != null) {
                        { runRetry(err) }
                    } else {
                        null
                    },
                    modifier = Modifier.padding(horizontal = 20.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            ShareTabRow(
                selected = tab,
                onSelect = {
                    clearError()
                    tab = it
                },
                modifier = Modifier.padding(horizontal = 20.dp)
            )
            Spacer(modifier = Modifier.height(18.dp))

            when (tab) {
                ShareTab.SHARE_MINE -> {
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .verticalScroll(rememberScrollState())
                            .padding(horizontal = 20.dp)
                    ) {
                        LiveProPreviewCard(
                            name = name.ifBlank { "Your Name" },
                            freeFireId = freeFireId.ifBlank { "FF ID" },
                            rank = rank ?: "Rank",
                            role = role ?: "Role",
                            device = effectiveDevice.ifBlank { "Device" },
                            matches = matches.ifBlank { "0" },
                            kills = kills.ifBlank { "0" },
                            headshots = headshots.ifBlank { "0" },
                            kd = kdText
                        )
                        Spacer(modifier = Modifier.height(18.dp))
                        ShareSectionLabel("Player")
                        Spacer(modifier = Modifier.height(8.dp))
                        ShareField(
                            value = name,
                            onValueChange = {
                                clearError()
                                name = it.take(24)
                            },
                            label = "Name",
                            placeholder = "Display name"
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        ShareField(
                            value = freeFireId,
                            onValueChange = {
                                clearError()
                                freeFireId = it.filter(Char::isDigit).take(15)
                            },
                            label = "Free Fire ID",
                            placeholder = "5–15 digits",
                            keyboardType = KeyboardType.Number
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        ShareSectionLabel("Rank")
                        Spacer(modifier = Modifier.height(8.dp))
                        ChipRow(
                            options = RANK_OPTIONS,
                            selected = rank,
                            onSelect = {
                                clearError()
                                rank = it
                            }
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        ShareSectionLabel("Role")
                        Spacer(modifier = Modifier.height(8.dp))
                        ChipRow(
                            options = ROLE_OPTIONS,
                            selected = role,
                            onSelect = {
                                clearError()
                                role = it
                            }
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        ShareSectionLabel("Stats")
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            ShareField(
                                value = matches,
                                onValueChange = {
                                    clearError()
                                    matches = clampStatInput(it)
                                },
                                label = "Matches",
                                placeholder = "0",
                                keyboardType = KeyboardType.Number,
                                modifier = Modifier.weight(1f)
                            )
                            ShareField(
                                value = kills,
                                onValueChange = {
                                    clearError()
                                    kills = clampStatInput(it)
                                },
                                label = "Kills",
                                placeholder = "0",
                                keyboardType = KeyboardType.Number,
                                modifier = Modifier.weight(1f)
                            )
                        }
                        Spacer(modifier = Modifier.height(10.dp))
                        ShareField(
                            value = headshots,
                            onValueChange = {
                                clearError()
                                headshots = clampStatInput(it)
                            },
                            label = "Total Headshots",
                            placeholder = "0",
                            keyboardType = KeyboardType.Number
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        KdBadge(kdText = kdText)

                        Spacer(modifier = Modifier.height(16.dp))
                        ShareSectionLabel("Device")
                        Spacer(modifier = Modifier.height(8.dp))
                        DeviceAutoCard(
                            label = when {
                                deviceLoading -> "Detecting device…"
                                effectiveDevice.isNotEmpty() -> effectiveDevice
                                else -> "Device unavailable"
                            },
                            meta = deviceMeta,
                            showRetry = deviceFailed || (!deviceLoading && effectiveDevice.isEmpty()),
                            onRetry = {
                                if (deviceLoading) {
                                    showBusy()
                                } else {
                                    scope.launch { loadDevice(force = true) }
                                }
                            },
                            onEnterManual = { deviceManual = true }
                        )
                        if (deviceManual || (deviceFailed && effectiveDevice.isEmpty())) {
                            Spacer(modifier = Modifier.height(10.dp))
                            ShareField(
                                value = deviceLabel,
                                onValueChange = {
                                    clearError()
                                    deviceLabel = it.take(40)
                                    deviceManual = true
                                },
                                label = "Device name",
                                placeholder = "e.g. Samsung Galaxy S23"
                            )
                        }

                        Spacer(modifier = Modifier.height(18.dp))
                        ShareSectionLabel("Sensitivity (0–200)")
                        Spacer(modifier = Modifier.height(8.dp))
                        SensiGrid(
                            general = general,
                            redDot = redDot,
                            scope2x = scope2x,
                            scope4x = scope4x,
                            awm = awm,
                            freeLook = freeLook,
                            onGeneral = {
                                clearError()
                                general = clampSensiInput(it)
                            },
                            onRedDot = {
                                clearError()
                                redDot = clampSensiInput(it)
                            },
                            on2x = {
                                clearError()
                                scope2x = clampSensiInput(it)
                            },
                            on4x = {
                                clearError()
                                scope4x = clampSensiInput(it)
                            },
                            onAwm = {
                                clearError()
                                awm = clampSensiInput(it)
                            },
                            onFreeLook = {
                                clearError()
                                freeLook = clampSensiInput(it)
                            }
                        )

                        Spacer(modifier = Modifier.height(24.dp))
                        if (submitHint != null) {
                            Text(
                                text = submitHint,
                                color = InkMuted,
                                fontSize = 12.sp,
                                lineHeight = 16.sp,
                                modifier = Modifier.padding(bottom = 10.dp)
                            )
                        }
                        SubmitProButton(
                            enabled = canSubmit && !deviceLoading && !sharing,
                            label = if (sharing) "Submitting…" else "Submit to Community",
                            onClick = { shareCard() }
                        )
                        Spacer(modifier = Modifier.height(28.dp))
                    }
                }

                ShareTab.COMMUNITY -> {
                    ShareCommunityTab(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp),
                        onRequireSignIn = { goSignIn() }
                    )
                }
            }
        }
    }
}
