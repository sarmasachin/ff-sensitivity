package com.ffsensitivity.app.data

import android.os.Build
import kotlin.math.roundToInt

object DeviceProcessorReader {

    data class ProcessorInfo(
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

    fun read(): ProcessorInfo {
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

    private fun readTextFileQuiet(path: String): String? {
        return try {
            val file = java.io.File(path)
            if (!file.exists() || !file.canRead()) null
            else file.readText().trim().takeIf { it.isNotBlank() }
        } catch (_: Throwable) {
            null
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
}
