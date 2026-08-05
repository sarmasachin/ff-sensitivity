package com.ffsensitivity.app.data.remote

import com.ffsensitivity.app.data.ContactMessage
import com.ffsensitivity.app.data.ContactSender
import com.ffsensitivity.app.data.ContactSubject
import com.ffsensitivity.app.data.ContactThread
import com.ffsensitivity.app.util.AppLog
import org.json.JSONArray
import org.json.JSONObject

// --- Start: Support live wire (Sachin) ---
object SupportApi {
    fun getMine(accessToken: String): Result<ContactThread?> {
        return runCatching {
            val req = ApiClient.get("/api/v1/support/thread", accessToken)
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) throw ApiClient.parseError(raw, resp.code)
                val root = JSONObject(raw)
                val threadObj = root.optJSONObject("thread") ?: return@use null
                parseThread(threadObj)
            }
        }.onFailure { AppLog.e("SupportApi.getMine failed", it) }
    }

    fun start(
        accessToken: String,
        name: String,
        email: String,
        subject: ContactSubject,
        message: String,
        appVersion: String,
        deviceLabel: String
    ): Result<ContactThread> {
        return runCatching {
            val body = JSONObject()
                .put("name", name)
                .put("email", email)
                .put("subject", subject.name)
                .put("message", message)
                .put("appVersion", appVersion)
                .put("deviceLabel", deviceLabel)
            val req = ApiClient.post("/api/v1/support/thread", body, accessToken)
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) throw ApiClient.parseError(raw, resp.code)
                parseThread(JSONObject(raw))
            }
        }.onFailure { AppLog.e("SupportApi.start failed", it) }
    }

    fun reply(accessToken: String, threadId: String, message: String): Result<ContactThread> {
        return runCatching {
            val body = JSONObject().put("message", message)
            val req = ApiClient.post(
                "/api/v1/support/thread/$threadId/messages",
                body,
                accessToken
            )
            ApiClient.http.newCall(req).execute().use { resp ->
                val raw = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) throw ApiClient.parseError(raw, resp.code)
                parseThread(JSONObject(raw))
            }
        }.onFailure { AppLog.e("SupportApi.reply failed", it) }
    }

    private fun parseThread(obj: JSONObject): ContactThread {
        val arr = obj.optJSONArray("messages") ?: JSONArray()
        val messages = ArrayList<ContactMessage>(arr.length())
        for (i in 0 until arr.length()) {
            val m = arr.optJSONObject(i) ?: continue
            val text = m.optString("text").trim()
            if (text.isBlank()) continue
            val createdAtMs = when {
                m.has("createdAtMs") -> m.optLong("createdAtMs", 0L)
                else -> 0L
            }
            messages.add(
                ContactMessage(
                    id = m.optString("id").ifBlank { "m_$i" },
                    sender = ContactSender.fromStorage(m.optString("sender")),
                    text = text,
                    createdAtMs = createdAtMs
                )
            )
        }
        return ContactThread(
            id = obj.optString("id"),
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
}
// --- End: Support live wire (Sachin) ---
