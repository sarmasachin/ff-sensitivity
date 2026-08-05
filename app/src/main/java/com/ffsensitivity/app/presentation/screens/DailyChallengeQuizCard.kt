package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.automirrored.outlined.HelpOutline
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.ChallengeQuizTimingConfig
import com.ffsensitivity.app.data.QuizUiPhase
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.AmberHot
import com.ffsensitivity.app.presentation.theme.AmberSoft
import com.ffsensitivity.app.presentation.theme.Hairline
import com.ffsensitivity.app.presentation.theme.HairlineStrong
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.presentation.theme.Success
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.presentation.theme.SurfaceDeep
import com.ffsensitivity.app.presentation.theme.SurfaceLift
import com.ffsensitivity.app.presentation.theme.VoidBlack
import kotlinx.coroutines.delay

@Composable
fun DailyChallengeQuizCard(
    question: String,
    options: List<String>,
    selectedOption: Int,
    onSelect: (Int) -> Unit,
    phase: QuizUiPhase,
    countdownEndsAtMs: Long,
    quizBoostReady: Boolean,
    actionEnabled: Boolean,
    onSubmit: () -> Unit
) {
    val showQuestion = phase == QuizUiPhase.AVAILABLE || phase == QuizUiPhase.OPEN
    val doneCorrect = phase == QuizUiPhase.DONE_CORRECT
    val locked = phase == QuizUiPhase.LOCKED
    val closed = phase == QuizUiPhase.CLOSED

    var nowMs by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(countdownEndsAtMs, phase) {
        if (countdownEndsAtMs <= 0L) return@LaunchedEffect
        while (true) {
            nowMs = System.currentTimeMillis()
            if (nowMs >= countdownEndsAtMs) break
            delay(250)
        }
        nowMs = System.currentTimeMillis()
    }
    val remainingMs = (countdownEndsAtMs - nowMs).coerceAtLeast(0L)
    val countdownLabel = formatCountdown(remainingMs)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(Brush.verticalGradient(listOf(SurfaceLift, SurfaceCard)))
            .border(
                1.dp,
                when {
                    doneCorrect -> Success.copy(alpha = 0.4f)
                    locked || closed -> Amber.copy(alpha = 0.28f)
                    else -> Amber.copy(alpha = 0.3f)
                },
                RoundedCornerShape(20.dp)
            )
            .padding(16.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(
                        when {
                            doneCorrect -> Success.copy(alpha = 0.15f)
                            locked || closed -> SurfaceDeep.copy(alpha = 0.6f)
                            else -> AmberSoft
                        }
                    )
                    .border(
                        1.dp,
                        when {
                            doneCorrect -> Success.copy(alpha = 0.4f)
                            else -> Amber.copy(alpha = 0.35f)
                        },
                        RoundedCornerShape(12.dp)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = when {
                        doneCorrect -> Icons.Outlined.CheckCircle
                        locked -> Icons.Outlined.Lock
                        closed -> Icons.Outlined.Timer
                        else -> Icons.AutoMirrored.Outlined.HelpOutline
                    },
                    contentDescription = null,
                    tint = when {
                        doneCorrect -> Success
                        else -> Amber
                    },
                    modifier = Modifier.size(22.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "Daily Quiz",
                    color = InkPrimary,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(3.dp))
                Text(
                    text = when {
                        doneCorrect -> "Correct · reward claimed"
                        locked -> "Wrong answer · opens in $countdownLabel"
                        closed -> "Open window ended · try again tomorrow"
                        phase == QuizUiPhase.OPEN -> "Open window · closes in $countdownLabel"
                        quizBoostReady -> {
                            val correct = ChallengeQuizTimingConfig.signedCoins(
                                ChallengeQuizTimingConfig.quizCorrectCoins * 2
                            )
                            "1 question · 2× boost ready on correct ($correct)"
                        }
                        else -> {
                            val correct = ChallengeQuizTimingConfig.signedCoins(
                                ChallengeQuizTimingConfig.quizCorrectCoins
                            )
                            val wrong = ChallengeQuizTimingConfig.signedCoins(
                                ChallengeQuizTimingConfig.quizWrongCoins
                            )
                            "1 question · $correct if correct · $wrong if wrong"
                        }
                    },
                    color = InkSecondary,
                    fontSize = 12.sp,
                    lineHeight = 16.sp
                )
            }
        }

        if (showQuestion) {
            Spacer(modifier = Modifier.height(14.dp))
            Text(
                text = question,
                color = InkPrimary,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                lineHeight = 22.sp
            )
            Spacer(modifier = Modifier.height(12.dp))
            options.forEachIndexed { index, option ->
                val selected = selectedOption == index
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 8.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(if (selected) AmberSoft else SurfaceDeep.copy(alpha = 0.55f))
                        .border(
                            1.dp,
                            if (selected) Amber.copy(alpha = 0.55f) else HairlineStrong,
                            RoundedCornerShape(12.dp)
                        )
                        .clickable(enabled = !doneCorrect) { onSelect(index) }
                        .padding(horizontal = 14.dp, vertical = 12.dp)
                ) {
                    Text(
                        text = "${'A' + index}.  $option",
                        color = if (selected) AmberHot else InkSecondary,
                        fontSize = 13.sp,
                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium
                    )
                }
            }
        } else {
            Spacer(modifier = Modifier.height(14.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(SurfaceDeep.copy(alpha = 0.45f))
                    .border(1.dp, HairlineStrong, RoundedCornerShape(12.dp))
                    .padding(14.dp)
            ) {
                Text(
                    text = when {
                        locked -> "Question locked. Countdown on the button below."
                        closed -> "Question is off for today after the open window."
                        else -> "Question hidden."
                    },
                    color = InkMuted,
                    fontSize = 13.sp,
                    lineHeight = 18.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(6.dp))
        QuizActionButton(
            label = when {
                doneCorrect -> "Answered"
                locked -> "Opens in $countdownLabel"
                closed -> "Closed today"
                else -> "Submit Answer"
            },
            enabled = actionEnabled && showQuestion && !doneCorrect,
            onClick = onSubmit
        )
    }
}

@Composable
private fun QuizActionButton(
    label: String,
    enabled: Boolean,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(48.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(
                if (enabled) Brush.horizontalGradient(listOf(Amber, AmberHot))
                else Brush.horizontalGradient(listOf(SurfaceLift, SurfaceLift))
            )
            .border(
                1.dp,
                if (enabled) Amber.copy(alpha = 0.35f) else Hairline,
                RoundedCornerShape(14.dp)
            )
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            color = if (enabled) VoidBlack else InkMuted,
            fontSize = 14.sp,
            fontWeight = FontWeight.Black
        )
    }
}

private fun formatCountdown(ms: Long): String {
    val totalSec = (ms / 1000L).coerceAtLeast(0L)
    val h = totalSec / 3600L
    val m = (totalSec % 3600L) / 60L
    val s = totalSec % 60L
    return String.format(java.util.Locale.US, "%02d:%02d:%02d", h, m, s)
}
