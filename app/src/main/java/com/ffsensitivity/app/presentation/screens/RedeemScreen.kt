package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.RedeemCadence
import com.ffsensitivity.app.data.RedeemCatalogCache
import com.ffsensitivity.app.data.RedeemCodeItem
import com.ffsensitivity.app.data.RedeemStatus
import com.ffsensitivity.app.data.ScratchHistoryStore
import com.ffsensitivity.app.data.remote.ApiException
import com.ffsensitivity.app.data.remote.RedeemRepository
import com.ffsensitivity.app.presentation.components.AtmosphereScaffold
import com.ffsensitivity.app.presentation.components.AppScreenHeader
import com.ffsensitivity.app.presentation.components.InlineErrorBanner
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.SafeOps
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun RedeemScreen(
    contentPadding: PaddingValues,
    onOpenMenu: () -> Boolean,
    onOpenComments: (String) -> Boolean
) {
    val context = LocalContext.current
    val unlocked = remember { mutableStateMapOf<String, Boolean>() }
    val revealed = remember { mutableStateMapOf<String, Boolean>() }
    val votes = remember { mutableStateMapOf<String, Boolean?>() }
    var scratchTarget by remember { mutableStateOf<RedeemCodeItem?>(null) }
    var actionError by remember { mutableStateOf<RedeemUiError?>(null) }
    var isBusy by remember { mutableStateOf(false) }
    var selectedTab by remember { mutableStateOf(RedeemTab.DAILY) }

    // --- Start: Redeem live wire (Sachin) ---
    var codes by remember { mutableStateOf<List<RedeemCodeItem>>(emptyList()) }
    var catalogLoading by remember { mutableStateOf(true) }
    var catalogLoadFailed by remember { mutableStateOf(false) }
    var catalogGeneration by remember { mutableStateOf(0) }

    LaunchedEffect(catalogGeneration) {
        catalogLoading = true
        val result = withContext(Dispatchers.IO) {
            RedeemRepository.loadCatalog(context)
        }
        result.fold(
            onSuccess = { list ->
                val cleaned = list
                    .filter { it.id.isNotBlank() && !it.id.contains('/') }
                    .distinctBy { it.id }
                codes = cleaned
                unlocked.clear()
                cleaned.filter { it.serverUnlocked }.forEach { unlocked[it.id] = true }
                catalogLoadFailed = false
            },
            onFailure = {
                AppLog.e("Redeem catalog failed", it)
                catalogLoadFailed = true
                codes = emptyList()
            }
        )
        catalogLoading = false
    }
    // --- End: Redeem live wire (Sachin) ---

    val cadence = if (selectedTab == RedeemTab.DAILY) RedeemCadence.DAILY else RedeemCadence.WEEKLY
    val tabCodes = remember(codes, selectedTab) {
        codes.filter { it.cadence == cadence }
    }
    val catalogError = when {
        catalogLoading -> null
        catalogLoadFailed -> RedeemUiError(
            code = "REDEEM_CATALOG_FAILED",
            title = "Gift codes unavailable",
            message = "Could not load redeem inventory. Check your connection and try again."
        )
        codes.isEmpty() -> RedeemUiError(
            code = "REDEEM_CATALOG_EMPTY",
            title = "No codes right now",
            message = "There are no gift codes to show. Check back later."
        )
        else -> null
    }

    fun clearError() {
        actionError = null
    }

    fun showError(
        code: String,
        title: String,
        message: String,
        retryKind: RedeemRetryKind? = null,
        retryItemId: String? = null
    ) {
        actionError = RedeemUiError(code, title, message, retryKind, retryItemId)
    }

    fun showBusy() {
        showError(
            code = "REDEEM_BUSY",
            title = "Please wait",
            message = "Another action is already in progress. Try again in a moment."
        )
    }

    fun findCode(id: String?): RedeemCodeItem? =
        id?.let { codes.firstOrNull { c -> c.id == it } }

    fun openMenuSafe() {
        if (isBusy) {
            showBusy()
            return
        }
        clearError()
        val ok = runCatching { onOpenMenu() }.getOrElse {
            AppLog.e("Redeem open menu crashed", it)
            false
        }
        if (!ok) {
            showError(
                code = "REDEEM_MENU_FAILED",
                title = "Menu unavailable",
                message = "Could not open the side menu. Try again."
            )
        }
    }

    fun openCommentsSafe(item: RedeemCodeItem) {
        if (isBusy) {
            showBusy()
            return
        }
        clearError()
        if (item.id.isBlank() || item.id.contains('/')) {
            showError(
                code = "REDEEM_COMMENT_INVALID",
                title = "Comments unavailable",
                message = "This reward cannot open comments right now."
            )
            AppLog.w("Blocked redeem comments for id=${item.id}")
            return
        }
        isBusy = true
        val ok = runCatching { onOpenComments(item.id) }.getOrElse {
            AppLog.e("Open redeem comments crashed id=${item.id}", it)
            false
        }
        isBusy = false
        if (!ok) {
            showError(
                code = "REDEEM_COMMENT_OPEN_FAILED",
                title = "Couldn’t open comments",
                message = "Navigation failed. Try again.",
                retryKind = RedeemRetryKind.COMMENTS,
                retryItemId = item.id
            )
        }
    }

    fun startScratch(item: RedeemCodeItem) {
        if (isBusy) {
            showBusy()
            return
        }
        clearError()
        runCatching {
            when {
                item.status != RedeemStatus.ACTIVE ->
                    showError(
                        code = "REDEEM_ALREADY_CLAIMED",
                        title = "Already claimed",
                        message = "This code is no longer active. Pick another reward."
                    )
                unlocked[item.id] == true ->
                    showError(
                        code = "REDEEM_ALREADY_UNLOCKED",
                        title = "Already unlocked",
                        message = "Use Copy Code on this card to copy your reward."
                    )
                else -> scratchTarget = item
            }
        }.onFailure {
            AppLog.e("Redeem now failed", it)
            showError(
                code = "REDEEM_SCRATCH_OPEN_FAILED",
                title = "Couldn’t open scratch card",
                message = "Something went wrong opening this reward. Try again.",
                retryKind = RedeemRetryKind.SCRATCH,
                retryItemId = item.id
            )
        }
    }

    fun toggleReveal(item: RedeemCodeItem) {
        clearError()
        if (unlocked[item.id] != true) {
            showError(
                code = "REDEEM_LOCKED_REVEAL",
                title = "Unlock first",
                message = "Scratch Redeem Now before you can show or hide the full code."
            )
            return
        }
        runCatching {
            revealed[item.id] = revealed[item.id] != true
        }.onFailure {
            AppLog.e("Redeem toggle reveal failed", it)
            showError(
                code = "REDEEM_REVEAL_FAILED",
                title = "Couldn’t update visibility",
                message = "Try again in a moment."
            )
        }
    }

    fun copyUnlocked(item: RedeemCodeItem) {
        clearError()
        if (unlocked[item.id] != true) {
            showError(
                code = "REDEEM_LOCKED_COPY",
                title = "Unlock first",
                message = "Scratch to unlock this code before copying."
            )
            return
        }
        if (item.code.isBlank()) {
            showError(
                code = "REDEEM_CODE_INVALID",
                title = "Invalid code",
                message = "This reward has no usable code. Try another one."
            )
            return
        }
        val ok = runCatching {
            SafeOps.copyText(context, "redeem_code", item.code)
        }.getOrElse {
            AppLog.e("Redeem copy failed", it)
            false
        }
        if (ok) {
            SafeOps.toast(context, "Code Copied Successfully!")
        } else {
            showError(
                code = "REDEEM_COPY_FAILED",
                title = "Copy failed",
                message = "Could not copy this code to the clipboard. Try again.",
                retryKind = RedeemRetryKind.COPY,
                retryItemId = item.id
            )
        }
    }

    fun onVoteSafe(itemId: String, yes: Boolean) {
        runCatching {
            votes[itemId] = yes
        }.onFailure {
            AppLog.e("Redeem vote failed", it)
            showError(
                code = "REDEEM_VOTE_FAILED",
                title = "Vote not saved",
                message = "Could not save your like/dislike. Try again."
            )
        }
    }

    fun runRetry(error: RedeemUiError) {
        val item = findCode(error.retryItemId) ?: return
        when (error.retryKind) {
            RedeemRetryKind.COMMENTS -> openCommentsSafe(item)
            RedeemRetryKind.SCRATCH -> startScratch(item)
            RedeemRetryKind.COPY -> copyUnlocked(item)
            null -> Unit
        }
    }

    scratchTarget?.let { target ->
        RedeemScratchCardDialog(
            item = target,
            onDismiss = { if (!isBusy) scratchTarget = null },
            onUnlocked = {
                // --- Start: Redeem live wire (Sachin) ---
                isBusy = true
                val result = withContext(Dispatchers.IO) {
                    RedeemRepository.claimCode(context, target)
                }
                result.fold(
                    onSuccess = { claim ->
                        val updated = target.copy(
                            code = claim.code,
                            serverUnlocked = true,
                            status = RedeemStatus.ACTIVE,
                            stockLeft = target.stockLeft?.let { left ->
                                if (claim.alreadyClaimed) left else (left - 1).coerceAtLeast(0)
                            }
                        )
                        codes = codes.map { if (it.id == target.id) updated else it }
                        RedeemCatalogCache.put(updated)
                        unlocked[target.id] = true
                        revealed[target.id] = true
                        runCatching {
                            ScratchHistoryStore.addRedeem(context, updated)
                        }.onFailure {
                            AppLog.e("Redeem unlock / history failed", it)
                        }
                        clearError()
                        SafeOps.toast(context, "Code unlocked · you can copy now")
                        scratchTarget = null
                        isBusy = false
                        true
                    },
                    onFailure = { err ->
                        AppLog.e("Redeem claim failed", err)
                        val message = when (err) {
                            is ApiException -> err.message
                            else -> "Couldn't unlock this code. Please try again."
                        }
                        showError(
                            code = (err as? ApiException)?.code ?: "REDEEM_CLAIM_FAILED",
                            title = "Unlock failed",
                            message = message,
                            retryKind = RedeemRetryKind.SCRATCH,
                            retryItemId = target.id
                        )
                        isBusy = false
                        false
                    }
                )
                // --- End: Redeem live wire (Sachin) ---
            }
        )
    }

    AtmosphereScaffold {
        when {
            catalogLoading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(contentPadding),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Loading gift codes…",
                        color = InkSecondary,
                        fontSize = 14.sp
                    )
                }
            }
            catalogError != null -> {
                RedeemCatalogErrorPane(
                    contentPadding = contentPadding,
                    error = catalogError,
                    onOpenMenu = { openMenuSafe() },
                    onRetry = {
                        clearError()
                        catalogGeneration += 1
                    }
                )
            }
            else -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(contentPadding)
                        .statusBarsPadding(),
                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    item {
                        AppScreenHeader(
                            title = "Gift Codes",
                            onOpenMenu = { openMenuSafe() }
                        )
                    }
                    item {
                        RedeemTabRow(
                            selected = selectedTab,
                            onSelect = { selectedTab = it }
                        )
                    }
                    item {
                        Text(
                            text = if (selectedTab == RedeemTab.DAILY) {
                                "Complete today’s challenge to unlock"
                            } else {
                                "7-day streak · bigger gift chance"
                            },
                            color = InkMuted,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(horizontal = 2.dp)
                        )
                    }
                    actionError?.let { err ->
                        item(key = "redeem_error_${err.code}") {
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
                    if (tabCodes.isEmpty()) {
                        item(key = "redeem_tab_empty_$selectedTab") {
                            RedeemTabEmptyPane(tab = selectedTab)
                        }
                    } else {
                        items(tabCodes, key = { it.id }) { item ->
                            val isUnlocked = unlocked[item.id] == true
                            RedeemCodeCard(
                                item = item,
                                unlocked = isUnlocked,
                                revealed = revealed[item.id] == true,
                                vote = votes[item.id],
                                onToggleReveal = { toggleReveal(item) },
                                onCopy = { copyUnlocked(item) },
                                onRedeem = { startScratch(item) },
                                onVote = { yes -> onVoteSafe(item.id, yes) },
                                onOpenComment = { openCommentsSafe(item) }
                            )
                        }
                    }
                    item { Spacer(modifier = Modifier.height(20.dp)) }
                }
            }
        }
    }
}
