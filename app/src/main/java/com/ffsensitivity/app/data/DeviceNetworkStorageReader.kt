package com.ffsensitivity.app.data

import android.app.usage.StorageStatsManager
import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.os.Build
import android.os.Environment
import android.os.StatFs
import android.os.storage.StorageManager
import android.telephony.TelephonyManager
import android.text.format.Formatter
import com.ffsensitivity.app.util.AppLog
import java.io.IOException
import java.util.UUID

/**
 * Network + internal storage probes for device scan.
 * Kept out of [DeviceInfoFetcher] (already over the 1000-line limit).
 */
object DeviceNetworkStorageReader {

    data class NetworkStorageInfo(
        val networkTypeLabel: String,
        val storageTotalGb: Double,
        val storageFreeGb: Double,
        val storageLabel: String
    )

    fun read(context: Context): NetworkStorageInfo {
        val storage = readStorage(context.applicationContext)
        return NetworkStorageInfo(
            networkTypeLabel = readNetworkTypeLabel(context),
            storageTotalGb = storage.first,
            storageFreeGb = storage.second,
            storageLabel = storage.third
        )
    }

    /**
     * Active internet path the user is on (VPN-aware).
     * Examples: Wi-Fi · Mobile · 5G · Wi-Fi · VPN · Offline
     */
    private fun readNetworkTypeLabel(context: Context): String {
        return runCatching {
            val cm = context.getSystemService(ConnectivityManager::class.java)
                ?: return@runCatching "Unknown"

            val primary = resolvePrimaryNetwork(cm) ?: return@runCatching "Offline"
            val primaryCaps = cm.getNetworkCapabilities(primary)
                ?: return@runCatching "Unknown"

            val vpnOn = primaryCaps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)
            val transportCaps = if (vpnOn) {
                findNonVpnInternetCaps(cm) ?: primaryCaps
            } else {
                primaryCaps
            }

            val base = labelForTransports(context, transportCaps)
            when {
                base == "Offline" || base == "Unknown" -> base
                vpnOn -> "$base · VPN"
                else -> base
            }
        }.getOrElse {
            AppLog.e("Network type read failed", it)
            "Unknown"
        }
    }

    /** Prefer validated internet network; else any internet-capable; else active. */
    private fun resolvePrimaryNetwork(cm: ConnectivityManager): Network? {
        val active = cm.activeNetwork
        if (active != null) {
            val caps = cm.getNetworkCapabilities(active)
            if (caps != null &&
                caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            ) {
                return active
            }
        }
        val all = cm.allNetworks
        all.firstOrNull { n ->
            val c = cm.getNetworkCapabilities(n) ?: return@firstOrNull false
            c.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                c.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
        }?.let { return it }

        all.firstOrNull { n ->
            val c = cm.getNetworkCapabilities(n) ?: return@firstOrNull false
            c.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        }?.let { return it }

        return active
    }

    /** Under a VPN, find the real Wi‑Fi / cellular / ethernet path. */
    private fun findNonVpnInternetCaps(cm: ConnectivityManager): NetworkCapabilities? {
        for (n in cm.allNetworks) {
            val c = cm.getNetworkCapabilities(n) ?: continue
            if (c.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) continue
            if (!c.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) continue
            val hasReal = c.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                c.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
                c.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) ||
                c.hasTransport(NetworkCapabilities.TRANSPORT_BLUETOOTH)
            if (hasReal) return c
        }
        return null
    }

    private fun labelForTransports(context: Context, caps: NetworkCapabilities): String {
        return when {
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "Wi-Fi"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "Ethernet"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> {
                val gen = readCellularGeneration(context)
                if (gen != null) "Mobile · $gen" else "Mobile data"
            }
            caps.hasTransport(NetworkCapabilities.TRANSPORT_BLUETOOTH) -> "Bluetooth tethering"
            else -> "Unknown"
        }
    }

    /**
     * Best-effort 2G/3G/4G/5G from TelephonyManager.
     * May return null without phone permission (then UI shows "Mobile data").
     */
    private fun readCellularGeneration(context: Context): String? {
        return runCatching {
            val tm = context.getSystemService(TelephonyManager::class.java) ?: return null
            val type = if (Build.VERSION.SDK_INT >= 24) {
                @Suppress("DEPRECATION")
                tm.dataNetworkType
            } else {
                @Suppress("DEPRECATION")
                tm.networkType
            }
            mapMobileNetworkType(type)
        }.getOrElse {
            // SecurityException when READ_PHONE_STATE / BASIC not granted — expected.
            AppLog.e("Cellular generation read failed", it)
            null
        }
    }

    private fun mapMobileNetworkType(type: Int): String? {
        return when (type) {
            TelephonyManager.NETWORK_TYPE_NR -> "5G"
            TelephonyManager.NETWORK_TYPE_LTE -> "4G LTE"
            TelephonyManager.NETWORK_TYPE_HSPAP,
            TelephonyManager.NETWORK_TYPE_HSPA,
            TelephonyManager.NETWORK_TYPE_HSUPA,
            TelephonyManager.NETWORK_TYPE_HSDPA,
            TelephonyManager.NETWORK_TYPE_UMTS,
            TelephonyManager.NETWORK_TYPE_EVDO_0,
            TelephonyManager.NETWORK_TYPE_EVDO_A,
            TelephonyManager.NETWORK_TYPE_EVDO_B,
            TelephonyManager.NETWORK_TYPE_EHRPD -> "3G"
            TelephonyManager.NETWORK_TYPE_GPRS,
            TelephonyManager.NETWORK_TYPE_EDGE,
            TelephonyManager.NETWORK_TYPE_CDMA,
            TelephonyManager.NETWORK_TYPE_1xRTT,
            TelephonyManager.NETWORK_TYPE_IDEN -> "2G"
            TelephonyManager.NETWORK_TYPE_UNKNOWN -> null
            else -> null
        }
    }

    /**
     * User-facing storage (matches Settings better than StatFs /data).
     * Primary: [StorageStatsManager] UUID_DEFAULT — retail total + reclaimable free.
     * Fallback: StatFs on data dir if stats service fails.
     */
    private fun readStorage(context: Context): Triple<Double, Double, String> {
        val fromStats = readStorageViaStatsManager(context)
        if (fromStats != null) return fromStats
        return readStorageViaStatFs(context)
    }

    private fun readStorageViaStatsManager(context: Context): Triple<Double, Double, String>? {
        return runCatching {
            val stats = context.getSystemService(StorageStatsManager::class.java)
                ?: return@runCatching null
            val uuid: UUID = StorageManager.UUID_DEFAULT
            val totalBytes = stats.getTotalBytes(uuid).coerceAtLeast(0L)
            val freeBytes = stats.getFreeBytes(uuid).coerceAtLeast(0L)
            if (totalBytes <= 0L) return@runCatching null
            toStorageTriple(context, totalBytes, freeBytes)
        }.getOrElse {
            if (it is IOException) {
                AppLog.e("StorageStatsManager read failed", it)
            } else {
                AppLog.e("StorageStatsManager unexpected failure", it)
            }
            null
        }
    }

    private fun readStorageViaStatFs(context: Context): Triple<Double, Double, String> {
        return runCatching {
            val path = Environment.getDataDirectory().absolutePath
            val stat = StatFs(path)
            val totalBytes = stat.totalBytes.coerceAtLeast(0L)
            val freeBytes = stat.availableBytes.coerceAtLeast(0L)
            toStorageTriple(context, totalBytes, freeBytes)
        }.getOrElse {
            AppLog.e("StatFs storage fallback failed", it)
            Triple(0.0, 0.0, "Unknown")
        }
    }

    private fun toStorageTriple(
        context: Context,
        totalBytes: Long,
        freeBytes: Long
    ): Triple<Double, Double, String> {
        // Decimal GB (1000^3) — same family Settings / Formatter uses for display.
        val totalGb = bytesToDecimalGb(totalBytes)
        val freeGb = bytesToDecimalGb(freeBytes)
        val freeLabel = Formatter.formatShortFileSize(context, freeBytes)
        val totalLabel = Formatter.formatShortFileSize(context, totalBytes)
        val label = "$freeLabel free / $totalLabel"
        return Triple(totalGb, freeGb, label)
    }

    private fun bytesToDecimalGb(bytes: Long): Double {
        return bytes.toDouble() / (1000.0 * 1000.0 * 1000.0)
    }
}
