package com.ffsensitivity.app.data

import android.content.Context
import com.ffsensitivity.app.util.AppLog
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

data class RedeemComment(
    val id: String,
    val itemId: String,
    val name: String,
    val text: String,
    val createdAtMs: Long,
    val likes: Int = 0
)

sealed class RedeemCommentAddResult {
    data class Ok(val entry: RedeemComment) : RedeemCommentAddResult()
    data object Validation : RedeemCommentAddResult()
    data object InvalidItem : RedeemCommentAddResult()
    data object SaveFailed : RedeemCommentAddResult()
}

object RedeemCommentsStore {

    private const val PREFS = "redeem_comments_v1"
    private const val KEY = "comments_json"
    private const val KEY_SEEDED = "seeded_v1"
    private const val KEY_VOTES = "votes_json"

    fun listFor(context: Context, itemId: String): List<RedeemComment> {
        ensureSeeded(context)
        return readAll(context)
            .filter { it.itemId == itemId }
            .sortedByDescending { it.createdAtMs }
    }

    fun add(
        context: Context,
        itemId: String,
        name: String,
        text: String
    ): RedeemCommentAddResult {
        val cleanName = name.trim().take(24)
        val cleanText = text.trim().take(280)
        if (cleanName.isBlank() || cleanText.isBlank()) {
            return RedeemCommentAddResult.Validation
        }
        if (itemId.isBlank() || itemId.contains('/')) {
            return RedeemCommentAddResult.InvalidItem
        }
        val entry = RedeemComment(
            id = UUID.randomUUID().toString(),
            itemId = itemId,
            name = cleanName,
            text = cleanText,
            createdAtMs = System.currentTimeMillis(),
            likes = 0
        )
        return runCatching {
            val next = listOf(entry) + readAll(context)
            writeAll(context, next)
            RedeemCommentAddResult.Ok(entry)
        }.getOrElse {
            AppLog.e("Redeem comment add failed", it)
            RedeemCommentAddResult.SaveFailed
        }
    }

    fun getVote(context: Context, itemId: String): Boolean? {
        return runCatching {
            val raw = prefs(context).getString(KEY_VOTES, "{}") ?: "{}"
            val obj = JSONObject(raw)
            if (!obj.has(itemId)) null
            else obj.optBoolean(itemId)
        }.getOrElse {
            AppLog.e("Redeem vote read failed", it)
            null
        }
    }

    fun setVote(context: Context, itemId: String, liked: Boolean): Boolean {
        if (itemId.isBlank() || itemId.contains('/')) return false
        return runCatching {
            val raw = prefs(context).getString(KEY_VOTES, "{}") ?: "{}"
            val obj = JSONObject(raw)
            obj.put(itemId, liked)
            prefs(context).edit().putString(KEY_VOTES, obj.toString()).apply()
            true
        }.getOrElse {
            AppLog.e("Redeem vote save failed", it)
            false
        }
    }

    private fun ensureSeeded(context: Context) {
        val p = prefs(context)
        if (p.getBoolean(KEY_SEEDED, false)) return
        val now = System.currentTimeMillis()
        val seeds = listOf(
            RedeemComment("s1", "1", "Aarav", "Code worked instantly. Copied and redeemed on Play.", now - 2 * 3600_000, 8),
            RedeemComment("s2", "1", "Neha", "Got ₹50 first try. Tip: redeem ASAP before stock ends.", now - 5 * 3600_000, 5),
            RedeemComment("s3", "1", "Rohan", "Still active for me. Smooth process.", now - 26 * 3600_000, 3),
            RedeemComment("s4", "3", "Vikram", "This one was already claimed when I tried.", now - 10 * 3600_000, 1)
        )
        runCatching {
            writeAll(context, seeds + readAll(context))
            p.edit().putBoolean(KEY_SEEDED, true).apply()
        }.onFailure { AppLog.e("Redeem comment seed failed", it) }
    }

    private fun readAll(context: Context): List<RedeemComment> {
        return runCatching {
            val raw = prefs(context).getString(KEY, "[]") ?: "[]"
            val arr = JSONArray(raw)
            buildList {
                for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    add(
                        RedeemComment(
                            id = o.getString("id"),
                            itemId = o.getString("itemId"),
                            name = o.getString("name"),
                            text = o.getString("text"),
                            createdAtMs = o.getLong("createdAtMs"),
                            likes = o.optInt("likes", 0)
                        )
                    )
                }
            }
        }.getOrElse {
            AppLog.e("Redeem comments read failed", it)
            emptyList()
        }
    }

    private fun writeAll(context: Context, items: List<RedeemComment>) {
        val arr = JSONArray()
        items.forEach { c ->
            arr.put(
                JSONObject()
                    .put("id", c.id)
                    .put("itemId", c.itemId)
                    .put("name", c.name)
                    .put("text", c.text)
                    .put("createdAtMs", c.createdAtMs)
                    .put("likes", c.likes)
            )
        }
        prefs(context).edit().putString(KEY, arr.toString()).apply()
    }

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
