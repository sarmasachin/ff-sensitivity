package com.ffsensitivity.app.data.remote

import android.content.Context
import android.os.Handler
import android.os.Looper
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.setValue
import com.ffsensitivity.app.data.UserSessionStore

/** Local seen ids per user — inbox API has no read flag. */
object PushInboxSeenStore {
    private const val PREFS = "ff_push_inbox_seen_v1"
    private const val MAX = 200

    private fun keyFor(userId: String): String = "ids_$userId"

    fun ids(context: Context, userId: String): Set<String> {
        val uid = userId.trim()
        if (uid.isEmpty()) return emptySet()
        val raw = context.applicationContext
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(keyFor(uid), "")
            .orEmpty()
        if (raw.isBlank()) return emptySet()
        return raw.split('\u001f').map { it.trim() }.filter { it.isNotEmpty() }.toSet()
    }

    fun add(context: Context, userId: String, next: Collection<String>) {
        val uid = userId.trim()
        val clean = next.map { it.trim() }.filter { it.isNotEmpty() }
        if (uid.isEmpty() || clean.isEmpty()) return
        val merged = (ids(context, uid) + clean).toList().takeLast(MAX)
        context.applicationContext
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(keyFor(uid), merged.joinToString("\u001f"))
            .apply()
    }
}

object PushInboxBadge {
    var unread by mutableIntStateOf(0)
        private set

    fun recount(context: Context, messages: List<PushInboxMessage>) {
        val userId = UserSessionStore(context).userId().trim()
        if (userId.isEmpty()) {
            publish(0)
            return
        }
        val seen = PushInboxSeenStore.ids(context, userId)
        publish(messages.count { it.id.isNotBlank() && it.id !in seen })
    }

    fun markSeen(
        context: Context,
        ids: Collection<String>,
        messages: List<PushInboxMessage>
    ) {
        val userId = UserSessionStore(context).userId().trim()
        if (userId.isEmpty()) {
            publish(0)
            return
        }
        PushInboxSeenStore.add(context, userId, ids)
        recount(context, messages)
    }

    fun clear() {
        publish(0)
    }

    private fun publish(count: Int) {
        val next = count.coerceAtLeast(0)
        val run = Runnable {
            if (unread != next) unread = next
        }
        if (Looper.myLooper() == Looper.getMainLooper()) {
            run.run()
        } else {
            Handler(Looper.getMainLooper()).post(run)
        }
    }
}
