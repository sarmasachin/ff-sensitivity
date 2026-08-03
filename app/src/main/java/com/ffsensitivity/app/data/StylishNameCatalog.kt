package com.ffsensitivity.app.data

import android.content.Context
import org.json.JSONObject

/**
 * Free Fire stylish-name catalog (offline).
 *
 * Every result is stylish (never plain name alone):
 * - symbols before / after the name
 * - symbols between letters
 * - full decorate (before + between + after)
 * - classic FF frames × letter styles
 * - 500 unique symbols from assets → thousands of unique names
 */
object StylishNameCatalog {

    const val FF_NAME_MAX = 12
    const val SYMBOL_TARGET = 500

    /** How many symbols pair with classic frames around mid-letter styles (keeps pool huge but bounded). */
    private const val MID_FRAME_SYMBOL_CAP = 60

    /** Icon-heavy FF nicknames — these should appear first in batches. */
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

    data class FrameStyle(
        val id: String,
        val label: String,
        val prefix: String,
        val suffix: String
    )

    data class LetterStyle(
        val id: String,
        val label: String,
        val map: Map<Char, String>?
    )

    data class GeneratedName(
        val id: String,
        val styleLabel: String,
        val value: String
    )

    @Volatile
    private var loaded = false

    private var symbolList: List<String> = emptyList()

    /** Cached after load so generateAll does not rebuild 1500+ frames every call. */
    private var cachedFrames: List<FrameStyle> = emptyList()

    private var generateCacheKey: String? = null
    private var generateCache: List<GeneratedName> = emptyList()

    /** Popular multi-char FF frames (kept alongside the 500-symbol set). */
    val frames: List<FrameStyle> = listOf(
        FrameStyle("classic", "Classic ꧁ ꧂", "꧁", "꧂"),
        FrameStyle("diamond", "Diamond ༒", "꧁༒", "༒꧂"),
        FrameStyle("tibetan", "Tibetan ༺", "꧁༺", "༻꧂"),
        FrameStyle("star_flow", "Star Flow ★彡", "★彡", "彡★"),
        FrameStyle("star_bracket", "Star Bracket", "★彡[", "]彡★"),
        FrameStyle("stars", "Stars ★", "★", "★"),
        FrameStyle("star_outline", "Stars ☆", "☆", "☆"),
        FrameStyle("jp_corner", "JP Corner 『』", "『", "』"),
        FrameStyle("square", "Square 【】", "【", "】"),
        FrameStyle("corner", "Corner 「」", "「", "」"),
        FrameStyle("bracket", "Bracket [ ]", "[", "]"),
        FrameStyle("paren", "Paren ( )", "(", ")"),
        FrameStyle("cjk", "CJK 亗", "亗", "亗"),
        FrameStyle("yi", "Yi 乂", "乂", "乂"),
        FrameStyle("slash", "Slash 彡", "彡", "彡"),
        FrameStyle("royal", "Royal ♛", "♛", "♛"),
        FrameStyle("royal_frame", "Royal Frame", "꧁♛", "♛꧂"),
        FrameStyle("white_crown", "Crown ♕", "♕", "♕"),
        FrameStyle("skull", "Skull ☠", "☠", "☠"),
        FrameStyle("skull_frame", "Skull Frame", "꧁☠", "☠꧂"),
        FrameStyle("bolt", "Bolt ⚡", "⚡", "⚡"),
        FrameStyle("bolt_frame", "Bolt Frame", "꧁⚡", "⚡꧂"),
        FrameStyle("sparkle", "Sparkle ✧", "✧", "✧"),
        FrameStyle("dot_star", "Dot Star ✦", "✦", "✦"),
        FrameStyle("khanda", "Khanda ☬", "꧁☬", "☬꧂"),
        FrameStyle("dark", "Dark Elite", "꧁༒☬", "☬༒꧂"),
        FrameStyle("dark_cross", "Dark Cross", "꧁ঔৣ☬✞", "✞☬ঔৣ꧂"),
        FrameStyle("boss_tag", "Boss Tag", "ᴮᵒˢˢ᭄", "࿐"),
        FrameStyle("pro_mark", "Pro Mark", "᭄", "࿐"),
        FrameStyle("x_wave", "X Wave", "×͜×", "×͜×"),
        FrameStyle("vip_tag", "VIP Tag", "『VIP』", ""),
        FrameStyle("ff_tag", "FF Tag", "『FF』", ""),
        FrameStyle("pro_tag", "PRO Tag", "『PRO』", ""),
        FrameStyle("god_tag", "GOD Tag", "『GOD』", ""),
        FrameStyle("king_tag", "KING Tag", "『KING』", ""),
        FrameStyle("ace_tag", "ACE Tag", "『ACE』", ""),
        FrameStyle("elite_wrap", "Elite Wrap", "꧁ELITE丨", "꧂"),
        FrameStyle("op_wrap", "OP Wrap", "꧁OP丨", "꧂"),
        FrameStyle("dot_sep", "Dot Sep", "•", "•"),
        FrameStyle("tm", "TM Brand", "", "™"),
        FrameStyle("inf", "Infinity", "∞", "∞"),
        FrameStyle("tsu", "Tsu ツ", "ツ", "ツ"),
        FrameStyle("left_star", "Left Star", "★", ""),
        FrameStyle("right_star", "Right Star", "", "★"),
        FrameStyle("left_crown", "Left Crown", "♛", ""),
        FrameStyle("double_star", "Double Star", "★★", "★★"),
        FrameStyle("flow_lite", "Flow Lite", "彡", "彡★"),
        FrameStyle("box_star", "Box Star", "【★", "★】"),
        FrameStyle("jp_star", "JP Star", "『★", "★』"),
        FrameStyle("cjk_star", "CJK Star", "亗★", "★亗"),
        FrameStyle("yi_bolt", "Yi Bolt", "乂⚡", "⚡乂"),
        FrameStyle("diamond_lite", "Diamond Lite", "༒", "༒"),
        FrameStyle("angel", "Angel Marks", "꧁༺", "༻꧂"),
        FrameStyle("blade", "Blade", "⚔", "⚔"),
        FrameStyle("blade_frame", "Blade Frame", "꧁⚔", "⚔꧂"),
        FrameStyle("shadow", "Shadow", "꧁丨", "丨꧂"),
        FrameStyle("clan", "Clan Bars", "丨", "丨"),
        FrameStyle("mini_vip", "Mini VIP", "꧁ᴠɪᴘ丨", "꧂")
    )

