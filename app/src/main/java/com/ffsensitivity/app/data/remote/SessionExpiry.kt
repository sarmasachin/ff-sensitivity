package com.ffsensitivity.app.data.remote

import android.os.Handler
import android.os.Looper
import android.util.Base64
import com.ffsensitivity.app.BuildConfig
import org.json.JSONObject
import java.util.concurrent.atomic.AtomicBoolean

/**
 * When the user JWT expires (90d) or the server returns 401, kick to login
 * like a normal app: clear local session, show login, ask to sign in again.
 */
object SessionExpiry {
    const val LOGIN_MESSAGE =
        "Session expired. Please sign in with Google to continue."

    private val main = Handler(Looper.getMainLooper())
    private val latch = AtomicBoolean(false)
    private val delivered = AtomicBoolean(false)
    private var handler: (() -> Unit)? = null

    fun reset() {
        latch.set(false)
        delivered.set(false)
    }

    fun wasForced(): Boolean = latch.get()

    fun setHandler(next: (() -> Unit)?) {
        handler = next
        dispatch()
    }

    /** True when a locally "signed in" seat must be sent to login. */
    fun shouldExpireLocally(accessToken: String, signedIn: Boolean): Boolean {
        if (!signedIn) return false
        if (accessToken.isBlank()) return !BuildConfig.DEBUG
        return isJwtExpired(accessToken)
    }

    fun checkLocalToken(accessToken: String, signedIn: Boolean) {
        if (shouldExpireLocally(accessToken, signedIn)) notifyExpired()
    }

    fun notifyIfUnauthorized(httpCode: Int, requestPath: String, hadBearer: Boolean) {
        if (httpCode != 401 || !hadBearer) return
        // Login/logout own their 401s — don't kick mid Google sign-in or Sign out.
        if (requestPath.contains("/user/auth/google")) return
        if (requestPath.contains("/user/auth/logout")) return
        notifyExpired()
    }

    fun notifyExpired() {
        latch.set(true)
        dispatch()
    }

    private fun dispatch() {
        if (!latch.get()) return
        val cb = handler ?: return
        if (!delivered.compareAndSet(false, true)) return
        main.post(cb)
    }

    fun isJwtExpired(token: String, leewayMs: Long = 30_000L): Boolean {
        val parts = token.split('.')
        if (parts.size < 2) return true
        val payload = runCatching {
            val raw = Base64.decode(
                parts[1],
                Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING
            )
            JSONObject(String(raw, Charsets.UTF_8))
        }.getOrNull() ?: return true
        val exp = payload.optLong("exp", 0L)
        if (exp <= 0L) return true
        return System.currentTimeMillis() > exp * 1000L + leewayMs
    }
}
