package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.ffsensitivity.app.data.SharedSensiCard
import com.ffsensitivity.app.data.remote.ApiException
import com.ffsensitivity.app.data.remote.CommunityRepository
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.AmberHot
import com.ffsensitivity.app.presentation.theme.AmberSoft
import com.ffsensitivity.app.presentation.theme.Hairline
import com.ffsensitivity.app.presentation.theme.HairlineStrong
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.presentation.theme.SurfaceDeep
import com.ffsensitivity.app.presentation.theme.SurfaceLift
import com.ffsensitivity.app.presentation.theme.VoidBlack
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.SafeOps
import com.ffsensitivity.app.util.ShareCardBitmap
import java.util.Locale
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun ShareCommunityTab(
    modifier: Modifier = Modifier,
    onRequireSignIn: () -> Unit = {}
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var viewing by remember { mutableStateOf<SharedSensiCard?>(null) }
    var sharing by remember { mutableStateOf(false) }
    var reporting by remember { mutableStateOf(false) }
    var cards by remember { mutableStateOf<List<SharedSensiCard>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var authRequired by remember { mutableStateOf(false) }
    var refreshKey by remember { mutableStateOf(0) }

    fun reload() {
        refreshKey += 1
    }

    LaunchedEffect(refreshKey) {
        loading = true
        loadError = null
        authRequired = false
        val result = withContext(Dispatchers.IO) {
            CommunityRepository.feed(context)
        }
        result.fold(
            onSuccess = { list ->
                cards = list.filter { it.isValidForDisplay() }
                loadError = null
                authRequired = false
            },
            onFailure = { err ->
                AppLog.e("Community feed load failed", err)
                cards = emptyList()
                authRequired = err is ApiException && err.code == "AUTH_REQUIRED"
                loadError = when (err) {
                    is ApiException -> err.message
                    is java.net.ConnectException,
                    is java.net.SocketTimeoutException,
                    is java.net.UnknownHostException,
                    is java.io.IOException ->
                        "Can't reach the server. Check Wi‑Fi and try again."
                    else -> "Couldn't load Community. Try again."
                }
            }
        )
        loading = false
    }

    fun shareCardImage(card: SharedSensiCard) {
        if (sharing) return
        sharing = true
        scope.launch {
            val ok = try {
                runCatching {
                    val bmp = withContext(Dispatchers.Default) {
                        ShareCardBitmap.render(card)
                    }
                    try {
                        val file = withContext(Dispatchers.IO) {
                            SafeOps.writeSharePng(context, bmp)
                        } ?: return@runCatching false
                        SafeOps.shareImageFile(
                            context = context,
                            title = "Share sensitivity card",
                            file = file,
                            caption = ShareCardBitmap.captionText(card)
                        )
                    } finally {
                        runCatching { bmp.recycle() }
                    }
                }.getOrElse { false }
            } finally {
                sharing = false
            }
            if (!ok) {
                SafeOps.toast(context, "Could not share card. Try again.")
            }
        }
    }

    Box(modifier = modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            item {
                Text(
                    text = "COMMUNITY",
                    color = Amber,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.6.sp
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Pro sensitivity cards",
                    color = InkPrimary,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Black,
                    lineHeight = 30.sp
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Approved pro cards from players · share image · full settings in app.",
                    color = InkSecondary,
                    fontSize = 13.sp,
                    lineHeight = 18.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                if (loadError != null) {
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = loadError.orEmpty(),
                        color = InkSecondary,
                        fontSize = 13.sp,
                        lineHeight = 18.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = if (authRequired) "Sign in" else "Tap to retry",
                        color = Amber,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.clickable {
                            if (authRequired) onRequireSignIn() else reload()
                        }
                    )
                }
            }

            when {
                loading -> {
                    item {
                        Text(
                            text = "Loading community…",
                            color = InkMuted,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(vertical = 24.dp)
                        )
                    }
                }
                cards.isEmpty() && loadError == null -> {
                    item { CommunityEmptyState() }
                }
                else -> {
                    items(cards, key = { it.id }) { card ->
                        CommunityProCard(
                            card = card,
                            onShare = { shareCardImage(card) },
                            onView = { viewing = card }
                        )
                    }
                }
            }
        }

        viewing?.let { card ->
            ViewSensitivityDialog(
                card = card,
                onDismiss = { viewing = null },
                onCopy = {
                    runCatching {
                        val ok = SafeOps.copyText(context, "ff_sensi", buildFullSettingsText(card))
                        SafeOps.toast(
                            context,
                            if (ok) "Sensitivity copied" else "Could not copy"
                        )
                    }.onFailure {
                        SafeOps.toast(context, "Could not copy settings")
                    }
                },
                onShare = { shareCardImage(card) },
                onReport = {
                    if (reporting) return@ViewSensitivityDialog
                    reporting = true
                    scope.launch {
                        try {
                            val result = withContext(Dispatchers.IO) {
                                CommunityRepository.report(context, card.id)
                            }
                            result.fold(
                                onSuccess = {
                                    SafeOps.toast(context, "Reported. Thanks — staff will review.")
                                    viewing = null
                                },
                                onFailure = { err ->
                                    AppLog.e("Community report failed", err)
                                    if (err is ApiException && err.code == "AUTH_REQUIRED") {
                                        SafeOps.toast(context, err.message)
                                        viewing = null
                                        onRequireSignIn()
                                    } else {
                                        val msg = when (err) {
                                            is ApiException -> err.message
                                            else -> "Could not report. Try again."
                                        }
                                        SafeOps.toast(context, msg)
                                    }
                                }
                            )
                        } finally {
                            reporting = false
                        }
                    }
                }
            )
        }
    }
}

