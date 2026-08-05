package com.ffsensitivity.app.data

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.ffsensitivity.app.util.AppLog

/**
 * AES-GCM EncryptedSharedPreferences for tokens / session fields.
 * Migrates once from a legacy plaintext prefs file, then clears it.
 */
internal object SecurePrefs {
    fun open(
        context: Context,
        encryptedName: String,
        legacyName: String? = null,
        migrateKeys: List<String> = emptyList(),
    ): SharedPreferences {
        val app = context.applicationContext
        val masterKey = MasterKey.Builder(app)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        val secure = EncryptedSharedPreferences.create(
            app,
            encryptedName,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
        if (!legacyName.isNullOrBlank() && migrateKeys.isNotEmpty()) {
            migrateFromLegacy(app, secure, legacyName, migrateKeys)
        }
        return secure
    }

    private fun migrateFromLegacy(
        app: Context,
        secure: SharedPreferences,
        legacyName: String,
        keys: List<String>,
    ) {
        val legacy = app.getSharedPreferences(legacyName, Context.MODE_PRIVATE)
        val legacyAll = legacy.all
        if (legacyAll.isNullOrEmpty()) return

        val legacyHasData = keys.any { key ->
            when (val v = legacyAll[key]) {
                is Boolean -> v
                is String -> v.isNotBlank()
                null -> false
                else -> true
            }
        }
        if (!legacyHasData) {
            legacy.edit().clear().apply()
            return
        }

        val secureAlreadyReady = keys.any { key ->
            when (val v = secure.all[key]) {
                is Boolean -> v
                is String -> v.isNotBlank()
                else -> false
            }
        }
        if (secureAlreadyReady) {
            legacy.edit().clear().apply()
            return
        }

        runCatching {
            val edit = secure.edit()
            for (key in keys) {
                when (val v = legacyAll[key]) {
                    is Boolean -> edit.putBoolean(key, v)
                    is String -> edit.putString(key, v)
                    is Int -> edit.putInt(key, v)
                    is Long -> edit.putLong(key, v)
                    is Float -> edit.putFloat(key, v)
                    is Set<*> -> {
                        @Suppress("UNCHECKED_CAST")
                        edit.putStringSet(key, v as Set<String>)
                    }
                }
            }
            edit.apply()
            legacy.edit().clear().apply()
        }.onFailure {
            AppLog.e("SecurePrefs migrate failed ($legacyName)", it)
        }
    }
}
