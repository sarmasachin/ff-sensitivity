package com.ffsensitivity.app

import com.ffsensitivity.app.data.DeviceInfo
import com.ffsensitivity.app.data.WizardAnswers
import com.ffsensitivity.app.engine.DpiResult
import com.ffsensitivity.app.engine.FullSettingsResult
import com.ffsensitivity.app.engine.SettingsEngine
import com.ffsensitivity.app.util.AppLog

internal fun safeCalculateAll(
    device: DeviceInfo,
    answers: WizardAnswers
): Result<FullSettingsResult> {
    return runCatching { SettingsEngine.calculateAll(device, answers) }
        .onFailure { AppLog.e("SettingsEngine.calculateAll failed", it) }
}

internal fun safeCalculateDpi(device: DeviceInfo): Result<DpiResult> {
    return runCatching { SettingsEngine.calculateDpi(device) }
        .onFailure { AppLog.e("SettingsEngine.calculateDpi failed", it) }
}
