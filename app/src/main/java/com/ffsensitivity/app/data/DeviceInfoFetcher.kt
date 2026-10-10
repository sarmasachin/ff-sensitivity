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

        val (ageYears, ageLabel) = DeviceAgeReader.read(appContext)

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
