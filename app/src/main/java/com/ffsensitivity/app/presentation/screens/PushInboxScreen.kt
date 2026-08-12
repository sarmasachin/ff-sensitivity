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
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.remote.PushInboxBadge
import com.ffsensitivity.app.data.remote.PushInboxCache
import com.ffsensitivity.app.data.remote.PushInboxMessage
import com.ffsensitivity.app.data.remote.PushRepository
import com.ffsensitivity.app.presentation.components.AtmosphereScaffold
import com.ffsensitivity.app.presentation.components.InlineErrorBanner
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.HairlineStrong
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.util.AppLog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class InboxUiError(
    val title: String,
    val message: String
)

@Composable
fun PushInboxScreen(
    contentPadding: PaddingValues,
    onBack: () -> Boolean,
    onOpenDeepLink: (String) -> Boolean
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var messages by remember { mutableStateOf(PushInboxCache.messages) }
    var loading by remember { mutableStateOf(true) }
    var refreshing by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<InboxUiError?>(null) }

    fun loadInbox(fromPull: Boolean) {
        if (busy) return
        busy = true
        if (fromPull) refreshing = true else loading = true
        error = null
        scope.launch {
            val result = withContext(Dispatchers.IO) {
                PushRepository.refreshInbox(context)
            }
            result
                .onSuccess { messages = it }
                .onFailure { err ->
                    AppLog.e("Push inbox refresh failed", err)
                    val noAuth = err.message?.contains("Not signed in", ignoreCase = true) == true
                    if (messages.isEmpty()) {
                        error = InboxUiError(
                            title = if (noAuth) "Sign-in required" else "Couldn’t load inbox",
                            message = if (noAuth) {
                                "Sign in with Google again to sync notifications."
                            } else {
                                "Check your connection and try again."
                            }
                        )
                    } else {
                        error = InboxUiError(
                            title = "Refresh failed",
                            message = if (noAuth) {
                                "Session expired. Sign in again to refresh."
                            } else {
                                "Showing last loaded messages."
                            }
                        )
                    }
                }
            loading = false
            refreshing = false
            busy = false
        }
    }

    LaunchedEffect(Unit) {
        loadInbox(fromPull = false)
    }

    LaunchedEffect(messages) {
        val ids = messages.map { it.id }.filter { it.isNotBlank() }
        if (ids.isEmpty()) return@LaunchedEffect
        PushInboxBadge.markSeen(context, ids, messages)
    }

    fun backSafe() {
        if (busy && loading) return
        val ok = runCatching { onBack() }.getOrElse {
            AppLog.e("Push inbox back crashed", it)
            false
        }
        if (!ok) {
            error = InboxUiError(
                title = "Couldn’t go back",
                message = "Navigation failed. Try again."
            )
        }
    }

    fun openMessage(message: PushInboxMessage) {
        if (busy) return
        val link = message.deepLink.trim()
        if (link.isBlank()) {
            error = InboxUiError(
                title = "Link missing",
                message = "This message has no destination."
            )
            return
        }
        busy = true
        val ok = runCatching { onOpenDeepLink(link) }.getOrElse {
            AppLog.e("Push inbox open link crashed", it)
            false
        }
        busy = false
        if (!ok) {
            error = InboxUiError(
                title = "Couldn’t open",
                message = "That link is unavailable right now."
            )
        }
    }

    AtmosphereScaffold {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(contentPadding)
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = 20.dp, vertical = 12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(42.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(SurfaceCard)
                        .border(1.dp, HairlineStrong, RoundedCornerShape(12.dp))
                        .clickable(onClick = { backSafe() }),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.AutoMirrored.Outlined.ArrowBack,
                        contentDescription = "Back",
                        tint = InkPrimary,
                        modifier = Modifier.size(20.dp)
                    )
                }
                Spacer(modifier = Modifier.width(14.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "INBOX",
                        color = Amber,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.6.sp
                    )
                    Text(
                        text = "Notifications",
                        color = InkPrimary,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Black
                    )
                }
                Box(
                    modifier = Modifier
                        .size(42.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(SurfaceCard)
                        .border(1.dp, HairlineStrong, RoundedCornerShape(12.dp))
                        .clickable(enabled = !busy) { loadInbox(fromPull = true) },
                    contentAlignment = Alignment.Center
                ) {
                    if (refreshing) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            color = Amber,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(
                            Icons.Outlined.Refresh,
                            contentDescription = "Refresh",
                            tint = InkPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Alerts from campaigns and updates.",
                color = InkSecondary,
                fontSize = 13.sp
            )
            Spacer(modifier = Modifier.height(14.dp))

            error?.let { err ->
                InlineErrorBanner(
                    title = err.title,
                    message = err.message,
                    onRetry = { loadInbox(fromPull = messages.isNotEmpty()) },
                    onDismiss = { error = null }
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            when {
                loading && messages.isEmpty() -> {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(top = 48.dp),
                        contentAlignment = Alignment.TopCenter
                    ) {
                        CircularProgressIndicator(color = Amber, strokeWidth = 2.dp)
                    }
                }
                messages.isEmpty() -> {
                    PushInboxEmptyState(modifier = Modifier.padding(top = 12.dp))
                }
                else -> {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        contentPadding = PaddingValues(bottom = 24.dp)
                    ) {
                        item {
                            Text(
                                text = "${messages.size} message${if (messages.size == 1) "" else "s"}",
                                color = InkMuted,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                        }
                        items(messages, key = { it.id.ifBlank { it.title + it.sentAt } }) { msg ->
                            PushInboxMessageCard(
                                message = msg,
                                onOpen = { openMessage(msg) }
                            )
                        }
                    }
                }
            }
        }
    }
}
