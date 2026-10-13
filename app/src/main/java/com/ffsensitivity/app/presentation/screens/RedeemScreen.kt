package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.ffsensitivity.app.data.RedeemCadenceOption
import com.ffsensitivity.app.data.RedeemCodeItem
import com.ffsensitivity.app.data.RedeemDailyAdStore
import com.ffsensitivity.app.data.remote.RedeemRepository
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
    var waitRefreshKey by remember { mutableStateOf("") }
    val lifecycleOwner = LocalLifecycleOwner.current
    var skipResumeRefresh by remember { mutableIntStateOf(1) }
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event != Lifecycle.Event.ON_RESUME) return@LifecycleEventObserver
            if (skipResumeRefresh > 0) {
                skipResumeRefresh -= 1
            } else {
                catalogGeneration += 1
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

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
        val item = findCode(itemId) ?: return
        val previous = votes[itemId] ?: item.myVote
        RedeemVoteUi.submit(
            scope = scope,
            context = context,
            item = item,
            previous = previous,
            yes = yes,
            apply = { updated ->
                votes[itemId] = updated.myVote
                codes = codes.map { if (it.id == itemId) updated else it }
            },
            fail = {
                if (previous == null) votes.remove(itemId) else votes[itemId] = previous
                codes = codes.map { if (it.id == itemId) item else it }
                showError(
                    code = "REDEEM_VOTE_FAILED",
                    title = "Vote not saved",
                    message = "Could not save your yes or no. Try again."
                )
            }
        )
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

    RedeemScreenList(
        contentPadding, catalogLoading, catalogError, actionError,
        cadenceTabs, selectedCadenceId, selectedCadenceLabel, isDailyCadence,
        tabCodes, unlocked, revealed, votes, needsRedeemDailyAd,
        onOpenMenu = { openMenuSafe() },
        onRetryCatalog = { clearError(); catalogGeneration += 1 },
        onSelectCadence = { selectedCadenceId = it },
        onDismissError = { clearError() },
        onRetryAction = { runRetry(it) },
        onToggleReveal = { toggleReveal(it) },
        onCopy = { copyUnlocked(it) },
        onRedeem = { requestScratch(it) },
        onVote = { id, yes -> onVoteSafe(id, yes) },
        onOpenComment = { openCommentsSafe(it) },
        onWaitFinished = { id, until ->
            val key = "$id:$until"
            if (waitRefreshKey != key) {
                waitRefreshKey = key
                catalogGeneration += 1
            }
        }
    )
}
