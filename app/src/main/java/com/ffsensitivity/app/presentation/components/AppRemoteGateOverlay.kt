package com.ffsensitivity.app.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.remote.AppRemoteGate
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.AmberHot
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.presentation.theme.SurfaceLift
import com.ffsensitivity.app.presentation.theme.VoidBlack
import com.ffsensitivity.app.util.SafeOps

// --- Start: App remote config live wire (Sachin) ---
@Composable
fun AppRemoteGateOverlay(gate: AppRemoteGate) {
    when (gate) {
        is AppRemoteGate.None -> Unit
        is AppRemoteGate.Maintenance -> GateCard(
            title = "Under maintenance",
            body = gate.message,
            cta = null
        )
        is AppRemoteGate.ForceUpdate -> {
            val context = LocalContext.current
            GateCard(
                title = "Update required",
                body = "Please install version ${gate.minVersionName} or newer to continue.",
                cta = "Open Play Store" to {
                    SafeOps.openUrl(context, gate.playStoreUrl)
                }
            )
        }
    }
}

@Composable
private fun GateCard(
    title: String,
    body: String,
    cta: Pair<String, () -> Unit>?
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(VoidBlack)
            .statusBarsPadding()
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .background(Brush.verticalGradient(listOf(SurfaceLift, SurfaceCard)))
                .border(1.dp, Amber.copy(alpha = 0.35f), RoundedCornerShape(20.dp))
                .padding(22.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = title,
                color = AmberHot,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )
            Text(
                text = body,
                color = InkSecondary,
                fontSize = 14.sp,
                textAlign = TextAlign.Center,
                lineHeight = 20.sp
            )
            if (cta != null) {
                Button(
                    onClick = cta.second,
                    colors = ButtonDefaults.buttonColors(containerColor = Amber),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = cta.first,
                        color = InkPrimary,
                        fontWeight = FontWeight.Bold
                    )
                }
            } else {
                Text(
                    text = "Please check back soon.",
                    color = InkMuted,
                    fontSize = 12.sp
                )
            }
        }
    }
}
// --- End: App remote config live wire (Sachin) ---
