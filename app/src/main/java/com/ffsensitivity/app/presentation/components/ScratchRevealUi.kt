package com.ffsensitivity.app.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CardGiftcard
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.AmberHot
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.presentation.theme.VoidBlack

enum class ScratchRevealOutcome {
    PENDING,
    WIN
}

@Composable
fun ScratchMysteryUnderlay(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(Color(0xFF1C2330), Color(0xFF12161E), Color(0xFF0E1116))
                )
            )
            .padding(18.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(56.dp)
                .clip(RoundedCornerShape(99.dp))
                .background(Brush.radialGradient(listOf(AmberHot.copy(alpha = 0.85f), Amber)))
                .border(1.5.dp, AmberHot.copy(alpha = 0.55f), RoundedCornerShape(99.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Outlined.CardGiftcard,
                contentDescription = null,
                tint = VoidBlack,
                modifier = Modifier.size(28.dp)
            )
        }
        Spacer(modifier = Modifier.height(14.dp))
        Text(
            text = "MYSTERY PRIZE",
            color = Amber,
            fontSize = 12.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = 1.6.sp
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Scratch to reveal",
            color = InkSecondary,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = "Win coins or a redeem code",
            color = InkMuted,
            fontSize = 12.sp,
            textAlign = TextAlign.Center
        )
    }
}
