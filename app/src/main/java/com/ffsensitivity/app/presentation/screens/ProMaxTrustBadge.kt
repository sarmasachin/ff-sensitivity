package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.AppSession
import com.ffsensitivity.app.data.ProMaxCrowdOffsets
import com.ffsensitivity.app.engine.ProMaxCrowdTierLabel
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.Hairline
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.presentation.theme.SurfaceLift

@Composable
internal fun ProMaxTrustBadge() {
    val crowd = AppSession.proMaxCrowdOffsets
    val confPct = (crowd.confidence * 100).toInt().coerceIn(0, 100)
    val tier = ProMaxCrowdTierLabel.trustTier(crowd.matchFrom, crowd.matchCount)
    val compareLine =
        if (crowd.matchCount > 0) {
            "Matched ${crowd.matchCount} compare · $confPct% conf · $tier"
        } else {
            "Compare peers ready · waiting for live JWT data"
        }
    val blendLine = crowd.blendFrom.trim().takeIf { it.isNotEmpty() }?.let { raw ->
        "Blended with ${ProMaxCrowdTierLabel.trustTier(raw, 1)}"
    }
    val agreeLine = crowd.fieldAgreement.weakestLabel()
    val shareLine = sharePullLine(crowd)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(SurfaceLift.copy(alpha = 0.65f))
            .border(1.dp, Hairline, RoundedCornerShape(14.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp)
    ) {
        Text(
            text = "TRUST SIGNAL",
            color = Amber,
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.4.sp
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(text = compareLine, color = InkSecondary, fontSize = 12.sp)
        if (blendLine != null) {
            Spacer(modifier = Modifier.height(2.dp))
            Text(text = blendLine, color = InkMuted, fontSize = 12.sp)
        }
        if (agreeLine != null) {
            Spacer(modifier = Modifier.height(2.dp))
            Text(text = agreeLine, color = InkMuted, fontSize = 12.sp)
        }
        Spacer(modifier = Modifier.height(2.dp))
        Text(text = shareLine, color = InkMuted, fontSize = 12.sp)
    }
}

/** Effective pull % (after conflict dampen) when ProMax calc has run. */
private fun sharePullLine(crowd: ProMaxCrowdOffsets): String {
    if (!crowd.community.active) {
        return "Community share · no matching cards yet"
    }
    val basePct = (crowd.community.weight * 100).toInt().coerceIn(0, 32)
    val eff = AppSession.proMaxSharePullWeight
    val effPct = ((eff ?: crowd.community.weight) * 100).toInt().coerceIn(0, 32)
    val damp =
        if (eff != null && effPct < basePct) " · damp $basePct→$effPct%" else ""
    return "Community share ×${crowd.community.matchCount} · " +
        "$effPct% pull$damp · ${crowd.community.source}"
}
