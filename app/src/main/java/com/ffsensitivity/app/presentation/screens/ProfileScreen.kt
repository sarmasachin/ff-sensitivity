package com.ffsensitivity.app.presentation.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.DailyChallengeStore
import com.ffsensitivity.app.data.ProfileMenuBus
import com.ffsensitivity.app.data.ProfileOptions
import com.ffsensitivity.app.data.ProfileRepository
import com.ffsensitivity.app.data.UserSessionStore
import com.ffsensitivity.app.data.remote.ApiException
import com.ffsensitivity.app.data.remote.UserProfile
import com.ffsensitivity.app.presentation.components.AtmosphereScaffold
import com.ffsensitivity.app.presentation.components.InlineErrorBanner
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.HairlineStrong
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.util.AppLog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun ProfileScreen(contentPadding: PaddingValues, onBack: () -> Boolean) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val session = remember { UserSessionStore(context) }
    var profile by remember {
        val snap = DailyChallengeStore.snapshot(context)
        mutableStateOf(
            ProfileRepository.cached(context, session.userId())
                ?: blankProfile(session, snap.coins, snap.streak)
        )
    }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var pick by remember { mutableStateOf<String?>(null) }
    var confirmDelete by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        withContext(Dispatchers.IO) { ProfileRepository.load(context) }
            .onSuccess { profile = it }
            .onFailure { err ->
                AppLog.e("Profile load failed", err)
                error = (err as? ApiException)?.message ?: "Could not load profile."
            }
    }

    fun runSave() {
        val problem = profileFieldError(
            profile.displayName,
            profile.ffUid,
            profile.playRole,
            profile.region
        )
        if (problem != null) {
            error = problem
            return
        }
        busy = true
        error = null
        scope.launch {
            val result = withContext(Dispatchers.IO) { ProfileRepository.save(context, profile) }
            busy = false
            result.onSuccess { profile = it }
                .onFailure { err ->
                    AppLog.e("Profile save failed", err)
                    error = (err as? ApiException)?.message ?: "Could not save profile."
                }
        }
    }

    fun runDelete() {
        confirmDelete = false
        busy = true
        error = null
        scope.launch {
            val result = withContext(Dispatchers.IO) { ProfileRepository.deleteAccount(context) }
            busy = false
            result.onSuccess { ProfileMenuBus.onAccountDeleted?.invoke() }
                .onFailure { err ->
                    AppLog.e("Profile delete failed", err)
                    error = (err as? ApiException)?.message ?: "Could not delete account."
                }
        }
    }

    AtmosphereScaffold {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(contentPadding)
                .statusBarsPadding()
                .navigationBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 12.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(42.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(SurfaceCard)
                        .border(1.dp, HairlineStrong, RoundedCornerShape(12.dp))
                        .clickable { onBack() },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.AutoMirrored.Outlined.ArrowBack,
                        contentDescription = "Back",
                        tint = InkPrimary,
                        modifier = Modifier.size(20.dp)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text("MENU", color = Amber, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    Text("Profile", color = InkPrimary, fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
                }
            }
            error?.let {
                Spacer(modifier = Modifier.height(14.dp))
                InlineErrorBanner(title = "Profile", message = it, onDismiss = { error = null })
            }
            Spacer(modifier = Modifier.height(16.dp))
            ProfileIdentityCard(
                googleName = profile.googleName,
                email = profile.email,
                photoUrl = profile.photoUrl,
                coins = profile.coins,
                streakDays = profile.streakDays
            )
            Spacer(modifier = Modifier.height(16.dp))
            ProfileEditFields(
                displayName = profile.displayName,
                onDisplayName = { profile = profile.copy(displayName = it.take(40)) },
                ffUid = profile.ffUid,
                onFfUid = { profile = profile.copy(ffUid = it.filter { ch -> ch.isDigit() }.take(15)) },
                role = profile.playRole,
                onRole = { pick = "role" },
                region = profile.region,
                onRegion = { pick = "region" },
                notifyPush = profile.notifyPush,
                onNotify = { profile = profile.copy(notifyPush = it) },
                enabled = !busy
            )
            Spacer(modifier = Modifier.height(16.dp))
            ProfileActionButton("Save", filled = true, enabled = !busy, onClick = { runSave() })
            Spacer(modifier = Modifier.height(10.dp))
            ProfileActionButton("Sign out", filled = false, enabled = !busy) {
                ProfileMenuBus.requestSignOut?.invoke()
            }
            Spacer(modifier = Modifier.height(10.dp))
            ProfileActionButton("Delete account", filled = false, enabled = !busy) {
                confirmDelete = true
            }
            Spacer(modifier = Modifier.height(12.dp))
        }
    }

    if (pick == "role") {
        ProfileChoiceDialog("Role", ProfileOptions.roles, profile.playRole, {
            profile = profile.copy(playRole = it)
            pick = null
        }) { pick = null }
    }
    if (pick == "region") {
        ProfileChoiceDialog("Region", ProfileOptions.regions, profile.region, {
            profile = profile.copy(region = it)
            pick = null
        }) { pick = null }
    }
    if (confirmDelete) {
        ProfileDeleteDialog(onDismiss = { confirmDelete = false }, onConfirm = { runDelete() })
    }
}

private fun blankProfile(session: UserSessionStore, coins: Int, streak: Int) = UserProfile(
    userId = session.userId(),
    googleName = session.displayName(),
    email = session.email(),
    photoUrl = "",
    displayName = session.displayName().ifBlank { "Player" },
    ffUid = "",
    playRole = "",
    region = "",
    notifyPush = true,
    coins = coins,
    streakDays = streak
)
