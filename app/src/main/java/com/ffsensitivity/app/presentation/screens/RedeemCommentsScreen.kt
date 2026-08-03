package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material.icons.outlined.CardGiftcard
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material.icons.outlined.ThumbDown
import androidx.compose.material.icons.outlined.ThumbUp
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.RedeemComment
import com.ffsensitivity.app.data.RedeemCommentAddResult
import com.ffsensitivity.app.data.RedeemCommentsStore
import com.ffsensitivity.app.data.RedeemStatus
import com.ffsensitivity.app.data.RedeemType
import com.ffsensitivity.app.data.sampleRedeemCodes
import com.ffsensitivity.app.presentation.components.AtmosphereScaffold
import com.ffsensitivity.app.presentation.components.InlineErrorBanner
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.AmberHot
import com.ffsensitivity.app.presentation.theme.Danger
import com.ffsensitivity.app.presentation.theme.Hairline
import com.ffsensitivity.app.presentation.theme.HairlineStrong
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.presentation.theme.Success
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.presentation.theme.SurfaceLift
import com.ffsensitivity.app.presentation.theme.VoidBlack
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.SafeOps
import kotlinx.coroutines.launch
private enum class CommentsRetryKind { RELOAD, POST }

private data class CommentsUiError(
    val code: String,
    val title: String,
    val message: String,
    val retryKind: CommentsRetryKind? = null
)

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

    val itemLookup = remember(itemId) {
        runCatching {
            when {
                itemId.isBlank() || itemId.contains('/') -> null
                else -> sampleRedeemCodes.find { it.id == itemId }
            }
        }
    }
    val item = itemLookup.getOrElse {
        AppLog.e("Redeem comments item lookup failed id=$itemId", it)
        null
    }
    val itemLookupFailed = itemLookup.isFailure
    val invalidItemId = itemId.isBlank() || itemId.contains('/')

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
            itemLookupFailed -> {
                CommentsFatalPane(
                    contentPadding = contentPadding,
                    title = "Comments unavailable",
                    message = "Could not open this comments page. Go back and try again.",
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
                            title = item.title,
                            valueLabel = item.valueLabel,
                            active = item.status == RedeemStatus.ACTIVE,
                            isPlayGift = item.type == RedeemType.GOOGLE_PLAY,
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

@Composable
private fun CommentsFatalPane(
    contentPadding: PaddingValues,
    title: String,
    message: String,
    code: String,
    onBack: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(contentPadding)
            .statusBarsPadding()
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        CommentsTopBar(title = "Comments", onBack = onBack)
        Spacer(modifier = Modifier.height(12.dp))
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(SurfaceCard)
                .border(1.dp, HairlineStrong, RoundedCornerShape(16.dp))
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = title,
                color = InkPrimary,
                fontSize = 17.sp,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = message,
                color = InkSecondary,
                fontSize = 13.sp,
                lineHeight = 18.sp,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Ref: $code",
                color = InkMuted,
                fontSize = 11.sp
            )
        }
    }
}

