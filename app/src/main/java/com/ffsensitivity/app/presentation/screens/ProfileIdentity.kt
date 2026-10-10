package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.HairlineStrong
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.SurfaceCard

@Composable
internal fun ProfileIdentityCard(
    googleName: String,
    email: String,
    photoUrl: String,
    coins: Int,
    streakDays: Int
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(SurfaceCard)
            .border(1.dp, Amber.copy(alpha = 0.35f), RoundedCornerShape(18.dp))
            .padding(16.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            ProfileAvatar(googleName.ifBlank { email }, photoUrl)
            Spacer(modifier = Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text("GOOGLE", color = Amber, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                Text(
                    googleName.ifBlank { "Google Player" },
                    color = InkPrimary,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(email.ifBlank { "—" }, color = InkMuted, fontSize = 12.sp)
            }
        }
        Spacer(modifier = Modifier.height(14.dp))
        Row(modifier = Modifier.fillMaxWidth()) {
            ProfileStat("Coins", coins.toString(), Modifier.weight(1f))
            Spacer(modifier = Modifier.width(8.dp))
            ProfileStat("Streak", streakDays.toString(), Modifier.weight(1f))
        }
    }
}

@Composable
private fun ProfileStat(label: String, value: String, modifier: Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(SurfaceCard)
            .border(1.dp, HairlineStrong, RoundedCornerShape(12.dp))
            .padding(vertical = 10.dp, horizontal = 12.dp)
    ) {
        Text(label, color = InkMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        Text(value, color = InkPrimary, fontSize = 18.sp, fontWeight = FontWeight.Black)
    }
}
