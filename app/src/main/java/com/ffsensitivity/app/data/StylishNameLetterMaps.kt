package com.ffsensitivity.app.data

internal object StylishNameLetterMaps {
    val SMALL_CAPS = mapOf(
        'a' to "ᴀ", 'b' to "ʙ", 'c' to "ᴄ", 'd' to "ᴅ", 'e' to "ᴇ", 'f' to "ғ",
        'g' to "ɢ", 'h' to "ʜ", 'i' to "ɪ", 'j' to "ᴊ", 'k' to "ᴋ", 'l' to "ʟ",
        'm' to "ᴍ", 'n' to "ɴ", 'o' to "ᴏ", 'p' to "ᴘ", 'q' to "ǫ", 'r' to "ʀ",
        's' to "ꜱ", 't' to "ᴛ", 'u' to "ᴜ", 'v' to "ᴠ", 'w' to "ᴡ", 'x' to "x",
        'y' to "ʏ", 'z' to "ᴢ"
    )

    val WIDE = mapOf(
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

    val BUBBLED = mapOf(
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

    val PARENTHESIZED = mapOf(
        'a' to "⒜", 'b' to "⒝", 'c' to "⒞", 'd' to "⒟", 'e' to "⒠", 'f' to "⒡",
        'g' to "⒢", 'h' to "⒣", 'i' to "⒤", 'j' to "⒥", 'k' to "⒦", 'l' to "⒧",
        'm' to "⒨", 'n' to "⒩", 'o' to "⒪", 'p' to "⒫", 'q' to "⒬", 'r' to "⒭",
        's' to "⒮", 't' to "⒯", 'u' to "⒰", 'v' to "⒱", 'w' to "⒲", 'x' to "⒳",
        'y' to "⒴", 'z' to "⒵"
    )

    fun builtinLetterStyles(): List<StylishNameCatalog.LetterStyle> = listOf(
        StylishNameCatalog.LetterStyle("normal", "Caps", null),
        StylishNameCatalog.LetterStyle("small_caps", "Small Caps", SMALL_CAPS),
        StylishNameCatalog.LetterStyle("wide", "Wide", WIDE),
        StylishNameCatalog.LetterStyle("bubbled", "Bubbled", BUBBLED),
        StylishNameCatalog.LetterStyle("parenthesized", "Parenthesized", PARENTHESIZED)
    )
}
