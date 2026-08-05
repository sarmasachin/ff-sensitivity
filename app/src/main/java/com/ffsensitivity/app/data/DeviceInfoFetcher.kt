package com.ffsensitivity.app.data

import android.app.ActivityManager
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorManager
import android.os.Build
import kotlin.math.roundToInt

object DeviceInfoFetcher {

    private const val PKG_FF = "com.dts.freefireth"
    private const val PKG_FF_MAX = "com.dts.freefiremax"

    fun fetch(context: Context): DeviceInfo {
        val appContext = context.applicationContext
        val brand = Build.BRAND.orEmpty().ifBlank { "Unknown" }.replaceFirstChar { it.uppercase() }
        val model = Build.MODEL.orEmpty().ifBlank { "Unknown" }
        val manufacturer = Build.MANUFACTURER.orEmpty()
        val deviceLabel = buildDeviceLabel(brand, model, manufacturer)

        val androidVersion = Build.VERSION.RELEASE.orEmpty().ifBlank { "?" }
        val sdkInt = Build.VERSION.SDK_INT
        val hardware = listOfNotNull(
            Build.HARDWARE?.takeIf { it.isNotBlank() },
            Build.BOARD?.takeIf { it.isNotBlank() && !it.equals(Build.HARDWARE, ignoreCase = true) }
        ).joinToString(" / ").ifBlank { "Unknown" }

        val gpuInfo = DeviceGpuReader.read()
        val gpuLabel = gpuInfo.label
        val gpuVendor = gpuInfo.vendor
        val gpuGlesVersion = gpuInfo.glesVersion

        val processorInfo = DeviceProcessorReader.read()
        val processorBrand = processorInfo.brand
        val processorType = processorInfo.type
        val processorCoreCount = processorInfo.coreCount
        val processorCoreLabel = processorInfo.coreLabel
        val primaryClockMhz = processorInfo.primaryClockMhz
        val secondaryClockMhz = processorInfo.secondaryClockMhz
        val tertiaryClockMhz = processorInfo.tertiaryClockMhz
        val primaryClockLabel = processorInfo.primaryClockLabel
        val secondaryClockLabel = processorInfo.secondaryClockLabel
        val tertiaryClockLabel = processorInfo.tertiaryClockLabel

        val ramGb = readRamGb(appContext)
        val ramLabel = formatRamLabel(ramGb)
        val networkStorage = DeviceNetworkStorageReader.read(appContext)

        val geometry = DeviceDisplayReaders.readDisplayGeometry(appContext)
        val widthPx = geometry.maxWidthPx
        val heightPx = geometry.maxHeightPx
        val dpiMetrics = DeviceDisplayReaders.readDpiMetrics(appContext, geometry.maxWidthPx)
        val densityDpi = dpiMetrics.currentDensityDpi
        val stableDensityDpi = dpiMetrics.stableDensityDpi
        val smallestWidthDp = dpiMetrics.smallestWidthDp
        val defaultSmallestWidthDp = dpiMetrics.defaultSmallestWidthDp
        val resolutionLabel = geometry.maxResolutionLabel
        val maxWidthPx = geometry.maxWidthPx
        val maxHeightPx = geometry.maxHeightPx
        val maxResolutionLabel = geometry.maxResolutionLabel
        val activeWidthPx = geometry.activeWidthPx
        val activeHeightPx = geometry.activeHeightPx
        val activeResolutionLabel = geometry.activeResolutionLabel
        val screenInchesRounded = geometry.screenInches
        val screenInchesLabel = geometry.screenInchesLabel
        val aspectRatioLabel = geometry.aspectRatioLabel

        val refreshRates = DisplayRefreshRates.read(appContext)
        val refreshRateHz = refreshRates.maxHz
        val refreshLabel = refreshRates.maxLabel
        val maxRefreshRateHz = refreshRates.maxHz
        val maxRefreshLabel = refreshRates.maxLabel
        val activeRefreshRateHz = refreshRates.activeHz
        val activeRefreshLabel = refreshRates.activeLabel

        val displayTypeInfo = DeviceDisplayReaders.readDisplayTypeInfo(appContext)
        val displayTypeLabel = displayTypeInfo.panelLabel
        val displayHdrLabel = displayTypeInfo.hdrLabel
        val displayColorGamutLabel = displayTypeInfo.colorGamutLabel

        val touchRateHz = DeviceDisplayReaders.readTouchRateHz()
        val touchRateLabel = if (touchRateHz != null) touchRateHz.toString() + "Hz" else "Unknown"
        val gamingModeAvailable = DeviceDisplayReaders.hasGamingMode(appContext)
        val gamingModeLabel = if (gamingModeAvailable) "Yes" else "No"

        val ageYears = estimateAgeYears(appContext)
        val ageLabel = when {
            ageYears == null -> "Unknown"
            ageYears < 1.0 -> String.format("%.1f yr", ageYears)
            else -> String.format("%.1f yrs", ageYears)
        }

        val batteryHealth = DeviceBatteryHealthReader.read(appContext)
        val gyro = hasGyro(appContext)
        val ff = isPackageInstalled(appContext, PKG_FF)
        val ffMax = isPackageInstalled(appContext, PKG_FF_MAX)

        return DeviceInfo(
            brand = brand,
            model = model,
            deviceLabel = deviceLabel,
            androidVersion = "Android $androidVersion (API $sdkInt)",
            sdkInt = sdkInt,
            hardware = hardware,
            processorBrand = processorBrand,
            processorType = processorType,
            processorCoreCount = processorCoreCount,
            processorCoreLabel = processorCoreLabel,
            primaryClockMhz = primaryClockMhz,
            secondaryClockMhz = secondaryClockMhz,
            tertiaryClockMhz = tertiaryClockMhz,
            primaryClockLabel = primaryClockLabel,
            secondaryClockLabel = secondaryClockLabel,
            tertiaryClockLabel = tertiaryClockLabel,
            gpuLabel = gpuLabel,
            gpuVendor = gpuVendor,
            gpuGlesVersion = gpuGlesVersion,
            ramGb = ramGb,
            ramLabel = ramLabel,
            networkTypeLabel = networkStorage.networkTypeLabel,
            storageTotalGb = networkStorage.storageTotalGb,
            storageFreeGb = networkStorage.storageFreeGb,
            storageLabel = networkStorage.storageLabel,
            widthPx = widthPx,
            heightPx = heightPx,
            resolutionLabel = resolutionLabel,
            maxWidthPx = maxWidthPx,
            maxHeightPx = maxHeightPx,
            maxResolutionLabel = maxResolutionLabel,
            activeWidthPx = activeWidthPx,
            activeHeightPx = activeHeightPx,
            activeResolutionLabel = activeResolutionLabel,
            densityDpi = densityDpi,
            stableDensityDpi = stableDensityDpi,
            smallestWidthDp = smallestWidthDp,
            defaultSmallestWidthDp = defaultSmallestWidthDp,
            refreshRateHz = refreshRateHz,
            refreshLabel = refreshLabel,
            maxRefreshRateHz = maxRefreshRateHz,
            maxRefreshLabel = maxRefreshLabel,
            activeRefreshRateHz = activeRefreshRateHz,
            activeRefreshLabel = activeRefreshLabel,
            screenInches = screenInchesRounded,
            screenInchesLabel = screenInchesLabel,
            aspectRatioLabel = aspectRatioLabel,
            displayTypeLabel = displayTypeLabel,
            displayHdrLabel = displayHdrLabel,
            displayColorGamutLabel = displayColorGamutLabel,
            touchRateHz = touchRateHz,
            touchRateLabel = touchRateLabel,
            gamingModeAvailable = gamingModeAvailable,
            gamingModeLabel = gamingModeLabel,
            deviceAgeYears = ageYears,
            deviceAgeLabel = ageLabel,
            gyroAvailable = gyro,
            freeFireInstalled = ff,
            freeFireMaxInstalled = ffMax,
            batteryHealthPercent = batteryHealth.percent,
            batteryHealthLabel = batteryHealth.label,
            batteryHealthStatusLabel = batteryHealth.statusLabel,
            batteryHealthVerdict = batteryHealth.verdict
        )
    }