    val letterStyles: List<LetterStyle> by lazy {
        listOf(
            LetterStyle("normal", "Caps", null),
            LetterStyle("small_caps", "Small Caps", SMALL_CAPS),
            LetterStyle("wide", "Wide", WIDE),
            LetterStyle("bubbled", "Bubbled", BUBBLED),
            LetterStyle("parenthesized", "Parenthesized", PARENTHESIZED)
        )
    }

    /** 500 unique symbols once [ensureLoaded] succeeds; empty until then. */
    val symbols: List<String>
        get() = symbolList

    /** Alias for UI / search — same unique symbol pool. */
    val accents: List<String>
        get() = symbolList.ifEmpty {
            listOf(
                "★", "☆", "✦", "✧", "⋆", "꧁", "꧂", "༒", "彡", "亗",
                "♛", "☠", "⚡", "『", "』", "【", "】", "ㅤ"
            )
        }

    val isLoaded: Boolean
        get() = loaded

    fun ensureLoaded(context: Context) {
        if (loaded) return
        synchronized(this) {
            if (loaded) return
            symbolList = loadSymbolsFromAssets(context)
            cachedFrames = frames
            generateCacheKey = null
            generateCache = emptyList()
            loaded = true
        }
    }

    fun generateAll(baseName: String): List<GeneratedName> {
        val clean = baseName.trim().replace(" ", "")
        if (clean.isEmpty()) return emptyList()

        synchronized(this) {
            if (generateCacheKey == clean && generateCache.isNotEmpty()) {
                return generateCache
            }

            val syms = symbolList.ifEmpty { accents }
            val classic = if (cachedFrames.isNotEmpty()) cachedFrames else frames
            val midFrameSyms = syms.take(MID_FRAME_SYMBOL_CAP)
            val capacity = letterStyles.size * (
                classic.size +
                    syms.size * 5 +
                    classic.size * midFrameSyms.size
                )
            val out = ArrayList<GeneratedName>(capacity.coerceAtLeast(256))
            val seenValues = HashSet<String>(capacity.coerceAtLeast(256))

            fun add(id: String, label: String, value: String, plainCores: Set<String>) {
                if (value.isEmpty()) return
                if (value in plainCores) return
                if (!seenValues.add(value)) return
                out.add(GeneratedName(id = id, styleLabel = label, value = value))
            }

            for (letter in letterStyles) {
                val segments = letterSegments(clean, letter.map)
                if (segments.isEmpty()) continue
                val core = segments.joinToString("")
                val plainCores = setOf(core, clean, clean.uppercase(), clean.lowercase())

                // Classic FF frames around name (always has prefix and/or suffix symbols)
                for (frame in classic) {
                    if (frame.prefix.isEmpty() && frame.suffix.isEmpty()) continue
                    add(
                        id = "${letter.id}_${frame.id}",
                        label = "${letter.label} · ${frame.label}",
                        value = frame.prefix + core + frame.suffix,
                        plainCores = plainCores
                    )
                }

                // Per-symbol: before, after, both sides, between letters, full decorate
                syms.forEachIndexed { i, s ->
                    add(
                        id = "${letter.id}_wrap_$i",
                        label = "${letter.label} · Wrap $s",
                        value = s + core + s,
                        plainCores = plainCores
                    )
                    add(
                        id = "${letter.id}_left_$i",
                        label = "${letter.label} · Prefix $s",
                        value = s + core,
                        plainCores = plainCores
                    )
                    add(
                        id = "${letter.id}_right_$i",
                        label = "${letter.label} · Suffix $s",
                        value = core + s,
                        plainCores = plainCores
                    )

                    if (segments.size >= 2) {
                        val mid = segments.joinToString(s)
                        add(
                            id = "${letter.id}_mid_$i",
                            label = "${letter.label} · Between $s",
                            value = mid,
                            plainCores = plainCores
                        )
                        add(
                            id = "${letter.id}_full_$i",
                            label = "${letter.label} · Full $s",
                            value = s + mid + s,
                            plainCores = plainCores
                        )
                    }
                }

                // Classic frame + between-letter symbol (extra stylish combos)
                if (segments.size >= 2) {
                    midFrameSyms.forEachIndexed { si, s ->
                        val mid = segments.joinToString(s)
                        for (frame in classic) {
                            if (frame.prefix.isEmpty() && frame.suffix.isEmpty()) continue
                            add(
                                id = "${letter.id}_${frame.id}_mid_$si",
                                label = "${letter.label} · ${frame.label} · Between $s",
                                value = frame.prefix + mid + frame.suffix,
                                plainCores = plainCores
                            )
                        }
                    }
                }
            }

            generateCacheKey = clean
            generateCache = out
            return out
        }
    }

