package com.ffsensitivity.app.data

import android.content.Context
import com.ffsensitivity.app.util.AppLog
import org.json.JSONArray
import org.json.JSONObject

/**
 * Persists scratched cards for [RETENTION_DAYS] days, then drops them.
 */
object ScratchHistoryStore {

    const val RETENTION_DAYS = 30
    const val RETENTION_MS = RETENTION_DAYS * 24L * 60L * 60L * 1000L

    private const val PREFS = "scratch_history_v1"
    private const val KEY_CARDS = "cards_json"

    fun addMilestone(
        context: Context,
        milestone: StreakMilestone,
        scratchedAtMs: Long = System.currentTimeMillis()
    ) {
        add(
            context,
            ScratchedCardEntry(
                id = "milestone_${milestone.days}",
                kind = ScratchCardKind.MILESTONE,
                title = "Day ${milestone.days} · ${milestone.title}",
                detail = "Daily Challenge streak reward",
                rewardLabel = "+${milestone.coinReward} coins",
                coins = milestone.coinReward,
                badge = milestone.badge,
                scratchedAtMs = scratchedAtMs
            )
        )
    }

    fun addRedeem(
        context: Context,
        item: RedeemCodeItem,
        scratchedAtMs: Long = System.currentTimeMillis()
    ) {
        add(
            context,
            ScratchedCardEntry(
                id = "redeem_${item.id}",
                kind = ScratchCardKind.REDEEM,
                title = item.title,
                detail = item.valueLabel,
                rewardLabel = item.valueLabel,
                code = item.code,
                scratchedAtMs = scratchedAtMs
            )
        )
    }

    fun addShopToken(
        context: Context,
        item: ShopItem,
        scratchedAtMs: Long = System.currentTimeMillis()
    ) {
        add(
            context,
            ScratchedCardEntry(
                id = "shop_${item.id}_$scratchedAtMs",
                kind = ScratchCardKind.SHOP,
                title = item.title,
                detail = "Coin Shop purchase",
                rewardLabel = item.rewardTag,
                scratchedAtMs = scratchedAtMs
            )
        )
    }

    fun listActive(context: Context): Result<List<ScratchedCardEntry>> {
        return runCatching {
            val now = System.currentTimeMillis()
            val active = readAll(context)
                .filterNot { it.isExpired(now) }
                .sortedByDescending { it.scratchedAtMs }
            writeAll(context, active)
            active
        }.onFailure {
            AppLog.e("ScratchHistory list failed", it)
        }
    }

    private fun add(context: Context, entry: ScratchedCardEntry) {
        runCatching {
            synchronized(this) {
                val now = System.currentTimeMillis()
                val next = readAll(context)
                    .filterNot { it.isExpired(now) || it.id == entry.id }
                    .toMutableList()
                next.add(entry)
                writeAll(context, next.sortedByDescending { it.scratchedAtMs })
            }
        }.onFailure {
            AppLog.e("ScratchHistory add failed", it)
        }
    }

    private fun readAll(context: Context): List<ScratchedCardEntry> {
        val raw = prefs(context).getString(KEY_CARDS, null).orEmpty()
        if (raw.isBlank()) return emptyList()
        val arr = JSONArray(raw)
        val out = ArrayList<ScratchedCardEntry>(arr.length())
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            parse(o)?.let { out.add(it) }
        }
        return out
    }

    private fun writeAll(context: Context, entries: List<ScratchedCardEntry>) {
        val arr = JSONArray()
        entries.forEach { arr.put(toJson(it)) }
        prefs(context).edit().putString(KEY_CARDS, arr.toString()).apply()
    }

    private fun toJson(e: ScratchedCardEntry): JSONObject {
        return JSONObject()
            .put("id", e.id)
            .put("kind", e.kind.name)
            .put("title", e.title)
            .put("detail", e.detail)
            .put("rewardLabel", e.rewardLabel)
            .put("code", e.code ?: JSONObject.NULL)
            .put("coins", e.coins)
            .put("badge", e.badge ?: JSONObject.NULL)
            .put("scratchedAtMs", e.scratchedAtMs)
    }

    private fun parse(o: JSONObject): ScratchedCardEntry? {
        return runCatching {
            val kind = ScratchCardKind.valueOf(o.getString("kind"))
            ScratchedCardEntry(
                id = o.getString("id"),
                kind = kind,
                title = o.getString("title"),
                detail = o.optString("detail", ""),
                rewardLabel = o.optString("rewardLabel", ""),
                code = o.optString("code").takeIf { it.isNotBlank() && it != "null" },
                coins = o.optInt("coins", 0),
                badge = o.optString("badge").takeIf { it.isNotBlank() && it != "null" },
                scratchedAtMs = o.getLong("scratchedAtMs")
            )
        }.getOrElse {
            AppLog.e("ScratchHistory parse failed", it)
            null
        }
    }

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
