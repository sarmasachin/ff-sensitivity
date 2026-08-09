package com.ffsensitivity.app.data

import com.ffsensitivity.app.data.remote.AppConfigDefaults
import com.ffsensitivity.app.data.remote.AppConfigRepository

// --- Start: App remote config live wire (Sachin) ---
/** Store / legal / support links. Privacy & Terms are app-hosted pages. */
object AppLinks {
    val WEBSITE: String
        get() = AppConfigRepository.snapshot().links.websiteUrl
            .ifBlank { AppConfigDefaults.WEBSITE }

    /** App Privacy page (hosted on app.sensitivitysettings.com). */
    val PRIVACY_POLICY: String
        get() = "https://app.sensitivitysettings.com/privacy"

    /** App Terms page (hosted on app.sensitivitysettings.com). */
    val TERMS: String
        get() = "https://app.sensitivitysettings.com/terms"

    val PLAY_STORE: String
        get() = AppConfigRepository.snapshot().links.playStoreUrl
            .ifBlank { AppConfigDefaults.PLAY_STORE }

    val SUPPORT_EMAIL: String
        get() = AppConfigRepository.snapshot().links.supportEmail
            .ifBlank { AppConfigDefaults.SUPPORT_EMAIL }
}
// --- End: App remote config live wire (Sachin) ---
