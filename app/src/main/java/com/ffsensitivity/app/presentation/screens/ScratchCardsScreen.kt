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
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.Key
import androidx.compose.material.icons.outlined.MonetizationOn
import androidx.compose.material.icons.outlined.Style
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.ScratchCardKind
import com.ffsensitivity.app.data.ScratchHistoryStore
import com.ffsensitivity.app.data.ScratchedCardEntry
import com.ffsensitivity.app.data.remote.RedeemRepository
import com.ffsensitivity.app.data.remote.ScratchEligibility
import com.ffsensitivity.app.data.remote.ScratchRepository
import com.ffsensitivity.app.data.remote.ScratchRollResult
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
import com.ffsensitivity.app.presentation.theme.Success
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.presentation.theme.SurfaceDeep
import com.ffsensitivity.app.presentation.theme.SurfaceLift
import com.ffsensitivity.app.presentation.theme.VoidBlack
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.SafeOps
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import androidx.compose.runtime.rememberCoroutineScope

private enum class ScratchArchiveRetryKind { RELOAD, COPY }

private data class ScratchArchiveUiError(
    val code: String,
    val title: String,
    val message: String,
    val retryKind: ScratchArchiveRetryKind? = null,
    val copyCode: String? = null
)

@Composable
fun ScratchCardsScreen(
    contentPadding: PaddingValues,
    onBack: () -> Boolean
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var entries by remember { mutableStateOf<List<ScratchedCardEntry>>(emptyList()) }
    var loadGeneration by remember { mutableStateOf(0) }
    var actionError by remember { mutableStateOf<ScratchArchiveUiError?>(null) }
    var isBusy by remember { mutableStateOf(false) }
    var listLoadFailed by remember { mutableStateOf(false) }
    var eligibility by remember { mutableStateOf<ScratchEligibility?>(null) }
    var lastRoll by remember { mutableStateOf<ScratchRollResult?>(null) }

    fun clearError() {
        actionError = null
    }

    fun showError(
        code: String,
        title: String,
        message: String,
        retryKind: ScratchArchiveRetryKind? = null,
        copyCode: String? = null
    ) {
        actionError = ScratchArchiveUiError(code, title, message, retryKind, copyCode)
    }

    fun showBusy() {
        showError(
            code = "SCRATCH_ARCHIVE_BUSY",
            title = "Please wait",
            message = "Another action is already in progress. Try again in a moment."
        )
    }

    fun reloadArchive() {
        clearError()
        loadGeneration += 1
    }

    fun backSafe() {
        if (isBusy) {
            showBusy()
            return
        }
        clearError()
        val ok = runCatching { onBack() }.getOrElse {
            AppLog.e("Scratch archive back crashed", it)
            false
        }
        if (!ok) {
            showError(
                code = "SCRATCH_ARCHIVE_BACK_FAILED",
                title = "Couldn’t go back",
                message = "Navigation failed. Try again."
            )
        }
    }

    fun copyCode(code: String) {
        if (isBusy) {
            showBusy()
            return
        }
        clearError()
        if (code.isBlank()) {
            showError(
                code = "SCRATCH_ARCHIVE_CODE_INVALID",
                title = "No code to copy",
                message = "This card does not have a copyable code."
            )
            return
        }
        isBusy = true
        val ok = runCatching {
            SafeOps.copyText(context, "scratch_archive_code", code)
        }.getOrElse {
            AppLog.e("Scratch archive copy failed", it)
            false
        }
        isBusy = false
        if (ok) {
            SafeOps.toast(context, "Code Copied Successfully!")
        } else {
            showError(
                code = "SCRATCH_ARCHIVE_COPY_FAILED",
                title = "Copy failed",
                message = "Could not copy this code to the clipboard. Try again.",
                retryKind = ScratchArchiveRetryKind.COPY,
                copyCode = code
            )
        }
    }

    fun runRetry(error: ScratchArchiveUiError) {
        when (error.retryKind) {
            ScratchArchiveRetryKind.RELOAD -> reloadArchive()
            ScratchArchiveRetryKind.COPY -> error.copyCode?.let { copyCode(it) }
            null -> Unit
        }
    }

    fun rollDaily() {
        if (isBusy) {
            showBusy()
            return
        }
        clearError()
        isBusy = true
        scope.launch {
            val result = withContext(Dispatchers.IO) {
                ScratchRepository.rollDaily(context)
            }
            isBusy = false
            result.fold(
                onSuccess = { roll ->
                    lastRoll = roll
                    eligibility = com.ffsensitivity.app.data.remote.ScratchConfigCache.config?.eligibility
                    reloadArchive()
                    SafeOps.toast(context, roll.rewardLabel.ifBlank { "Scratch revealed!" })
                },
                onFailure = {
                    AppLog.e("Daily scratch roll failed", it)
                    val msg = (it as? com.ffsensitivity.app.data.remote.ApiException)?.message
                        ?: "Scratch roll failed. Try again."
                    showError("SCRATCH_ROLL_FAILED", "Scratch failed", msg)
                }
            )
        }
    }

    LaunchedEffect(Unit) {
        withContext(Dispatchers.IO) {
            ScratchRepository.syncConfig(context)
        }.onSuccess {
            eligibility = it.eligibility
        }
    }

    LaunchedEffect(loadGeneration) {
        listLoadFailed = false
        val localResult = withContext(Dispatchers.IO) {
            ScratchHistoryStore.listActive(context)
        }
        val serverClaims = withContext(Dispatchers.IO) {
            RedeemRepository.myClaims(context).getOrElse { emptyList() }
        }
        localResult.fold(
            onSuccess = { local ->
                val nonRedeem = local.filter { it.kind != ScratchCardKind.REDEEM }
                val fromServer = serverClaims.map { row ->
                    ScratchedCardEntry(
                        id = "redeem_${row.redeemCodeId}",
                        kind = ScratchCardKind.REDEEM,
                        title = row.title,
                        detail = row.valueLabel.ifBlank { row.whenLabel },
                        rewardLabel = row.valueLabel.ifBlank { "Redeem claim" },
                        code = row.code.ifBlank { row.codeMasked },
                        scratchedAtMs = row.createdAtMs
                    )
                }
                entries = (fromServer + nonRedeem).sortedByDescending { it.scratchedAtMs }
                listLoadFailed = false
            },
            onFailure = {
                if (serverClaims.isNotEmpty()) {
                    entries = serverClaims.map { row ->
                        ScratchedCardEntry(
                            id = "redeem_${row.redeemCodeId}",
                            kind = ScratchCardKind.REDEEM,
                            title = row.title,
                            detail = row.valueLabel.ifBlank { row.whenLabel },
                            rewardLabel = row.valueLabel.ifBlank { "Redeem claim" },
                            code = row.code.ifBlank { row.codeMasked },
                            scratchedAtMs = row.createdAtMs
                        )
                    }
                    listLoadFailed = false
                } else {
                    entries = emptyList()
                    listLoadFailed = true
                    actionError = ScratchArchiveUiError(
                        code = "SCRATCH_ARCHIVE_LOAD_FAILED",
                        title = "Archive unavailable",
                        message = "Could not load scratched cards. Try again.",
                        retryKind = ScratchArchiveRetryKind.RELOAD
                    )
                }
            }
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
            ScratchCardsTopBar(onBack = { backSafe() })
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                actionError?.let { err ->
                    item(key = "scratch_archive_error_${err.code}_$loadGeneration") {
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
                }
                item {
                    ScratchArchiveHero(count = entries.size)
                }
                item {
                    DailyScratchBanner(
                        eligibility = eligibility,
                        busy = isBusy,
                        onRoll = { rollDaily() }
                    )
                }
                lastRoll?.let { roll ->
                    item(key = "daily_roll_${roll.title}_${roll.coinDelta}") {
                        DailyScratchResultCard(
                            title = roll.title,
                            rewardLabel = roll.rewardLabel,
                            code = roll.code
                        )
                    }
                }
                when {
                    listLoadFailed && entries.isEmpty() -> {
                        item { ScratchArchiveLoadFailedHint() }
                    }
                    entries.isEmpty() -> {
                        item { EmptyScratchArchive() }
                    }
                    else -> {
                        items(entries, key = { it.id }) { entry ->
                            ScratchedArchiveCard(
                                entry = entry,
                                onCopyCode = { code -> copyCode(code) }
                            )
                        }
                    }
                }
                item { Spacer(modifier = Modifier.height(20.dp)) }
            }
        }
    }
}
