package com.ffsensitivity.app.data

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import kotlin.math.roundToInt

object DeviceBatteryHealthReader {

    data class BatteryHealthInfo(
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
    fun read(context: Context): BatteryHealthInfo {
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

    private fun readTextFileQuiet(path: String): String? {
        return try {
            val file = java.io.File(path)
            if (!file.exists() || !file.canRead()) null
            else file.readText().trim().takeIf { it.isNotBlank() }
        } catch (_: Throwable) {
            null
        }
    }
}
