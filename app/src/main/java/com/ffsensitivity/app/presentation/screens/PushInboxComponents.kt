package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.NotificationsNone
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.remote.PushInboxMessage
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.AmberHot
import com.ffsensitivity.app.presentation.theme.HairlineStrong
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.presentation.theme.SurfaceLift

@Composable
fun PushInboxEmptyState(
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(SurfaceCard)
            .border(1.dp, HairlineStrong, RoundedCornerShape(18.dp))
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Box(
            modifier = Modifier
                .size(52.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(SurfaceLift)
                .border(1.dp, Amber.copy(alpha = 0.35f), RoundedCornerShape(16.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Outlined.NotificationsNone,
                contentDescription = null,
                tint = AmberHot,
                modifier = Modifier.size(26.dp)
            )
        }
        Text(
            text = "No messages yet",
            color = InkPrimary,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = "Campaign alerts and updates will show up here after we send them.",
            color = InkSecondary,
            fontSize = 13.sp,
            lineHeight = 18.sp
        )
    }
}

@Composable
fun PushInboxMessageCard(
    message: PushInboxMessage,
    onOpen: () -> Unit,
    modifier: Modifier = Modifier
) {
    val title = message.title.trim().ifBlank { "Notification" }
    val body = message.body.trim()
    val whenLabel = formatPushSentAt(message.sentAt, message.sentAtMs)

    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(SurfaceCard)
            .border(1.dp, HairlineStrong, RoundedCornerShape(16.dp))
            .clickable(onClick = onOpen)
            .padding(14.dp),
        verticalAlignment = Alignment.Top
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(SurfaceLift)
                .border(1.dp, Amber.copy(alpha = 0.3f), RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Outlined.NotificationsNone,
                contentDescription = null,
                tint = Amber,
                modifier = Modifier.size(20.dp)
            )
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                color = InkPrimary,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            if (body.isNotBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = body,
                    color = InkSecondary,
                    fontSize = 12.sp,
                    lineHeight = 17.sp,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis
                )
            }
            if (whenLabel.isNotBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = whenLabel,
                    color = InkMuted,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
        Spacer(modifier = Modifier.width(6.dp))
        Icon(
            Icons.Outlined.ChevronRight,
            contentDescription = null,
            tint = InkMuted,
            modifier = Modifier
                .padding(top = 2.dp)
                .size(18.dp)
        )
    }
}

/** Device-local clock from sentAtMs (IST instant). Stamp string is fallback. */
fun formatPushSentAt(raw: String?, sentAtMs: Long? = null): String {
    val ms = sentAtMs?.takeIf { it > 0L }
    if (ms != null) {
        val now = System.currentTimeMillis()
        val diff = now - ms
        if (diff in 0 until 60_000L) return "Just now"
        if (diff in 60_000L until 3_600_000L) {
            val mins = (diff / 60_000L).toInt().coerceAtLeast(1)
            return "$mins min ago"
        }
        val cal = java.util.Calendar.getInstance().apply { timeInMillis = ms }
        val h = cal.get(java.util.Calendar.HOUR_OF_DAY)
        val mi = cal.get(java.util.Calendar.MINUTE)
        val clock = "%02d:%02d".format(h, mi)
        val today = java.util.Calendar.getInstance()
        val sameDay =
            cal.get(java.util.Calendar.YEAR) == today.get(java.util.Calendar.YEAR) &&
                cal.get(java.util.Calendar.DAY_OF_YEAR) ==
                today.get(java.util.Calendar.DAY_OF_YEAR)
        if (sameDay) return "Today $clock"
        val months = arrayOf(
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        )
        val mon = months[cal.get(java.util.Calendar.MONTH)]
        val day = cal.get(java.util.Calendar.DAY_OF_MONTH)
        return "$day $mon, $clock"
    }
    val s = raw?.trim().orEmpty()
    if (s.isBlank()) return ""
    return s.take(32)
}
