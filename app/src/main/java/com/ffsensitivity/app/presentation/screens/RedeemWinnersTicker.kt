package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.basicMarquee
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.presentation.theme.Success

/** Green left-scrolling line of recent redeem-code winners under Daily/Weekly tabs. */
@Composable
internal fun RedeemWinnersTicker(
    lines: List<String>,
    emptyHint: String = "Win a code — your name can show here"
) {
    val text = if (lines.isEmpty()) {
        emptyHint
    } else {
        lines.joinToString(separator = "   ·   ")
    }
    Text(
        text = text,
        color = Success,
        fontSize = 12.sp,
        fontWeight = FontWeight.SemiBold,
        maxLines = 1,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 2.dp, vertical = 2.dp)
            .basicMarquee(iterations = Int.MAX_VALUE)
    )
}
