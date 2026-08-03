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
    val cadence: RedeemCadence = RedeemCadence.DAILY
)

val sampleRedeemCodes = listOf(
    RedeemCodeItem(
        id = "1",
        type = RedeemType.GOOGLE_PLAY,
        title = "GOOGLE PLAY GIFT CARD",
        valueLabel = "₹50 INR",
        code = "ABCD-8X92-K12M-99PL",
        status = RedeemStatus.ACTIVE,
        expiresLabel = "In 4 Hours",
        redeemUrl = "https://play.google.com/redeem",
        stockLeft = 5,
        cadence = RedeemCadence.DAILY
    ),
    RedeemCodeItem(
        id = "2",
        type = RedeemType.FF_DIAMONDS,
        title = "FREE FIRE DIAMONDS",
        valueLabel = "100 Diamonds",
        code = "FFDX-7K21-P90Q-44MZ",
        status = RedeemStatus.ACTIVE,
        expiresLabel = "Valid till Midnight",
        redeemUrl = "https://reward.ff.garena.com",
        stockLeft = 3,
        coinCost = 1000,
        cadence = RedeemCadence.DAILY
    ),
    RedeemCodeItem(
        id = "3",
        type = RedeemType.GOOGLE_PLAY,
        title = "GOOGLE PLAY GIFT CARD",
        valueLabel = "₹10 INR",
        code = "USED-0000-0000-0001",
        status = RedeemStatus.CLAIMED,
        expiresLabel = "Expired",
        redeemUrl = "https://play.google.com/redeem",
        cadence = RedeemCadence.DAILY
    ),
    RedeemCodeItem(
        id = "4",
        type = RedeemType.GOOGLE_PLAY,
        title = "GOOGLE PLAY GIFT CARD",
        valueLabel = "₹100 INR",
        code = "WEEK-9K21-M88P-12QT",
        status = RedeemStatus.ACTIVE,
        expiresLabel = "7-day streak bonus",
        tip = "Complete 7-day streak for a bigger chance!",
        redeemUrl = "https://play.google.com/redeem",
        stockLeft = 2,
        cadence = RedeemCadence.WEEKLY
    )
)
