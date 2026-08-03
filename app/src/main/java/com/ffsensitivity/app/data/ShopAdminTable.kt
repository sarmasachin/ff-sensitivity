package com.ffsensitivity.app.data

/**
 * =============================================================================
 * ADMIN TABLE — Coin Shop items
 * =============================================================================
 * Yahan se items add / edit / disable karo.
 *
 * Naya item kaise daalein:
 * 1) Niche list me ek naya ShopItem(...) row add karo
 * 2) id unique rakho (e.g. "boost_quiz_x2")
 * 3) priceCoins set karo
 * 4) enabled = false se hide (delete ki zarurat nahi)
 *
 * App restart / rebuild ke baad naya item shop me dikhega.
 * =============================================================================
 */
object ShopAdminTable {

    /** Active catalog — sirf enabled rows shop UI me aati hain. */
    fun items(): List<ShopItem> = table.filter { it.enabled && it.priceCoins > 0 }

    fun findById(id: String): ShopItem? = table.firstOrNull { it.id == id }

    /**
     * ADMIN ROWS — har entry = ek product.
     * Order = shop me display order.
     */
    private val table: List<ShopItem> = listOf(

        // --- PRIZES (in-app vault only — not real delivery yet) ---
        ShopItem(
            id = "prize_google_play_gift",
            title = "Google Play Gift Card",
            subtitle = "In-app vault entry only · not a real Google Play code yet.",
            category = ShopCategory.PRIZE,
            priceCoins = 500,
            oneTime = false,
            stockLimit = 20,
            rewardTag = "VAULT"
        ),
        ShopItem(
            id = "prize_ff_diamonds",
            title = "Free Fire Diamonds",
            subtitle = "In-app vault entry only · diamonds are not delivered in-game yet.",
            category = ShopCategory.PRIZE,
            priceCoins = 400,
            oneTime = false,
            stockLimit = 40,
            rewardTag = "VAULT"
        ),
        ShopItem(
            id = "prize_ffmax_diamonds",
            title = "FF Max Diamonds",
            subtitle = "In-app vault entry only · FF Max diamonds not delivered yet.",
            category = ShopCategory.PRIZE,
            priceCoins = 450,
            oneTime = false,
            stockLimit = 40,
            rewardTag = "VAULT"
        ),
        ShopItem(
            id = "prize_royale_pass",
            title = "Royale Pass",
            subtitle = "In-app vault entry only · Pass is not activated on your account yet.",
            category = ShopCategory.PRIZE,
            priceCoins = 600,
            oneTime = true,
            rewardTag = "VAULT"
        ),
        ShopItem(
            id = "prize_premium_skin",
            title = "Premium Skin",
            subtitle = "In-app vault entry only · skin is not applied in Free Fire yet.",
            category = ShopCategory.PRIZE,
            priceCoins = 350,
            oneTime = false,
            stockLimit = 30,
            rewardTag = "VAULT"
        ),

        // --- BOOSTS (wired) ---
        ShopItem(
            id = "boost_quiz_double",
            title = "Quiz Double Coins",
            subtitle = "Next correct daily quiz pays 2× coins. Stacks if you buy more.",
            category = ShopCategory.BOOST,
            priceCoins = 80,
            oneTime = false,
            stockLimit = 30,
            rewardTag = "2× QUIZ"
        ),
        ShopItem(
            id = "boost_checkin_plus",
            title = "Check-in Plus",
            subtitle = "Next daily check-in pays +20 extra coins. Stacks if you buy more.",
            category = ShopCategory.BOOST,
            priceCoins = 60,
            oneTime = false,
            stockLimit = 30,
            rewardTag = "STREAK+"
        ),

        // --- UNLOCKS (hidden until identity UI is ready) ---
        ShopItem(
            id = "unlock_premium_badge",
            title = "Pro Player Badge",
            subtitle = "Unlock a Pro Player badge for your profile & archive.",
            category = ShopCategory.UNLOCK,
            priceCoins = 200,
            enabled = false,
            oneTime = true,
            rewardTag = "BADGE"
        ),
        ShopItem(
            id = "unlock_elite_title",
            title = "Elite Title",
            subtitle = "Unlock the Elite title tag in your rewards identity.",
            category = ShopCategory.UNLOCK,
            priceCoins = 350,
            enabled = false,
            oneTime = true,
            rewardTag = "TITLE"
        ),

        // --- PACKS ---
        ShopItem(
            id = "pack_stylish_rare",
            title = "Rare Stylish Pack",
            subtitle = "Unlocks a rare stylish-name symbol flavor for generators.",
            category = ShopCategory.PACK,
            priceCoins = 150,
            enabled = false,
            oneTime = true,
            rewardTag = "NAMES"
        ),
        ShopItem(
            id = "pack_scratch_bonus",
            title = "Bonus Scratch Token",
            subtitle = "Adds a shop win token to your scratch archive history.",
            category = ShopCategory.PACK,
            priceCoins = 120,
            oneTime = false,
            stockLimit = 50,
            rewardTag = "TOKEN"
        ),

        // --- COSMETICS (wired) ---
        ShopItem(
            id = "cosmetic_gold_wallet",
            title = "Gold Wallet Chip",
            subtitle = "Applies a premium gold accent on your in-app coin wallet chip.",
            category = ShopCategory.COSMETIC,
            priceCoins = 100,
            oneTime = true,
            rewardTag = "STYLE"
        ),
        ShopItem(
            id = "cosmetic_foil_obsidian",
            title = "Obsidian Foil Skin",
            subtitle = "Applies a dark premium foil look on scratch cards in this app.",
            category = ShopCategory.COSMETIC,
            priceCoins = 180,
            oneTime = true,
            rewardTag = "FOIL"
        )
    )
}
