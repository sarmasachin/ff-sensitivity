package com.ffsensitivity.app.data

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.ffsensitivity.app.BuildConfig
import com.ffsensitivity.app.util.AppLog
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
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
 * User-facing messages stay plain — technical details go to [AppLog] only.
 */
class GoogleAuthClient(private val activityContext: Context) {

    private val credentialManager = CredentialManager.create(activityContext)

    suspend fun signIn(): GoogleSignInOutcome {
        val serverClientId = BuildConfig.GOOGLE_SERVER_CLIENT_ID.trim()
        if (serverClientId.isEmpty()) {
            AppLog.e("Google Sign-In: GOOGLE_SERVER_CLIENT_ID empty")
            return GoogleSignInOutcome.Failure(USER_SIGN_IN_FAILED)
        }

        return try {
            val googleIdOption = GetGoogleIdOption.Builder()
                .setFilterByAuthorizedAccounts(false)
                .setServerClientId(serverClientId)
                .setAutoSelectEnabled(false)
                .setNonce(UUID.randomUUID().toString())
                .build()

            val request = GetCredentialRequest.Builder()
                .addCredentialOption(googleIdOption)
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
                val name = google.displayName?.trim().orEmpty().ifBlank { "Google Player" }
                val email = google.id.trim()
                val token = google.idToken
                if (token.isBlank()) {
                    AppLog.e("Google Sign-In: empty idToken")
                    GoogleSignInOutcome.Failure(USER_SIGN_IN_FAILED)
                } else {
                    GoogleSignInOutcome.Success(
                        GoogleSignInResult(
                            idToken = token,
                            displayName = name,
                            email = email
                        )
                    )
                }
            } else {
                AppLog.e("Google Sign-In: unexpected credential type=${credential.type}")
                GoogleSignInOutcome.Failure(USER_SIGN_IN_FAILED)
            }
        } catch (e: GetCredentialCancellationException) {
            GoogleSignInOutcome.Cancelled()
        } catch (e: NoCredentialException) {
            AppLog.e("Google Sign-In: no credential", e)
            GoogleSignInOutcome.Failure(userMessageFor(e.message))
        } catch (e: GoogleIdTokenParsingException) {
            AppLog.e("Google ID token parse failed", e)
            GoogleSignInOutcome.Failure(USER_SIGN_IN_FAILED)
        } catch (e: GetCredentialException) {
            AppLog.e("Google Sign-In credential error", e)
            GoogleSignInOutcome.Failure(userMessageFor(e.message))
        } catch (e: Exception) {
            AppLog.e("Google Sign-In unexpected error", e)
            GoogleSignInOutcome.Failure(USER_SIGN_IN_FAILED)
        }
    }

    private fun userMessageFor(raw: String?): String {
        val msg = raw.orEmpty()
        return when {
            msg.contains("28444") ||
                msg.contains("Developer console is not set up correctly", ignoreCase = true) ->
                USER_SIGN_IN_UNAVAILABLE
            msg.contains("network", ignoreCase = true) ||
                msg.contains("timeout", ignoreCase = true) ->
                USER_NETWORK
            msg.contains("account", ignoreCase = true) &&
                msg.contains("no credential", ignoreCase = true) ->
                USER_NO_ACCOUNT
            else -> USER_SIGN_IN_FAILED
        }
    }

    companion object {
        private const val USER_SIGN_IN_FAILED =
            "Couldn't sign in with Google. Please try again."
        private const val USER_SIGN_IN_UNAVAILABLE =
            "Google Sign-In isn't available right now. Please try again later."
        private const val USER_NETWORK =
            "Check your internet connection and try again."
        private const val USER_NO_ACCOUNT =
            "No Google account found on this device. Add a Google account and try again."
    }
}
