package com.ffsensitivity.app.data

import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Point
import android.hardware.display.DisplayManager
import android.os.Build
import android.util.DisplayMetrics
import android.view.Display
import android.view.WindowManager
import kotlin.math.hypot
import kotlin.math.roundToInt

object DeviceDisplayReaders {

    data class DpiMetrics(
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
    fun readDpiMetrics(context: Context, shortSidePx: Int): DpiMetrics {
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

    fun readTouchRateHz(): Int? {
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

    fun hasGamingMode(context: Context): Boolean {
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

    data class DisplayTypeInfo(
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
    fun readDisplayTypeInfo(context: Context): DisplayTypeInfo {
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

    data class DisplayGeometry(
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

    fun readDisplayGeometry(context: Context): DisplayGeometry {
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
