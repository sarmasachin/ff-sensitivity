package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.remote.ScratchEligibility
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.AmberHot
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.presentation.theme.VoidBlack

// --- Start: Scratch live wire (Sachin) ---
@Composable
fun DailyScratchBanner(
    eligibility: ScratchEligibility?,
    busy: Boolean,
    onRoll: () -> Unit,
    modifier: Modifier = Modifier
) {
    val can = eligibility?.canRoll == true && !busy
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(
                Brush.horizontalGradient(
                    listOf(AmberHot.copy(alpha = 0.95f), Amber)
                )
            )
            .clickable(enabled = can, onClick = onRoll)
            .padding(16.dp)
    ) {
        Text(
            text = "DAILY SCRATCH",
            color = VoidBlack.copy(alpha = 0.7f),
            fontSize = 11.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = 1.4.sp
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = when {
                eligibility == null -> "Syncing card…"
                eligibility.canRoll -> "Tap to reveal today’s Nest roll"
                !eligibility.checkinDone -> "Check in first on Daily Challenge"
                else -> "No cards left today (${eligibility.rollsUsed}/${eligibility.cardsPerDay})"
            },
            color = VoidBlack,
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "Server RNG · coins or redeem · admin odds",
            color = VoidBlack.copy(alpha = 0.65f),
            fontSize = 12.sp
        )
    }
}

@Composable
fun DailyScratchResultCard(
    title: String,
    rewardLabel: String,
    code: String?,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(SurfaceCard)
            .border(1.dp, Amber.copy(alpha = 0.35f), RoundedCornerShape(16.dp))
            .padding(14.dp)
    ) {
        Text(
            text = title,
            color = InkPrimary,
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(text = rewardLabel, color = Amber, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        if (!code.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = code, color = InkMuted, fontSize = 12.sp, fontWeight = FontWeight.Medium)
        }
    }
}
// --- End: Scratch live wire (Sachin) ---
