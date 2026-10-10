package com.ffsensitivity.app.data

import android.content.Context
import android.os.Build

/**
 * Device age for Fetch Device. Android 13 OEMs often hide product first_api
 * and fall back to chipset BSP API / ancient GSF install times — those made
 * 1–2 yr phones show as 5–7 yrs.
 */
object DeviceAgeReader {

    fun read(context: Context): Pair<Double?, String> {
        val years = estimateYears()
        return years to DeviceAgeMath.formatAgeLabel(years)
    }

    private fun estimateYears(): Double? {
        val now = System.currentTimeMillis()
        val firstApi = readProductFirstApi()
        val apiEpoch = DeviceAgeMath.firstApiToEpochMs(firstApi)
        val birth = DeviceAgeMath.pickBirthMs(apiEpoch, readBuildTimes(), now) ?: return null
        return DeviceAgeMath.yearsSince(birth, now)
    }

    /** Phone shipping API only — never board/SoC first_api. */
    private fun readProductFirstApi(): Int {
        try {
            val field = Build.VERSION::class.java.getField("DEVICE_INITIAL_SDK_INT")
            val value = field.getInt(null)
            if (value in 1..Build.VERSION.SDK_INT) return value
        } catch (_: Throwable) {
            // Hidden on some Android 13 builds — fall through.
        }
        val product = readSystemPropertyInt("ro.product.first_api_level", 0)
        if (product in 1..Build.VERSION.SDK_INT) return product
        return 0
    }

    private fun readBuildTimes(): List<Long> {
        val out = ArrayList<Long>(6)
        if (Build.TIME > 0L) out.add(Build.TIME)
        listOf(
            "ro.vendor.build.date.utc",
            "ro.bootimage.build.date.utc",
            "ro.system.build.date.utc",
            "ro.build.date.utc"
        ).forEach { key ->
            readUtcSeconds(key)?.let { sec ->
                if (sec > 0L) out.add(sec * 1000L)
            }
        }
        return out
    }

    private fun readUtcSeconds(key: String): Long? {
        val raw = readSystemPropertyString(key) ?: return null
        return raw.trim().toLongOrNull()?.takeIf { it in 1_000_000_000L..2_200_000_000L }
    }

    private fun readSystemPropertyInt(key: String, default: Int): Int {
        return try {
            val clazz = Class.forName("android.os.SystemProperties")
            val method = clazz.getMethod(
                "getInt",
                String::class.java,
                Int::class.javaPrimitiveType
            )
            method.invoke(null, key, default) as Int
        } catch (_: Throwable) {
            default
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
