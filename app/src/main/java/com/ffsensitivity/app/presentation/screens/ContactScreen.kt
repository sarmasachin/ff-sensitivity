package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.ContactReplyResult
import com.ffsensitivity.app.data.ContactStartResult
import com.ffsensitivity.app.data.ContactStore
import com.ffsensitivity.app.data.ContactSubject
import com.ffsensitivity.app.presentation.components.AtmosphereScaffold
import com.ffsensitivity.app.presentation.components.InlineErrorBanner
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.HairlineStrong
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.util.AppLog

@Composable
fun ContactScreen(
    contentPadding: PaddingValues,
    appVersion: String,
    onBack: () -> Boolean
) {
    val context = LocalContext.current
    var thread by remember { mutableStateOf(ContactStore.load(context)) }
    var name by remember { mutableStateOf(thread?.name.orEmpty()) }
    var email by remember { mutableStateOf(thread?.email.orEmpty()) }
    var subject by remember { mutableStateOf(thread?.subject ?: ContactSubject.REPORT) }
    var startMessage by remember { mutableStateOf("") }
    var chatDraft by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<Pair<String, String>?>(null) }
    var backBusy by remember { mutableStateOf(false) }

    val versionLabel = remember(appVersion) {
        appVersion.trim().ifBlank { "—" }.removePrefix("v").removePrefix("V")
    }

    fun clearError() {
        error = null
    }

    fun goBack() {
        if (backBusy) return
        backBusy = true
        val ok = runCatching { onBack() }.getOrElse {
            AppLog.e("Contact back crashed", it)
            false
        }
        backBusy = false
        if (!ok) {
            error = "CONTACT_BACK_FAILED" to "Could not go back. Try again."
        }
    }

    fun startConversation() {
        if (sending) return
        clearError()
        sending = true
        val result = runCatching {
            ContactStore.start(
                context = context,
                name = name,
                email = email,
                subject = subject,
                message = startMessage,
                appVersion = versionLabel
            )
        }.getOrElse {
            AppLog.e("Contact start crashed", it)
            ContactStartResult.SaveFailed
        }
        sending = false
        when (result) {
            is ContactStartResult.Ok -> {
                thread = result.thread
                startMessage = ""
                chatDraft = ""
            }
            ContactStartResult.Validation -> {
                error = "Check name, email, and message" to
                    "Enter a valid name, email, and message to start."
            }
            ContactStartResult.SaveFailed -> {
                error = "Couldn’t save message" to
                    "Local save failed. Try again."
            }
        }
    }

    fun sendChat() {
        if (sending) return
        clearError()
        sending = true
        val result = runCatching {
            ContactStore.appendUserMessage(context, chatDraft)
        }.getOrElse {
            AppLog.e("Contact chat send crashed", it)
            ContactReplyResult.SaveFailed
        }
        sending = false
        when (result) {
            is ContactReplyResult.Ok -> {
                thread = result.thread
                chatDraft = ""
            }
            ContactReplyResult.Validation -> {
                error = "Empty message" to "Type a message before sending."
            }
            ContactReplyResult.NoThread -> {
                error = "Thread missing" to "Start a new conversation from the form."
                thread = null
            }
            ContactReplyResult.SaveFailed -> {
                error = "Couldn’t send" to "Local save failed. Try again."
            }
        }
    }

    AtmosphereScaffold {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(contentPadding)
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = 20.dp)
                .padding(top = 8.dp, bottom = 12.dp)
        ) {
            ContactTopBar(onBack = { goBack() })
            Spacer(modifier = Modifier.height(12.dp))

            error?.let { (title, message) ->
                InlineErrorBanner(
                    title = title,
                    message = message,
                    onDismiss = { clearError() }
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            val current = thread
            if (current == null || current.messages.isEmpty()) {
                ContactStartForm(
                    name = name,
                    email = email,
                    subject = subject,
                    message = startMessage,
                    appVersion = versionLabel,
                    sending = sending,
                    onName = { name = it },
                    onEmail = { email = it },
                    onSubject = { subject = it },
                    onMessage = { startMessage = it },
                    onSend = { startConversation() }
                )
            } else {
                ContactChatPanel(
                    thread = current,
                    draft = chatDraft,
                    sending = sending,
                    onDraftChange = { chatDraft = it.take(1000) },
                    onSend = { sendChat() }
                )
            }
        }
    }
}

@Composable
private fun ContactTopBar(onBack: () -> Unit) {
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
        Spacer(modifier = Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "CONTACT US",
                color = Amber,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.6.sp
            )
            Text(
                text = "Support chat",
                color = InkPrimary,
                fontSize = 20.sp,
                fontWeight = FontWeight.Black
            )
        }
    }
}
