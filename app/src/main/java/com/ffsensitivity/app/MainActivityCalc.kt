package com.ffsensitivity.app

import com.ffsensitivity.app.data.AppSession
import com.ffsensitivity.app.data.DeviceInfo
import com.ffsensitivity.app.data.SensitivityEngineKind
import com.ffsensitivity.app.data.WizardAnswers
import com.ffsensitivity.app.engine.DpiResult
import com.ffsensitivity.app.engine.FullSettingsResult
import com.ffsensitivity.app.engine.SettingsEngine
import com.ffsensitivity.app.engine.SettingsEngineOneTap
import com.ffsensitivity.app.engine.SettingsEnginePro
import com.ffsensitivity.app.engine.SettingsEngineProMax
import com.ffsensitivity.app.util.AppLog

internal fun safeCalculateAll(
    device: DeviceInfo,
    answers: WizardAnswers
): Result<FullSettingsResult> {
    return runCatching {
        when (AppSession.sensitivityEngine) {
            SensitivityEngineKind.PREMIUM_PRO_MAX ->
                SettingsEngineProMax.calculateAll(device, answers)
            SensitivityEngineKind.BEST_PREMIUM ->
                SettingsEnginePro.calculateAll(device, answers)
            SensitivityEngineKind.ONE_TAP_PREMIUM ->
                SettingsEngineOneTap.calculateAll(device, answers)
            SensitivityEngineKind.CLASSIC ->
                SettingsEngine.calculateAll(device, answers)
        }
    }.onFailure {
        val which = when (AppSession.sensitivityEngine) {
            SensitivityEngineKind.PREMIUM_PRO_MAX -> "SettingsEngineProMax"
            SensitivityEngineKind.BEST_PREMIUM -> "SettingsEnginePro"
            SensitivityEngineKind.ONE_TAP_PREMIUM -> "SettingsEngineOneTap"
            SensitivityEngineKind.CLASSIC -> "SettingsEngine"
        }
        AppLog.e("$which.calculateAll failed", it)
    }
}

internal fun safeCalculateDpi(device: DeviceInfo): Result<DpiResult> {
    return runCatching { SettingsEngine.calculateDpi(device) }
        .onFailure { AppLog.e("SettingsEngine.calculateDpi failed", it) }
}
