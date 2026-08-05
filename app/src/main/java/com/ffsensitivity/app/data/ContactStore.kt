package com.ffsensitivity.app.data

import android.content.Context
import com.ffsensitivity.app.util.AppLog
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/**
 * Local cache of the Nest support thread for Contact Us.
 * Server is source of truth when signed in.
 */
object ContactStore {

    private const val PREFS = "contact_thread_v1"
    private const val KEY_THREAD = "thread_json"

    fun load(context: Context): ContactThread? {
        return runCatching {
            val raw = prefs(context).getString(KEY_THREAD, null) ?: return null
            parseThread(JSONObject(raw))
        }.getOrElse {
            AppLog.e("Contact thread load failed", it)
            null
        }
    }

    fun saveRemote(context: Context, thread: ContactThread) {
        runCatching { save(context, thread) }
            .onFailure { AppLog.e("Contact cache save failed", it) }
    }

    fun clear(context: Context) {
        prefs(context).edit().remove(KEY_THREAD).apply()
    }

    fun isValidEmail(email: String): Boolean {
        if (email.isBlank() || email.length > 80) return false
        return EMAIL_REGEX.matches(email)
    }

    private fun save(context: Context, thread: ContactThread) {
        prefs(context).edit().putString(KEY_THREAD, toJson(thread).toString()).apply()
    }

    private fun toJson(thread: ContactThread): JSONObject {
        val msgs = JSONArray()
        thread.messages.forEach { m ->
            msgs.put(
                JSONObject()
                    .put("id", m.id)
                    .put("sender", m.sender.name)
                    .put("text", m.text)
                    .put("createdAtMs", m.createdAtMs)
            )
        }
        return JSONObject()
            .put("id", thread.id)
            .put("name", thread.name)
            .put("email", thread.email)
            .put("subject", thread.subject.name)
            .put("appVersion", thread.appVersion)
            .put("deviceLabel", thread.deviceLabel)
            .put("status", thread.status)
            .put("createdAtMs", thread.createdAtMs)
            .put("messages", msgs)
    }

    private fun parseThread(obj: JSONObject): ContactThread {
        val arr = obj.optJSONArray("messages") ?: JSONArray()
        val messages = buildList {
            for (i in 0 until arr.length()) {
                val m = arr.optJSONObject(i) ?: continue
                val text = m.optString("text").trim()
                if (text.isBlank()) continue
                add(
                    ContactMessage(
                        id = m.optString("id").ifBlank { UUID.randomUUID().toString() },
                        sender = ContactSender.fromStorage(m.optString("sender")),
                        text = text,
                        createdAtMs = m.optLong("createdAtMs", 0L)
                    )
                )
            }
        }
        return ContactThread(
            id = obj.optString("id").ifBlank { UUID.randomUUID().toString() },
            name = obj.optString("name"),
            email = obj.optString("email"),
            subject = ContactSubject.fromStorage(obj.optString("subject")),
            appVersion = obj.optString("appVersion").ifBlank { "—" },
            deviceLabel = obj.optString("deviceLabel").ifBlank { "—" },
            status = obj.optString("status").ifBlank { "OPEN" },
            createdAtMs = obj.optLong("createdAtMs", 0L),
            messages = messages
        )
    }

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private val EMAIL_REGEX = Regex("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")
}
