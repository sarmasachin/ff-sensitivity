package com.ffsensitivity.app.data

enum class ContactSubject(val label: String) {
    REPORT("Report"),
    REDEEM_CODE_ISSUE("Redeem Code issue"),
    BUG("Bug"),
    FEATURE("Feature"),
    FEEDBACK("Feedback"),
    OTHER("Other");

    companion object {
        fun fromStorage(raw: String): ContactSubject {
            return entries.firstOrNull { it.name == raw } ?: OTHER
        }
    }
}

enum class ContactSender {
    USER,
    ADMIN;

    companion object {
        fun fromStorage(raw: String): ContactSender {
            return entries.firstOrNull { it.name == raw } ?: USER
        }
    }
}

data class ContactMessage(
    val id: String,
    val sender: ContactSender,
    val text: String,
    val createdAtMs: Long
)

data class ContactThread(
    val id: String,
    val name: String,
    val email: String,
    val subject: ContactSubject,
    val appVersion: String,
    val createdAtMs: Long,
    val messages: List<ContactMessage>
)
