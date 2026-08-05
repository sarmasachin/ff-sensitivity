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
    val deviceLabel: String = "—",
    val status: String = "OPEN",
    val createdAtMs: Long,
    val messages: List<ContactMessage>
)

sealed class ContactStartResult {
    data class Ok(val thread: ContactThread) : ContactStartResult()
    data object Validation : ContactStartResult()
    data object AuthRequired : ContactStartResult()
    data class OpenLimit(val message: String) : ContactStartResult()
    data class SaveFailed(val message: String) : ContactStartResult()
}

sealed class ContactReplyResult {
    data class Ok(val thread: ContactThread) : ContactReplyResult()
    data object Validation : ContactReplyResult()
    data object NoThread : ContactReplyResult()
    data object AuthRequired : ContactReplyResult()
    data class Closed(val message: String) : ContactReplyResult()
    data class SaveFailed(val message: String) : ContactReplyResult()
}
