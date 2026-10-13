package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import com.ffsensitivity.app.data.RedeemCatalogCache
import com.ffsensitivity.app.data.RedeemCodeItem
import com.ffsensitivity.app.data.remote.RedeemRepository
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.SafeOps
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun RedeemCommentsScreen(
    itemId: String,
    contentPadding: PaddingValues,
    onBack: () -> Boolean
) {
    val context = LocalContext.current
    val focusManager = LocalFocusManager.current
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    val invalidItemId = itemId.isBlank() || itemId.contains('/')

    // --- Start: Redeem live wire (Sachin) ---
    var item by remember(itemId) { mutableStateOf<RedeemCodeItem?>(null) }
    var itemResolving by remember(itemId) { mutableStateOf(!invalidItemId) }
    var itemLookupFailed by remember(itemId) { mutableStateOf(false) }
    var vote by remember(itemId) { mutableStateOf<Boolean?>(null) }
    var yesCount by remember(itemId) { mutableIntStateOf(0) }
    var noCount by remember(itemId) { mutableIntStateOf(0) }
    var pendingVote by remember(itemId) { mutableStateOf<Boolean?>(null) }

    LaunchedEffect(itemId) {
        if (invalidItemId) {
            item = null
            itemResolving = false
            itemLookupFailed = false
            return@LaunchedEffect
        }
        itemResolving = item == null
        itemLookupFailed = false
        RedeemCatalogCache.get(itemId)?.let { cached ->
            item = cached
            vote = cached.myVote
            yesCount = cached.yesCount
            noCount = cached.noCount
        }
        val result = withContext(Dispatchers.IO) {
            RedeemRepository.loadCatalog(context)
        }
        result.fold(
            onSuccess = { payload ->
                val found = payload.items.firstOrNull { it.id == itemId }
                item = found
                if (found == null) {
                    itemLookupFailed = true
                } else {
                    vote = found.myVote
                    yesCount = found.yesCount
                    noCount = found.noCount
                    itemLookupFailed = false
                }
            },
            onFailure = {
                AppLog.e("Redeem comments live lookup failed id=$itemId", it)
                if (item == null) itemLookupFailed = true
            }
        )
        itemResolving = false
    }
    // --- End: Redeem live wire (Sachin) ---

    var actionError by remember(itemId) { mutableStateOf<CommentsUiError?>(null) }
    var isBusy by remember(itemId) { mutableStateOf(false) }
    var loadGeneration by remember(itemId) { mutableStateOf(0) }

    var comments by remember(itemId) { mutableStateOf<List<com.ffsensitivity.app.data.RedeemComment>>(emptyList()) }
    var listLoadFailed by remember(itemId) { mutableStateOf(false) }

    LaunchedEffect(itemId, loadGeneration) {
        if (invalidItemId) {
            comments = emptyList()
            listLoadFailed = false
            return@LaunchedEffect
        }
        val result = withContext(Dispatchers.IO) {
            RedeemRepository.comments(context, itemId)
        }
        result.fold(
            onSuccess = { rows ->
                comments = rows
                listLoadFailed = false
            },
            onFailure = {
                AppLog.e("Redeem comments load failed", it)
                listLoadFailed = true
            }
        )
    }

    var name by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }

    fun clearError() {
        actionError = null
    }

    fun showError(
        code: String,
        title: String,
        messageText: String,
        retryKind: CommentsRetryKind? = null
    ) {
        actionError = CommentsUiError(code, title, messageText, retryKind)
    }

    fun showBusy() {
        showError(
            code = "COMMENTS_BUSY",
            title = "Please wait",
            messageText = "Another action is already in progress. Try again in a moment."
        )
    }

    fun reloadComments() {
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
            AppLog.e("Redeem comments back crashed", it)
            false
        }
        if (!ok) {
            showError(
                code = "COMMENTS_BACK_FAILED",
                title = "Couldn’t go back",
                messageText = "Navigation failed. Try again."
            )
        }
    }

    fun applyVote(liked: Boolean) {
        val reward = item
        if (isBusy) {
            showBusy()
            return
        }
        if (reward == null || vote != null) return
        clearError()
        pendingVote = liked
        isBusy = true
        scope.launch {
            val result = withContext(Dispatchers.IO) {
                RedeemRepository.vote(context, itemId, liked)
            }
            isBusy = false
            result.fold(
                onSuccess = { saved ->
                    vote = saved.worked
                    yesCount = saved.yesCount
                    noCount = saved.noCount
                    RedeemCatalogCache.put(
                        reward.copy(
                            yesCount = saved.yesCount,
                            noCount = saved.noCount,
                            myVote = saved.worked
                        )
                    )
                },
                onFailure = {
                    AppLog.e("Redeem comments vote failed", it)
                    showError(
                        code = "COMMENTS_VOTE_FAILED",
                        title = "Vote not saved",
                        messageText = "Could not save your like or dislike. Try again.",
                        retryKind = CommentsRetryKind.VOTE
                    )
                }
            )
        }
    }

    fun postComment() {
        if (isBusy) {
            showBusy()
            return
        }
        clearError()
        if (name.trim().isBlank() || message.trim().isBlank()) {
            showError(
                code = "COMMENTS_VALIDATION",
                title = "Name and comment required",
                messageText = "Enter your name and a short comment before posting."
            )
            return
        }
        isBusy = true
        val postedName = name.trim()
        val postedText = message.trim()
        scope.launch {
            val result = withContext(Dispatchers.IO) {
                RedeemRepository.addComment(context, itemId, postedName, postedText)
            }
            isBusy = false
            result.fold(
                onSuccess = { entry ->
                    comments = listOf(entry) + comments.filter { it.id != entry.id }
                    message = ""
                    runCatching { focusManager.clearFocus() }
                    SafeOps.toast(context, "Comment posted")
                    runCatching { listState.animateScrollToItem(0) }
                        .onFailure { AppLog.e("Comments scroll after post failed", it) }
                },
                onFailure = {
                    AppLog.e("Redeem comment post failed", it)
                    showError(
                        code = "COMMENTS_SAVE_FAILED",
                        title = "Couldn’t post comment",
                        messageText = "Could not post this comment. Check your connection and try again.",
                        retryKind = CommentsRetryKind.POST
                    )
                }
            )
        }
    }

    fun runRetry(error: CommentsUiError) {
        when (error.retryKind) {
            CommentsRetryKind.RELOAD -> reloadComments()
            CommentsRetryKind.POST -> postComment()
            CommentsRetryKind.VOTE -> pendingVote?.let { applyVote(it) }
            null -> Unit
        }
    }

    LaunchedEffect(listLoadFailed, loadGeneration, item != null, invalidItemId) {
        if (listLoadFailed && item != null && !invalidItemId) {
            actionError = CommentsUiError(
                code = "COMMENTS_LOAD_FAILED",
                title = "Comments unavailable",
                message = "Could not load comments for this reward. Try again.",
                retryKind = CommentsRetryKind.RELOAD
            )
        }
    }

    RedeemCommentsPane(
        contentPadding = contentPadding,
        listState = listState,
        itemResolving = itemResolving,
        itemLookupFailed = itemLookupFailed,
        invalidItemId = invalidItemId,
        reward = item,
        actionError = actionError,
        loadGeneration = loadGeneration,
        comments = comments,
        listLoadFailed = listLoadFailed,
        name = name,
        message = message,
        vote = vote,
        yesCount = yesCount,
        noCount = noCount,
        onBack = { backSafe() },
        onDismissError = { clearError() },
        onRetry = { runRetry(it) },
        onVote = { applyVote(it) },
        onNameChange = { clearError(); name = it.take(24) },
        onMessageChange = { clearError(); message = it.take(280) },
        onPost = { postComment() }
    )
}
