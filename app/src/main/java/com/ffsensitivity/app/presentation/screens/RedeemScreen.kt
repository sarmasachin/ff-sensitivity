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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CardGiftcard
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.Key
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.RocketLaunch
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material.icons.outlined.ThumbDown
import androidx.compose.material.icons.outlined.ThumbUp
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.RedeemCadence
import com.ffsensitivity.app.data.RedeemCodeItem
import com.ffsensitivity.app.data.RedeemStatus
import com.ffsensitivity.app.data.RedeemType
import com.ffsensitivity.app.data.ScratchHistoryStore
import com.ffsensitivity.app.data.sampleRedeemCodes
import com.ffsensitivity.app.presentation.components.AtmosphereScaffold
import com.ffsensitivity.app.presentation.components.AppScreenHeader
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

private enum class RedeemRetryKind { COMMENTS, SCRATCH, COPY }

private enum class RedeemTab { DAILY, WEEKLY }

private data class RedeemUiError(
    val code: String,
    val title: String,
    val message: String,
    val retryKind: RedeemRetryKind? = null,
    val retryItemId: String? = null
)

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

    val catalogLoad = remember {
        runCatching {
            sampleRedeemCodes
                .filter { it.id.isNotBlank() && !it.id.contains('/') }
                .distinctBy { it.id }
        }
    }
    val codes = catalogLoad.getOrElse {
        AppLog.e("Redeem catalog failed", it)
        emptyList()
    }
    val cadence = if (selectedTab == RedeemTab.DAILY) RedeemCadence.DAILY else RedeemCadence.WEEKLY
    val tabCodes = remember(codes, selectedTab) {
        codes.filter { it.cadence == cadence }
    }
    val catalogError = when {
        catalogLoad.isFailure -> RedeemUiError(
            code = "REDEEM_CATALOG_FAILED",
            title = "Gift codes unavailable",
            message = "Could not load redeem inventory. Restart the app and try again."
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
                item.code.isBlank() ->
                    showError(
                        code = "REDEEM_CODE_INVALID",
                        title = "Invalid code",
                        message = "This reward has no usable code. Try another one."
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
            onDismiss = { scratchTarget = null },
            onUnlocked = {
                runCatching {
                    unlocked[target.id] = true
                    revealed[target.id] = true
                    ScratchHistoryStore.addRedeem(context, target)
                    clearError()
                    SafeOps.toast(context, "Code unlocked · you can copy now")
                    true
                }.getOrElse {
                    AppLog.e("Redeem unlock / history failed", it)
                    unlocked[target.id] = true
                    revealed[target.id] = true
                    showError(
                        code = "REDEEM_HISTORY_SAVE_FAILED",
                        title = "Unlocked, archive failed",
                        message = "Code is unlocked for copy, but saving to Scratch Cards history failed."
                    )
                    true
                }
            }
        )
    }

    AtmosphereScaffold {
        when {
            catalogError != null -> {
                RedeemCatalogErrorPane(
                    contentPadding = contentPadding,
                    error = catalogError,
                    onOpenMenu = { openMenuSafe() }
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

@Composable
private fun RedeemTabRow(
    selected: RedeemTab,
    onSelect: (RedeemTab) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(SurfaceCard)
            .border(1.dp, HairlineStrong, RoundedCornerShape(16.dp))
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        RedeemTabChip(
            label = "Daily",
            selected = selected == RedeemTab.DAILY,
            onClick = { onSelect(RedeemTab.DAILY) },
            modifier = Modifier.weight(1f)
        )
        RedeemTabChip(
            label = "Weekly",
            selected = selected == RedeemTab.WEEKLY,
            onClick = { onSelect(RedeemTab.WEEKLY) },
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
private fun RedeemTabChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .height(42.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (selected) Brush.horizontalGradient(listOf(Amber, AmberHot))
                else Brush.horizontalGradient(listOf(SurfaceCard, SurfaceCard))
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            color = if (selected) VoidBlack else InkSecondary,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            maxLines = 1
        )
    }
}

@Composable
private fun RedeemTabEmptyPane(tab: RedeemTab) {
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
            text = if (tab == RedeemTab.DAILY) "No daily rewards yet" else "No weekly rewards yet",
            color = InkPrimary,
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = if (tab == RedeemTab.DAILY) {
                "Complete today’s challenge, then check back here."
            } else {
                "Keep a 7-day streak to unlock weekly gift chances."
            },
            color = InkMuted,
            fontSize = 12.sp,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun RedeemCatalogErrorPane(
    contentPadding: PaddingValues,
    error: RedeemUiError,
    onOpenMenu: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(contentPadding)
            .statusBarsPadding()
            .padding(horizontal = 20.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        AppScreenHeader(
            title = "Gift Codes",
            onOpenMenu = onOpenMenu
        )
        Spacer(modifier = Modifier.height(24.dp))
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
                text = error.title,
                color = InkPrimary,
                fontSize = 17.sp,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = error.message,
                color = InkSecondary,
                fontSize = 13.sp,
                lineHeight = 18.sp,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Ref: ${error.code}",
                color = InkMuted,
                fontSize = 11.sp
            )
        }
    }
}

@Composable
private fun RedeemCodeCard(
    item: RedeemCodeItem,
    unlocked: Boolean,
    revealed: Boolean,
    vote: Boolean?,
    onToggleReveal: () -> Unit,
    onCopy: () -> Unit,
    onRedeem: () -> Unit,
    onVote: (Boolean) -> Unit,
    onOpenComment: () -> Unit
) {
    val active = item.status == RedeemStatus.ACTIVE
    val displayCode = when {
        unlocked && revealed -> item.code
        unlocked -> maskCode(item.code)
        else -> maskCode(item.code)
    }
    val typeIcon = if (item.type == RedeemType.GOOGLE_PLAY) {
        Icons.Outlined.CardGiftcard
    } else {
        Icons.Outlined.Star
    }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(Brush.verticalGradient(listOf(SurfaceLift, SurfaceCard)))
            .border(1.dp, HairlineStrong, RoundedCornerShape(22.dp))
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
                Icon(typeIcon, null, tint = Amber, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = item.title,
                    color = InkPrimary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.6.sp,
                    maxLines = 1
                )
            }
            StatusChip(active = active)
        }
        Spacer(modifier = Modifier.height(12.dp))
        Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(Hairline))
        Spacer(modifier = Modifier.height(14.dp))
        Text(
            text = "Value : ${item.valueLabel}",
            color = InkPrimary,
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold
        )
        if (item.coinCost != null || item.stockLeft != null) {
            Spacer(modifier = Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                item.coinCost?.let { MetaPill("Cost: $it Coins") }
                item.stockLeft?.let { MetaPill("Only $it left today") }
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                if (unlocked) Icons.Outlined.Key else Icons.Outlined.Lock,
                null,
                tint = if (unlocked) InkMuted else Amber,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "Code :  [ $displayCode ]",
                color = InkPrimary,
                fontSize = 14.sp,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Medium
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        TextButton(onClick = onToggleReveal, contentPadding = PaddingValues(0.dp)) {
            Icon(
                imageVector = when {
                    !unlocked -> Icons.Outlined.Lock
                    revealed -> Icons.Outlined.VisibilityOff
                    else -> Icons.Outlined.Visibility
                },
                contentDescription = null,
                tint = Amber,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = when {
                    !unlocked -> "Locked · scratch Redeem Now"
                    revealed -> "Hide Code"
                    else -> "Show Code"
                },
                color = Amber,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
        Spacer(modifier = Modifier.height(10.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            ActionPill(
                pillModifier = Modifier.weight(1f),
                label = if (unlocked) "COPY CODE" else "LOCKED",
                icon = if (unlocked) Icons.Outlined.ContentCopy else Icons.Outlined.Lock,
                enabled = active && unlocked,
                filled = false,
                onClick = onCopy
            )
            ActionPill(
                pillModifier = Modifier.weight(1f),
                label = if (unlocked) "UNLOCKED" else "REDEEM NOW",
                icon = Icons.Outlined.RocketLaunch,
                enabled = active && !unlocked,
                filled = true,
                onClick = onRedeem
            )
        }
        Spacer(modifier = Modifier.height(14.dp))
        Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(Hairline))
        Spacer(modifier = Modifier.height(12.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Outlined.Schedule, null, tint = InkMuted, modifier = Modifier.size(14.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text("Expires: ${item.expiresLabel}", color = InkSecondary, fontSize = 11.sp)
            Text("  |  ", color = InkMuted, fontSize = 11.sp)
            Text(
                text = "Tip: ${item.tip}",
                color = InkSecondary,
                fontSize = 11.sp,
                modifier = Modifier.weight(1f)
            )
        }
        Spacer(modifier = Modifier.height(14.dp))
        Text("Did this code work?", color = InkMuted, fontSize = 12.sp)
        Spacer(modifier = Modifier.height(8.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                VoteChip("YES", vote == true, true) { onVote(true) }
                VoteChip("NO", vote == false, false) { onVote(false) }
            }
            if (item.type == RedeemType.GOOGLE_PLAY) {
                CommentChip(onClick = onOpenComment)
            }
        }
    }
}

@Composable
private fun CommentChip(onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(Amber.copy(alpha = 0.16f))
            .border(1.dp, Amber.copy(alpha = 0.55f), RoundedCornerShape(12.dp))
            .clickable(
                indication = null,
                interactionSource = remember { MutableInteractionSource() },
                onClick = onClick
            )
            .padding(horizontal = 14.dp, vertical = 8.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                Icons.Outlined.ChatBubbleOutline,
                contentDescription = null,
                tint = Amber,
                modifier = Modifier.size(14.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = "COMMENT",
                color = Amber,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun StatusChip(active: Boolean) {
    val bg = if (active) Success.copy(alpha = 0.15f) else Danger.copy(alpha = 0.15f)
    val fg = if (active) Success else Danger
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(bg)
            .border(1.dp, fg.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
            .padding(horizontal = 10.dp, vertical = 5.dp)
    ) {
        Text(
            text = if (active) "ACTIVE" else "CLAIMED",
            color = fg,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 0.8.sp
        )
    }
}

@Composable
private fun MetaPill(text: String) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(VoidBlack.copy(alpha = 0.45f))
            .border(1.dp, Hairline, RoundedCornerShape(8.dp))
            .padding(horizontal = 10.dp, vertical = 5.dp)
    ) {
        Text(text, color = InkSecondary, fontSize = 11.sp)
    }
}

@Composable
private fun ActionPill(
    pillModifier: Modifier = Modifier,
    label: String,
    icon: ImageVector,
    enabled: Boolean,
    filled: Boolean,
    onClick: () -> Unit
) {
    val shape = RoundedCornerShape(14.dp)
    val bg = when {
        !enabled -> InkMuted.copy(alpha = 0.15f)
        filled -> Amber
        else -> VoidBlack.copy(alpha = 0.5f)
    }
    val fg = when {
        !enabled -> InkMuted
        filled -> VoidBlack
        else -> InkPrimary
    }
    Box(
        modifier = pillModifier
            .height(46.dp)
            .clip(shape)
            .background(bg)
            .border(1.dp, if (filled && enabled) Amber else HairlineStrong, shape)
            .then(
                if (enabled) {
                    Modifier.clickable(
                        indication = null,
                        interactionSource = remember { MutableInteractionSource() },
                        onClick = onClick
                    )
                } else Modifier
            ),
        contentAlignment = Alignment.Center
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = fg, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = label,
                color = fg,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.6.sp
            )
        }
    }
}

@Composable
private fun VoteChip(label: String, selected: Boolean, positive: Boolean, onClick: () -> Unit) {
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
                null,
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

private fun maskCode(code: String): String {
    val parts = code.split("-")
    if (parts.size < 4) return "****-****-****-****"
    return "${parts[0]}-****-****-${parts.last()}"
}
