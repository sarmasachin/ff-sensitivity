package com.ffsensitivity.app.data

import android.content.Context
import android.hardware.display.DisplayManager
import android.os.Build
import android.provider.Settings
import android.view.Display
import android.view.WindowManager
import kotlin.math.roundToInt

/**
 * Reads active + peak panel refresh rates.
 *
 * Many OEMs only expose the *currently enabled* mode via [Display.getMode],
 * so max must also come from supportedModes, alternative rates, Settings, and props.
 */
object DisplayRefreshRates {

    data class Result(
        val activeHz: Int,
        val maxHz: Int,
        val activeLabel: String,
        val maxLabel: String
    )

    fun read(context: Context): Result {
        return try {
            val app = context.applicationContext
            val candidates = linkedSetOf<Float>()

            val displays = resolveAllDisplays(app)
            val primary = displays.firstOrNull { it.displayId == Display.DEFAULT_DISPLAY }
                ?: displays.firstOrNull()
            var activeRaw = 60f
            if (primary != null) {
                activeRaw = readActiveRefreshRaw(primary)
            }
            displays.forEach { display ->
                candidates.addAll(collectModeRates(display))
            }
            candidates.add(activeRaw)

            readPeakFromSettings(app)?.let { candidates.add(it) }
            collectFromSystemProps().forEach { candidates.add(it) }

            val activeHz = normalizeRefreshHz(activeRaw)
            val maxRaw = candidates.filter { it >= 30f }.maxOrNull() ?: activeRaw
            val maxHz = normalizeRefreshHz(maxRaw).coerceAtLeast(activeHz)

            Result(
                activeHz = activeHz,
                maxHz = maxHz,
                activeLabel = "${activeHz}Hz",
                maxLabel = "${maxHz}Hz"
            )
        } catch (_: Exception) {
            Result(60, 60, "60Hz", "60Hz")
        }
    }

    private fun resolveAllDisplays(context: Context): List<Display> {
        val out = linkedSetOf<Display>()
        try {
            val dm = context.getSystemService(Context.DISPLAY_SERVICE) as? DisplayManager
            if (dm != null) {
                dm.displays.forEach { out.add(it) }
                dm.getDisplay(Display.DEFAULT_DISPLAY)?.let { out.add(it) }
            }
        } catch (_: Exception) {
            // continue
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                context.display?.let { out.add(it) }
            }
        } catch (_: Exception) {
            // continue
        }
        try {
            @Suppress("DEPRECATION")
            (context.getSystemService(Context.WINDOW_SERVICE) as? WindowManager)
                ?.defaultDisplay
                ?.let { out.add(it) }
        } catch (_: Exception) {
            // continue
        }
        return out.toList()
    }

    private fun readActiveRefreshRaw(display: Display): Float {
        return try {
            val fromMode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                display.mode?.refreshRate
            } else {
                null
            }
            fromMode ?: display.refreshRate
        } catch (_: Exception) {
            60f
        }
    }

    private fun collectModeRates(display: Display): List<Float> {
        val rates = mutableListOf<Float>()
        try {
            rates.add(display.refreshRate)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                display.mode?.let { mode ->
                    rates.add(mode.refreshRate)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        mode.alternativeRefreshRates.forEach { rates.add(it) }
                    }
                }
                display.supportedModes.forEach { mode ->
                    rates.add(mode.refreshRate)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        mode.alternativeRefreshRates.forEach { rates.add(it) }
                    }
                }
            }
        } catch (_: Exception) {
            // keep what we have
        }
        return rates.filter { it >= 30f }
    }

    private fun readPeakFromSettings(context: Context): Float? {
        val keys = listOf(
            "peak_refresh_rate",
            "min_refresh_rate",
            "user_refresh_rate",
            "preferred_refresh_rate",
            "refresh_rate"
        )
        val cr = context.contentResolver
        for (key in keys) {
            parseHzFloat(
                runCatching { Settings.Secure.getString(cr, key) }.getOrNull()
                    ?: runCatching { Settings.System.getString(cr, key) }.getOrNull()
            )?.let { return it }
            runCatching {
                Settings.Secure.getFloat(cr, key)
            }.getOrNull()?.takeIf { it >= 30f }?.let { return it }
            runCatching {
                Settings.System.getFloat(cr, key)
            }.getOrNull()?.takeIf { it >= 30f }?.let { return it }
        }
        return null
    }

    private fun collectFromSystemProps(): List<Float> {
        val keys = listOf(
            "persist.vendor.dfps.level",
            "persist.sys.miui_refresh_rate",
            "persist.vendor.display.refresh_rate",
            "ro.vendor.display.default_fps",
            "ro.vendor.display.max_fps",
            "ro.vendor.display.supported_fps",
            "persist.sys.display_prefer",
            "persist.sys.sf.fps",
            "ro.config.high_refresh_rate"
        )
        val out = mutableListOf<Float>()
        for (key in keys) {
            val raw = readSystemPropertyString(key) ?: continue
            parseHzFloat(raw)?.let { out.add(it) }
            raw.split(',', ' ', '|', ';').forEach { token ->
                parseHzFloat(token)?.let { out.add(it) }
            }
        }
        return out
    }

    private fun parseHzFloat(raw: String?): Float? {
        if (raw.isNullOrBlank()) return null
        val trimmed = raw.trim()
        val match = Regex("""(\d{2,3}(?:\.\d+)?)""").find(trimmed) ?: return null
        val value = match.groupValues[1].toFloatOrNull() ?: return null
        if (value < 30f || value > 240f) return null
        return value
    }

    /** Snap noisy values (119.98 / 59.94) to common gaming panel rates. */
    private fun normalizeRefreshHz(raw: Float): Int {
        val rounded = raw.roundToInt().coerceIn(30, 240)
        val buckets = intArrayOf(60, 90, 120, 144, 165, 180, 240)
        for (bucket in buckets) {
            if (kotlin.math.abs(rounded - bucket) <= 4) return bucket
        }
        return rounded
    }

    private fun readSystemPropertyString(key: String): String? {
        return try {
            val clazz = Class.forName("android.os.SystemProperties")
            val get = clazz.getMethod("get", String::class.java, String::class.java)
            val value = get.invoke(null, key, "") as? String
            value?.takeIf { it.isNotBlank() }
        } catch (_: Exception) {
            null
        }
    }
}
