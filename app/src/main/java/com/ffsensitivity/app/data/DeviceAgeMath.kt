package com.ffsensitivity.app.data

import kotlin.math.roundToInt

/**
 * Device-age math (no Android APIs). Fetch Device used to take the oldest of
 * OS-launch date + GSF install + board first_api — that makes Android 13
 * phones look years older than they are.
 */
internal object DeviceAgeMath {
    const val DAY_MS = 86_400_000L
    const val MONTH_MS = 30L * DAY_MS
    /** Android 13 SKUs shipped for ~3.5 years; beyond that is almost always OTA. */
    const val SHIPPING_WINDOW_MS = 42L * MONTH_MS

    fun firstApiToEpochMs(firstApi: Int): Long? {
        if (firstApi <= 0) return null
        val (year, month) = when {
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
        return utcYmdMs(year, month, 15)
    }

    fun utcYmdMs(year: Int, month: Int, day: Int): Long {
        val cal = java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("UTC"))
        cal.clear()
        cal.set(year, month - 1, day, 12, 0, 0)
        return cal.timeInMillis
    }

    fun pickBirthMs(apiEpochMs: Long?, buildMs: List<Long>, nowMs: Long): Long? {
        val minOk = utcYmdMs(2012, 1, 1)
        val sane = buildMs.filter { it in minOk until nowMs }
        val oldestBuild = sane.minOrNull()
        if (apiEpochMs == null) return oldestBuild
        if (oldestBuild == null) return apiEpochMs
        if (oldestBuild < apiEpochMs - 90 * DAY_MS) return apiEpochMs
        val eighteenMonths = 18 * MONTH_MS
        val thirtyMonths = 30 * MONTH_MS
        if (oldestBuild > nowMs - eighteenMonths && apiEpochMs < nowMs - thirtyMonths) {
            return apiEpochMs
        }
        if (oldestBuild <= apiEpochMs + SHIPPING_WINDOW_MS) return oldestBuild
        return apiEpochMs
    }

    fun yearsSince(birthMs: Long, nowMs: Long): Double {
        val ageMs = nowMs - birthMs
        if (ageMs <= 0L) return 0.1
        val years = ageMs / (365.25 * 24.0 * 60.0 * 60.0 * 1000.0)
        return ((years * 10.0).roundToInt() / 10.0).coerceIn(0.1, 15.0)
    }

    fun formatAgeLabel(years: Double?): String {
        if (years == null) return "Unknown"
        return if (years < 1.0) {
            String.format("%.1f yr", years)
        } else {
            String.format("%.1f yrs", years)
        }
    }
}
