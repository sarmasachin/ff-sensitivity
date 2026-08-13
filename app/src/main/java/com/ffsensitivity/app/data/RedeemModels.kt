package com.ffsensitivity.app.data

enum class RedeemStatus { ACTIVE, CLAIMED }
enum class RedeemMode { SINGLE, SCRATCH_REWARD }

data class RedeemTypeOption(
    val id: String,
    val label: String
)

data class RedeemCadenceOption(
    val id: String,
    val label: String,
    val claimLimit: Int = 3,
    val windowHours: Int = 24
)

data class RedeemCatalogPayload(
    val items: List<RedeemCodeItem>,
    val types: List<RedeemTypeOption> = emptyList(),
    val cadences: List<RedeemCadenceOption> = emptyList()
)

data class RedeemCodeItem(
    val id: String,
    val type: String,
    val title: String,
    val valueLabel: String,
    val code: String,
    val status: RedeemStatus,
    val expiresLabel: String,
    val tip: String = "First Come, First Serve!",
    val redeemUrl: String,
    val stockLeft: Int? = null,
    val coinCost: Int? = null,
    val cadence: String = "DAILY",
    // --- Start: Redeem live wire (Sachin) ---
    val serverUnlocked: Boolean = false,
    // --- End: Redeem live wire (Sachin) ---
    val mode: RedeemMode = RedeemMode.SINGLE,
    val coinRewardMin: Int? = null,
    val coinRewardMax: Int? = null,
    val poolLeft: Int? = null,
    val needsAd: Boolean = false,
    val canScratch: Boolean = false
) {
    val isScratchReward: Boolean get() = mode == RedeemMode.SCRATCH_REWARD
    val isPlayGift: Boolean get() = type == "GOOGLE_PLAY"
}
