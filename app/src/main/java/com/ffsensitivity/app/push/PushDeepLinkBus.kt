package com.ffsensitivity.app.push

/** Pending deep link from FCM notification tap. */
// --- Start: Push FCM live wire (Sachin) ---
object PushDeepLinkBus {
    @Volatile
    private var pending: String? = null

    fun offer(deepLink: String) {
        val v = deepLink.trim()
        if (v.isNotEmpty()) pending = v
    }

    fun consume(): String? {
        val v = pending
        pending = null
        return v
    }
}
// --- End: Push FCM live wire (Sachin) ---
