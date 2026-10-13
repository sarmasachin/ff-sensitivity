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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.RedeemCadenceOption
import com.ffsensitivity.app.data.RedeemCodeItem
import com.ffsensitivity.app.presentation.components.AppScreenHeader
import com.ffsensitivity.app.presentation.components.AtmosphereScaffold
import com.ffsensitivity.app.presentation.components.InlineErrorBanner
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkSecondary

@Composable
internal fun RedeemScreenList(
    contentPadding: PaddingValues,
    catalogLoading: Boolean,
    catalogError: RedeemUiError?,
    actionError: RedeemUiError?,
    cadenceTabs: List<RedeemCadenceOption>,
    selectedCadenceId: String,
    selectedCadenceLabel: String,
    isDailyCadence: Boolean,
    tabCodes: List<RedeemCodeItem>,
    unlocked: Map<String, Boolean>,
    revealed: Map<String, Boolean>,
    votes: Map<String, Boolean?>,
    needsRedeemDailyAd: Boolean,
    onOpenMenu: () -> Unit,
    onRetryCatalog: () -> Unit,
    onSelectCadence: (String) -> Unit,
    onDismissError: () -> Unit,
    onRetryAction: (RedeemUiError) -> Unit,
    onToggleReveal: (RedeemCodeItem) -> Unit,
    onCopy: (RedeemCodeItem) -> Unit,
    onRedeem: (RedeemCodeItem) -> Unit,
    onVote: (String, Boolean) -> Unit,
    onOpenComment: (RedeemCodeItem) -> Unit,
    onWaitFinished: (String, Long) -> Unit
) {
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
                    onOpenMenu = onOpenMenu,
                    onRetry = onRetryCatalog
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
                            onOpenMenu = onOpenMenu
                        )
                    }
                    item {
                        RedeemTabRow(
                            tabs = cadenceTabs.map { it.id to it.label },
                            selectedId = selectedCadenceId,
                            onSelect = onSelectCadence
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
                                onDismiss = onDismissError,
                                retryLabel = if (err.retryKind != null) "Retry" else null,
                                onRetry = if (err.retryKind != null) {
                                    { onRetryAction(err) }
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
                                vote = votes[item.id] ?: item.myVote,
                                onToggleReveal = { onToggleReveal(item) },
                                onCopy = { onCopy(item) },
                                onRedeem = { onRedeem(item) },
                                onVote = { yes -> onVote(item.id, yes) },
                                onOpenComment = { onOpenComment(item) },
                                onWaitFinished = { until -> onWaitFinished(item.id, until) },
                                redeemActionLabel = when {
                                    item.isScratchReward && item.needsAd -> "WATCH AD"
                                    item.isScratchReward && item.canScratch -> "SCRATCH"
                                    item.isScratchReward -> "WAIT"
                                    isUnlocked -> null
                                    needsRedeemDailyAd -> "WATCH AD"
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
