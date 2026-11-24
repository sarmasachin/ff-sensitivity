package com.ffsensitivity.app.data.remote

import android.content.Context
import com.ffsensitivity.app.data.AppSession
import com.ffsensitivity.app.data.CompareFeedback
import com.ffsensitivity.app.data.ProMaxPersonalPrior
import com.ffsensitivity.app.data.SensitivityEngineKind
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

    fun promaxOffset(
        context: Context,
        fingers: String,
        role: String,
        deviceLabel: String,
        ramGb: Double,
        processorBrand: String,
        processorType: String,
        gpuLabel: String,
        gpuVendor: String,
        dpiPreference: String,
        screenGuard: String,
        refreshHz: Int,
        /** Peer product bucket: one_tap | promax (default promax + legacy). */
        engine: String = "promax"
    ): Result<ProMaxOffsetPayload> {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return Result.failure(ApiException("AUTH_REQUIRED", "Please sign in again."))
        }
        return CompareApi.promaxOffset(
            accessToken = token,
            fingers = fingers,
            role = role,
            deviceLabel = deviceLabel,
            ramGb = ramGb,
            processorBrand = processorBrand,
            processorType = processorType,
            gpuLabel = gpuLabel,
            gpuVendor = gpuVendor,
            dpiPreference = dpiPreference,
            screenGuard = screenGuard,
            refreshHz = refreshHz,
            engine = engine
        ).onFailure { AppLog.e("CompareRepository.promaxOffset failed", it) }
    }

    /** Maps active sensitivity engine → compare.engine storage / peer bucket tag. */
    fun compareEngineTag(): String = when (AppSession.sensitivityEngine) {
        SensitivityEngineKind.ONE_TAP_PREMIUM -> "one_tap"
        SensitivityEngineKind.PREMIUM_PRO_MAX -> "promax"
        SensitivityEngineKind.BEST_PREMIUM -> "best_premium"
        SensitivityEngineKind.CLASSIC -> "classic"
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
        feedback: CompareFeedback,
        ramGb: Double? = null,
        processorBrand: String? = null,
        processorType: String? = null,
        gpuLabel: String? = null,
        gpuVendor: String? = null,
        refreshHz: Int? = null
    ): Result<String> {
        val token = UserSessionStore(context).accessToken()
        if (token.isBlank()) {
            return Result.failure(ApiException("AUTH_REQUIRED", "Please sign in again."))
        }
        val engine = compareEngineTag()
        return CompareApi.save(
            token,
            deviceLabel,
            fingers,
            role,
            dpiPreference,
            screenGuard,
            suggested,
            actual,
            feedback,
            ramGb = ramGb,
            processorBrand = processorBrand,
            processorType = processorType,
            gpuLabel = gpuLabel,
            gpuVendor = gpuVendor,
            refreshHz = refreshHz,
            engine = engine
        ).onSuccess {
            val prior = ProMaxPersonalPrior.fromCompare(suggested, actual)
            // Pro Max path unchanged — always refresh Pro Max prior on compare save.
            AppSession.proMaxPersonalPrior = prior
            // One Tap keeps an isolated prior only when that engine is active.
            if (AppSession.sensitivityEngine == SensitivityEngineKind.ONE_TAP_PREMIUM) {
                AppSession.oneTapPersonalPrior = prior
                AppLog.i(
                    "ONE_TAP_PRIOR_SAVED|g=${prior.general}|rd=${prior.redDot}|" +
                        "s2=${prior.scope2x}|active=${if (prior.active) 1 else 0}"
                )
            }
        }.onFailure { AppLog.e("CompareRepository.save failed", it) }
    }
}
