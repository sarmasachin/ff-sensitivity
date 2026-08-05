package com.ffsensitivity.app.data

data class SharedSensiCard(
    val id: String,
    val name: String,
    val freeFireId: String,
    val rank: String,
    val role: String,
    val deviceLabel: String,
    val deviceMeta: String,
    val matches: Int,
    val kills: Int,
    val headshots: Int,
    val general: Int,
    val redDot: Int,
    val scope2x: Int,
    val scope4x: Int,
    val awm: Int,
    val freeLook: Int
) {
    val kd: String
        get() = if (matches <= 0) "—" else String.format(java.util.Locale.US, "%.2f", kills.toDouble() / matches)
}
