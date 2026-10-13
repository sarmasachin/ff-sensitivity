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
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.RedeemCodeItem
import com.ffsensitivity.app.data.RedeemComment
import com.ffsensitivity.app.data.RedeemStatus
import com.ffsensitivity.app.presentation.components.AtmosphereScaffold
import com.ffsensitivity.app.presentation.components.InlineErrorBanner
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.InkSecondary

@Composable
internal fun RedeemCommentsPane(
    contentPadding: PaddingValues,
    listState: LazyListState,
    itemResolving: Boolean,
    itemLookupFailed: Boolean,
    invalidItemId: Boolean,
    reward: RedeemCodeItem?,
    actionError: CommentsUiError?,
    loadGeneration: Int,
    comments: List<RedeemComment>,
    listLoadFailed: Boolean,
    name: String,
    message: String,
    vote: Boolean?,
    yesCount: Int,
    noCount: Int,
    onBack: () -> Unit,
    onDismissError: () -> Unit,
    onRetry: (CommentsUiError) -> Unit,
    onVote: (Boolean) -> Unit,
    onNameChange: (String) -> Unit,
    onMessageChange: (String) -> Unit,
    onPost: () -> Unit
) {
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
                    onBack = onBack
                )
            }
            invalidItemId -> {
                CommentsFatalPane(
                    contentPadding = contentPadding,
                    title = "Invalid reward",
                    message = "This comments link is not valid.",
                    code = "COMMENTS_ITEM_INVALID",
                    onBack = onBack
                )
            }
            reward == null -> {
                CommentsFatalPane(
                    contentPadding = contentPadding,
                    title = "Reward not found",
                    message = "This gift code is missing or no longer available.",
                    code = "COMMENTS_ITEM_NOT_FOUND",
                    onBack = onBack
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
                    item { CommentsTopBar(title = "Comments", onBack = onBack) }
                    actionError?.let { err ->
                        item(key = "comments_error_${err.code}_$loadGeneration") {
                            InlineErrorBanner(
                                title = err.title,
                                message = err.message,
                                onDismiss = onDismissError,
                                retryLabel = if (err.retryKind != null) "Retry" else null,
                                onRetry = if (err.retryKind != null) {
                                    { onRetry(err) }
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
                            yesCount = yesCount,
                            noCount = noCount,
                            onVote = onVote
                        )
                    }
                    item {
                        ComposeCommentCard(
                            name = name,
                            message = message,
                            onNameChange = onNameChange,
                            onMessageChange = onMessageChange,
                            onPost = onPost
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
                        item { EmptyCommentsHint() }
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
