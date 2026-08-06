package com.ffsensitivity.app.presentation.screens.login

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.AmberHot
import com.ffsensitivity.app.presentation.theme.HairlineStrong
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.presentation.theme.SurfaceLift
import com.ffsensitivity.app.presentation.theme.VoidBlack

@Composable
fun LoginTermsCheckboxRow(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    onOpenTerms: () -> Unit,
    onOpenPrivacy: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            val boxShape = RoundedCornerShape(6.dp)
            Box(
                modifier = Modifier
                    .size(22.dp)
                    .clip(boxShape)
                    .background(if (checked) Amber else SurfaceCard)
                    .border(
                        1.dp,
                        if (checked) AmberHot else HairlineStrong,
                        boxShape
                    )
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = { onCheckedChange(!checked) }
                    ),
                contentAlignment = Alignment.Center
            ) {
                if (checked) {
                    Icon(
                        imageVector = Icons.Outlined.Check,
                        contentDescription = null,
                        tint = VoidBlack,
                        modifier = Modifier.size(14.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.width(10.dp))

            Row(
                modifier = Modifier.weight(1f),
                verticalAlignment = Alignment.CenterVertically
            ) {
                LegalPlainText("I agree to the ") { onCheckedChange(!checked) }
                LegalLinkText("Terms & Conditions", onOpenTerms)
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Privacy is readable only — no checkbox required.
        Text(
            text = "Privacy Policy",
            color = InkMuted,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            textDecoration = TextDecoration.Underline,
            modifier = Modifier
                .padding(start = 32.dp)
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    onClick = onOpenPrivacy
                )
        )
    }
}

@Composable
fun LoginTermsSheet(
    onDismiss: () -> Unit,
    onReadMore: () -> Unit
) {
    LoginLegalSheet(
        eyebrow = "TERMS & CONDITIONS",
        title = "FF Sensitivity Settings",
        bullets = listOf(
            "This app provides sensitivity tools, tips, and related helpers for players. " +
                "It is fan-made and not affiliated with Garena, Krafton, or any game publisher.",
            "Calculator results and presets are guidance only. Results vary by device, " +
                "game version, and play style. We do not guarantee better aim or ranks.",
            "Do not share passwords, OTPs, or payment details in the app. Use Google Sign-In only.",
            "Do not misuse the app for illegal, abusive, or disruptive activity. " +
                "We may restrict access if Terms are violated.",
            "By continuing you also acknowledge our Privacy Policy."
        ),
        readMoreHint = "Opens app.sensitivitysettings.com/terms",
        onDismiss = onDismiss,
        onReadMore = onReadMore
    )
}

@Composable
fun LoginPrivacySheet(
    onDismiss: () -> Unit,
    onReadMore: () -> Unit
) {
    LoginLegalSheet(
        eyebrow = "PRIVACY POLICY",
        title = "How we handle your data",
        bullets = listOf(
            "We collect only what is needed to run the app — for example Google Sign-In details, " +
                "support messages you send, and basic device info used for sensitivity tools.",
            "Calculator fields (device, RAM, DPI, play style) are used to suggest settings. " +
                "We do not sell your personal information.",
            "We may use your account email or contact details to reply to support and keep " +
                "the service secure (spam / abuse prevention).",
            "You can request access, correction, or deletion of your submitted personal data " +
                "by emailing support@sensitivitysettings.com.",
            "The app is for a general audience and is not directed at children under 13."
        ),
        readMoreHint = "Opens app.sensitivitysettings.com/privacy",
        onDismiss = onDismiss,
        onReadMore = onReadMore
    )
}

@Composable
private fun LoginLegalSheet(
    eyebrow: String,
    title: String,
    bullets: List<String>,
    readMoreHint: String,
    onDismiss: () -> Unit,
    onReadMore: () -> Unit
) {
    val shape = RoundedCornerShape(22.dp)

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 22.dp)
                .clip(shape)
                .background(
                    Brush.verticalGradient(listOf(SurfaceLift, SurfaceCard))
                )
                .border(1.dp, Amber.copy(alpha = 0.28f), shape)
                .padding(horizontal = 18.dp, vertical = 18.dp)
        ) {
            Text(
                text = eyebrow,
                color = Amber,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.4.sp
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = title,
                color = InkPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(12.dp))

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 280.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                bullets.forEach { LegalBullet(it) }
            }

            Spacer(modifier = Modifier.height(14.dp))

            Text(
                text = "Read more",
                color = AmberHot,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                textDecoration = TextDecoration.Underline,
                modifier = Modifier
                    .align(Alignment.Start)
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = onReadMore
                    )
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = readMoreHint,
                color = InkMuted,
                fontSize = 11.sp
            )

            Spacer(modifier = Modifier.height(14.dp))

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(Amber)
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = onDismiss
                    )
                    .padding(vertical = 12.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Close",
                    color = VoidBlack,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

@Composable
private fun LegalPlainText(text: String, onClick: () -> Unit) {
    Text(
        text = text,
        color = InkSecondary,
        fontSize = 12.sp,
        fontWeight = FontWeight.Medium,
        lineHeight = 17.sp,
        modifier = Modifier.clickable(
            interactionSource = remember { MutableInteractionSource() },
            indication = null,
            onClick = onClick
        )
    )
}

@Composable
private fun LegalLinkText(text: String, onClick: () -> Unit) {
    Text(
        text = text,
        color = AmberHot,
        fontSize = 12.sp,
        fontWeight = FontWeight.Bold,
        textDecoration = TextDecoration.Underline,
        lineHeight = 17.sp,
        modifier = Modifier.clickable(
            interactionSource = remember { MutableInteractionSource() },
            indication = null,
            onClick = onClick
        )
    )
}

@Composable
private fun LegalBullet(text: String) {
    Text(
        text = "•  $text",
        color = InkSecondary,
        fontSize = 13.sp,
        lineHeight = 19.sp,
        modifier = Modifier.padding(bottom = 10.dp)
    )
}