    private fun buildDeviceLabel(brand: String, model: String, manufacturer: String): String {
        val m = model.trim()
        val b = brand.trim()
        return when {
            m.contains(b, ignoreCase = true) -> m
            b.isNotBlank() && m.isNotBlank() -> "$b $m"
            m.isNotBlank() -> m
            manufacturer.isNotBlank() -> manufacturer
            else -> "Unknown Device"
        }
    }

    private fun readRamGb(context: Context): Double {
        val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val info = ActivityManager.MemoryInfo()
        am.getMemoryInfo(info)
        val bytes = info.totalMem
        val gb = bytes.toDouble() / (1024.0 * 1024.0 * 1024.0)
        // Round to nearest 0.5 for cleaner UI (e.g. 5.7 -> 6.0, 3.6 -> 3.5)
        return ((gb * 2.0).roundToInt() / 2.0).coerceAtLeast(0.5)
    }

    private fun formatRamLabel(ramGb: Double): String {
        return if (ramGb == ramGb.toLong().toDouble()) {
            "${ramGb.toLong()} GB"
        } else {
            String.format("%.1f GB", ramGb)
        }
    }

    private fun estimateAgeYears(context: Context): Double? {
        val now = System.currentTimeMillis()
        val candidates = mutableSetOf<Long>()

        // 1) Launch API level — survives OTA, closest to real hardware age
        val firstApi = readFirstApiLevel()
        firstApiToEpochMs(firstApi)?.let { candidates.add(it) }

        // 2) Firmware build time (resets on OTA — only useful as fallback/extra signal)
        if (Build.TIME > 0L) candidates.add(Build.TIME)

        // 3) Oldest system-package install time (often first setup / factory image)
        listOf(
            "android",
            "com.android.settings",
            "com.android.systemui",
            "com.google.android.gsf"
        ).forEach { pkg ->
            readPackageFirstInstallMs(context, pkg)?.let { candidates.add(it) }
        }

        val valid = candidates.filter { it in 1L until now }
        if (valid.isEmpty()) return null

        // Oldest timestamp = longest lived signal = best age estimate
        val birthMs = valid.minOrNull() ?: return null
        val ageMs = now - birthMs
        if (ageMs <= 0L) return 0.1
        val years = ageMs / (365.25 * 24.0 * 60.0 * 60.0 * 1000.0)
        return ((years * 10.0).roundToInt() / 10.0).coerceIn(0.1, 15.0)
    }

