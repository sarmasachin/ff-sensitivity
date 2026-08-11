package com.ffsensitivity.app.data

import android.os.Build

/**
 * Some OEMs put a factory SKU in [Build.MODEL] (Xiaomi `23128PC33I`).
 * Others already send a marketing name (Motorola `motorola edge 60 pro`).
 * Only replace when MODEL looks like a SKU and firmware exposes a market name.
 */
object DeviceMarketName {
    fun forHeartbeat(rawModel: String = Build.MODEL.orEmpty()): String {
        val model = rawModel.trim()
        if (model.isEmpty() || !looksLikeFactoryCode(model)) return model
        return firstUsableMarketName(model) ?: model
    }

    internal fun looksLikeFactoryCode(model: String): Boolean {
        val m = model.trim()
        if (m.length !in 4..24) return false
        if (m.any { it.isWhitespace() }) return false
        val compact = m.replace("-", "").replace("_", "")
        if (compact.length < 4 || !compact.all { it.isLetterOrDigit() }) return false
        val letters = compact.count { it.isLetter() }
        val digits = compact.count { it.isDigit() }
        return letters >= 1 && digits >= 2
    }

    private fun firstUsableMarketName(model: String): String? {
        for (key in MARKET_NAME_PROPS) {
            val value = readSystemProperty(key)
            if (isUsableMarketName(value, model)) return value.trim().replace(WHITESPACE, " ")
        }
        return null
    }

    internal fun isUsableMarketName(name: String, model: String): Boolean {
        val n = name.trim().replace(WHITESPACE, " ")
        if (n.length !in 2..60) return false
        if (n.equals(model, ignoreCase = true)) return false
        if (looksLikeFactoryCode(n)) return false
        return n.any { it.isLetter() }
    }

    private fun readSystemProperty(key: String): String {
        return try {
            val clazz = Class.forName("android.os.SystemProperties")
            val method = clazz.getMethod("get", String::class.java, String::class.java)
            (method.invoke(null, key, "") as? String).orEmpty()
        } catch (_: Throwable) {
            ""
        }
    }

    private val WHITESPACE = Regex("\\s+")

    private val MARKET_NAME_PROPS = listOf(
        "ro.product.marketname",
        "ro.product.odm.marketname",
        "ro.product.vendor.marketname",
        "ro.vendor.oplus.market.name",
        "ro.vendor.oplus.marketname",
        "ro.oppo.market.name",
        "ro.vivo.market.name",
        "ro.config.marketing_name",
        "ro.semc.product.name",
    )
}
