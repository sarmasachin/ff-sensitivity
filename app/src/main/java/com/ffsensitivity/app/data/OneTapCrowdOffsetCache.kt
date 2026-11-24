package com.ffsensitivity.app.data

import android.content.Context
import org.json.JSONObject

/**
 * Last-good One Tap Premium crowd payload (device + fingers + One-Tap role).
 * Separate prefs from Pro Max so peer buckets never collide.
 */
object OneTapCrowdOffsetCache {
    private const val PREFS = "onetap_crowd_offset_cache_v1"
    private const val KEY_PREFIX = "ot_offsets:"

    fun save(
        context: Context,
        deviceLabel: String,
        fingers: String,
        role: String,
        offsets: ProMaxCrowdOffsets
    ) {
        if (!offsets.isCacheWorthy) return
        runCatching {
            prefs(context).edit()
                .putString(key(deviceLabel, fingers, role), encode(offsets))
                .apply()
        }
    }

    fun load(
        context: Context,
        deviceLabel: String,
        fingers: String,
        role: String
    ): ProMaxCrowdOffsets? {
        return runCatching {
            val raw = prefs(context).getString(key(deviceLabel, fingers, role), null)
                ?: return null
            decode(raw)?.markFromCache()
        }.getOrNull()
    }

    private fun key(deviceLabel: String, fingers: String, role: String): String {
        val d = deviceLabel.trim().lowercase()
        val f = fingers.trim().lowercase()
        val r = role.trim().lowercase()
        return "$KEY_PREFIX$d|$f|$r"
    }

    private fun encode(o: ProMaxCrowdOffsets): String {
        val c = o.community
        val a = o.fieldAgreement
        return JSONObject()
            .put("g", o.general)
            .put("rd", o.redDot)
            .put("s2", o.scope2x)
            .put("s4", o.scope4x)
            .put("sn", o.sniper)
            .put("fl", o.freeLook)
            .put("fb", o.fireButton)
            .put("from", o.matchFrom)
            .put("n", o.matchCount)
            .put("conf", o.confidence)
            .put("blend", o.blendFrom)
            .put("ag", a.general)
            .put("ard", a.redDot)
            .put("as2", a.scope2x)
            .put("as4", a.scope4x)
            .put("asn", a.sniper)
            .put("afl", a.freeLook)
            .put("afb", a.fireButton)
            .put("cg", c.general)
            .put("crd", c.redDot)
            .put("cs2", c.scope2x)
            .put("cs4", c.scope4x)
            .put("csn", c.sniper)
            .put("cfl", c.freeLook)
            .put("cw", c.weight)
            .put("cn", c.matchCount)
            .put("cs", c.source)
            .put("ss", o.shareConflict.softGap)
            .put("sh", o.shareConflict.hardGap)
            .put("sm", o.shareConflict.maxShrink)
            .toString()
    }

    private fun decode(raw: String): ProMaxCrowdOffsets? {
        if (raw.isBlank()) return null
        val j = JSONObject(raw)
        return ProMaxCrowdOffsets(
            general = j.optInt("g"),
            redDot = j.optInt("rd"),
            scope2x = j.optInt("s2"),
            scope4x = j.optInt("s4"),
            sniper = j.optInt("sn"),
            freeLook = j.optInt("fl"),
            fireButton = j.optInt("fb"),
            matchFrom = j.optString("from", "none"),
            matchCount = j.optInt("n"),
            confidence = j.optDouble("conf", 0.0),
            blendFrom = j.optString("blend", ""),
            fieldAgreement = ProMaxFieldAgreement(
                general = j.optDouble("ag", 1.0),
                redDot = j.optDouble("ard", 1.0),
                scope2x = j.optDouble("as2", 1.0),
                scope4x = j.optDouble("as4", 1.0),
                sniper = j.optDouble("asn", 1.0),
                freeLook = j.optDouble("afl", 1.0),
                fireButton = j.optDouble("afb", 1.0)
            ),
            community = ProMaxCommunityPull(
                general = j.optInt("cg"),
                redDot = j.optInt("crd"),
                scope2x = j.optInt("cs2"),
                scope4x = j.optInt("cs4"),
                sniper = j.optInt("csn"),
                freeLook = j.optInt("cfl"),
                weight = j.optDouble("cw", 0.0),
                matchCount = j.optInt("cn"),
                source = j.optString("cs", "none")
            ),
            shareConflict = ProMaxShareConflictKnobs(
                softGap = j.optDouble("ss", 8.0),
                hardGap = j.optDouble("sh", 35.0),
                maxShrink = j.optDouble("sm", 0.75)
            )
        )
    }

    private fun ProMaxCrowdOffsets.markFromCache(): ProMaxCrowdOffsets {
        val from = matchFrom.trim().ifBlank { "none" }
        val marked = if (from.endsWith("_cache")) from else "${from}_cache"
        return copy(matchFrom = marked)
    }

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
