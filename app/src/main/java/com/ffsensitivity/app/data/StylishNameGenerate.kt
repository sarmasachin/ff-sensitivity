package com.ffsensitivity.app.data

internal const val STYLISH_NAME_MID_FRAME_CAP = 60

internal fun letterSegments(input: String, map: Map<Char, String>?): List<String> {
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

internal fun generateStylishNames(
    clean: String,
    requireStyleWrap: Boolean,
    letters: List<StylishNameCatalog.LetterStyle>,
    classic: List<StylishNameCatalog.FrameStyle>,
    syms: List<String>,
): List<StylishNameCatalog.GeneratedName> {
    val midFrameSyms = syms.take(STYLISH_NAME_MID_FRAME_CAP)
    val capacity = letters.size * (
        classic.size +
            syms.size * 5 +
            classic.size * midFrameSyms.size
        )
    val out = ArrayList<StylishNameCatalog.GeneratedName>(capacity.coerceAtLeast(256))
    val seenValues = HashSet<String>(capacity.coerceAtLeast(256))

    fun add(id: String, label: String, value: String, plainCores: Set<String>) {
        if (value.isEmpty()) return
        if (requireStyleWrap && value in plainCores) return
        if (!seenValues.add(value)) return
        out.add(
            StylishNameCatalog.GeneratedName(id = id, styleLabel = label, value = value)
        )
    }

    for (letter in letters) {
        val segments = letterSegments(clean, letter.map)
        if (segments.isEmpty()) continue
        val core = segments.joinToString("")
        val plainCores = setOf(core, clean, clean.uppercase(), clean.lowercase())

        for (frame in classic) {
            if (frame.prefix.isEmpty() && frame.suffix.isEmpty()) continue
            add(
                id = "${letter.id}_${frame.id}",
                label = "${letter.label} · ${frame.label}",
                value = frame.prefix + core + frame.suffix,
                plainCores = plainCores
            )
        }

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
    return out
}
