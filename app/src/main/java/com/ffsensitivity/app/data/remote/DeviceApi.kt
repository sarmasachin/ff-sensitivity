package com.ffsensitivity.app.data.remote

import com.ffsensitivity.app.util.AppLog
import org.json.JSONObject

// --- Start: Devices live wire (Sachin) ---
data class DeviceHeartbeatResult(
    val ok: Boolean,
    val blocked: Boolean,
    val message: String
)

object DeviceApi {
    fun heartbeat(
        accessToken: String,
        installId: String,
        brand: String,
        model: String,
        androidVersion: String,
        appVersion: String,
        appVersionCode: Int,
        hasFcmToken: Boolean,
        fcmTokenHint: String
    ): Result<DeviceHeartbeatResult> {
        return runCatching {
            val body = JSONObject()
                .put("installId", installId)
                .put("brand", brand)
                .put("model", model)
                .put("androidVersion", androidVersion)
                .put("appVersion", appVersion)
                .put("appVersionCode", appVersionCode)
                .put("hasFcmToken", hasFcmToken)
                .put("fcmTokenHint", fcmTokenHint)
            val req = ApiClient.post("/api/v1/devices/heartbeat", body, accessToken)
            ApiClient.http.newCall(req).execute().use { res ->
                val raw = res.body?.string().orEmpty()
                if (!res.isSuccessful) throw ApiClient.parseError(raw, res.code)
                val root = JSONObject(raw)
                DeviceHeartbeatResult(
                    ok = root.optBoolean("ok", true),
                    blocked = root.optBoolean("blocked", false),
                    message = root.optString("message")
                )
            }
        }.onFailure { AppLog.e("DeviceApi.heartbeat failed", it) }
    }
}
// --- End: Devices live wire (Sachin) ---
