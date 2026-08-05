package com.ffsensitivity.app.presentation.screens.login

import android.app.Activity
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.BuildConfig
import com.ffsensitivity.app.data.GoogleAuthClient
import com.ffsensitivity.app.data.GoogleSignInOutcome
import com.ffsensitivity.app.data.GoogleSignInResult
import com.ffsensitivity.app.data.remote.ApiException
import com.ffsensitivity.app.data.remote.NestUserSession
import com.ffsensitivity.app.data.remote.UserAuthApi
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.Danger
import com.ffsensitivity.app.presentation.theme.Hairline
import com.ffsensitivity.app.presentation.theme.InkMuted
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.presentation.theme.SurfaceLift
import com.ffsensitivity.app.presentation.theme.VoidBlack
import com.ffsensitivity.app.util.AppLog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Google-only gate. Uses Credential Manager + downloaded Android OAuth client.
 * Nest ID-token verify wires next.
 */
@Composable
fun LoginScreen(
    onContinueWithGoogle: (GoogleSignInResult, NestUserSession) -> Unit,
    modifier: Modifier = Modifier
) {
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val activity = context as? Activity
    val authClient = remember(context) { GoogleAuthClient(context) }
    val cardShape = RoundedCornerShape(24.dp)

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(VoidBlack)
    ) {
        LoginAtmosphere()

        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 28.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Spacer(modifier = Modifier.height(12.dp))

            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                LoginBrandBlock(modifier = Modifier.fillMaxWidth())

                Spacer(modifier = Modifier.height(36.dp))

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(cardShape)
                        .background(
                            Brush.verticalGradient(
                                listOf(SurfaceLift.copy(alpha = 0.95f), SurfaceCard)
                            )
                        )
                        .border(1.dp, Amber.copy(alpha = 0.28f), cardShape)
                        .padding(horizontal = 20.dp, vertical = 22.dp)
                ) {
                    Text(
                        text = "SECURE ACCESS",
                        color = Amber,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.6.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Use your Google account to unlock the tools inside this app.",
                        color = InkSecondary,
                        fontSize = 13.sp,
                        lineHeight = 19.sp
                    )

                    Spacer(modifier = Modifier.height(20.dp))

                    LoginGoogleButton(
                        loading = loading,
                        onClick = {
                            if (loading) return@LoginGoogleButton
                            if (activity == null) {
                                error = "Something went wrong. Please try again."
                                return@LoginGoogleButton
                            }
                            error = null
                            loading = true
                            scope.launch {
                                when (val outcome = authClient.signIn()) {
                                    is GoogleSignInOutcome.Success -> {
                                        // --- Start: Redeem live wire (Sachin) ---
                                        val nest = withContext(Dispatchers.IO) {
                                            UserAuthApi.loginWithGoogle(outcome.result.idToken)
                                        }
                                        nest.fold(
                                            onSuccess = { session ->
                                                runCatching {
                                                    onContinueWithGoogle(
                                                        outcome.result,
                                                        session
                                                    )
                                                }.onFailure {
                                                    AppLog.e("Post Google sign-in failed", it)
                                                    error = "Signed in, but the app couldn't continue. Please try again."
                                                }
                                            },
                                            onFailure = { err ->
                                                AppLog.e("Nest Google exchange failed", err)
                                                error = when (err) {
                                                    is ApiException -> when (err.code) {
                                                        "RATE_LIMITED" ->
                                                            "Too many login attempts. Wait a minute and try again."
                                                        "AUTH_GOOGLE_INVALID" -> err.message
                                                        "AUTH_SUSPENDED" ->
                                                            "This account is suspended. Contact support if you think this is a mistake."
                                                        else -> err.message
                                                    }
                                                    is java.net.ConnectException,
                                                    is java.net.SocketTimeoutException,
                                                    is java.net.UnknownHostException ->
                                                        "Can't reach the server. Check Wi‑Fi and make sure the API is running."
                                                    is java.io.IOException ->
                                                        "Can't reach the server. Check Wi‑Fi and make sure the API is running."
                                                    // Google succeeded; the API exchange is what failed.
                                                    else -> if (BuildConfig.DEBUG) {
                                                        "Signed in with Google, but the server call failed.\n[debug] ${err.javaClass.simpleName}: ${err.message?.take(240)}"
                                                    } else {
                                                        "Couldn't sign in right now. Please try again."
                                                    }
                                                }
                                            }
                                        )
                                        // --- End: Redeem live wire (Sachin) ---
                                    }
                                    is GoogleSignInOutcome.Cancelled -> {
                                        error = null
                                    }
                                    is GoogleSignInOutcome.Failure -> {
                                        error = outcome.message
                                    }
                                }
                                loading = false
                            }
                        }
                    )

                    if (!error.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = error.orEmpty(),
                            color = Danger,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            lineHeight = 17.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(1.dp)
                            .background(Hairline)
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = "No email/password · no guest access. Google Sign-In only.",
                        color = InkMuted,
                        fontSize = 11.sp,
                        lineHeight = 16.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 28.dp, bottom = 8.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "FF Sensitivity",
                    color = InkMuted,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    letterSpacing = 0.4.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "By continuing you agree to the app terms & privacy policy.",
                    color = InkMuted.copy(alpha = 0.85f),
                    fontSize = 11.sp,
                    textAlign = TextAlign.Center,
                    lineHeight = 15.sp
                )
            }
        }
    }
}
