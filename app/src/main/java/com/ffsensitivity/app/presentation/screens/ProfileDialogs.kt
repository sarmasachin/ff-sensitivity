package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.AmberHot
import com.ffsensitivity.app.presentation.theme.Danger
import com.ffsensitivity.app.presentation.theme.HairlineStrong
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.presentation.theme.SurfaceLift

@Composable
internal fun ProfileChoiceDialog(
    title: String,
    options: List<String>,
    selected: String,
    onPick: (String) -> Unit,
    onDismiss: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(SurfaceCard)
                .border(1.dp, HairlineStrong, RoundedCornerShape(18.dp))
                .padding(16.dp)
        ) {
            Text(title, color = Amber, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(8.dp))
            ProfileChoiceRow("Not set", selected.isBlank()) {
                onPick("")
            }
            options.forEach { option ->
                ProfileChoiceRow(option, option == selected) { onPick(option) }
            }
        }
    }
}

/** Region: pick from list or type a custom label. */
@Composable
internal fun ProfileRegionDialog(
    options: List<String>,
    selected: String,
    onPick: (String) -> Unit,
    onDismiss: () -> Unit
) {
    val selectedClean = selected.trim()
    val isPreset = selectedClean.isEmpty() || selectedClean in options
    var custom by remember {
        mutableStateOf(if (isPreset) "" else selectedClean)
    }
    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(SurfaceCard)
                .border(1.dp, HairlineStrong, RoundedCornerShape(18.dp))
                .padding(16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Text("Region", color = Amber, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "Choose from the list or type your own.",
                color = InkMuted,
                fontSize = 12.sp
            )
            Spacer(modifier = Modifier.height(10.dp))
            ProfileChoiceRow("Not set", selectedClean.isBlank()) {
                onPick("")
            }
            options.forEach { option ->
                ProfileChoiceRow(option, option == selectedClean) { onPick(option) }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                "Custom region",
                color = InkMuted,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(6.dp))
            OutlinedTextField(
                value = custom,
                onValueChange = { custom = it.take(40) },
                singleLine = true,
                placeholder = { Text("e.g. Pakistan, Thailand…") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = InkPrimary,
                    unfocusedTextColor = InkPrimary,
                    focusedBorderColor = Amber,
                    unfocusedBorderColor = HairlineStrong,
                    focusedContainerColor = SurfaceLift,
                    unfocusedContainerColor = SurfaceLift,
                    cursorColor = Amber,
                    focusedPlaceholderColor = InkMuted,
                    unfocusedPlaceholderColor = InkMuted
                )
            )
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = "Use custom",
                color = AmberHot,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .border(1.dp, Amber.copy(alpha = 0.45f), RoundedCornerShape(12.dp))
                    .clickable {
                        val next = custom.trim().replace(Regex("\\s+"), " ")
                        if (next.isNotEmpty() &&
                            next.length <= 40 &&
                            !next.contains('<') &&
                            !next.contains('>')
                        ) {
                            onPick(next)
                        }
                    }
                    .padding(vertical = 12.dp)
            )
        }
    }
}

@Composable
private fun ProfileChoiceRow(label: String, selected: Boolean, onClick: () -> Unit) {
    Text(
        text = label,
        color = if (selected) AmberHot else InkPrimary,
        fontSize = 15.sp,
        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 12.dp, horizontal = 8.dp)
    )
}

@Composable
internal fun ProfileDeleteDialog(onDismiss: () -> Unit, onConfirm: () -> Unit) {
    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(SurfaceCard)
                .border(1.dp, Danger.copy(alpha = 0.35f), RoundedCornerShape(18.dp))
                .padding(18.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                "Delete account",
                color = InkPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "This deletes your app data for this Google account and signs you out.",
                color = InkMuted,
                fontSize = 13.sp,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(16.dp))
            Row(modifier = Modifier.fillMaxWidth()) {
                ProfileDialogButton("Cancel", false, Modifier.weight(1f), onDismiss)
                Spacer(modifier = Modifier.padding(4.dp))
                ProfileDialogButton("Delete", true, Modifier.weight(1f), onConfirm)
            }
        }
    }
}

@Composable
private fun ProfileDialogButton(
    label: String,
    danger: Boolean,
    modifier: Modifier,
    onClick: () -> Unit
) {
    Text(
        text = label,
        color = if (danger) Danger else InkPrimary,
        fontSize = 14.sp,
        fontWeight = FontWeight.Bold,
        textAlign = TextAlign.Center,
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .border(1.dp, if (danger) Danger.copy(alpha = 0.4f) else HairlineStrong, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 12.dp)
    )
}
