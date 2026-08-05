package com.ffsensitivity.app.data.remote

import android.content.Context
import android.os.Build
import com.ffsensitivity.app.data.ContactReplyResult
import com.ffsensitivity.app.data.ContactStartResult
import com.ffsensitivity.app.data.ContactStore
import com.ffsensitivity.app.data.ContactSubject
import com.ffsensitivity.app.data.ContactThread
import com.ffsensitivity.app.data.UserSessionStore
import com.ffsensitivity.app.util.AppLog

// --- Start: Support live wire (Sachin) ---
object SupportRepository {
    fun deviceLabel(): String {
        val maker = Build.MANUFACTURER.orEmpty().trim()
        val model = Build.MODEL.orEmpty().trim()
        val release = Build.VERSION.RELEASE.orEmpty().trim().ifBlank { "?" }
        val name = listOf(maker, model)
            .filter { it.isNotBlank() }
            .joinToString(" ")
            .ifBlank { "Android device" }
        return "$name · Android $release".take(120)
    }

    fun syncMine(context: Context): Result<ContactThread?> {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return Result.failure(ApiException("AUTH_REQUIRED", "Please sign in to use support."))
        }
        return SupportApi.getMine(token).map { remote ->
            if (remote != null) {
                ContactStore.saveRemote(context, remote)
            } else {
                ContactStore.clear(context)
            }
            remote
        }.onFailure { AppLog.e("SupportRepository.syncMine failed", it) }
    }

    fun start(
        context: Context,
        name: String,
        email: String,
        subject: ContactSubject,
        message: String,
        appVersion: String
    ): ContactStartResult {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return ContactStartResult.AuthRequired
        }
        val result = SupportApi.start(
            accessToken = token,
            name = name,
            email = email,
            subject = subject,
            message = message,
            appVersion = appVersion,
            deviceLabel = deviceLabel()
        )
        return result.fold(
            onSuccess = { thread ->
                ContactStore.saveRemote(context, thread)
                ContactStartResult.Ok(thread)
            },
            onFailure = { err ->
                AppLog.e("SupportRepository.start failed", err)
                when {
                    err is ApiException && err.code == "SUPPORT_VALIDATION" ->
                        ContactStartResult.Validation
                    err is ApiException && err.code == "SUPPORT_OPEN_LIMIT" ->
                        ContactStartResult.OpenLimit(err.message)
                    else -> ContactStartResult.SaveFailed(err.message ?: "Couldn’t reach support.")
                }
            }
        )
    }

    fun reply(context: Context, message: String): ContactReplyResult {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return ContactReplyResult.AuthRequired
        }
        val current = ContactStore.load(context) ?: return ContactReplyResult.NoThread
        val result = SupportApi.reply(token, current.id, message)
        return result.fold(
            onSuccess = { thread ->
                ContactStore.saveRemote(context, thread)
                ContactReplyResult.Ok(thread)
            },
            onFailure = { err ->
                AppLog.e("SupportRepository.reply failed", err)
                when {
                    err is ApiException && err.code == "SUPPORT_VALIDATION" ->
                        ContactReplyResult.Validation
                    err is ApiException && err.code == "SUPPORT_CLOSED" ->
                        ContactReplyResult.Closed(err.message)
                    err is ApiException && err.code == "SUPPORT_NOT_FOUND" ->
                        ContactReplyResult.NoThread
                    else -> ContactReplyResult.SaveFailed(err.message ?: "Couldn’t send.")
                }
            }
        )
    }
}
// --- End: Support live wire (Sachin) ---
