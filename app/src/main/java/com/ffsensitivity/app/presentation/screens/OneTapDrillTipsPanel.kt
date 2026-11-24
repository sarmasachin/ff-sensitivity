package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.AmberSoft
import com.ffsensitivity.app.presentation.theme.HairlineStrong
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.presentation.theme.SurfaceCard

/** Close-range Red Dot drill (UI tip — engine unchanged). */
internal const val ONE_TAP_DRILL_CLOSE_TITLE = "Close peek · Red Dot"
internal const val ONE_TAP_DRILL_CLOSE_BODY =
    "Pre-aim head height, short strafe, single tap. If you overshoot the skull → General −3. Body spray only → Red Dot +3."

/** Mid-range 2x drill (UI tip — engine unchanged). */
internal const val ONE_TAP_DRILL_MID_TITLE = "Mid spray · 2x Scope"
internal const val ONE_TAP_DRILL_MID_BODY =
    "Track chest→head with 2x, burst 2–3 shots. Drag feels heavy → 2x +3. Crosshair floats past head → 2x −3 (keep under Red Dot)."

/** One-line copy summary for clipboard. */
internal const val ONE_TAP_DRILL_COPY =
    "Drills: Close peek → Red Dot taps · Mid spray → 2x track (keep 2x under Red Dot)"

/**
 * One Tap Premium — situation drills for Red Dot (close) vs 2x (mid).
 */
@Composable
internal fun OneTapDrillTipsPanel(
    redDot: Int,
    scope2x: Int
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(SurfaceCard)
            .border(1.dp, HairlineStrong, RoundedCornerShape(20.dp))
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = "HEADSHOT DRILLS",
            color = Amber,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.6.sp
        )
        Text(
            text = "Practice by range — Red Dot close, 2x mid",
            color = InkPrimary,
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold
        )

        DrillCard(
            title = ONE_TAP_DRILL_CLOSE_TITLE,
            meta = "Red Dot $redDot",
            body = ONE_TAP_DRILL_CLOSE_BODY
        )
        DrillCard(
            title = ONE_TAP_DRILL_MID_TITLE,
            meta = "2x $scope2x",
            body = ONE_TAP_DRILL_MID_BODY
        )
    }
}

@Composable
private fun DrillCard(
    title: String,
    meta: String,
    body: String
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(AmberSoft, RoundedCornerShape(14.dp))
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Text(
            text = title,
            color = InkPrimary,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold
        )
        Text(
            text = meta,
            color = InkSecondary,
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium
        )
        Text(
            text = body,
            color = InkMuted,
            fontSize = 12.sp,
            lineHeight = 17.sp
        )
    }
}
