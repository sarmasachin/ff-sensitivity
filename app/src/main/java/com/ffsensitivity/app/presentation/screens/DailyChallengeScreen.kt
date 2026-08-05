package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.PaddingValues
import com.ffsensitivity.app.data.DailyChallengeStore
import com.ffsensitivity.app.data.remote.ChallengeRepository
import com.ffsensitivity.app.presentation.components.AtmosphereScaffold
import com.ffsensitivity.app.presentation.components.InlineErrorBanner
import com.ffsensitivity.app.util.AppLog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun DailyChallengeScreen(
    contentPadding: PaddingValues,
    onBack: () -> Boolean
) {
    val context = LocalContext.current
    var tab by remember { mutableStateOf(ChallengeTab.TODAY) }
    var actionError by remember { mutableStateOf<ChallengeUiError?>(null) }
    var snap by remember {
        mutableStateOf(EmptySafeSnapshot)
    }

    fun clearError() {
        actionError = null
    }

    fun showError(error: ChallengeUiError) {
        actionError = error
    }

    fun refreshSnapshot(): Boolean {
        return runCatching {
            snap = DailyChallengeStore.snapshot(context)
            true
        }.getOrElse {
            AppLog.e("Daily challenge snapshot failed", it)
            snap = EmptySafeSnapshot
            showError(
                ChallengeUiError(
                    code = "CHALLENGE_SNAPSHOT_FAILED",
                    title = "Challenge unavailable",
                    message = "Could not load today’s progress. Try again.",
                    retryKind = ChallengeRetryKind.REFRESH_SNAPSHOT
                )
            )
            false
        }
    }

    fun backSafe() {
        clearError()
        val ok = runCatching { onBack() }.getOrElse {
            AppLog.e("Daily challenge back crashed", it)
            false
        }
        if (!ok) {
            showError(
                ChallengeUiError(
                    code = "CHALLENGE_BACK_FAILED",
                    title = "Couldn’t go back",
                    message = "Navigation failed. Try again."
                )
            )
        }
    }

    fun runRetry(error: ChallengeUiError) {
        when (error.retryKind) {
            ChallengeRetryKind.REFRESH_SNAPSHOT -> {
                clearError()
                refreshSnapshot()
            }
            ChallengeRetryKind.CHECK_IN,
            ChallengeRetryKind.QUIZ,
            ChallengeRetryKind.AD,
            ChallengeRetryKind.CLAIM_MILESTONE,
            null -> clearError()
        }
    }

    LaunchedEffect(Unit) {
        withContext(Dispatchers.IO) {
            ChallengeRepository.syncToday(context)
            com.ffsensitivity.app.data.remote.EconomyRepository.refreshWallet(context)
        }
        refreshSnapshot()
    }

    AtmosphereScaffold {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(contentPadding)
                .statusBarsPadding()
                .navigationBarsPadding()
        ) {
            ChallengeTopBar(
                coins = snap.coins,
                onBack = { backSafe() }
            )
            Spacer(modifier = Modifier.height(12.dp))

            actionError?.let { err ->
                InlineErrorBanner(
                    title = err.title,
                    message = err.message,
                    onDismiss = { clearError() },
                    retryLabel = if (err.retryKind == ChallengeRetryKind.REFRESH_SNAPSHOT) {
                        "Retry"
                    } else {
                        null
                    },
                    onRetry = if (err.retryKind == ChallengeRetryKind.REFRESH_SNAPSHOT) {
                        { runRetry(err) }
                    } else {
                        null
                    },
                    modifier = Modifier.padding(horizontal = 20.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            ChallengeTabRow(
                selected = tab,
                onSelect = {
                    clearError()
                    tab = it
                },
                modifier = Modifier.padding(horizontal = 20.dp)
            )
            Spacer(modifier = Modifier.height(18.dp))

            when (tab) {
                ChallengeTab.TODAY -> {
                    DailyChallengeTodayTab(
                        snapshot = snap,
                        onSnapshot = { snap = it },
                        onError = { showError(it) },
                        onClearError = { clearError() },
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp)
                    )
                }
                ChallengeTab.REWARDS -> {
                    DailyChallengeRewardsTab(
                        snapshot = snap,
                        onSnapshot = { snap = it },
                        onError = { showError(it) },
                        onClearError = { clearError() },
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp)
                    )
                }
            }
        }
    }
}
