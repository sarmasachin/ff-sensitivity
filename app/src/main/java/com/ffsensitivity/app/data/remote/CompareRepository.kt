package com.ffsensitivity.app.data.remote

import android.content.Context
import com.ffsensitivity.app.data.CompareFeedback
import com.ffsensitivity.app.data.SensitivityValues
import com.ffsensitivity.app.data.UserSessionStore
import com.ffsensitivity.app.util.AppLog

object CompareRepository {
    fun list(context: Context, fingers: String, role: String): Result<CompareListPayload> {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return Result.failure(ApiException("AUTH_REQUIRED", "Please sign in again."))
        }
        return CompareApi.list(token, fingers, role)
            .onFailure { AppLog.e("CompareRepository.list failed", it) }
    }

    fun save(
        context: Context,
        deviceLabel: String,
        fingers: String,
        role: String,
        dpiPreference: String,
        screenGuard: String,
        suggested: SensitivityValues,
        actual: SensitivityValues,
        feedback: CompareFeedback
    ): Result<String> {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return Result.failure(ApiException("AUTH_REQUIRED", "Please sign in again."))
        }
        return CompareApi.save(
            token,
            deviceLabel,
            fingers,
            role,
            dpiPreference,
            screenGuard,
            suggested,
            actual,
            feedback
        ).onFailure { AppLog.e("CompareRepository.save failed", it) }
    }
}
