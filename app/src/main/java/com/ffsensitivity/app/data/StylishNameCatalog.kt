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

    /** FF in-game name length — updated from Nest policy when catalog syncs. */
    @Volatile
    var FF_NAME_MAX: Int = 12
        private set

    @Volatile
    var maxBatchSize: Int = 100
        private set

    @Volatile
    private var blockSpaces: Boolean = true

    @Volatile
    private var requireStyleWrap: Boolean = true

    const val SYMBOL_TARGET = 500

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

    /** When set, only these letter style ids are used (Nest enabled fonts). */
    @Volatile
    private var enabledFontIds: Set<String>? = null

    private var generateCacheKey: String? = null
    private var generateCache: List<GeneratedName> = emptyList()

    /** Builtin letter maps — Nest can only enable/disable known ids. */
    private val builtinLetterStyles: List<LetterStyle> by lazy {
        StylishNameLetterMaps.builtinLetterStyles()
    }

    /** Popular multi-char FF frames (kept alongside the 500-symbol set). */
    val frames: List<FrameStyle> = stylishNameBuiltinFrames()

    val letterStyles: List<LetterStyle>
        get() {
            val enabled = enabledFontIds
            val all = builtinLetterStyles
            if (enabled == null) return all
            val filtered = all.filter { it.id in enabled }
            return filtered.ifEmpty { all }
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

    @Volatile
    private var remoteCatalogApplied = false

    fun ensureLoaded(context: Context) {
        if (loaded) return
        synchronized(this) {
            if (loaded) return
            symbolList = loadSymbolsFromAssets(context)
            if (cachedFrames.isEmpty() && !remoteCatalogApplied) {
                cachedFrames = frames
            }
            generateCacheKey = null
            generateCache = emptyList()
            loaded = true
        }
    }

    /**
     * Apply Nest catalog (enabled frames/fonts + policy).
     * Successful sync replaces classic frames even when the list is empty.
     * Offline builtin frames stay only when catalog fetch never applied.
     * Never fetches remotePackUrl.
     */
    fun applyRemoteCatalog(payload: com.ffsensitivity.app.data.remote.NamesCatalogPayload) {
        synchronized(this) {
            FF_NAME_MAX = payload.policy.maxNameChars.coerceIn(1, 12)
            maxBatchSize = payload.policy.maxBatchSize.coerceIn(10, 200)
            blockSpaces = payload.policy.blockSpaces
            requireStyleWrap = payload.policy.requireStyleWrap
            enabledFontIds = payload.fonts.map { it.id }.toSet().ifEmpty { null }
            cachedFrames = payload.frames.mapNotNull { f ->
                val prefix = f.prefix.take(32)
                val suffix = f.suffix.take(32)
                if (prefix.isEmpty() && suffix.isEmpty()) return@mapNotNull null
                FrameStyle(
                    id = f.id,
                    label = f.label.ifBlank { f.id },
                    prefix = prefix,
                    suffix = suffix
                )
            }
            remoteCatalogApplied = true
            generateCacheKey = null
            generateCache = emptyList()
        }
    }

    fun generateAll(baseName: String): List<GeneratedName> {
        val clean = if (blockSpaces) {
            baseName.trim().replace(" ", "")
        } else {
            baseName.trim()
        }
        if (clean.isEmpty()) return emptyList()

        synchronized(this) {
            if (generateCacheKey == clean && generateCache.isNotEmpty()) {
                return generateCache
            }
            val syms = symbolList.ifEmpty { accents }
            val classic = if (remoteCatalogApplied) cachedFrames else {
                if (cachedFrames.isNotEmpty()) cachedFrames else frames
            }
            val out = generateStylishNames(
                clean = clean,
                requireStyleWrap = requireStyleWrap,
                letters = letterStyles,
                classic = classic,
                syms = syms,
            )
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
    ): List<GeneratedName> = pickStylishNameBatch(all, usedValues, fontChoiceId, limit)

    fun styleRank(item: GeneratedName): Int = stylishNameStyleRank(item)

    fun charCount(text: String): Int = text.length

    fun fitsFfLimit(text: String): Boolean = text.length in 1..FF_NAME_MAX

    val totalStyleCount: Int
        get() {
            val sym = symbolList.size.coerceAtLeast(accents.size)
            val classic = if (remoteCatalogApplied) {
                cachedFrames.size
            } else {
                (if (cachedFrames.isNotEmpty()) cachedFrames else frames).size
            }
            val midCap = sym.coerceAtMost(STYLISH_NAME_MID_FRAME_CAP)
            return letterStyles.size * (classic + sym * 5 + classic * midCap)
        }

    fun uniqueStyleEstimate(): Int = totalStyleCount

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
}