    /**
     * Batch picker: mostly icon-heavy (skull / sword / crown / ꧁…) first,
     * with a light sprinkle of simpler styles (~10–15%), not a random flood of plain wraps.
     */
    fun pickUniqueBatch(
        all: List<GeneratedName>,
        usedValues: Set<String>,
        fontChoiceId: String?,
        limit: Int
    ): List<GeneratedName> {
        if (limit <= 0 || all.isEmpty()) return emptyList()
        val filtered = all.asSequence()
            .filter { it.value !in usedValues }
            .filter { fontChoiceId == null || it.id.startsWith(fontChoiceId + "_") }
            .toList()
        if (filtered.isEmpty()) return emptyList()

        val premium = ArrayList<GeneratedName>(filtered.size)
        val mid = ArrayList<GeneratedName>(filtered.size / 2)
        val simple = ArrayList<GeneratedName>(filtered.size / 2)
        for (item in filtered) {
            val rank = styleRank(item)
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

        val out = ArrayList<GeneratedName>(limit)
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

    fun styleRank(item: GeneratedName): Int {
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

    fun charCount(text: String): Int = text.length

    fun fitsFfLimit(text: String): Boolean = text.length in 1..FF_NAME_MAX

    val totalStyleCount: Int
        get() {
            val sym = symbolList.size.coerceAtLeast(accents.size)
            val classic = frames.size
            val midCap = sym.coerceAtMost(MID_FRAME_SYMBOL_CAP)
            return letterStyles.size * (classic + sym * 5 + classic * midCap)
        }

    fun uniqueStyleEstimate(): Int = totalStyleCount

    /** One segment per input letter (safe for multi-code-unit glyphs). */
    private fun letterSegments(input: String, map: Map<Char, String>?): List<String> {
        if (input.isEmpty()) return emptyList()
        val out = ArrayList<String>(input.length)
        for (ch in input) {
            if (map == null) {
                out.add(ch.uppercaseChar().toString())
                continue
            }
            val lower = ch.lowercaseChar()
            val upper = ch.uppercaseChar()
            out.add(map[lower] ?: map[upper] ?: ch.toString())
        }
        return out
    }

    private fun loadSymbolsFromAssets(context: Context): List<String> {
        return try {
            val raw = context.assets.open("ff_stylish_symbols.json")
                .bufferedReader(Charsets.UTF_8)
                .use { it.readText() }
            val arr = JSONObject(raw).getJSONArray("symbols")
            val list = ArrayList<String>(arr.length())
            val seen = HashSet<String>(arr.length())
            for (i in 0 until arr.length()) {
                val s = arr.optString(i, "").trim()
                if (s.isEmpty()) continue
                if (seen.add(s)) list.add(s)
            }
            if (list.size > SYMBOL_TARGET) list.take(SYMBOL_TARGET) else list
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun applyLetters(input: String, map: Map<Char, String>?): String =
        letterSegments(input, map).joinToString("")

    private val SMALL_CAPS = mapOf(
        'a' to "ᴀ", 'b' to "ʙ", 'c' to "ᴄ", 'd' to "ᴅ", 'e' to "ᴇ", 'f' to "ғ",
        'g' to "ɢ", 'h' to "ʜ", 'i' to "ɪ", 'j' to "ᴊ", 'k' to "ᴋ", 'l' to "ʟ",
        'm' to "ᴍ", 'n' to "ɴ", 'o' to "ᴏ", 'p' to "ᴘ", 'q' to "ǫ", 'r' to "ʀ",
        's' to "ꜱ", 't' to "ᴛ", 'u' to "ᴜ", 'v' to "ᴠ", 'w' to "ᴡ", 'x' to "x",
        'y' to "ʏ", 'z' to "ᴢ"
    )

    private val WIDE = mapOf(
        'a' to "ａ", 'b' to "ｂ", 'c' to "ｃ", 'd' to "ｄ", 'e' to "ｅ", 'f' to "ｆ",
        'g' to "ｇ", 'h' to "ｈ", 'i' to "ｉ", 'j' to "ｊ", 'k' to "ｋ", 'l' to "ｌ",
        'm' to "ｍ", 'n' to "ｎ", 'o' to "ｏ", 'p' to "ｐ", 'q' to "ｑ", 'r' to "ｒ",
        's' to "ｓ", 't' to "ｔ", 'u' to "ｕ", 'v' to "ｖ", 'w' to "ｗ", 'x' to "ｘ",
        'y' to "ｙ", 'z' to "ｚ",
        'A' to "Ａ", 'B' to "Ｂ", 'C' to "Ｃ", 'D' to "Ｄ", 'E' to "Ｅ", 'F' to "Ｆ",
        'G' to "Ｇ", 'H' to "Ｈ", 'I' to "Ｉ", 'J' to "Ｊ", 'K' to "Ｋ", 'L' to "Ｌ",
        'M' to "Ｍ", 'N' to "Ｎ", 'O' to "Ｏ", 'P' to "Ｐ", 'Q' to "Ｑ", 'R' to "Ｒ",
        'S' to "Ｓ", 'T' to "Ｔ", 'U' to "Ｕ", 'V' to "Ｖ", 'W' to "Ｗ", 'X' to "Ｘ",
        'Y' to "Ｙ", 'Z' to "Ｚ",
        '0' to "０", '1' to "１", '2' to "２", '3' to "３", '4' to "４",
        '5' to "５", '6' to "６", '7' to "７", '8' to "８", '9' to "９"
    )

    private val BUBBLED = mapOf(
        'a' to "ⓐ", 'b' to "ⓑ", 'c' to "ⓒ", 'd' to "ⓓ", 'e' to "ⓔ", 'f' to "ⓕ",
        'g' to "ⓖ", 'h' to "ⓗ", 'i' to "ⓘ", 'j' to "ⓙ", 'k' to "ⓚ", 'l' to "ⓛ",
        'm' to "ⓜ", 'n' to "ⓝ", 'o' to "ⓞ", 'p' to "ⓟ", 'q' to "ⓠ", 'r' to "ⓡ",
        's' to "ⓢ", 't' to "ⓣ", 'u' to "ⓤ", 'v' to "ⓥ", 'w' to "ⓦ", 'x' to "ⓧ",
        'y' to "ⓨ", 'z' to "ⓩ",
        'A' to "Ⓐ", 'B' to "Ⓑ", 'C' to "Ⓒ", 'D' to "Ⓓ", 'E' to "Ⓔ", 'F' to "Ⓕ",
        'G' to "Ⓖ", 'H' to "Ⓗ", 'I' to "Ⓘ", 'J' to "Ⓙ", 'K' to "Ⓚ", 'L' to "Ⓛ",
        'M' to "Ⓜ", 'N' to "Ⓝ", 'O' to "Ⓞ", 'P' to "Ⓟ", 'Q' to "Ⓠ", 'R' to "Ⓡ",
        'S' to "Ⓢ", 'T' to "Ⓣ", 'U' to "Ⓤ", 'V' to "Ⓥ", 'W' to "Ⓦ", 'X' to "Ⓧ",
        'Y' to "Ⓨ", 'Z' to "Ⓩ"
    )

    private val PARENTHESIZED = mapOf(
        'a' to "⒜", 'b' to "⒝", 'c' to "⒞", 'd' to "⒟", 'e' to "⒠", 'f' to "⒡",
        'g' to "⒢", 'h' to "⒣", 'i' to "⒤", 'j' to "⒥", 'k' to "⒦", 'l' to "⒧",
        'm' to "⒨", 'n' to "⒩", 'o' to "⒪", 'p' to "⒫", 'q' to "⒬", 'r' to "⒭",
        's' to "⒮", 't' to "⒯", 'u' to "⒰", 'v' to "⒱", 'w' to "⒲", 'x' to "⒳",
        'y' to "⒴", 'z' to "⒵"
    )
}
