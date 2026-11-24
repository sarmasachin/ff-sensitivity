package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
import com.ffsensitivity.app.data.DpiPreference
import com.ffsensitivity.app.engine.SensitivityResult
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.AmberHot
import com.ffsensitivity.app.presentation.theme.AmberSoft
import com.ffsensitivity.app.presentation.theme.HairlineStrong
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.presentation.theme.SurfaceCard

/** Clipboard / share label for One Tap Premium results. */
internal const val ONE_TAP_COPY_LABEL = "One Tap Premium · Headshot"

/** Suggested DPI band for One Tap (UI hint only — engine math unchanged). */
internal const val ONE_TAP_DPI_BAND = "Mid DPI"

/** Wizard DPI-step hint when on One Tap Premium. */
internal const val ONE_TAP_DPI_WIZARD_HINT =
    "One Tap tip: Mid DPI band for smoother headshot flicks. High DPI works — we cut sensi more."

/** Results / panel DPI tip line. */
internal const val ONE_TAP_DPI_TIP =
    "DPI tip: Mid DPI band for one-tap flicks. High DPI → sensi already lowered."

/** One Tap–biased DPI card subtitles (suggest Mid; do not lock choice). */
internal fun oneTapDpiSubtitle(option: DpiPreference): String = when (option) {
    DpiPreference.NONE -> "Stock DPI — ok; Mid is smoother for one-tap"
    DpiPreference.MID -> "Suggested for One Tap · smoother headshot drag"
    DpiPreference.HIGH -> "Usable — sensi is lowered more to balance"
}

/**
 * Plain-text block copied from One Tap results — clearly labelled for headshot use.
 */
internal fun oneTapCopyText(
    deviceLabel: String,
    playstyleSummary: String,
    s: SensitivityResult
): String {
    val delta = s.redDot - s.general
    val deltaLabel = if (delta >= 0) "+$delta" else "$delta"
    return buildString {
        appendLine(ONE_TAP_COPY_LABEL)
        appendLine("Device: $deviceLabel")
        appendLine("Playstyle: $playstyleSummary")
        appendLine("General: ${s.general}")
        appendLine("Red Dot: ${s.redDot} (Δ vs General $deltaLabel)")
        appendLine("2x Scope: ${s.scope2x}")
        appendLine("4x Scope: ${s.scope4x}")
        appendLine("Sniper: ${s.sniper}")
        appendLine("Free Look: ${s.freeLook}")
        appendLine("Fire Button: ${s.fireButton}%")
        appendLine("Apply order: General → Red Dot → 2x")
        appendLine("Tip: Overshoot → General -3 · Body-only → Red Dot +3")
        appendLine(ONE_TAP_DPI_TIP)
        appendLine(ONE_TAP_DRILL_COPY)
    }.trim()
}

/**
 * One Tap Premium results — headshot guide panel.
 * Shows Red Dot vs General delta, apply order, and a 1-step adjust tip.
 */
@Composable
internal fun OneTapHeadshotPanel(
    general: Int,
    redDot: Int,
    scope2x: Int
) {
    val delta = redDot - general
    val deltaLabel = if (delta >= 0) "+$delta" else "$delta"
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(SurfaceCard)
            .border(1.dp, HairlineStrong, RoundedCornerShape(20.dp))
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text(
            text = "HEADSHOT GUIDE",
            color = Amber,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.6.sp
        )
        Text(
            text = "One Tap Premium · Red Dot focused",
            color = InkPrimary,
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(AmberSoft, RoundedCornerShape(14.dp))
                .padding(horizontal = 14.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(
                    text = "Red Dot − General",
                    color = InkMuted,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "$redDot − $general = $deltaLabel",
                    color = AmberHot,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            Column {
                Text(
                    text = "2x Scope",
                    color = InkMuted,
                    fontSize = 11.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = scope2x.toString(),
                    color = InkPrimary,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        Text(
            text = "Apply order",
            color = InkSecondary,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold
        )
        Text(
            text = "1) General  →  2) Red Dot  →  3) 2x Scope",
            color = InkPrimary,
            fontSize = 13.sp,
            lineHeight = 18.sp
        )
        Text(
            text = "Set General first, then lock Red Dot for headshots, then 2x for mid-range.",
            color = InkMuted,
            fontSize = 12.sp,
            lineHeight = 17.sp
        )

        Text(
            text = "1-step adjust",
            color = InkSecondary,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold
        )
        Text(
            text = "Overshoot → General −3. Body-only hits → Red Dot +3. Keep Red Dot above General.",
            color = InkPrimary,
            fontSize = 13.sp,
            lineHeight = 18.sp
        )

        Text(
            text = "DPI suggest",
            color = InkSecondary,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold
        )
        Text(
            text = "$ONE_TAP_DPI_BAND · $ONE_TAP_DPI_TIP",
            color = InkPrimary,
            fontSize = 13.sp,
            lineHeight = 18.sp
        )
    }
}
