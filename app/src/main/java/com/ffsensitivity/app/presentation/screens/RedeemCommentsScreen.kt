package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.RedeemCatalogCache
import com.ffsensitivity.app.data.RedeemCodeItem
import com.ffsensitivity.app.data.RedeemCommentAddResult
import com.ffsensitivity.app.data.RedeemCommentsStore
import com.ffsensitivity.app.data.RedeemStatus
import com.ffsensitivity.app.data.remote.RedeemRepository
import com.ffsensitivity.app.presentation.components.AtmosphereScaffold
import com.ffsensitivity.app.presentation.components.InlineErrorBanner
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.InkSecondary
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

    LaunchedEffect(itemId) {
        if (invalidItemId) {
            item = null
            itemResolving = false
            itemLookupFailed = false
            return@LaunchedEffect
        }
        itemResolving = true
        itemLookupFailed = false
        RedeemCatalogCache.get(itemId)?.let { cached ->
            item = cached
            itemResolving = false
            return@LaunchedEffect
        }
        val result = withContext(Dispatchers.IO) {
            RedeemRepository.findInCatalog(context, itemId)
        }
        result.fold(
            onSuccess = { found ->
                item = found
                itemLookupFailed = false
            },
            onFailure = {
                AppLog.e("Redeem comments live lookup failed id=$itemId", it)
                item = null
                itemLookupFailed = true
            }
        )
        itemResolving = false
    }
    // --- End: Redeem live wire (Sachin) ---

    var actionError by remember(itemId) { mutableStateOf<CommentsUiError?>(null) }
    var isBusy by remember(itemId) { mutableStateOf(false) }
    var loadGeneration by remember(itemId) { mutableStateOf(0) }

    var vote by remember(itemId) {
        mutableStateOf(
            runCatching { RedeemCommentsStore.getVote(context, itemId) }
                .getOrElse {
                    AppLog.e("Redeem comments vote load failed", it)
                    null
                }
        )
    }

    val commentsLoad = remember(itemId, loadGeneration) {
        runCatching { RedeemCommentsStore.listFor(context, itemId) }
    }
    var comments by remember(itemId, loadGeneration) {
        mutableStateOf(
            commentsLoad.getOrElse {
                AppLog.e("Redeem comments list load failed", it)
                emptyList()
            }
        )
    }
    val listLoadFailed = commentsLoad.isFailure

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
        if (isBusy) {
            showBusy()
            return
        }
        clearError()
        val previous = vote
        vote = liked
        val ok = runCatching {
            RedeemCommentsStore.setVote(context, itemId, liked)
        }.getOrElse {
            AppLog.e("Redeem comments vote crashed", it)
            false
        }
        if (!ok) {
            vote = previous
            showError(
                code = "COMMENTS_VOTE_FAILED",
                title = "Vote not saved",
                messageText = "Could not save your like/dislike. Try again."
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
        val result = runCatching {
            RedeemCommentsStore.add(context, itemId, name, message)
        }.getOrElse {
            AppLog.e("Redeem comment post crashed", it)
            RedeemCommentAddResult.SaveFailed
        }
        isBusy = false
        when (result) {
            is RedeemCommentAddResult.Ok -> {
                comments = runCatching {
                    RedeemCommentsStore.listFor(context, itemId)
                }.getOrElse {
                    AppLog.e("Redeem comments refresh after post failed", it)
                    listOf(result.entry) + comments
                }
                message = ""
                runCatching { focusManager.clearFocus() }
                SafeOps.toast(context, "Comment posted")
                scope.launch {
                    runCatching { listState.animateScrollToItem(0) }
                        .onFailure { AppLog.e("Comments scroll after post failed", it) }
                }
            }
            RedeemCommentAddResult.Validation -> {
                showError(
                    code = "COMMENTS_VALIDATION",
                    title = "Name and comment required",
                    messageText = "Enter your name and a short comment before posting."
                )
            }
            RedeemCommentAddResult.InvalidItem -> {
                showError(
                    code = "COMMENTS_ITEM_INVALID",
                    title = "Cannot post here",
                    messageText = "This reward cannot accept comments."
                )
            }
            RedeemCommentAddResult.SaveFailed -> {
                showError(
                    code = "COMMENTS_SAVE_FAILED",
                    title = "Couldn’t post comment",
                    messageText = "Saving failed on this device. Try again.",
                    retryKind = CommentsRetryKind.POST
                )
            }
        }
    }

    fun runRetry(error: CommentsUiError) {
        when (error.retryKind) {
            CommentsRetryKind.RELOAD -> reloadComments()
            CommentsRetryKind.POST -> postComment()
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

    AtmosphereScaffold {
        when {
            itemResolving -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(contentPadding),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Loading reward…",
                        color = InkSecondary,
                        fontSize = 14.sp
                    )
                }
            }
            itemLookupFailed -> {
                CommentsFatalPane(
                    contentPadding = contentPadding,
                    title = "Comments unavailable",
                    message = "Could not open this comments page. Check your connection and try again.",
                    code = "COMMENTS_LOOKUP_FAILED",
                    onBack = { backSafe() }
                )
            }
            invalidItemId -> {
                CommentsFatalPane(
                    contentPadding = contentPadding,
                    title = "Invalid reward",
                    message = "This comments link is not valid.",
                    code = "COMMENTS_ITEM_INVALID",
                    onBack = { backSafe() }
                )
            }
            item == null -> {
                CommentsFatalPane(
                    contentPadding = contentPadding,
                    title = "Reward not found",
                    message = "This gift code is missing or no longer available.",
                    code = "COMMENTS_ITEM_NOT_FOUND",
                    onBack = { backSafe() }
                )
            }
            else -> {
                val reward = item!!
                LazyColumn(
                    state = listState,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(contentPadding)
                        .statusBarsPadding()
                        .navigationBarsPadding()
                        .imePadding(),
                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    item {
                        CommentsTopBar(title = "Comments", onBack = { backSafe() })
                    }

                    actionError?.let { err ->
                        item(key = "comments_error_${err.code}_$loadGeneration") {
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
                        RewardReactionCard(
                            title = reward.title,
                            valueLabel = reward.valueLabel,
                            active = reward.status == RedeemStatus.ACTIVE,
                            isPlayGift = reward.isPlayGift,
                            vote = vote,
                            onVote = { liked -> applyVote(liked) }
                        )
                    }

                    item {
                        ComposeCommentCard(
                            name = name,
                            message = message,
                            onNameChange = {
                                clearError()
                                name = it.take(24)
                            },
                            onMessageChange = {
                                clearError()
                                message = it.take(280)
                            },
                            onPost = { postComment() }
                        )
                    }

                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "All comments",
                                color = InkPrimary,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = "${comments.size}",
                                color = Amber,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    if (comments.isEmpty() && !listLoadFailed) {
                        item {
                            EmptyCommentsHint()
                        }
                    } else {
                        items(comments, key = { it.id }) { entry ->
                            CommentFeedRow(entry)
                        }
                    }

                    item { Spacer(modifier = Modifier.height(12.dp)) }
                }
            }
        }
    }
}