@Composable
private fun CommentsTopBar(title: String, onBack: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
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
        Column {
            Text(
                text = "COMMUNITY",
                color = Amber,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.4.sp
            )
            Text(
                text = title,
                color = InkPrimary,
                fontSize = 20.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun RewardReactionCard(
    title: String,
    valueLabel: String,
    active: Boolean,
    isPlayGift: Boolean,
    vote: Boolean?,
    onVote: (Boolean) -> Unit
) {
    val shape = RoundedCornerShape(22.dp)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Brush.verticalGradient(listOf(SurfaceLift, SurfaceCard)))
            .border(1.dp, HairlineStrong, shape)
            .padding(18.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                Icon(
                    if (isPlayGift) Icons.Outlined.CardGiftcard else Icons.Outlined.Star,
                    contentDescription = null,
                    tint = Amber,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = title,
                    color = InkPrimary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.5.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            val badgeBg = if (active) Success.copy(alpha = 0.15f) else Danger.copy(alpha = 0.15f)
            val badgeFg = if (active) Success else Danger
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(badgeBg)
                    .border(1.dp, badgeFg.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
                    .padding(horizontal = 10.dp, vertical = 5.dp)
            ) {
                Text(
                    text = if (active) "ACTIVE" else "CLAIMED",
                    color = badgeFg,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.8.sp
                )
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = valueLabel,
            color = InkPrimary,
            fontSize = 18.sp,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(modifier = Modifier.height(16.dp))
        Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(Hairline))
        Spacer(modifier = Modifier.height(14.dp))
        Text(
            text = "Did this code work?",
            color = InkMuted,
            fontSize = 12.sp
        )
        Spacer(modifier = Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            ReactionChip(
                label = "LIKE",
                selected = vote == true,
                positive = true,
                onClick = { onVote(true) }
            )
            ReactionChip(
                label = "DISLIKE",
                selected = vote == false,
                positive = false,
                onClick = { onVote(false) }
            )
        }
    }
}

@Composable
private fun ComposeCommentCard(
    name: String,
    message: String,
    onNameChange: (String) -> Unit,
    onMessageChange: (String) -> Unit,
    onPost: () -> Unit
) {
    val shape = RoundedCornerShape(22.dp)
    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedTextColor = InkPrimary,
        unfocusedTextColor = InkPrimary,
        focusedBorderColor = Amber.copy(alpha = 0.7f),
        unfocusedBorderColor = HairlineStrong,
        cursorColor = Amber,
        focusedContainerColor = VoidBlack.copy(alpha = 0.35f),
        unfocusedContainerColor = VoidBlack.copy(alpha = 0.35f),
        focusedPlaceholderColor = InkMuted,
        unfocusedPlaceholderColor = InkMuted,
        focusedLabelColor = Amber,
        unfocusedLabelColor = InkMuted
    )
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Brush.verticalGradient(listOf(SurfaceLift, SurfaceCard)))
            .border(1.dp, Amber.copy(alpha = 0.28f), shape)
            .padding(16.dp)
    ) {
        Text(
            text = "WRITE A COMMENT",
            color = Amber,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.4.sp
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "Share your experience",
            color = InkPrimary,
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(modifier = Modifier.height(14.dp))
        OutlinedTextField(
            value = name,
            onValueChange = onNameChange,
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            label = { Text("Your name") },
            placeholder = { Text("e.g. Aryan") },
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
            shape = RoundedCornerShape(14.dp),
            colors = fieldColors
        )
        Spacer(modifier = Modifier.height(10.dp))
        OutlinedTextField(
            value = message,
            onValueChange = onMessageChange,
            modifier = Modifier
                .fillMaxWidth()
                .height(110.dp),
            label = { Text("Comment") },
            placeholder = { Text("Did it work? Any tip for others…") },
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { onPost() }),
            shape = RoundedCornerShape(14.dp),
            colors = fieldColors
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "${message.length}/280",
            color = InkMuted,
            fontSize = 11.sp,
            modifier = Modifier.align(Alignment.End)
        )
        Spacer(modifier = Modifier.height(12.dp))
        val canPost = name.trim().isNotEmpty() && message.trim().isNotEmpty()
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(46.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(if (canPost) Amber else InkMuted.copy(alpha = 0.2f))
                .border(
                    1.dp,
                    if (canPost) Amber else HairlineStrong,
                    RoundedCornerShape(14.dp)
                )
                .then(
                    if (canPost) {
                        Modifier.clickable(
                            indication = null,
                            interactionSource = remember { MutableInteractionSource() },
                            onClick = onPost
                        )
                    } else Modifier
                ),
            contentAlignment = Alignment.Center
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.AutoMirrored.Outlined.Send,
                    contentDescription = null,
                    tint = if (canPost) VoidBlack else InkMuted,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "POST COMMENT",
                    color = if (canPost) VoidBlack else InkMuted,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.7.sp
                )
            }
        }
    }
}

@Composable
private fun CommentFeedRow(entry: RedeemComment) {
    val shape = RoundedCornerShape(18.dp)
    val initial = entry.name.firstOrNull()?.uppercaseChar()?.toString() ?: "?"
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(SurfaceCard)
            .border(1.dp, Hairline, shape)
            .padding(14.dp)
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(
                    Brush.linearGradient(listOf(Amber.copy(alpha = 0.55f), AmberHot.copy(alpha = 0.25f)))
                )
                .border(1.dp, Amber.copy(alpha = 0.35f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = initial,
                color = VoidBlack,
                fontSize = 16.sp,
                fontWeight = FontWeight.Black
            )
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = entry.name,
                    color = InkPrimary,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = relativeTime(entry.createdAtMs),
                    color = InkMuted,
                    fontSize = 11.sp
                )
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = entry.text,
                color = InkSecondary,
                fontSize = 13.sp,
                lineHeight = 19.sp
            )
            if (entry.likes > 0) {
                Spacer(modifier = Modifier.height(10.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Outlined.ThumbUp,
                        contentDescription = null,
                        tint = Amber,
                        modifier = Modifier.size(13.dp)
                    )
                    Spacer(modifier = Modifier.width(5.dp))
                    Text(
                        text = "${entry.likes}",
                        color = InkMuted,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}

@Composable
private fun EmptyCommentsHint() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(SurfaceLift)
            .border(1.dp, Hairline, RoundedCornerShape(16.dp))
            .padding(18.dp)
    ) {
        Text(
            text = "No comments yet. Be the first to share a tip.",
            color = InkMuted,
            fontSize = 13.sp
        )
    }
}

@Composable
private fun ReactionChip(
    label: String,
    selected: Boolean,
    positive: Boolean,
    onClick: () -> Unit
) {
    val accent = if (positive) Success else Danger
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(if (selected) accent.copy(alpha = 0.2f) else SurfaceLift)
            .border(1.dp, if (selected) accent else Hairline, RoundedCornerShape(12.dp))
            .clickable(
                indication = null,
                interactionSource = remember { MutableInteractionSource() },
                onClick = onClick
            )
            .padding(horizontal = 14.dp, vertical = 8.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                if (positive) Icons.Outlined.ThumbUp else Icons.Outlined.ThumbDown,
                contentDescription = null,
                tint = if (selected) accent else InkMuted,
                modifier = Modifier.size(14.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = label,
                color = if (selected) accent else InkSecondary,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

private fun relativeTime(createdAtMs: Long): String {
    val diff = (System.currentTimeMillis() - createdAtMs).coerceAtLeast(0L)
    val mins = diff / 60_000
    val hours = diff / 3_600_000
    val days = diff / 86_400_000
    return when {
        mins < 1 -> "Just now"
        mins < 60 -> "${mins}m"
        hours < 24 -> "${hours}h"
        days < 7 -> "${days}d"
        else -> "${days / 7}w"
    }
}
