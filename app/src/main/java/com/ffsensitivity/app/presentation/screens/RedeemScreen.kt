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
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.RedeemCadenceOption
import com.ffsensitivity.app.data.RedeemCodeItem
import com.ffsensitivity.app.data.RedeemDailyAdConfig
import com.ffsensitivity.app.data.RedeemDailyAdStore
import com.ffsensitivity.app.data.remote.RedeemRepository
import com.ffsensitivity.app.presentation.components.AtmosphereScaffold
import com.ffsensitivity.app.presentation.components.AppScreenHeader
import com.ffsensitivity.app.presentation.components.InlineErrorBanner
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.SafeOps
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun RedeemScreen(
    contentPadding: PaddingValues,
    onOpenMenu: () -> Boolean,
    onOpenComments: (String) -> Boolean
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val unlocked = remember { mutableStateMapOf<String, Boolean>() }
    val revealed = remember { mutableStateMapOf<String, Boolean>() }
    val votes = remember { mutableStateMapOf<String, Boolean?>() }
    var scratchTarget by remember { mutableStateOf<RedeemCodeItem?>(null) }
    var actionError by remember { mutableStateOf<RedeemUiError?>(null) }
    var isBusy by remember { mutableStateOf(false) }
    var selectedCadenceId by remember { mutableStateOf("DAILY") }
    var redeemDailyAdPassTick by remember { mutableIntStateOf(0) }

    var codes by remember { mutableStateOf<List<RedeemCodeItem>>(emptyList()) }
    var cadenceTabs by remember {
        mutableStateOf(
            listOf(
                RedeemCadenceOption("DAILY", "Daily", 3, 24),
                RedeemCadenceOption("WEEKLY", "Weekly", 2, 168)
            )
        )
    }
    var catalogLoading by remember { mutableStateOf(true) }
    var catalogLoadFailed by remember { mutableStateOf(false) }
    var catalogGeneration by remember { mutableStateOf(0) }

    LaunchedEffect(catalogGeneration) {
        catalogLoading = true
        val result = withContext(Dispatchers.IO) {
            RedeemRepository.loadCatalog(context)
        }
        result.fold(
            onSuccess = { payload ->
                val cleaned = payload.items
                    .filter { it.id.isNotBlank() && !it.id.contains('/') }
                    .distinctBy { it.id }
                codes = cleaned
                if (payload.cadences.isNotEmpty()) {
                    cadenceTabs = payload.cadences
                    if (cadenceTabs.none { it.id == selectedCadenceId }) {
                        selectedCadenceId = cadenceTabs.first().id
                    }
                }
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

    val selectedCadenceLabel =
        cadenceTabs.firstOrNull { it.id == selectedCadenceId }?.label ?: selectedCadenceId
    val isDailyCadence = selectedCadenceId == "DAILY"
    val tabCodes = remember(codes, selectedCadenceId) {
        codes.filter { it.cadence == selectedCadenceId }
    }
    val needsRedeemDailyAd = remember(selectedCadenceId, isBusy, redeemDailyAdPassTick) {
        isDailyCadence && RedeemDailyAdStore.needsAd(context)
    }
    LaunchedEffect(selectedCadenceId, redeemDailyAdPassTick) {
        RedeemScreenScratch.preloadIfNeeded(context, isDailyCadence)
    }
    val catalogError = when {
        catalogLoading -> null
        catalogLoadFailed -> RedeemUiError(
            code = "REDEEM_CATALOG_FAILED",
            title = "Rewards unavailable",
            message = "Could not load redeem inventory. Check your connection and try again."
        )
        codes.isEmpty() -> RedeemUiError(
            code = "REDEEM_CATALOG_EMPTY",
            title = "No rewards right now",
            message = "There are no scratch cards to show. Check back later."
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

    fun showBusy() = showError(
        "REDEEM_BUSY",
        "Please wait",
        "Another action is already in progress. Try again in a moment."
    )

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

    fun requestScratch(item: RedeemCodeItem) {
        RedeemScreenScratch.request(
            context = context,
            scope = scope,
            item = item,
            dailyTab = isDailyCadence,
            alreadyUnlocked = unlocked[item.id] == true,
            isBusy = isBusy,
            setBusy = { isBusy = it },
            showBusy = { showBusy() },
            clearError = { clearError() },
            setActionError = { actionError = it },
            showError = { code, title, message, retryKind, retryItemId ->
                showError(code, title, message, retryKind, retryItemId)
            },
            onPassTick = { redeemDailyAdPassTick += 1 },
            onReady = { scratchTarget = it }
        )
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

    fun writeRedeemClipboard(secret: String): Boolean {
        return runCatching {
            SafeOps.copyText(context, "redeem_code", secret)
        }.getOrElse {
            AppLog.e("Redeem copy failed", it)
            false
        }
    }

    fun finishCopy(secret: String, itemId: String) {
        if (writeRedeemClipboard(secret)) {
            SafeOps.toast(context, "Code Copied Successfully!")
        } else {
            showError(
                code = "REDEEM_COPY_FAILED",
                title = "Copy failed",
                message = "Could not copy this code to the clipboard. Try again.",
                retryKind = RedeemRetryKind.COPY,
                retryItemId = itemId
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
        val latest = findCode(item.id) ?: item
        val ready = copyableRedeemSecret(latest.code)
        if (ready != null) {
            finishCopy(ready, latest.id)
            return
        }
        if (isBusy) {
            showBusy()
            return
        }
        isBusy = true
        scope.launch {
            val result = withContext(Dispatchers.IO) {
                RedeemRepository.claimCode(context, latest)
            }
            isBusy = false
            result.fold(
                onSuccess = { claim ->
                    val secret = copyableRedeemSecret(claim.code)
                    if (secret == null) {
                        showError(
                            code = "REDEEM_CODE_INVALID",
                            title = "Invalid code",
                            message = "This reward has no usable code. Try another one."
                        )
                        return@fold
                    }
                    codes = codes.map { row ->
                        if (row.id == latest.id) row.copy(code = secret) else row
                    }
                    finishCopy(secret, latest.id)
                },
                onFailure = { err ->
                    AppLog.e("Redeem copy refetch failed", err)
                    showError(
                        code = "REDEEM_COPY_FAILED",
                        title = "Copy failed",
                        message = "Could not copy this code to the clipboard. Try again.",
                        retryKind = RedeemRetryKind.COPY,
                        retryItemId = latest.id
                    )
                }
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
            RedeemRetryKind.SCRATCH -> requestScratch(item)
            RedeemRetryKind.COPY -> copyUnlocked(item)
            null -> Unit
        }
    }

    scratchTarget?.let { target ->
        RedeemScratchCardDialog(
            item = target,
            onDismiss = { if (!isBusy) scratchTarget = null },
            onClaim = {
                isBusy = true
                try {
                    RedeemScreenClaim.run(
                        context = context,
                        target = target,
                        onCodes = { codes = it },
                        codes = codes,
                        unlocked = unlocked,
                        revealed = revealed,
                        clearError = { clearError() }
                    )
                } finally {
                    isBusy = false
                }
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
                        text = "Loading rewards…",
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
                            tabs = cadenceTabs.map { it.id to it.label },
                            selectedId = selectedCadenceId,
                            onSelect = { selectedCadenceId = it }
                        )
                    }
                    item {
                        Text(
                            text = if (isDailyCadence) {
                                "Scratch to earn Coins · limited codes by schedule"
                            } else {
                                "$selectedCadenceLabel · coins every scratch"
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
                        item(key = "redeem_tab_empty_$selectedCadenceId") {
                            RedeemTabEmptyPane(
                                cadenceId = selectedCadenceId,
                                cadenceLabel = selectedCadenceLabel
                            )
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
                                onRedeem = { requestScratch(item) },
                                onVote = { yes -> onVoteSafe(item.id, yes) },
                                onOpenComment = { openCommentsSafe(item) },
                                redeemActionLabel = when {
                                    item.isScratchReward && item.needsAd ->
                                        RedeemDailyAdConfig.buttonLabel
                                    item.isScratchReward -> "Scratch for Coins"
                                    isUnlocked -> null
                                    needsRedeemDailyAd -> RedeemDailyAdConfig.buttonLabel
                                    else -> null
                                }
                            )
                        }
                    }
                    item { Spacer(modifier = Modifier.height(20.dp)) }
                }
            }
        }
    }
}
