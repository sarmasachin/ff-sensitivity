package com.ffsensitivity.app

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.rememberCoroutineScope
import com.ffsensitivity.app.data.ProfileMenuBus
import com.ffsensitivity.app.data.ProfileRepository
import com.ffsensitivity.app.data.UserSessionStore
import com.ffsensitivity.app.data.remote.PushInboxBadge
import com.ffsensitivity.app.data.remote.ScreenSessionTracker
import com.ffsensitivity.app.data.remote.SessionExpiry
import com.ffsensitivity.app.presentation.components.SignOutConfirmDialog
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.CrashReporting
import com.ffsensitivity.app.util.SafeOps
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
internal fun MainSignOutDialog(
    visible: Boolean,
    onDismiss: () -> Unit,
    onRequestShow: () -> Unit,
    sessionStore: UserSessionStore,
    screenSessionTracker: ScreenSessionTracker,
    context: Context,
    onLocalSignedOut: () -> Unit
) {
    val scope = rememberCoroutineScope()

    fun clearLocal() {
        sessionStore.signOut()
        ProfileRepository.clear(context)
        PushInboxBadge.clear()
        CrashReporting.clearUser()
        onLocalSignedOut()
    }

    DisposableEffect(Unit) {
        ProfileMenuBus.requestSignOut = onRequestShow
        ProfileMenuBus.onAccountDeleted = { clearLocal() }
        onDispose {
            ProfileMenuBus.requestSignOut = null
            ProfileMenuBus.onAccountDeleted = null
        }
    }

    if (!visible) return

    SignOutConfirmDialog(
        onDismiss = onDismiss,
        onConfirm = {
            onDismiss()
            scope.launch {
                runCatching {
                    val revoked = withContext(Dispatchers.IO) {
                        val token = sessionStore.accessToken()
                        if (token.isNotBlank() && !SessionExpiry.isJwtExpired(token)) {
                            screenSessionTracker.checkpoint()?.let {
                                com.ffsensitivity.app.data.remote.AnalyticsRepository
                                    .trackScreenVisit(context, it)
                            }
                        }
                        com.ffsensitivity.app.data.remote.AnalyticsRepository.revokeSession(context)
                    }
                    if (revoked) {
                        clearLocal()
                    } else {
                        SafeOps.toast(
                            context,
                            "Could not end session. Check your connection and try again."
                        )
                    }
                }.onFailure {
                    AppLog.e("Sign out failed", it)
                    SafeOps.toast(context, "Could not sign out")
                }
            }
        }
    )
}
