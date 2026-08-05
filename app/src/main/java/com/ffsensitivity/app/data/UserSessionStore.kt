package com.ffsensitivity.app.data

import android.content.Context

/**
 * Local session gate + Nest user access token after Google verify.
 * Tokens live in EncryptedSharedPreferences (migrates once from plaintext v1).
 */
class UserSessionStore(context: Context) {
    private val prefs = SecurePrefs.open(
        context = context,
        encryptedName = PREFS_ENC,
        legacyName = PREFS_LEGACY,
        migrateKeys = listOf(
            KEY_SIGNED_IN,
            KEY_NAME,
            KEY_EMAIL,
            KEY_ID_TOKEN,
            KEY_ACCESS_TOKEN,
            KEY_USER_ID,
        ),
    )

    fun isSignedIn(): Boolean = prefs.getBoolean(KEY_SIGNED_IN, false)

    fun displayName(): String = prefs.getString(KEY_NAME, "").orEmpty()

    fun email(): String = prefs.getString(KEY_EMAIL, "").orEmpty()

    fun idToken(): String = prefs.getString(KEY_ID_TOKEN, "").orEmpty()

    // --- Start: Redeem live wire (Sachin) ---
    fun accessToken(): String = prefs.getString(KEY_ACCESS_TOKEN, "").orEmpty()
    // --- End: Redeem live wire (Sachin) ---

    // --- Start: Users admin live wire (Sachin) ---
    fun userId(): String = prefs.getString(KEY_USER_ID, "").orEmpty()
    // --- End: Users admin live wire (Sachin) ---

    fun signInLocal(
        displayName: String,
        email: String,
        idToken: String = "",
        // --- Start: Redeem live wire (Sachin) ---
        accessToken: String = "",
        // --- End: Redeem live wire (Sachin) ---
        // --- Start: Users admin live wire (Sachin) ---
        userId: String = ""
        // --- End: Users admin live wire (Sachin) ---
    ) {
        prefs.edit()
            .putBoolean(KEY_SIGNED_IN, true)
            .putString(KEY_NAME, displayName.trim())
            .putString(KEY_EMAIL, email.trim())
            .putString(KEY_ID_TOKEN, idToken)
            // --- Start: Redeem live wire (Sachin) ---
            .putString(KEY_ACCESS_TOKEN, accessToken)
            // --- End: Redeem live wire (Sachin) ---
            // --- Start: Users admin live wire (Sachin) ---
            .putString(KEY_USER_ID, userId.trim())
            // --- End: Users admin live wire (Sachin) ---
            .apply()
    }

    fun signOut() {
        prefs.edit()
            .putBoolean(KEY_SIGNED_IN, false)
            .remove(KEY_NAME)
            .remove(KEY_EMAIL)
            .remove(KEY_ID_TOKEN)
            // --- Start: Redeem live wire (Sachin) ---
            .remove(KEY_ACCESS_TOKEN)
            // --- End: Redeem live wire (Sachin) ---
            // --- Start: Users admin live wire (Sachin) ---
            .remove(KEY_USER_ID)
            // --- End: Users admin live wire (Sachin) ---
            .apply()
    }

    companion object {
        private const val PREFS_ENC = "ff_user_session_v2_enc"
        private const val PREFS_LEGACY = "ff_user_session_v1"
        private const val KEY_SIGNED_IN = "signed_in"
        private const val KEY_NAME = "display_name"
        private const val KEY_EMAIL = "email"
        private const val KEY_ID_TOKEN = "id_token"
        // --- Start: Redeem live wire (Sachin) ---
        private const val KEY_ACCESS_TOKEN = "access_token"
        // --- End: Redeem live wire (Sachin) ---
        // --- Start: Users admin live wire (Sachin) ---
        private const val KEY_USER_ID = "user_id"
        // --- End: Users admin live wire (Sachin) ---
    }
}
