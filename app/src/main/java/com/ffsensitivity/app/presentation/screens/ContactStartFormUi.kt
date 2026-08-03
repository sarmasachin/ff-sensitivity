package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.ContactSubject
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.HairlineStrong
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.presentation.theme.VoidBlack

@Composable
fun ContactStartForm(
    name: String,
    email: String,
    subject: ContactSubject,
    message: String,
    appVersion: String,
    sending: Boolean,
    onName: (String) -> Unit,
    onEmail: (String) -> Unit,
    onSubject: (ContactSubject) -> Unit,
    onMessage: (String) -> Unit,
    onSend: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
    ) {
        Text(
            text = "We usually reply within 24–48 hours once backend support is live. Your messages stay on this phone for now.",
            color = InkSecondary,
            fontSize = 13.sp,
            lineHeight = 18.sp
        )
        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = name,
            onValueChange = { onName(it.take(40)) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            enabled = !sending,
            label = { Text("Name") },
            keyboardOptions = KeyboardOptions(
                capitalization = KeyboardCapitalization.Words,
                imeAction = ImeAction.Next
            ),
            shape = RoundedCornerShape(16.dp),
            colors = contactFieldColors()
        )
        Spacer(modifier = Modifier.height(10.dp))
        OutlinedTextField(
            value = email,
            onValueChange = { onEmail(it.take(80)) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            enabled = !sending,
            label = { Text("Email") },
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Email,
                imeAction = ImeAction.Next
            ),
            shape = RoundedCornerShape(16.dp),
            colors = contactFieldColors()
        )
        Spacer(modifier = Modifier.height(14.dp))

        Text(
            text = "SUBJECT",
            color = Amber,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.2.sp
        )
        Spacer(modifier = Modifier.height(8.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            ContactSubject.entries.forEach { item ->
                val selected = item == subject
                Text(
                    text = item.label,
                    color = if (selected) VoidBlack else InkPrimary,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier
                        .clip(RoundedCornerShape(999.dp))
                        .background(if (selected) Amber else SurfaceCard)
                        .border(
                            1.dp,
                            if (selected) Amber else HairlineStrong,
                            RoundedCornerShape(999.dp)
                        )
                        .clickable(enabled = !sending) { onSubject(item) }
                        .padding(horizontal = 12.dp, vertical = 8.dp)
                )
            }
        }
        Spacer(modifier = Modifier.height(14.dp))

        OutlinedTextField(
            value = message,
            onValueChange = { onMessage(it.take(1000)) },
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 140.dp),
            enabled = !sending,
            label = { Text("Message") },
            placeholder = { Text("Describe your issue…") },
            keyboardOptions = KeyboardOptions(
                capitalization = KeyboardCapitalization.Sentences
            ),
            shape = RoundedCornerShape(16.dp),
            colors = contactFieldColors()
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "App version $appVersion (attached locally)",
            color = InkMuted,
            fontSize = 11.sp
        )
        Spacer(modifier = Modifier.height(16.dp))

        val canStart = !sending &&
            message.isNotBlank() &&
            name.isNotBlank() &&
            email.isNotBlank()
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(if (canStart) Amber else SurfaceCard)
                .border(1.dp, HairlineStrong, RoundedCornerShape(16.dp))
                .clickable(enabled = canStart) { onSend() }
                .padding(vertical = 14.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = if (sending) "Sending…" else "Start conversation",
                color = if (canStart) VoidBlack else InkMuted,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )
        }
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = "After you send, this becomes a chat thread on your phone.",
            color = InkMuted,
            fontSize = 11.sp
        )
    }
}
