package com.ffsensitivity.app.data

import android.content.Context
import com.ffsensitivity.app.util.AppLog
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

sealed class ContactStartResult {
    data class Ok(val thread: ContactThread) : ContactStartResult()
    data object Validation : ContactStartResult()
    data object SaveFailed : ContactStartResult()
}

sealed class ContactReplyResult {
    data class Ok(val thread: ContactThread) : ContactReplyResult()
    data object Validation : ContactReplyResult()
    data object NoThread : ContactReplyResult()
    data object SaveFailed : ContactReplyResult()
}

/**
 * Local-only contact thread. Admin replies will sync here after backend exists.
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

    fun start(
        context: Context,
        name: String,
        email: String,
        subject: ContactSubject,
        message: String,
        appVersion: String
    ): ContactStartResult {
        val cleanName = name.trim().take(40)
        val cleanEmail = email.trim().take(80)
        val cleanMsg = message.trim().take(1000)
        if (cleanName.isBlank() || cleanMsg.isBlank() || !isValidEmail(cleanEmail)) {
            return ContactStartResult.Validation
        }
        val now = System.currentTimeMillis()
        val first = ContactMessage(
            id = UUID.randomUUID().toString(),
            sender = ContactSender.USER,
            text = cleanMsg,
            createdAtMs = now
        )
        val thread = ContactThread(
            id = UUID.randomUUID().toString(),
            name = cleanName,
            email = cleanEmail,
            subject = subject,
            appVersion = appVersion.trim().ifBlank { "—" },
            createdAtMs = now,
            messages = listOf(first)
        )
        return runCatching {
            save(context, thread)
            ContactStartResult.Ok(thread)
        }.getOrElse {
            AppLog.e("Contact thread start failed", it)
            ContactStartResult.SaveFailed
        }
    }

    fun appendUserMessage(context: Context, message: String): ContactReplyResult {
        val cleanMsg = message.trim().take(1000)
        if (cleanMsg.isBlank()) return ContactReplyResult.Validation
        val current = load(context) ?: return ContactReplyResult.NoThread
        val nextMsg = ContactMessage(
            id = UUID.randomUUID().toString(),
            sender = ContactSender.USER,
            text = cleanMsg,
            createdAtMs = System.currentTimeMillis()
        )
        val updated = current.copy(messages = current.messages + nextMsg)
        return runCatching {
            save(context, updated)
            ContactReplyResult.Ok(updated)
        }.getOrElse {
            AppLog.e("Contact append user message failed", it)
            ContactReplyResult.SaveFailed
        }
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
            createdAtMs = obj.optLong("createdAtMs", 0L),
            messages = messages
        )
    }

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private val EMAIL_REGEX = Regex("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")
}
