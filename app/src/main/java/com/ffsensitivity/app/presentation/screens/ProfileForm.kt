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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.ProfileOptions
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.HairlineStrong
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.presentation.theme.SurfaceLift
import com.ffsensitivity.app.presentation.theme.VoidBlack

internal fun profileFieldError(
    displayName: String,
    ffUid: String,
    role: String,
    region: String
): String? {
    val name = displayName.trim().replace(Regex("\\s+"), " ")
    if (name.length !in 1..40 || name.contains('<') || name.contains('>')) {
        return "Display name must be 1–40 characters."
    }
    val uid = ffUid.trim()
    if (uid.isNotEmpty() && !uid.matches(Regex("\\d{6,15}"))) {
        return "Free Fire UID must be 6–15 digits."
    }
    if (role.isNotEmpty() && role !in ProfileOptions.roles) return "Pick a role from the list."
    if (region.isNotEmpty() && region !in ProfileOptions.regions) return "Pick a region from the list."
    return null
}

@Composable
internal fun ProfileEditFields(
    displayName: String,
    onDisplayName: (String) -> Unit,
    ffUid: String,
    onFfUid: (String) -> Unit,
    role: String,
    onRole: () -> Unit,
    region: String,
    onRegion: () -> Unit,
    notifyPush: Boolean,
    onNotify: (Boolean) -> Unit,
    enabled: Boolean
) {
    ProfileField("Display name", displayName, onDisplayName, enabled, KeyboardType.Text)
    Spacer(modifier = Modifier.height(10.dp))
    ProfileField("Free Fire UID", ffUid, onFfUid, enabled, KeyboardType.Number)
    Spacer(modifier = Modifier.height(10.dp))
    ProfilePickRow("Role", role.ifBlank { "Not set" }, enabled, onRole)
    Spacer(modifier = Modifier.height(10.dp))
    ProfilePickRow("Region", region.ifBlank { "Not set" }, enabled, onRegion)
    Spacer(modifier = Modifier.height(10.dp))
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(SurfaceCard)
            .border(1.dp, HairlineStrong, RoundedCornerShape(14.dp))
            .padding(horizontal = 14.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text("Notifications", color = InkPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Text("Push on or off", color = InkMuted, fontSize = 12.sp)
        }
        Switch(
            checked = notifyPush,
            onCheckedChange = onNotify,
            enabled = enabled,
            colors = SwitchDefaults.colors(
                checkedThumbColor = VoidBlack,
                checkedTrackColor = Amber,
                uncheckedThumbColor = InkMuted,
                uncheckedTrackColor = SurfaceLift
            )
        )
    }
}

@Composable
private fun ProfileField(
    label: String,
    value: String,
    onValue: (String) -> Unit,
    enabled: Boolean,
    keyboard: KeyboardType
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValue,
        enabled = enabled,
        label = { Text(label) },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = keyboard),
        modifier = Modifier.fillMaxWidth(),
        colors = OutlinedTextFieldDefaults.colors(
            focusedTextColor = InkPrimary,
            unfocusedTextColor = InkPrimary,
            focusedBorderColor = Amber,
            unfocusedBorderColor = HairlineStrong,
            focusedContainerColor = SurfaceLift,
            unfocusedContainerColor = SurfaceLift,
            cursorColor = Amber,
            focusedLabelColor = Amber,
            unfocusedLabelColor = InkMuted
        )
    )
}

@Composable
private fun ProfilePickRow(label: String, value: String, enabled: Boolean, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(SurfaceCard)
            .border(1.dp, HairlineStrong, RoundedCornerShape(14.dp))
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 12.dp)
    ) {
        Text(label, color = InkMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        Text(value, color = InkPrimary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
internal fun ProfileActionButton(
    label: String,
    filled: Boolean,
    enabled: Boolean,
    onClick: () -> Unit
) {
    Text(
        text = label,
        color = if (filled && enabled) VoidBlack else InkPrimary,
        fontSize = 15.sp,
        fontWeight = FontWeight.Black,
        textAlign = TextAlign.Center,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(if (filled && enabled) Amber else SurfaceCard)
            .border(1.dp, if (filled) Amber else HairlineStrong, RoundedCornerShape(14.dp))
            .clickable(enabled = enabled, onClick = onClick)
            .padding(vertical = 14.dp)
    )
}
