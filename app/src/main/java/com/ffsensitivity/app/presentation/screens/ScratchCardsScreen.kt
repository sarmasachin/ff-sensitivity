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
    var entries by remember { mutableStateOf<List<ScratchedCardEntry>>(emptyList()) }
    var loadGeneration by remember { mutableStateOf(0) }
    var actionError by remember { mutableStateOf<ScratchArchiveUiError?>(null) }
    var isBusy by remember { mutableStateOf(false) }
    var listLoadFailed by remember { mutableStateOf(false) }

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

    LaunchedEffect(loadGeneration) {
        listLoadFailed = false
        val result = ScratchHistoryStore.listActive(context)
        result.fold(
            onSuccess = { list ->
                entries = list
                listLoadFailed = false
            },
            onFailure = {
                entries = emptyList()
                listLoadFailed = true
                actionError = ScratchArchiveUiError(
                    code = "SCRATCH_ARCHIVE_LOAD_FAILED",
                    title = "Archive unavailable",
                    message = "Could not load scratched cards on this device. Try again.",
                    retryKind = ScratchArchiveRetryKind.RELOAD
                )
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

@Composable
private fun ScratchArchiveLoadFailedHint() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(SurfaceDeep.copy(alpha = 0.7f))
            .border(1.dp, HairlineStrong, RoundedCornerShape(20.dp))
            .padding(28.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Couldn’t load archive",
            color = InkPrimary,
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "Use Retry above to reload your scratched cards.",
            color = InkMuted,
            fontSize = 13.sp,
            lineHeight = 18.sp
        )
    }
}

@Composable
private fun ScratchCardsTopBar(onBack: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(42.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(SurfaceCard)
                .border(1.dp, HairlineStrong, RoundedCornerShape(12.dp))
                .clickable(onClick = onBack),
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
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "ARCHIVE",
                color = Amber,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.5.sp
            )
            Text(
                text = "Scratch Cards",
                color = InkPrimary,
                fontSize = 20.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun ScratchArchiveHero(count: Int) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(
                Brush.verticalGradient(
                    listOf(
                        Color(0xFF1A2230),
                        SurfaceLift,
                        SurfaceCard
                    )
                )
            )
            .border(1.dp, Amber.copy(alpha = 0.42f), RoundedCornerShape(22.dp))
            .padding(18.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(Brush.radialGradient(listOf(AmberHot, Amber)))
                    .border(1.dp, AmberHot.copy(alpha = 0.7f), RoundedCornerShape(14.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Outlined.AutoAwesome,
                    contentDescription = null,
                    tint = VoidBlack,
                    modifier = Modifier.size(24.dp)
                )
            }
            Spacer(modifier = Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "YOUR WINS",
                    color = Amber,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.4.sp
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = if (count == 0) "No scratches yet" else "$count scratched",
                    color = InkPrimary,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Black
                )
            }
        }
        Spacer(modifier = Modifier.height(14.dp))
        Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(Hairline))
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = "Every scratched reward stays here for 30 days. Older cards auto-remove — new wins appear on top.",
            color = InkSecondary,
            fontSize = 13.sp,
            lineHeight = 18.sp
        )
    }
}

@Composable
private fun EmptyScratchArchive() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(SurfaceDeep.copy(alpha = 0.7f))
            .border(1.dp, HairlineStrong, RoundedCornerShape(20.dp))
            .padding(28.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            Icons.Outlined.Style,
            contentDescription = null,
            tint = Amber.copy(alpha = 0.7f),
            modifier = Modifier.size(36.dp)
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = "No scratched cards",
            color = InkPrimary,
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "Scratch a Daily Challenge reward or Redeem code — wins show up here.",
            color = InkMuted,
            fontSize = 13.sp,
            lineHeight = 18.sp
        )
    }
}

@Composable
private fun ScratchedArchiveCard(
    entry: ScratchedCardEntry,
    onCopyCode: (String) -> Unit
) {
    val daysLeft = entry.daysLeft()
    val dateLabel = remember(entry.scratchedAtMs) {
        runCatching {
            SimpleDateFormat("dd MMM yyyy · HH:mm", Locale.getDefault())
                .format(Date(entry.scratchedAtMs))
        }.getOrElse {
            AppLog.e("Scratch archive date format failed", it)
            "—"
        }
    }
    val isRedeem = entry.kind == ScratchCardKind.REDEEM
    val isShop = entry.kind == ScratchCardKind.SHOP
    val accent = when {
        isRedeem -> AmberHot
        isShop -> Success
        else -> Amber
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(
                Brush.verticalGradient(
                    listOf(
                        Color(0xFF1C2330),
                        SurfaceLift,
                        SurfaceCard
                    )
                )
            )
            .border(1.dp, accent.copy(alpha = 0.4f), RoundedCornerShape(22.dp))
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(46.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(accent.copy(alpha = 0.16f))
                    .border(1.dp, accent.copy(alpha = 0.4f), RoundedCornerShape(14.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = when {
                        isRedeem -> Icons.Outlined.Key
                        isShop -> Icons.Outlined.AutoAwesome
                        else -> Icons.Outlined.MonetizationOn
                    },
                    contentDescription = null,
                    tint = accent,
                    modifier = Modifier.size(22.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = when {
                        isRedeem -> "REDEEM CODE"
                        isShop -> "SHOP TOKEN"
                        else -> "STREAK REWARD"
                    },
                    color = accent,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.2.sp
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = entry.title,
                    color = InkPrimary,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(AmberSoft)
                    .border(1.dp, Amber.copy(alpha = 0.35f), RoundedCornerShape(8.dp))
                    .padding(horizontal = 8.dp, vertical = 5.dp)
            ) {
                Text(
                    text = "YOU WON",
                    color = AmberHot,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 0.8.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(14.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(VoidBlack.copy(alpha = 0.45f))
                .border(1.dp, Hairline, RoundedCornerShape(16.dp))
                .padding(14.dp)
        ) {
            Column {
                Text(
                    text = entry.rewardLabel,
                    color = AmberHot,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Black
                )
                if (!entry.badge.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Badge · ${entry.badge}",
                        color = Success,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                if (!entry.code.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = entry.code,
                        color = InkPrimary,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                } else if (entry.detail.isNotBlank() && entry.detail != entry.rewardLabel) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = entry.detail,
                        color = InkSecondary,
                        fontSize = 12.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }

        if (!entry.code.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(12.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(Brush.horizontalGradient(listOf(Amber, AmberHot)))
                    .clickable { onCopyCode(entry.code) }
                    .padding(vertical = 12.dp),
                contentAlignment = Alignment.Center
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Outlined.ContentCopy,
                        contentDescription = null,
                        tint = VoidBlack,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "COPY CODE",
                        color = VoidBlack,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 0.7.sp
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))
        Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(Hairline))
        Spacer(modifier = Modifier.height(10.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = dateLabel,
                color = InkMuted,
                fontSize = 11.sp
            )
            Text(
                text = if (daysLeft <= 1) "Expires today" else "$daysLeft days left",
                color = if (daysLeft <= 3) AmberHot else InkSecondary,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}
