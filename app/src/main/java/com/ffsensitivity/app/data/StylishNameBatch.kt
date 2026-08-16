package com.ffsensitivity.app.data

private val HERO_ICONS = listOf(
    "☠", "⚔", "♛", "♕", "♚", "♔",
    "꧁", "꧂", "༒", "༺", "༻", "彡", "亗", "乂",
    "⚡", "☬", "✞", "★", "☆", "✦", "✧",
    "『", "』", "【", "】", "ツ", "࿐", "᭄", "ঔ", "ৣ", "丨"
)

private val HERO_FRAME_HINTS = listOf(
    "skull", "blade", "dark", "royal", "khanda", "classic",
    "diamond", "star_flow", "bolt", "tibetan", "angel", "cjk", "yi"
)

internal fun stylishNameStyleRank(item: StylishNameCatalog.GeneratedName): Int {
    var score = 0
    val value = item.value
    val id = item.id
    var heroHits = 0
    for (icon in HERO_ICONS) {
        if (value.contains(icon)) {
            score += 12
            heroHits++
        }
    }
    if (heroHits >= 2) score += 22
    if (heroHits >= 3) score += 16

    for (hint in HERO_FRAME_HINTS) {
        if (id.contains(hint)) {
            score += 28
            break
        }
    }

    when {
        "_full_" in id -> score += 36
        "_wrap_" in id && heroHits > 0 -> score += 20
        "_mid_" in id && heroHits > 0 -> score += 24
        "_left_" in id || "_right_" in id -> score += 2
    }

    if (id.startsWith("normal_") || id.startsWith("small_caps_")) score += 6
    return score
}

internal fun pickStylishNameBatch(
    all: List<StylishNameCatalog.GeneratedName>,
    usedValues: Set<String>,
    fontChoiceId: String?,
    limit: Int
): List<StylishNameCatalog.GeneratedName> {
    if (limit <= 0 || all.isEmpty()) return emptyList()
    val filtered = all.asSequence()
        .filter { it.value !in usedValues }
        .filter { fontChoiceId == null || it.id.startsWith(fontChoiceId + "_") }
        .toList()
    if (filtered.isEmpty()) return emptyList()

    val premium = ArrayList<StylishNameCatalog.GeneratedName>(filtered.size)
    val mid = ArrayList<StylishNameCatalog.GeneratedName>(filtered.size / 2)
    val simple = ArrayList<StylishNameCatalog.GeneratedName>(filtered.size / 2)
    for (item in filtered) {
        val rank = stylishNameStyleRank(item)
        when {
            rank >= 45 -> premium.add(item)
            rank >= 18 -> mid.add(item)
            else -> simple.add(item)
        }
    }
    premium.shuffle()
    mid.shuffle()
    simple.shuffle()

    val premiumTarget = (limit * 0.75).toInt().coerceAtLeast(1)
    val midTarget = (limit * 0.15).toInt()
    val simpleTarget = (limit - premiumTarget - midTarget).coerceAtLeast(0)

    val pQueue = ArrayDeque(premium.take(premiumTarget))
    val sprinkle = ArrayDeque(
        (mid.take(midTarget) + simple.take(simpleTarget)).shuffled()
    )

    val out = ArrayList<StylishNameCatalog.GeneratedName>(limit)
    var step = 0
    while (out.size < limit && (pQueue.isNotEmpty() || sprinkle.isNotEmpty())) {
        val takeSimple = step > 0 && step % 6 == 0 && sprinkle.isNotEmpty()
        when {
            takeSimple -> out.add(sprinkle.removeFirst())
            pQueue.isNotEmpty() -> out.add(pQueue.removeFirst())
            sprinkle.isNotEmpty() -> out.add(sprinkle.removeFirst())
        }
        step++
    }
    return out
}
