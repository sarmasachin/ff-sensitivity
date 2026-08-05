package com.ffsensitivity.app.data

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.CredentialOption
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.ffsensitivity.app.BuildConfig
import com.ffsensitivity.app.util.AppLog
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import java.util.UUID

data class GoogleSignInResult(
    val idToken: String,
    val displayName: String,
    val email: String
)

sealed class GoogleSignInOutcome {
    data class Success(val result: GoogleSignInResult) : GoogleSignInOutcome()
    data class Cancelled(val message: String = "Sign-in cancelled") : GoogleSignInOutcome()
    data class Failure(val message: String) : GoogleSignInOutcome()
}

/**
 * Google Sign-In via Credential Manager.
 * Uses [BuildConfig.GOOGLE_SERVER_CLIENT_ID] (Web OAuth client ID).
 *
 * Two passes: the silent ID-token option first, then the explicit
 * "Sign in with Google" option, which still shows a picker on devices where
 * the first pass returns no credential.
 *
 * User-facing messages stay plain; debug builds append the raw cause so a
 * misconfigured SHA-1 / client ID is identifiable from the screen.
 */
class GoogleAuthClient(private val activityContext: Context) {

    private val credentialManager = CredentialManager.create(activityContext)

    private sealed class Attempt {
        data class Ok(val result: GoogleSignInResult) : Attempt()
        data object Cancelled : Attempt()
        data class Failed(val cause: Throwable?) : Attempt()
    }

    suspend fun signIn(): GoogleSignInOutcome {
        val serverClientId = BuildConfig.GOOGLE_SERVER_CLIENT_ID.trim()
        if (serverClientId.isEmpty()) {
            AppLog.e("Google Sign-In: GOOGLE_SERVER_CLIENT_ID empty")
            return GoogleSignInOutcome.Failure(
                detailed(USER_SIGN_IN_FAILED, "GOOGLE_SERVER_CLIENT_ID is empty")
            )
        }

        val nonce = UUID.randomUUID().toString()

        val idOption = GetGoogleIdOption.Builder()
            .setFilterByAuthorizedAccounts(false)
            .setServerClientId(serverClientId)
            .setAutoSelectEnabled(false)
            .setNonce(nonce)
            .build()

        when (val first = attempt(idOption)) {
            is Attempt.Ok -> return GoogleSignInOutcome.Success(first.result)
            is Attempt.Cancelled -> return GoogleSignInOutcome.Cancelled()
            is Attempt.Failed -> {
                if (!isWorthRetrying(first.cause)) {
                    return GoogleSignInOutcome.Failure(messageFor(first.cause))
                }
                AppLog.e("Google ID option failed; retrying sign-in flow", first.cause)
            }
        }

        val buttonOption = GetSignInWithGoogleOption.Builder(serverClientId)
            .setNonce(nonce)
            .build()

        return when (val second = attempt(buttonOption)) {
            is Attempt.Ok -> GoogleSignInOutcome.Success(second.result)
            is Attempt.Cancelled -> GoogleSignInOutcome.Cancelled()
            is Attempt.Failed -> GoogleSignInOutcome.Failure(messageFor(second.cause))
        }
    }

    private suspend fun attempt(option: CredentialOption): Attempt {
        return try {
            val request = GetCredentialRequest.Builder()
                .addCredentialOption(option)
                .build()

            val response = credentialManager.getCredential(
                request = request,
                context = activityContext
            )

            val credential = response.credential
            if (credential is CustomCredential &&
                credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
            ) {
                val google = GoogleIdTokenCredential.createFrom(credential.data)
                val token = google.idToken
                if (token.isBlank()) {
                    AppLog.e("Google Sign-In: empty idToken")
                    Attempt.Failed(IllegalStateException("Empty ID token"))
                } else {
                    Attempt.Ok(
                        GoogleSignInResult(
                            idToken = token,
                            displayName = google.displayName?.trim().orEmpty()
                                .ifBlank { "Google Player" },
                            email = google.id.trim()
                        )
                    )
                }
            } else {
                AppLog.e("Google Sign-In: unexpected credential type=${credential.type}")
                Attempt.Failed(
                    IllegalStateException("Unexpected credential ${credential.type}")
                )
            }
        } catch (e: GetCredentialCancellationException) {
            Attempt.Cancelled
        } catch (e: NoCredentialException) {
            AppLog.e("Google Sign-In: no credential", e)
            Attempt.Failed(e)
        } catch (e: GoogleIdTokenParsingException) {
            AppLog.e("Google ID token parse failed", e)
            Attempt.Failed(e)
        } catch (e: GetCredentialException) {
            AppLog.e("Google Sign-In credential error", e)
            Attempt.Failed(e)
        } catch (e: Exception) {
            AppLog.e("Google Sign-In unexpected error", e)
            Attempt.Failed(e)
        }
    }

    /** Console/config errors repeat identically, so only retry recoverable ones. */
    private fun isWorthRetrying(cause: Throwable?): Boolean {
        val msg = cause?.message.orEmpty()
        val configBroken = msg.contains("28444") ||
            msg.contains("Developer console is not set up correctly", ignoreCase = true)
        return !configBroken
    }

    private fun messageFor(cause: Throwable?): String {
        val msg = cause?.message.orEmpty()
        val base = when {
            msg.contains("28444") ||
                msg.contains("Developer console is not set up correctly", ignoreCase = true) ->
                USER_CONSOLE_MISMATCH
            msg.contains("network", ignoreCase = true) ||
                msg.contains("timeout", ignoreCase = true) ->
                USER_NETWORK
            cause is NoCredentialException -> USER_NO_ACCOUNT
            else -> USER_SIGN_IN_FAILED
        }
        return detailed(base, "${cause?.javaClass?.simpleName}: ${msg.take(240)}")
    }

    private fun detailed(base: String, technical: String): String =
        if (BuildConfig.DEBUG) "$base\n[debug] $technical" else base

    companion object {
        private const val USER_SIGN_IN_FAILED =
            "Couldn't sign in with Google. Please try again."
        private const val USER_CONSOLE_MISMATCH =
            "Google Sign-In isn't set up for this app build. Please try again later."
        private const val USER_NETWORK =
            "Check your internet connection and try again."
        private const val USER_NO_ACCOUNT =
            "No Google account available. Add a Google account in Settings, update Google Play services, then try again."
    }
}