    private fun readFirstApiLevel(): Int {
        // Prefer public SDK field when present (API 31+ on some builds exposes it)
        try {
            val field = Build.VERSION::class.java.getField("DEVICE_INITIAL_SDK_INT")
            val value = field.getInt(null)
            if (value > 0) return value
        } catch (_: Throwable) {
            // not publicly available — fall through
        }
        return readSystemPropertyInt("ro.product.first_api_level", 0)
            .takeIf { it > 0 }
            ?: readSystemPropertyInt("ro.board.first_api_level", 0)
    }

    private fun readSystemPropertyInt(key: String, default: Int): Int {
        return try {
            val clazz = Class.forName("android.os.SystemProperties")
            val method = clazz.getMethod("getInt", String::class.java, Int::class.javaPrimitiveType)
            method.invoke(null, key, default) as Int
        } catch (_: Throwable) {
            default
        }
    }

    /**
     * Maps shipping API level -> approximate commercial launch epoch.
     * first_api_level does not change after OTA, so this tracks hardware generation age.
     */
    private fun firstApiToEpochMs(firstApi: Int): Long? {
        if (firstApi <= 0) return null
        // Approximate mid-window when devices with this shipping API hit market
        val launchYearMonth: Pair<Int, Int> = when {
            firstApi >= 36 -> 2025 to 6
            firstApi >= 35 -> 2024 to 9
            firstApi >= 34 -> 2023 to 10
            firstApi >= 33 -> 2022 to 8
            firstApi >= 32 -> 2022 to 3
            firstApi >= 31 -> 2021 to 10
            firstApi >= 30 -> 2020 to 9
            firstApi >= 29 -> 2019 to 9
            firstApi >= 28 -> 2018 to 8
            firstApi >= 27 -> 2017 to 12
            firstApi >= 26 -> 2017 to 8
            firstApi >= 25 -> 2016 to 12
            firstApi >= 24 -> 2016 to 8
            firstApi >= 23 -> 2015 to 10
            firstApi >= 22 -> 2015 to 3
            firstApi >= 21 -> 2014 to 11
            firstApi >= 19 -> 2013 to 10
            firstApi >= 16 -> 2012 to 7
            else -> 2011 to 1
        }
        val cal = java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("UTC"))
        cal.clear()
        cal.set(launchYearMonth.first, launchYearMonth.second - 1, 15, 12, 0, 0)
        return cal.timeInMillis
    }

    private fun readPackageFirstInstallMs(context: Context, packageName: String): Long? {
        return try {
            val info = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.packageManager.getPackageInfo(
                    packageName,
                    PackageManager.PackageInfoFlags.of(0)
                )
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(packageName, 0)
            }
            info.firstInstallTime.takeIf { it > 0L }
        } catch (_: Throwable) {
            null
        }
    }

    private fun hasGyro(context: Context): Boolean {
        val sm = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager ?: return false
        return sm.getDefaultSensor(Sensor.TYPE_GYROSCOPE) != null
    }

    private fun isPackageInstalled(context: Context, packageName: String): Boolean {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.packageManager.getPackageInfo(
                    packageName,
                    PackageManager.PackageInfoFlags.of(0)
                )
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(packageName, 0)
            }
            true
        } catch (_: PackageManager.NameNotFoundException) {
            false
        } catch (_: Exception) {
            false
        }
    }
}
