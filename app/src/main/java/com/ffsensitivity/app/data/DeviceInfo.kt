package com.ffsensitivity.app.data

data class DeviceInfo(
    val brand: String,
    val model: String,
    val deviceLabel: String,
    val androidVersion: String,
    val sdkInt: Int,
    val hardware: String,
    val processorBrand: String,
    val processorType: String,
    val processorCoreCount: Int,
    val processorCoreLabel: String,
    /** Max cluster clocks from sysfs cpuinfo_max_freq (Primary=fastest). */
    val primaryClockMhz: Int?,
    val secondaryClockMhz: Int?,
    val tertiaryClockMhz: Int?,
    val primaryClockLabel: String,
    val secondaryClockLabel: String,
    val tertiaryClockLabel: String,
    val gpuLabel: String,
    val gpuVendor: String,
    val gpuGlesVersion: String,
    val ramGb: Double,
    val ramLabel: String,
    /** Active link: Wi-Fi / Mobile · 4G|5G / Offline / … */
    val networkTypeLabel: String,
    val storageTotalGb: Double,
    val storageFreeGb: Double,
    /** e.g. "42 GB free / 128 GB" */
    val storageLabel: String,
    val widthPx: Int,
    val heightPx: Int,
    val resolutionLabel: String,
    val maxWidthPx: Int,
    val maxHeightPx: Int,
    val maxResolutionLabel: String,
    val activeWidthPx: Int,
    val activeHeightPx: Int,
    val activeResolutionLabel: String,
    /** Current logical system density (wm density / display size) */
    val densityDpi: Int,
    /** Factory / stable density — does not change with user DPI tweaks */
    val stableDensityDpi: Int,
    /** Current Developer Options Smallest Width (sw dp) */
    val smallestWidthDp: Int,
    /** Default Smallest Width for this panel (calculator base / restore value) */
    val defaultSmallestWidthDp: Int,
    val refreshRateHz: Int,
    val refreshLabel: String,
    val maxRefreshRateHz: Int,
    val maxRefreshLabel: String,
    val activeRefreshRateHz: Int,
    val activeRefreshLabel: String,
    val screenInches: Double,
    val screenInchesLabel: String,
    val aspectRatioLabel: String,
    /** Panel tech when OEM/EDID explicitly says so; else Unknown (no guessing) */
    val displayTypeLabel: String,
    val displayHdrLabel: String,
    val displayColorGamutLabel: String,
    val touchRateHz: Int?,
    val touchRateLabel: String,
    val gamingModeAvailable: Boolean,
    val gamingModeLabel: String,
    val deviceAgeYears: Double?,
    val deviceAgeLabel: String,
    val gyroAvailable: Boolean,
    val freeFireInstalled: Boolean,
    val freeFireMaxInstalled: Boolean,
    /** Remaining full-charge capacity vs design, when readable. */
    val batteryHealthPercent: Int?,
    val batteryHealthLabel: String,
    /** Android EXTRA_HEALTH status text (Good / Dead / ...). Not charging. */
    val batteryHealthStatusLabel: String,
    /** Healthy / Fair / Not Healthy / Unknown — from SoH % when available. */
    val batteryHealthVerdict: String
)
