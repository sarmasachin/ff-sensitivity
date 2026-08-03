package com.ffsensitivity.app.data

import android.app.ActivityManager
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorManager
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import android.opengl.GLES20
import android.opengl.EGLConfig
import android.opengl.EGL14
import android.graphics.Point
import android.util.DisplayMetrics
import android.hardware.display.DisplayManager
import android.view.Display
import android.view.WindowManager
import kotlin.math.hypot
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

        val gpuInfo = readGpuInfo()
        val gpuLabel = gpuInfo.label
        val gpuVendor = gpuInfo.vendor
        val gpuGlesVersion = gpuInfo.glesVersion

        val processorInfo = readProcessorInfo()
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

        val geometry = readDisplayGeometry(appContext)
        val widthPx = geometry.maxWidthPx
        val heightPx = geometry.maxHeightPx
        val dpiMetrics = readDpiMetrics(appContext, geometry.maxWidthPx)
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

        val displayTypeInfo = readDisplayTypeInfo(appContext)
        val displayTypeLabel = displayTypeInfo.panelLabel
        val displayHdrLabel = displayTypeInfo.hdrLabel
        val displayColorGamutLabel = displayTypeInfo.colorGamutLabel

        val touchRateHz = readTouchRateHz()
        val touchRateLabel = if (touchRateHz != null) touchRateHz.toString() + "Hz" else "Unknown"
        val gamingModeAvailable = hasGamingMode(appContext)
        val gamingModeLabel = if (gamingModeAvailable) "Yes" else "No"

        val ageYears = estimateAgeYears(appContext)
        val ageLabel = when {
            ageYears == null -> "Unknown"
            ageYears < 1.0 -> String.format("%.1f yr", ageYears)
            else -> String.format("%.1f yrs", ageYears)
        }

        val batteryHealth = readBatteryHealth(appContext)
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


    private data class BatteryHealthInfo(
        val percent: Int?,
        val label: String,
        val statusLabel: String,
        val verdict: String
    )

    /**
     * Accurate battery health when the device exposes it.
     * Priority:
     * 1) BatteryManager STATE_OF_HEALTH (API 34+, hardware SoH %)
     * 2) sysfs charge_full / charge_full_design (or energy_full*)
     * 3) else Unknown — never invents a percentage.
     * Status text always from ACTION_BATTERY_CHANGED EXTRA_HEALTH when available.
     */
    private fun readBatteryHealth(context: Context): BatteryHealthInfo {
        val statusLabel = readBatteryHealthStatusLabel(context)
        val percent = readStateOfHealthPercent(context) ?: readHealthPercentFromSysfs()

        val label = when {
            percent != null -> "$percent%"
            else -> "Unknown"
        }
        val verdict = batteryHealthVerdict(percent, statusLabel)
        return BatteryHealthInfo(
            percent = percent,
            label = label,
            statusLabel = statusLabel,
            verdict = verdict
        )
    }

    /**
     * Healthy / Fair / Not Healthy from real SoH % when available.
     * EXTRA_HEALTH "Good" alone is NOT treated as Healthy (phones report Good even when worn).
     * Dead / Failure force Not Healthy.
     */
    private fun batteryHealthVerdict(percent: Int?, statusLabel: String): String {
        if (statusLabel == "Dead" || statusLabel == "Failure") return "Not Healthy"
        if (percent == null) return "Unknown"
        return when {
            percent >= 80 -> "Healthy"
            percent >= 60 -> "Fair"
            else -> "Not Healthy"
        }
    }

    private fun readStateOfHealthPercent(context: Context): Int? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return null
        return try {
            val bm = context.getSystemService(BatteryManager::class.java) ?: return null
            // BatteryManager.BATTERY_PROPERTY_STATE_OF_HEALTH = 10
            val value = bm.getIntProperty(10)
            if (value == Int.MIN_VALUE || value <= 0) return null
            value.takeIf { it in 1..100 }
        } catch (_: Throwable) {
            null
        }
    }

    private fun readHealthPercentFromSysfs(): Int? {
        val bases = listOf(
            "/sys/class/power_supply/battery",
            "/sys/class/power_supply/Battery",
            "/sys/class/power_supply/bms",
            "/sys/class/power_supply/maxfg",
            "/sys/class/power_supply/max170xx_battery"
        )
        for (base in bases) {
            val full = readPositiveLongSysfs("$base/charge_full")
                ?: readPositiveLongSysfs("$base/energy_full")
            val design = readPositiveLongSysfs("$base/charge_full_design")
                ?: readPositiveLongSysfs("$base/energy_full_design")
            if (full == null || design == null || design <= 0L) continue
            // Ignore nonsense ratios (corrupt / wrong nodes)
            val ratio = full.toDouble() / design.toDouble()
            if (ratio !in 0.40..1.15) continue
            val pct = (ratio * 100.0).roundToInt().coerceIn(1, 100)
            return pct
        }
        return null
    }

    private fun readPositiveLongSysfs(path: String): Long? {
        return try {
            val raw = readTextFileQuiet(path)?.trim() ?: return null
            val v = raw.toLongOrNull() ?: return null
            v.takeIf { it > 0L }
        } catch (_: Throwable) {
            null
        }
    }

    private fun readBatteryHealthStatusLabel(context: Context): String {
        return try {
            val intent = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
                ?: return "Unknown"
            when (intent.getIntExtra(BatteryManager.EXTRA_HEALTH, BatteryManager.BATTERY_HEALTH_UNKNOWN)) {
                BatteryManager.BATTERY_HEALTH_GOOD -> "Good"
                BatteryManager.BATTERY_HEALTH_OVERHEAT -> "Overheat"
                BatteryManager.BATTERY_HEALTH_DEAD -> "Dead"
                BatteryManager.BATTERY_HEALTH_OVER_VOLTAGE -> "Over Voltage"
                BatteryManager.BATTERY_HEALTH_UNSPECIFIED_FAILURE -> "Failure"
                BatteryManager.BATTERY_HEALTH_COLD -> "Cold"
                else -> "Unknown"
            }
        } catch (_: Throwable) {
            "Unknown"
        }
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




    private data class ProcessorInfo(
        val brand: String,
        val type: String,
        val coreCount: Int,
        val coreLabel: String,
        val primaryClockMhz: Int?,
        val secondaryClockMhz: Int?,
        val tertiaryClockMhz: Int?,
        val primaryClockLabel: String,
        val secondaryClockLabel: String,
        val tertiaryClockLabel: String
    )

    private fun readProcessorInfo(): ProcessorInfo {
        val cores = readCpuCoreCount()
        val coreLabel = if (cores > 0) "$cores Cores" else "Unknown"

        val socManufacturer = readSocManufacturerRaw()
        val socModelRaw = readSocModelRaw()
        val platformRaw = readSystemPropertyString("ro.board.platform")
        val chipnameRaw = listOfNotNull(
            readSystemPropertyString("ro.hardware.chipname"),
            readSystemPropertyString("ro.chipname")
        ).firstOrNull { !it.isNullOrBlank() }
        val hardwareRaw = Build.HARDWARE?.takeIf { it.isNotBlank() && !it.equals("unknown", true) }
        val cpuinfoHw = readCpuinfoHardware()

        // Prefer SOC model, then chipname, platform, cpuinfo, hardware — first DB hit wins.
        val candidates = listOfNotNull(socModelRaw, chipnameRaw, platformRaw, cpuinfoHw, hardwareRaw)
        val mapped = candidates.firstNotNullOfOrNull { SocDatabase.lookup(it) }

        val brand = when {
            mapped != null -> mapped.brand
            else -> normalizeProcessorBrand(socManufacturer, socModelRaw, platformRaw, chipnameRaw, hardwareRaw)
        }

        val type = resolveProcessorType(
            mapped = mapped,
            socModelRaw = socModelRaw,
            chipnameRaw = chipnameRaw,
            platformRaw = platformRaw,
            hardwareRaw = hardwareRaw,
            cpuinfoHw = cpuinfoHw
        )

        val clocks = readCpuClusterClocks()

        return ProcessorInfo(
            brand = brand,
            type = type,
            coreCount = cores,
            coreLabel = coreLabel,
            primaryClockMhz = clocks.primaryMhz,
            secondaryClockMhz = clocks.secondaryMhz,
            tertiaryClockMhz = clocks.tertiaryMhz,
            primaryClockLabel = clocks.primaryLabel,
            secondaryClockLabel = clocks.secondaryLabel,
            tertiaryClockLabel = clocks.tertiaryLabel
        )
    }

    private fun resolveProcessorType(
        mapped: SocDatabase.SocInfo?,
        socModelRaw: String?,
        chipnameRaw: String?,
        platformRaw: String?,
        hardwareRaw: String?,
        cpuinfoHw: String?
    ): String {
        // 1) Curated marketing name from SoC code DB
        if (mapped != null && mapped.type.isNotBlank()) return mapped.type

        // 2) OEM already exposed a marketing-like SOC_MODEL string
        for (raw in listOfNotNull(socModelRaw, chipnameRaw, cpuinfoHw)) {
            val marketing = asMarketingProcessorName(raw)
            if (marketing != null) return marketing
        }

        // 3) Known-looking chip code without DB hit — show clean code, never a wrong Snapdragon name
        for (raw in listOfNotNull(socModelRaw, chipnameRaw, platformRaw, hardwareRaw, cpuinfoHw)) {
            val code = SocDatabase.extractCodes(raw).firstOrNull()
                ?: SocDatabase.normalize(raw)?.takeIf { looksLikeSocCode(it) }
            if (code != null && !isUselessSocToken(code)) {
                return code.uppercase()
            }
        }

        return "Unknown"
    }

    private fun asMarketingProcessorName(raw: String): String? {
        val t = raw.trim()
        if (t.isBlank()) return null
        val lower = t.lowercase()
        val markers = listOf(
            "snapdragon", "dimensity", "exynos", "tensor",
            "helio", "kirin", "unisoc", "tiger"
        )
        if (markers.any { it in lower }) {
            return t
                .replace(Regex("(?i)^qualcomm\\s*(technologies[,.]?\\s*inc\\.?\\s*)?"), "")
                .replace(Regex("(?i)^mediatek\\s*"), "")
                .replace(Regex("(?i)^samsung\\s*"), "")
                .trim()
                .ifBlank { t }
        }
        return null
    }

    private fun looksLikeSocCode(normalized: String): Boolean {
        val n = normalized.lowercase()
        return Regex("""^(sm|sdm|msm|mt|s5e|gs|ums)\d{3,}""").matches(n) ||
            Regex("""^exynos\d{3,}""").matches(n) ||
            Regex("""^t[6-8]\d{2}$""").matches(n)
    }

    private fun isUselessSocToken(token: String): Boolean {
        val t = token.lowercase()
        return t in setOf(
            "qcom", "qualcomm", "mtk", "mediatek", "samsung", "exynos",
            "unisoc", "spreadtrum", "google", "unknown", "android", "msm", "sdm"
        )
    }

    private fun readSocManufacturerRaw(): String? {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Build.SOC_MANUFACTURER?.takeIf { it.isNotBlank() && !it.equals("unknown", true) }?.let { return it }
        }
        return readSystemPropertyString("ro.soc.manufacturer")
            ?: readSystemPropertyString("ro.hardware.soc.manufacturer")
    }

    private fun readSocModelRaw(): String? {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Build.SOC_MODEL?.takeIf { it.isNotBlank() && !it.equals("unknown", true) }?.let { return it }
        }
        return readSystemPropertyString("ro.soc.model")
            ?: readSystemPropertyString("ro.hardware.soc.model")
    }

    private fun readCpuinfoHardware(): String? {
        return try {
            val file = java.io.File("/proc/cpuinfo")
            if (!file.canRead()) return null
            val lines = file.readLines()
            val hardware = lines.firstOrNull { it.startsWith("Hardware", ignoreCase = true) }
                ?.substringAfter(":")
                ?.trim()
            val modelName = lines.firstOrNull { it.startsWith("model name", ignoreCase = true) }
                ?.substringAfter(":")
                ?.trim()
            hardware?.takeIf { it.isNotBlank() } ?: modelName?.takeIf { it.isNotBlank() }
        } catch (_: Throwable) {
            null
        }
    }

    private fun readCpuCoreCount(): Int {
        // Most accurate: cpu/present e.g. "0-7" => 8
        parseCpuPresentRange(readTextFileQuiet("/sys/devices/system/cpu/present"))?.let { return it }
        parseCpuPresentRange(readTextFileQuiet("/sys/devices/system/cpu/possible"))?.let { return it }
        countCpuSysfsDirs()?.let { return it }
        countCpuinfoProcessors()?.let { return it }
        return Runtime.getRuntime().availableProcessors().coerceAtLeast(1)
    }

    private fun countCpuSysfsDirs(): Int? {
        return try {
            val dir = java.io.File("/sys/devices/system/cpu")
            if (!dir.isDirectory) return null
            val n = dir.listFiles()?.count { f ->
                f.isDirectory && Regex("""^cpu\d+$""").matches(f.name)
            } ?: return null
            n.takeIf { it in 1..32 }
        } catch (_: Throwable) {
            null
        }
    }

    private fun countCpuinfoProcessors(): Int? {
        return try {
            val file = java.io.File("/proc/cpuinfo")
            if (!file.canRead()) return null
            val n = file.readLines().count { it.startsWith("processor", ignoreCase = true) }
            n.takeIf { it in 1..32 }
        } catch (_: Throwable) {
            null
        }
    }

    private fun parseCpuPresentRange(raw: String?): Int? {
        if (raw.isNullOrBlank()) return null
        // Formats: "0-7" or "0-3,4-7" or "0,1,2,3"
        var count = 0
        for (part in raw.trim().split(",")) {
            val p = part.trim()
            if (p.contains("-")) {
                val bits = p.split("-")
                if (bits.size != 2) continue
                val a = bits[0].toIntOrNull() ?: continue
                val b = bits[1].toIntOrNull() ?: continue
                if (b >= a) count += (b - a + 1)
            } else {
                if (p.toIntOrNull() != null) count += 1
            }
        }
        return count.takeIf { it in 1..32 }
    }

    private fun normalizeProcessorBrand(
        manufacturer: String?,
        model: String?,
        platform: String?,
        chipname: String?,
        hardware: String?
    ): String {
        cleanVendorBrand(manufacturer)?.let { return it }

        val blob = listOfNotNull(manufacturer, model, platform, chipname, hardware)
            .joinToString(" ")
            .lowercase()

        val codes = listOfNotNull(model, chipname, platform, hardware)
            .flatMap { SocDatabase.extractCodes(it) }
        for (code in codes) {
            brandFromSocCode(code)?.let { return it }
        }

        return when {
            "qualcomm" in blob || Regex("""\bqcom\b""").containsMatchIn(blob) ||
                "kalama" in blob || "taro" in blob || "lahaina" in blob ||
                "pineapple" in blob || "kona" in blob || "sun" in blob -> "Qualcomm"
            "mediatek" in blob || "dimensity" in blob || "helio" in blob ||
                Regex("""\bmt\d{4}""").containsMatchIn(blob) -> "MediaTek"
            "exynos" in blob || Regex("""\bs5e\d{4}""").containsMatchIn(blob) -> "Samsung"
            "tensor" in blob || Regex("""\bgs\d{3}\b""").containsMatchIn(blob) ||
                "zuma" in blob -> "Google"
            "unisoc" in blob || "spreadtrum" in blob ||
                Regex("""\bums\d{4}""").containsMatchIn(blob) ||
                Regex("""\bt[6-8]\d{2}\b""").containsMatchIn(blob) -> "Unisoc"
            "hisilicon" in blob || "kirin" in blob || "hi36" in blob -> "HiSilicon"
            else -> "Unknown"
        }
    }

    private fun cleanVendorBrand(raw: String?): String? {
        if (raw.isNullOrBlank()) return null
        val lower = raw.lowercase()
        return when {
            "qualcomm" in lower || lower == "qti" || lower == "qcom" -> "Qualcomm"
            "mediatek" in lower || lower == "mtk" -> "MediaTek"
            "samsung" in lower -> "Samsung"
            "google" in lower -> "Google"
            "unisoc" in lower || "spreadtrum" in lower -> "Unisoc"
            "hisilicon" in lower || "huawei" in lower -> "HiSilicon"
            lower == "unknown" -> null
            else -> raw.trim().replaceFirstChar { it.uppercase() }
        }
    }

    private fun brandFromSocCode(code: String): String? {
        val c = code.lowercase()
        return when {
            c.startsWith("sm") || c.startsWith("sdm") || c.startsWith("msm") -> "Qualcomm"
            c.startsWith("mt") -> "MediaTek"
            c.startsWith("s5e") || c.startsWith("exynos") -> "Samsung"
            c.startsWith("gs") -> "Google"
            c.startsWith("ums") || Regex("""^t[6-8]\d{2}$""").matches(c) -> "Unisoc"
            else -> null
        }
    }

    private data class CpuClusterClocks(
        val primaryMhz: Int?,
        val secondaryMhz: Int?,
        val tertiaryMhz: Int?,
        val primaryLabel: String,
        val secondaryLabel: String,
        val tertiaryLabel: String
    )

    /**
     * Hardware max frequencies per CPU cluster from sysfs.
     * Source: cpufreq/cpuinfo_max_freq (KHz) — not current/scaling freq.
     * Primary = fastest, Secondary = mid, Tertiary = 3rd unique max.
     * Missing cluster => "N/A". Unreadable => "Unknown". Never invents MHz.
     */
    private fun readCpuClusterClocks(): CpuClusterClocks {
        val uniqueKhz = linkedSetOf<Int>()

        // Best: one entry per cpufreq policy (cluster)
        val policyRoot = java.io.File("/sys/devices/system/cpu/cpufreq")
        if (policyRoot.isDirectory) {
            val policies = policyRoot.listFiles()
                ?.filter { it.isDirectory && it.name.startsWith("policy") }
                ?.sortedBy { it.name.removePrefix("policy").toIntOrNull() ?: Int.MAX_VALUE }
                .orEmpty()
            for (policy in policies) {
                readFreqKhz(java.io.File(policy, "cpuinfo_max_freq"))?.let { uniqueKhz.add(it) }
            }
        }

        // Fallback: per-CPU cpuinfo_max_freq
        if (uniqueKhz.isEmpty()) {
            val cpuRoot = java.io.File("/sys/devices/system/cpu")
            val cpus = cpuRoot.listFiles()
                ?.filter { it.isDirectory && Regex("""^cpu\d+$""").matches(it.name) }
                ?.sortedBy { it.name.removePrefix("cpu").toIntOrNull() ?: Int.MAX_VALUE }
                .orEmpty()
            for (cpu in cpus) {
                val khz = readFreqKhz(java.io.File(cpu, "cpufreq/cpuinfo_max_freq"))
                    ?: readFreqKhz(java.io.File(cpu, "cpufreq/scaling_max_freq"))
                if (khz != null) uniqueKhz.add(khz)
            }
        }

        // Last resort: walk present core indices
        if (uniqueKhz.isEmpty()) {
            val present = parseCpuPresentRange(readTextFileQuiet("/sys/devices/system/cpu/present"))
            val count = present ?: readCpuCoreCount()
            for (i in 0 until count) {
                val khz = readFreqKhz(java.io.File("/sys/devices/system/cpu/cpu$i/cpufreq/cpuinfo_max_freq"))
                    ?: readFreqKhz(java.io.File("/sys/devices/system/cpu/cpu$i/cpufreq/scaling_max_freq"))
                if (khz != null) uniqueKhz.add(khz)
            }
        }

        val sortedMhz = uniqueKhz
            .map { khz -> (khz / 1000.0).roundToInt().coerceAtLeast(1) }
            .distinct()
            .sortedDescending()

        if (sortedMhz.isEmpty()) {
            return CpuClusterClocks(
                primaryMhz = null,
                secondaryMhz = null,
                tertiaryMhz = null,
                primaryLabel = "Unknown",
                secondaryLabel = "Unknown",
                tertiaryLabel = "Unknown"
            )
        }

        val primary = sortedMhz.getOrNull(0)
        val secondary = sortedMhz.getOrNull(1)
        val tertiary = sortedMhz.getOrNull(2)

        return CpuClusterClocks(
            primaryMhz = primary,
            secondaryMhz = secondary,
            tertiaryMhz = tertiary,
            primaryLabel = formatClockMhz(primary),
            secondaryLabel = formatClockMhz(secondary),
            tertiaryLabel = formatClockMhz(tertiary)
        )
    }

    private fun readFreqKhz(file: java.io.File): Int? {
        return try {
            if (!file.canRead()) return null
            val raw = file.readText().trim()
            val khz = raw.toIntOrNull() ?: return null
            // Sanity: mobile CPU max usually 100 MHz .. 5.5 GHz in KHz
            khz.takeIf { it in 100_000..5_500_000 }
        } catch (_: Throwable) {
            null
        }
    }

    private fun formatClockMhz(mhz: Int?): String {
        if (mhz == null) return "N/A"
        return if (mhz >= 1000) {
            String.format(java.util.Locale.US, "%.2f GHz", mhz / 1000.0)
        } else {
            "$mhz MHz"
        }
    }

    private data class GpuInfo(
        val renderer: String,
        val vendor: String,
        val label: String,
        val glesVersion: String
    )

    private data class GpuGlStrings(
        val renderer: String,
        val vendor: String,
        val version: String
    )

    private fun readGpuInfo(): GpuInfo {
        // Only trust driver strings from a live EGL/GLES context.
        // Never fall back to SoC / Build.HARDWARE — those are not GPU model names.
        val gl = readGpuViaEgl()
        if (gl != null && gl.renderer.isNotBlank()) {
            return GpuInfo(
                renderer = gl.renderer,
                vendor = gl.vendor.ifBlank { "Unknown" },
                label = cleanGpuLabel(gl.renderer),
                glesVersion = formatGlesVersionLabel(gl.version)
            )
        }

        return GpuInfo(
            renderer = "Unknown GPU",
            vendor = "Unknown",
            label = "Unknown GPU",
            glesVersion = "Unknown"
        )
    }

    private fun cleanGpuLabel(raw: String): String {
        return raw
            .replace("(TM)", "", ignoreCase = true)
            .replace("(R)", "", ignoreCase = true)
            .replace(Regex("\\s+"), " ")
            .trim()
            .ifBlank { "Unknown GPU" }
    }

    private fun formatGlesVersionLabel(rawVersion: String): String {
        val v = rawVersion.trim()
        if (v.isBlank()) return "Unknown"
        // Driver strings look like: "OpenGL ES 3.2 V@0625.0 (...)"
        val marker = "OpenGL ES"
        val idx = v.indexOf(marker, ignoreCase = true)
        if (idx >= 0) {
            val after = v.substring(idx + marker.length).trimStart()
            val number = after.takeWhile { it.isDigit() || it == '.' }
            if (number.isNotBlank()) return "OpenGL ES $number"
        }
        return if (v.length <= 48) v else v.take(48)
    }

    /**
     * Offscreen EGL pbuffer — only accurate public source for GPU renderer/vendor.
     * Tries ES3 context first, then ES2. No SoC/hardware fallbacks.
     */
    private fun readGpuViaEgl(): GpuGlStrings? {
        // Prefer ES3 so GL_VERSION reflects true device capability when available.
        return readGpuViaEglWithClientVersion(3) ?: readGpuViaEglWithClientVersion(2)
    }

    private fun readGpuViaEglWithClientVersion(clientVersion: Int): GpuGlStrings? {
        var display = EGL14.EGL_NO_DISPLAY
        var eglContext = EGL14.EGL_NO_CONTEXT
        var surface = EGL14.EGL_NO_SURFACE
        return try {
            display = EGL14.eglGetDisplay(EGL14.EGL_DEFAULT_DISPLAY)
            if (display == EGL14.EGL_NO_DISPLAY) return null

            val eglVersion = IntArray(2)
            if (!EGL14.eglInitialize(display, eglVersion, 0, eglVersion, 1)) return null

            val renderableBit = if (clientVersion >= 3) {
                0x0040 // EGL_OPENGL_ES3_BIT_KHR
            } else {
                EGL14.EGL_OPENGL_ES2_BIT
            }

            val attribList = intArrayOf(
                EGL14.EGL_RED_SIZE, 8,
                EGL14.EGL_GREEN_SIZE, 8,
                EGL14.EGL_BLUE_SIZE, 8,
                EGL14.EGL_RENDERABLE_TYPE, renderableBit,
                EGL14.EGL_SURFACE_TYPE, EGL14.EGL_PBUFFER_BIT,
                EGL14.EGL_NONE
            )
            val configs = arrayOfNulls<EGLConfig>(1)
            val numConfig = IntArray(1)
            if (!EGL14.eglChooseConfig(display, attribList, 0, configs, 0, 1, numConfig, 0)) return null
            if (numConfig[0] <= 0) return null
            val config = configs[0] ?: return null

            val contextAttribs = intArrayOf(
                EGL14.EGL_CONTEXT_CLIENT_VERSION, clientVersion,
                EGL14.EGL_NONE
            )
            eglContext = EGL14.eglCreateContext(display, config, EGL14.EGL_NO_CONTEXT, contextAttribs, 0)
            if (eglContext == null || eglContext == EGL14.EGL_NO_CONTEXT) return null

            // 64x64 pbuffer — more reliable than 1x1 on some OEM drivers
            val surfaceAttribs = intArrayOf(
                EGL14.EGL_WIDTH, 64,
                EGL14.EGL_HEIGHT, 64,
                EGL14.EGL_NONE
            )
            surface = EGL14.eglCreatePbufferSurface(display, config, surfaceAttribs, 0)
            if (surface == null || surface == EGL14.EGL_NO_SURFACE) return null

            if (!EGL14.eglMakeCurrent(display, surface, surface, eglContext)) return null

            val renderer = GLES20.glGetString(GLES20.GL_RENDERER)?.trim().orEmpty()
            val vendor = GLES20.glGetString(GLES20.GL_VENDOR)?.trim().orEmpty()
            val version = GLES20.glGetString(GLES20.GL_VERSION)?.trim().orEmpty()

            if (renderer.isBlank()) null
            else GpuGlStrings(renderer = renderer, vendor = vendor, version = version)
        } catch (_: Throwable) {
            null
        } finally {
            try {
                if (display != EGL14.EGL_NO_DISPLAY) {
                    EGL14.eglMakeCurrent(
                        display,
                        EGL14.EGL_NO_SURFACE,
                        EGL14.EGL_NO_SURFACE,
                        EGL14.EGL_NO_CONTEXT
                    )
                    if (surface != EGL14.EGL_NO_SURFACE && surface != null) {
                        EGL14.eglDestroySurface(display, surface)
                    }
                    if (eglContext != EGL14.EGL_NO_CONTEXT && eglContext != null) {
                        EGL14.eglDestroyContext(display, eglContext)
                    }
                    EGL14.eglTerminate(display)
                }
            } catch (_: Throwable) {
            }
        }
    }

    private data class DpiMetrics(
        val currentDensityDpi: Int,
        val stableDensityDpi: Int,
        val smallestWidthDp: Int,
        val defaultSmallestWidthDp: Int
    )

    /**
     * System DPI = logical densityDpi (not physical xdpi).
     * Gaming "DPI" apply path = Developer Options Smallest Width (sw dp).
     * Default SW is derived from physical short side + stable density when needed.
     */
    private fun readDpiMetrics(context: Context, shortSidePx: Int): DpiMetrics {
        val config = context.resources.configuration
        val metrics = context.resources.displayMetrics

        val currentDpi = when {
            config.densityDpi > 0 -> config.densityDpi
            metrics.densityDpi > 0 -> metrics.densityDpi
            else -> 160
        }.coerceIn(120, 800)

        val stableDpi = try {
            val stable = DisplayMetrics.DENSITY_DEVICE_STABLE
            if (stable > 0) stable.coerceIn(120, 800) else currentDpi
        } catch (_: Throwable) {
            currentDpi
        }

        val currentSw = when {
            config.smallestScreenWidthDp > 0 -> config.smallestScreenWidthDp
            else -> {
                val px = minOf(metrics.widthPixels, metrics.heightPixels).coerceAtLeast(1)
                ((px * 160.0) / currentDpi.toDouble()).roundToInt()
            }
        }.coerceIn(240, 1000)

        val estimatedDefaultSw = ((shortSidePx.coerceAtLeast(1) * 160.0) / stableDpi.toDouble())
            .roundToInt()
            .coerceIn(240, 1000)

        // If density still at factory, Dev Options SW is the real default users restore to.
        val defaultSw = if (currentDpi == stableDpi) currentSw else estimatedDefaultSw

        return DpiMetrics(
            currentDensityDpi = currentDpi,
            stableDensityDpi = stableDpi,
            smallestWidthDp = currentSw,
            defaultSmallestWidthDp = defaultSw
        )
    }



    private fun readTouchRateHz(): Int? {
        // 1) OEM properties that actually store Hz (rare but accurate when present)
        val propKeys = listOf(
            "persist.vendor.touch.sample_rate",
            "persist.vendor.touch.sampling_rate",
            "ro.vendor.touch.sampling_rate",
            "ro.vendor.touch.report_rate",
            "sys.touch.rate",
            "persist.sys.touch.rate"
        )
        for (key in propKeys) {
            parseTouchHz(readSystemPropertyString(key))?.let { return snapTouchRate(it) }
        }

        // 2) Only sysfs/proc nodes that report RATE — never bump_sample_rate (0/1 toggle)
        val ratePaths = listOf(
            "/proc/touchpanel/report_rate",
            "/sys/class/touchscreen/touchscreen/report_rate",
            "/sys/touchscreen/report_rate"
        )
        for (path in ratePaths) {
            parseTouchHz(readTextFileQuiet(path))?.let { return snapTouchRate(it) }
        }

        // 3) Curated model database (exact model/device match only)
        return TouchRateDatabase.lookup()?.let { snapTouchRate(it) }
    }

    /** Accept only realistic touch-sampling values. */
    private fun parseTouchHz(raw: String?): Int? {
        if (raw.isNullOrBlank()) return null
        val trimmed = raw.trim()
        if (trimmed == "0" || trimmed == "1" ||
            trimmed.equals("true", ignoreCase = true) ||
            trimmed.equals("false", ignoreCase = true)
        ) {
            return null
        }
        val digits = Regex("""(\d{2,4})""").find(trimmed)?.groupValues?.get(1) ?: return null
        val value = digits.toIntOrNull() ?: return null
        val allowed = setOf(60, 90, 120, 144, 165, 180, 240, 300, 360, 480, 600, 720, 1000)
        if (value in allowed) return value
        return allowed.minByOrNull { kotlin.math.abs(it - value) }
            ?.takeIf { kotlin.math.abs(it - value) <= 15 }
    }

    private fun snapTouchRate(hz: Int): Int {
        val buckets = intArrayOf(60, 90, 120, 144, 165, 180, 240, 300, 360, 480, 600, 720, 1000)
        return buckets.minBy { kotlin.math.abs(it - hz) }
    }

    private fun readTextFileQuiet(path: String): String? {
        return try {
            val file = java.io.File(path)
            if (!file.exists() || !file.canRead()) null
            else file.readText().trim().takeIf { it.isNotBlank() }
        } catch (_: Throwable) {
            null
        }
    }

    /**
     * Gaming Mode = Yes only with direct evidence:
     * Game Space / Game Launcher / Game Turbo packages, or explicit game-mode props/features.
     * Never use One UI / securitycenter brand heuristics (false Yes).
     */
    private fun hasGamingMode(context: Context): Boolean {
        val packages = listOf(
            "com.samsung.android.game.gos",
            "com.samsung.android.game.gamehome",
            "com.samsung.android.game.gametools",
            "com.enhance.gameservice",
            "com.xiaomi.glgm",
            "com.xiaomi.joyose",
            "com.oplus.games",
            "com.oplus.play",
            "com.oplus.cosa",
            "com.coloros.gamespace",
            "com.coloros.gamespaceui",
            "com.oneplus.gamespace",
            "com.vivo.gamewatch",
            "com.vivo.gamecube",
            "com.iqoo.gameassistant",
            "com.asus.gamecenter",
            "com.asus.playactivity",
            "com.motorola.gamemode",
            "com.nothing.ntgamemode",
            "com.android.gameassistant"
        )
        if (packages.any { isPackageInstalled(context, it) }) return true

        val featureHints = listOf(
            "com.oplus.feature.gamespace",
            "com.xiaomi.game.turbo"
        )
        val pm = context.packageManager
        for (f in featureHints) {
            try {
                if (pm.hasSystemFeature(f)) return true
            } catch (_: Throwable) {
            }
        }

        val propHints = listOf(
            "ro.vendor.game.mode",
            "persist.vendor.game.mode",
            "ro.miui.has_game_turbo"
        )
        for (key in propHints) {
            val v = readSystemPropertyString(key)?.lowercase().orEmpty()
            if (v == "1" || v == "true" || v == "yes") return true
        }
        return false
    }

    private data class DisplayTypeInfo(
        val panelLabel: String,
        val hdrLabel: String,
        val colorGamutLabel: String
    )

    /**
     * Panel technology has NO public Android API (OLED vs LCD).
     * We only label panel type when OEM property / EDID product name
     * explicitly contains a known token. Otherwise "Unknown".
     * HDR + color gamut come from Display APIs and are accurate.
     */
    private fun readDisplayTypeInfo(context: Context): DisplayTypeInfo {
        val display = resolveDisplay(context)
        val panel = detectPanelType(display)
        val hdr = detectHdrLabel(display)
        val gamut = detectColorGamutLabel(display)
        return DisplayTypeInfo(
            panelLabel = panel,
            hdrLabel = hdr,
            colorGamutLabel = gamut
        )
    }

    private fun detectPanelType(display: Display?): String {
        val explicit = readExplicitPanelTypeFromProperties()
            ?: readExplicitPanelTypeFromProductInfo(display)
            ?: DisplayPanelDatabase.lookup()
        return explicit ?: "Unknown"
    }

    private fun readExplicitPanelTypeFromProperties(): String? {
        val keys = listOf(
            "ro.vendor.display.type",
            "ro.vendor.display.panel_type",
            "persist.vendor.display.panel_type",
            "vendor.display.lcd_type",
            "ro.hardware.display_type",
            "ro.sf.lcd_type",
            "persist.sys.display_type"
        )
        for (key in keys) {
            val raw = readSystemPropertyString(key) ?: continue
            normalizePanelToken(raw)?.let { return it }
        }
        return null
    }

    private fun readExplicitPanelTypeFromProductInfo(display: Display?): String? {
        if (display == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return null
        return try {
            val info = display.deviceProductInfo ?: return null
            val name = info.name?.trim().orEmpty()
            if (name.isBlank()) null else normalizePanelToken(name)
        } catch (_: Throwable) {
            null
        }
    }

    private fun normalizePanelToken(raw: String): String? {
        val s = raw.lowercase()
        return when {
            "super amoled" in s || "superamoled" in s -> "Super AMOLED"
            "amoled" in s -> "AMOLED"
            "poled" in s -> "POLED"
            "ltpo" in s && "oled" in s -> "LTPO OLED"
            "oled" in s -> "OLED"
            "ips" in s && "lcd" in s -> "IPS LCD"
            "ips" in s -> "IPS LCD"
            "pls" in s -> "PLS LCD"
            "ltps" in s -> "LTPS LCD"
            "tft" in s -> "TFT LCD"
            Regex("(^|[^a-z])lcd([^a-z]|$)").containsMatchIn(s) -> "LCD"
            else -> null
        }
    }

    private fun detectHdrLabel(display: Display?): String {
        if (display == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
            return "SDR"
        }
        return try {
            val types = display.hdrCapabilities?.supportedHdrTypes?.toList().orEmpty()
            if (types.isEmpty()) return "SDR"

            val labels = linkedSetOf<String>()
            for (t in types) {
                when (t) {
                    Display.HdrCapabilities.HDR_TYPE_DOLBY_VISION -> labels.add("Dolby Vision")
                    Display.HdrCapabilities.HDR_TYPE_HDR10 -> labels.add("HDR10")
                    Display.HdrCapabilities.HDR_TYPE_HLG -> labels.add("HLG")
                    Display.HdrCapabilities.HDR_TYPE_HDR10_PLUS -> labels.add("HDR10+")
                    else -> { }
                }
            }
            if (labels.isEmpty()) "HDR" else labels.joinToString(" + ")
        } catch (_: Throwable) {
            "SDR"
        }
    }

    private fun detectColorGamutLabel(display: Display?): String {
        if (display == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return "Standard"
        }
        return try {
            if (display.isWideColorGamut) "Wide Color Gamut" else "Standard"
        } catch (_: Throwable) {
            "Standard"
        }
    }


    private fun readSystemPropertyString(key: String): String? {
        return try {
            val clazz = Class.forName("android.os.SystemProperties")
            val method = clazz.getMethod("get", String::class.java, String::class.java)
            val value = method.invoke(null, key, "") as? String
            value?.takeIf { it.isNotBlank() }
        } catch (_: Throwable) {
            null
        }
    }

    private data class DisplayGeometry(
        val maxWidthPx: Int,
        val maxHeightPx: Int,
        val maxResolutionLabel: String,
        val activeWidthPx: Int,
        val activeHeightPx: Int,
        val activeResolutionLabel: String,
        val densityDpi: Int,
        val screenInches: Double,
        val screenInchesLabel: String,
        val aspectRatioLabel: String
    )

    private fun readDisplayGeometry(context: Context): DisplayGeometry {
        val display = resolveDisplay(context)
        val realMetrics = readRealDisplayMetrics(context, display)
        val fallbackW = realMetrics.widthPixels.coerceAtLeast(1)
        val fallbackH = realMetrics.heightPixels.coerceAtLeast(1)

        val activeRaw = readActivePhysicalSize(display, fallbackW, fallbackH)
        val maxRaw = readMaxPhysicalSize(display, activeRaw.first, activeRaw.second, fallbackW, fallbackH)

        val (activeW, activeH) = normalizePortrait(activeRaw.first, activeRaw.second)
        val (maxW, maxH) = normalizePortrait(maxRaw.first, maxRaw.second)

        val densityDpi = realMetrics.densityDpi.coerceAtLeast(1)
        val xdpi = realMetrics.xdpi.takeIf { it > 0f } ?: densityDpi.toFloat()
        val ydpi = realMetrics.ydpi.takeIf { it > 0f } ?: densityDpi.toFloat()

        val widthIn = maxW.toDouble() / xdpi.toDouble()
        val heightIn = maxH.toDouble() / ydpi.toDouble()
        val inches = hypot(widthIn, heightIn)
        val inchesRounded = ((inches * 100.0).roundToInt() / 100.0).coerceIn(4.0, 15.0)

        return DisplayGeometry(
            maxWidthPx = maxW,
            maxHeightPx = maxH,
            maxResolutionLabel = "$maxW x $maxH",
            activeWidthPx = activeW,
            activeHeightPx = activeH,
            activeResolutionLabel = "$activeW x $activeH",
            densityDpi = densityDpi,
            screenInches = inchesRounded,
            screenInchesLabel = String.format("%.2f\"", inchesRounded),
            aspectRatioLabel = aspectRatio(maxW, maxH)
        )
    }

    private fun readRealDisplayMetrics(context: Context, display: Display?): DisplayMetrics {
        val metrics = DisplayMetrics()
        try {
            if (display != null) {
                @Suppress("DEPRECATION")
                display.getRealMetrics(metrics)
            }
        } catch (_: Exception) {
        }

        if (metrics.widthPixels <= 0 || metrics.heightPixels <= 0) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    val wm = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
                    val bounds = wm.maximumWindowMetrics.bounds
                    metrics.widthPixels = bounds.width().coerceAtLeast(1)
                    metrics.heightPixels = bounds.height().coerceAtLeast(1)
                    val density = context.resources.displayMetrics
                    metrics.densityDpi = density.densityDpi
                    metrics.xdpi = density.xdpi
                    metrics.ydpi = density.ydpi
                } else {
                    val density = context.resources.displayMetrics
                    metrics.setTo(density)
                    val wm = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
                    val point = Point()
                    @Suppress("DEPRECATION")
                    wm.defaultDisplay.getRealSize(point)
                    metrics.widthPixels = point.x.coerceAtLeast(1)
                    metrics.heightPixels = point.y.coerceAtLeast(1)
                }
            } catch (_: Exception) {
                metrics.setTo(context.resources.displayMetrics)
            }
        }

        if (metrics.densityDpi <= 0) {
            metrics.densityDpi = context.resources.displayMetrics.densityDpi.coerceAtLeast(160)
        }
        if (metrics.xdpi <= 0f) metrics.xdpi = metrics.densityDpi.toFloat()
        if (metrics.ydpi <= 0f) metrics.ydpi = metrics.densityDpi.toFloat()
        return metrics
    }

    private fun readActivePhysicalSize(display: Display?, fallbackW: Int, fallbackH: Int): Pair<Int, Int> {
        try {
            if (display != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val mode = display.mode
                val w = mode.physicalWidth
                val h = mode.physicalHeight
                if (w > 0 && h > 0) return w to h
            }
        } catch (_: Exception) {
        }
        return fallbackW to fallbackH
    }

    private fun readMaxPhysicalSize(
        display: Display?,
        activeW: Int,
        activeH: Int,
        fallbackW: Int,
        fallbackH: Int
    ): Pair<Int, Int> {
        var bestW = activeW
        var bestH = activeH
        var bestArea = activeW.toLong() * activeH.toLong()

        fun consider(w: Int, h: Int) {
            if (w <= 0 || h <= 0) return
            val area = w.toLong() * h.toLong()
            if (area > bestArea) {
                bestArea = area
                bestW = w
                bestH = h
            }
        }

        consider(fallbackW, fallbackH)

        try {
            if (display != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                display.supportedModes.forEach { mode ->
                    consider(mode.physicalWidth, mode.physicalHeight)
                }
            }
        } catch (_: Exception) {
        }

        if (bestW <= 0 || bestH <= 0) return fallbackW to fallbackH
        return bestW to bestH
    }

    private fun normalizePortrait(width: Int, height: Int): Pair<Int, Int> {
        val a = width.coerceAtLeast(1)
        val b = height.coerceAtLeast(1)
        return if (a <= b) a to b else b to a
    }

    private fun resolveDisplay(context: Context): Display? {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                context.display
                    ?: (context.getSystemService(Context.DISPLAY_SERVICE) as? DisplayManager)
                        ?.getDisplay(Display.DEFAULT_DISPLAY)
                    ?: (context.getSystemService(Context.WINDOW_SERVICE) as WindowManager).defaultDisplay
            } else {
                @Suppress("DEPRECATION")
                (context.getSystemService(Context.WINDOW_SERVICE) as WindowManager).defaultDisplay
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun aspectRatio(w: Int, h: Int): String {
        val shortSide = minOf(w, h).coerceAtLeast(1)
        val longSide = maxOf(w, h).coerceAtLeast(1)
        val ratio = longSide.toDouble() / shortSide.toDouble()

        data class Bucket(val label: String, val value: Double)

        // Common phone / tablet display ratios (long:short)
        val buckets = listOf(
            Bucket("4:3", 4.0 / 3.0),
            Bucket("3:2", 3.0 / 2.0),
            Bucket("16:9", 16.0 / 9.0),
            Bucket("18:9", 18.0 / 9.0),
            Bucket("19:9", 19.0 / 9.0),
            Bucket("19.5:9", 19.5 / 9.0),
            Bucket("20:9", 20.0 / 9.0),
            Bucket("20.5:9", 20.5 / 9.0),
            Bucket("21:9", 21.0 / 9.0),
            Bucket("22:9", 22.0 / 9.0),
            Bucket("22.5:9", 22.5 / 9.0)
        )

        val nearest = buckets.minBy { kotlin.math.abs(ratio - it.value) }
        val distance = kotlin.math.abs(ratio - nearest.value)

        // Half of smallest adjacent-bucket gap prevents 20:9 being eaten by 19.5:9
        val sorted = buckets.map { it.value }.sorted()
        var minGap = Double.MAX_VALUE
        for (i in 0 until sorted.lastIndex) {
            minGap = minOf(minGap, sorted[i + 1] - sorted[i])
        }
        val maxDist = minGap / 2.0

        if (distance <= maxDist) {
            return nearest.label
        }

        // Clean X:9 style if within a half-step of n or n.5
        val timesNine = ratio * 9.0
        val roundedHalf = (timesNine * 2.0).roundToInt() / 2.0
        if (kotlin.math.abs(timesNine - roundedHalf) <= 0.06) {
            val left = if (roundedHalf == roundedHalf.toLong().toDouble()) {
                roundedHalf.toLong().toString()
            } else {
                String.format(java.util.Locale.US, "%.1f", roundedHalf)
            }
            return "$left:9"
        }

        // Reduced fraction as long:short
        val g = gcd(shortSide, longSide)
        val rw = shortSide / g
        val rh = longSide / g
        if (rw <= 40 && rh <= 40) {
            return "$rh:$rw"
        }

        return String.format(java.util.Locale.US, "%.2f:1", ratio)
    }

    private fun gcd(x: Int, y: Int): Int {
        var a = x
        var b = y
        while (b != 0) {
            val t = a % b
            a = b
            b = t
        }
        return a.coerceAtLeast(1)
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
