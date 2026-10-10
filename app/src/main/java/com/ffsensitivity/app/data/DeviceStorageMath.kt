package com.ffsensitivity.app.data

import kotlin.math.roundToInt

/**
 * Storage display math (no Android APIs) so Fetch Device matches Settings
 * on Android 13+ where usable bytes are ~80–95% of the marketed size.
 */
internal object DeviceStorageMath {
    /** Typical retail SKUs. Usable StatFs is smaller than the box label. */
    val MARKET_GB = longArrayOf(8, 16, 32, 64, 128, 256, 512, 1024, 2048)

    /** Ignore tmpfs / broken UUID reads (Android 13 UUID_DEFAULT can be tiny). */
    const val MIN_VOLUME_BYTES = 2L * 1000L * 1000L * 1000L

    fun bytesToDecimalGb(bytes: Long): Double =
        bytes.coerceAtLeast(0L).toDouble() / (1000.0 * 1000.0 * 1000.0)

    /**
     * Snap usable total to the marketed bucket when it is clearly that SKU.
     * 110–128 GB usable → 128 GB (Settings / box). Far-off values stay as-is.
     */
    fun snapMarketTotalBytes(usableBytes: Long): Long {
        if (usableBytes < MIN_VOLUME_BYTES) return usableBytes.coerceAtLeast(0L)
        val usableGb = bytesToDecimalGb(usableBytes)
        for (bucket in MARKET_GB) {
            val minGb = bucket * 0.80
            if (usableGb <= bucket + 0.5 && usableGb >= minGb) {
                return bucket * 1_000_000_000L
            }
        }
        return usableBytes
    }

    fun formatGbLabel(bytes: Long): String {
        val gb = bytesToDecimalGb(bytes)
        return if (gb >= 10.0) {
            "${gb.roundToInt()} GB"
        } else {
            String.format("%.1f GB", gb)
        }
    }

    fun formatStorageLabel(totalBytes: Long, freeBytes: Long): String {
        val total = snapMarketTotalBytes(totalBytes)
        val free = freeBytes.coerceIn(0L, total.coerceAtLeast(freeBytes))
        return "${formatGbLabel(free)} free / ${formatGbLabel(total)}"
    }
}
