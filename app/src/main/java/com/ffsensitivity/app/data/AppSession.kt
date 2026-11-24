package com.ffsensitivity.app.data

/** Which sensitivity calculator the current results flow uses. */
enum class SensitivityEngineKind {
    /** Home → Best Sensitivity (frozen Classic). */
    CLASSIC,

    /** Best Premium Sensi Unlock → SettingsEnginePro. */
    BEST_PREMIUM,

    /** Premium Sensi Pro Unlock → SettingsEngineProMax (stronger + crowd offset). */
    PREMIUM_PRO_MAX,

    /** One Tap Premium Sensi Unlock → SettingsEngineOneTap (headshot-locked). */
    ONE_TAP_PREMIUM
}

object AppSession {
    var deviceInfo: DeviceInfo? = null
    var wizardAnswers: WizardAnswers? = null
    var featureId: String = "sensi"

    var sensitivityEngine: SensitivityEngineKind = SensitivityEngineKind.CLASSIC

    /**
     * Deep peer offsets from Compare (model / CPU / GPU / RAM / playstyle).
     * Applied only by [com.ffsensitivity.app.engine.SettingsEngineProMax], clamped.
     */
    var proMaxCrowdOffsets: ProMaxCrowdOffsets = ProMaxCrowdOffsets()

    /**
     * One Tap Premium peer bucket (role forced One-Tap Headshot).
     * Separate from [proMaxCrowdOffsets] — applied only by SettingsEngineOneTap.
     */
    var oneTapCrowdOffsets: ProMaxCrowdOffsets = ProMaxCrowdOffsets()

    /**
     * Last successful Compare deltas for this device session.
     * Soft-applied only by SettingsEngineProMax (after crowd, before share).
     */
    var proMaxPersonalPrior: ProMaxPersonalPrior = ProMaxPersonalPrior()

    /**
     * One Tap Premium last-compare soft prior (actual − suggested).
     * Filled on Compare save while engine is ONE_TAP_PREMIUM; applied only by
     * SettingsEngineOneTapCrowd (after peers, before share). Isolated from Pro Max.
     */
    var oneTapPersonalPrior: ProMaxPersonalPrior = ProMaxPersonalPrior()

    /**
     * Effective community share pull weight after peer↔share conflict dampen.
     * Null until ProMax calculate runs; trust badge prefers this over server weight.
     */
    var proMaxSharePullWeight: Double? = null

    /**
     * Effective One Tap community share pull after dampen (null until calculate).
     */
    var oneTapSharePullWeight: Double? = null

    fun clearPremiumSensitivity() {
        sensitivityEngine = SensitivityEngineKind.CLASSIC
        proMaxCrowdOffsets = ProMaxCrowdOffsets()
        oneTapCrowdOffsets = ProMaxCrowdOffsets()
        proMaxPersonalPrior = ProMaxPersonalPrior()
        oneTapPersonalPrior = ProMaxPersonalPrior()
        proMaxSharePullWeight = null
        oneTapSharePullWeight = null
    }

    fun isPaidSensitivityEngine(): Boolean =
        sensitivityEngine != SensitivityEngineKind.CLASSIC
}
