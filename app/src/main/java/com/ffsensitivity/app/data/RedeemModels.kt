package com.ffsensitivity.app.data

enum class RedeemType { GOOGLE_PLAY, FF_DIAMONDS }
enum class RedeemStatus { ACTIVE, CLAIMED }
enum class RedeemCadence { DAILY, WEEKLY }

data class RedeemCodeItem(
    val id: String,
    val type: RedeemType,
    val title: String,
    val valueLabel: String,
    val code: String,
    val status: RedeemStatus,
    val expiresLabel: String,
    val tip: String = "First Come, First Serve!",
    val redeemUrl: String,
    val stockLeft: Int? = null,
    val coinCost: Int? = null,
    val cadence: RedeemCadence = RedeemCadence.DAILY,
    // --- Start: Redeem live wire (Sachin) ---
    val serverUnlocked: Boolean = false
    // --- End: Redeem live wire (Sachin) ---
)
