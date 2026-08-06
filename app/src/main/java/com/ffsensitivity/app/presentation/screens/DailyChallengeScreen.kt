package com.ffsensitivity.app.presentation.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.ffsensitivity.app.data.DailyChallengeStore
import com.ffsensitivity.app.data.remote.ApiException
import com.ffsensitivity.app.data.remote.ChallengeRepository
import com.ffsensitivity.app.data.remote.EconomyRepository
import com.ffsensitivity.app.presentation.components.AtmosphereScaffold
import com.ffsensitivity.app.presentation.components.InlineErrorBanner
import com.ffsensitivity.app.util.AppLog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun DailyChallengeScreen(
    contentPadding: PaddingValues,
    onBack: () -> Boolean,
    onRequireSignIn: () -> Boolean = { false }
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var tab by remember { mutableStateOf(ChallengeTab.TODAY) }
    var actionError by remember { mutableStateOf<ChallengeUiError?>(null) }
    var snap by remember { mutableStateOf(EmptySafeSnapshot) }
    var syncing by remember { mutableStateOf(false) }

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

    fun goSignIn() {
        clearError()
        val ok = runCatching { onRequireSignIn() }.getOrElse {
            AppLog.e("Daily challenge sign-in navigate failed", it)
            false
        }
        if (!ok) {
            showError(
                ChallengeUiError(
                    code = "AUTH_REQUIRED",
                    title = "Sign in required",
                    message = "Please sign in again to use Daily Challenge.",
                    retryKind = ChallengeRetryKind.SIGN_IN
                )
            )
        }
    }

    suspend fun syncFromServer(): Boolean {
        if (syncing) return false
        syncing = true
        return try {
            val challenge = withContext(Dispatchers.IO) {
                ChallengeRepository.syncToday(context)
            }
            val wallet = withContext(Dispatchers.IO) {
                EconomyRepository.refreshWallet(context)
            }
            refreshSnapshot()

            val challengeErr = challenge.exceptionOrNull()
            val walletErr = wallet.exceptionOrNull()
            when {
                challengeErr is ApiException && challengeErr.code == "AUTH_REQUIRED" -> {
                    showError(
                        ChallengeUiError(
                            code = "AUTH_REQUIRED",
                            title = "Sign in required",
                            message = challengeErr.message,
                            retryKind = ChallengeRetryKind.SIGN_IN
                        )
                    )
                    false
                }
                walletErr is ApiException && walletErr.code == "AUTH_REQUIRED" -> {
                    showError(
                        ChallengeUiError(
                            code = "AUTH_REQUIRED",
                            title = "Sign in required",
                            message = walletErr.message,
                            retryKind = ChallengeRetryKind.SIGN_IN
                        )
                    )
                    false
                }
                challengeErr != null && walletErr != null -> {
                    AppLog.e("Daily challenge sync both failed", challengeErr)
                    showError(
                        ChallengeUiError(
                            code = "CHALLENGE_SYNC_FAILED",
                            title = "Couldn’t sync",
                            message = "Check Wi‑Fi and try again.",
                            retryKind = ChallengeRetryKind.REFRESH_SNAPSHOT
                        )
                    )
                    false
                }
                challengeErr != null -> {
                    AppLog.e("Daily challenge syncToday failed", challengeErr)
                    showError(
                        ChallengeUiError(
                            code = "CHALLENGE_SYNC_FAILED",
                            title = "Challenge sync failed",
                            message = (challengeErr as? ApiException)?.message
                                ?: "Could not load today’s challenge. Try again.",
                            retryKind = ChallengeRetryKind.REFRESH_SNAPSHOT
                        )
                    )
                    false
                }
                walletErr != null -> {
                    AppLog.e("Daily challenge wallet refresh failed", walletErr)
                    showError(
                        ChallengeUiError(
                            code = "CHALLENGE_WALLET_FAILED",
                            title = "Wallet sync failed",
                            message = (walletErr as? ApiException)?.message
                                ?: "Coins may be outdated. Try again.",
                            retryKind = ChallengeRetryKind.REFRESH_SNAPSHOT
                        )
                    )
                    false
                }
                else -> {
                    clearError()
                    true
                }
            }
        } finally {
            syncing = false
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

    BackHandler { backSafe() }

    fun runRetry(error: ChallengeUiError) {
        when (error.retryKind) {
            ChallengeRetryKind.REFRESH_SNAPSHOT -> {
                clearError()
                scope.launch { syncFromServer() }
            }
            ChallengeRetryKind.SIGN_IN -> goSignIn()
            ChallengeRetryKind.CHECK_IN,
            ChallengeRetryKind.QUIZ,
            ChallengeRetryKind.AD,
            ChallengeRetryKind.CLAIM_MILESTONE,
            null -> clearError()
        }
    }

    LaunchedEffect(Unit) {
        refreshSnapshot()
        syncFromServer()
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
                    retryLabel = when (err.retryKind) {
                        ChallengeRetryKind.SIGN_IN -> "Sign in"
                        ChallengeRetryKind.REFRESH_SNAPSHOT -> "Retry"
                        else -> null
                    },
                    onRetry = if (err.retryKind == ChallengeRetryKind.REFRESH_SNAPSHOT ||
                        err.retryKind == ChallengeRetryKind.SIGN_IN
                    ) {
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