@Composable
private fun CommunityEmptyState() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(Brush.verticalGradient(listOf(SurfaceLift, SurfaceCard)))
            .border(1.dp, HairlineStrong, RoundedCornerShape(20.dp))
            .padding(22.dp)
    ) {
        Text(
            text = "NO CARDS YET",
            color = Amber,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.4.sp
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Community cards unavailable",
            color = InkPrimary,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "Approved cards appear here after staff review. Submit yours from Share Mine.",
            color = InkSecondary,
            fontSize = 13.sp,
            lineHeight = 18.sp
        )
    }
}

@Composable
private fun CommunityProCard(
    card: SharedSensiCard,
    onShare: () -> Unit,
    onView: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(IntrinsicSize.Min)
            .clip(RoundedCornerShape(22.dp))
            .background(Brush.verticalGradient(listOf(SurfaceLift, SurfaceCard)))
            .border(1.dp, Amber.copy(alpha = 0.34f), RoundedCornerShape(22.dp))
    ) {
        Box(
            modifier = Modifier
                .width(4.dp)
                .fillMaxHeight()
                .background(Brush.verticalGradient(listOf(AmberHot, Amber)))
        )
        Column(
            modifier = Modifier
                .weight(1f)
                .padding(start = 14.dp, end = 16.dp, top = 16.dp, bottom = 16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "PRO SETUP",
                    color = Amber,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.4.sp
                )
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(AmberSoft)
                        .border(1.dp, Amber.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
                        .clickable(onClick = onShare),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Share,
                        contentDescription = "Share card",
                        tint = AmberHot,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = card.name,
                color = InkPrimary,
                fontSize = 22.sp,
                fontWeight = FontWeight.Black,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "FF ID · ${card.freeFireId}",
                color = InkSecondary,
                fontSize = 12.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                CommunityChip(card.rank)
                CommunityChip(card.role)
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = card.deviceLabel,
                color = InkSecondary,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            if (card.deviceMeta.isNotBlank()) {
                Text(
                    text = card.deviceMeta,
                    color = InkMuted,
                    fontSize = 12.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(SurfaceDeep.copy(alpha = 0.55f))
                    .border(1.dp, Hairline, RoundedCornerShape(12.dp))
                    .padding(horizontal = 10.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                CommunityStat("Matches", formatCount(card.matches))
                CommunityStat("Kills", formatCount(card.kills))
                CommunityStat("HS", formatCount(card.headshots))
                CommunityStat("KD", card.kd)
            }
            Spacer(modifier = Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Outlined.Lock,
                    contentDescription = null,
                    tint = InkMuted,
                    modifier = Modifier.size(12.dp)
                )
                Spacer(modifier = Modifier.width(5.dp))
                Text(
                    text = "Full sensitivity locked · open in app",
                    color = InkMuted,
                    fontSize = 11.sp
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(Brush.horizontalGradient(listOf(Amber, AmberHot)))
                    .clickable(onClick = onView),
                contentAlignment = Alignment.Center
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Outlined.Visibility,
                        contentDescription = null,
                        tint = VoidBlack,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "View Sensitivity Settings",
                        color = VoidBlack,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }
        }
    }
}

@Composable
private fun CommunityChip(text: String) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(9.dp))
            .background(SurfaceDeep.copy(alpha = 0.7f))
            .border(1.dp, HairlineStrong, RoundedCornerShape(9.dp))
            .padding(horizontal = 10.dp, vertical = 5.dp)
    ) {
        Text(
            text = text,
            color = InkSecondary,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun CommunityStat(label: String, value: String) {
    Column {
        Text(text = label, color = InkMuted, fontSize = 10.sp)
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = value,
            color = InkPrimary,
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun ViewSensitivityDialog(
    card: SharedSensiCard,
    onDismiss: () -> Unit,
    onCopy: () -> Unit,
    onShare: () -> Unit,
    onReport: () -> Unit
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .clip(RoundedCornerShape(22.dp))
                .background(Brush.verticalGradient(listOf(SurfaceLift, SurfaceCard)))
                .border(1.dp, Amber.copy(alpha = 0.42f), RoundedCornerShape(22.dp))
                .padding(18.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "SENSITIVITY",
                        color = Amber,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.4.sp
                    )
                    Text(
                        text = card.name,
                        color = InkPrimary,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Black,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .clip(RoundedCornerShape(11.dp))
                        .background(SurfaceDeep)
                        .border(1.dp, HairlineStrong, RoundedCornerShape(11.dp))
                        .clickable(onClick = onDismiss),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Outlined.Close,
                        contentDescription = "Close",
                        tint = InkPrimary,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "${card.rank} · ${card.role}",
                color = InkSecondary,
                fontSize = 12.sp
            )
            Text(
                text = "FF ID · ${card.freeFireId}",
                color = InkMuted,
                fontSize = 12.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = card.deviceLabel,
                color = InkMuted,
                fontSize = 12.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(SurfaceDeep.copy(alpha = 0.5f))
                    .padding(horizontal = 10.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                CommunityStat("Matches", formatCount(card.matches))
                CommunityStat("Kills", formatCount(card.kills))
                CommunityStat("HS", formatCount(card.headshots))
                CommunityStat("KD", card.kd)
            }
            Spacer(modifier = Modifier.height(14.dp))
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(SurfaceDeep.copy(alpha = 0.45f))
                    .border(1.dp, HairlineStrong, RoundedCornerShape(14.dp))
                    .padding(horizontal = 14.dp, vertical = 8.dp)
            ) {
                SensiDetailRow("General", card.general.coerceIn(0, 200))
                SensiDetailRow("Red Dot", card.redDot.coerceIn(0, 200))
                SensiDetailRow("2x Scope", card.scope2x.coerceIn(0, 200))
                SensiDetailRow("4x Scope", card.scope4x.coerceIn(0, 200))
                SensiDetailRow("AWM", card.awm.coerceIn(0, 200))
                SensiDetailRow("Free Look", card.freeLook.coerceIn(0, 200))
            }
            Spacer(modifier = Modifier.height(16.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(SurfaceLift)
                        .border(1.dp, Amber.copy(alpha = 0.35f), RoundedCornerShape(14.dp))
                        .clickable(onClick = onShare),
                    contentAlignment = Alignment.Center
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Outlined.Share,
                            contentDescription = null,
                            tint = AmberHot,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Share",
                            color = AmberHot,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
                Box(
                    modifier = Modifier
                        .weight(1.2f)
                        .height(48.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(Brush.horizontalGradient(listOf(Amber, AmberHot)))
                        .clickable(onClick = onCopy),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Copy Settings",
                        color = VoidBlack,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = "Report this post",
                color = InkMuted,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier
                    .align(Alignment.CenterHorizontally)
                    .clickable(onClick = onReport)
                    .padding(vertical = 6.dp)
            )
        }
    }
}

@Composable
private fun SensiDetailRow(label: String, value: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(text = label, color = InkSecondary, fontSize = 13.sp)
        Text(
            text = value.toString(),
            color = AmberHot,
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

private fun formatCount(value: Int): String =
    String.format(Locale.US, "%,d", value.coerceAtLeast(0))

private fun SharedSensiCard.isValidForDisplay(): Boolean {
    if (id.isBlank() || name.isBlank() || freeFireId.isBlank()) return false
    if (rank.isBlank() || role.isBlank() || deviceLabel.isBlank()) return false
    if (matches !in 0..SHARE_STAT_MAX) return false
    if (kills !in 0..SHARE_STAT_MAX) return false
    if (headshots !in 0..SHARE_STAT_MAX) return false
    val values = listOf(general, redDot, scope2x, scope4x, awm, freeLook)
    return values.all { it in 0..200 }
}

private fun buildFullSettingsText(card: SharedSensiCard): String {
    return buildString {
        appendLine("${card.name} · ${card.rank} · ${card.role}")
        appendLine("FF ID: ${card.freeFireId}")
        appendLine(card.deviceLabel)
        appendLine(
            "Matches: ${card.matches} · Kills: ${card.kills} · HS: ${card.headshots} · KD: ${card.kd}"
        )
        appendLine("General: ${card.general.coerceIn(0, 200)}")
        appendLine("Red Dot: ${card.redDot.coerceIn(0, 200)}")
        appendLine("2x: ${card.scope2x.coerceIn(0, 200)}")
        appendLine("4x: ${card.scope4x.coerceIn(0, 200)}")
        appendLine("AWM: ${card.awm.coerceIn(0, 200)}")
        appendLine("Free Look: ${card.freeLook.coerceIn(0, 200)}")
    }
}
