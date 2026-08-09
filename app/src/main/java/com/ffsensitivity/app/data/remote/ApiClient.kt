package com.ffsensitivity.app.data.remote

import com.ffsensitivity.app.BuildConfig
import com.ffsensitivity.app.util.AppLog
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

// --- Start: Redeem live wire (Sachin) ---
class ApiException(
    val code: String,
    override val message: String,
    val detailsJson: String? = null
) : Exception(message) {
    fun detailLong(key: String): Long? {
        if (detailsJson.isNullOrBlank()) return null
        return runCatching {
            val v = JSONObject(detailsJson).optLong(key, -1L)
            if (v > 0L) v else null
        }.getOrNull()
    }
}

object ApiClient {
    private val jsonMedia = "application/json; charset=utf-8".toMediaType()

    val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .writeTimeout(20, TimeUnit.SECONDS)
        .callTimeout(25, TimeUnit.SECONDS)
        .build()

    fun baseUrl(): String {
        val raw = BuildConfig.API_BASE_URL.trim().trimEnd('/')
        val url = raw.ifBlank {
            if (BuildConfig.DEBUG) "http://10.0.2.2:4000" else ""
        }
        check(url.isNotBlank()) { "API_BASE_URL is missing" }
        check(BuildConfig.DEBUG || url.startsWith("https://")) {
            "Release builds require an HTTPS API_BASE_URL"
        }
        return url
    }

    fun jsonBody(obj: JSONObject) =
        obj.toString().toRequestBody(jsonMedia)

    fun parseError(body: String?, httpCode: Int): ApiException {
        return runCatching {
            val root = JSONObject(body.orEmpty())
            val err = root.optJSONObject("error")
            val code = err?.optString("code").orEmpty().ifBlank { "HTTP_$httpCode" }
            val message = err?.optString("message").orEmpty().ifBlank {
                "Something went wrong. Please try again."
            }
            val details = err?.optJSONObject("details")?.toString()
            ApiException(code, message, details)
        }.getOrElse {
            AppLog.e("API error parse failed", it)
            ApiException("HTTP_$httpCode", "Couldn't reach the server. Try again.")
        }
    }

    fun get(path: String, bearer: String?): Request {
        val b = Request.Builder().url("${baseUrl()}$path").get()
        if (!bearer.isNullOrBlank()) {
            b.header("Authorization", "Bearer $bearer")
        }
        return b.build()
    }

    fun post(path: String, body: JSONObject, bearer: String?): Request {
        val b = Request.Builder()
            .url("${baseUrl()}$path")
            .post(jsonBody(body))
            .header("Content-Type", "application/json")
        if (!bearer.isNullOrBlank()) {
            b.header("Authorization", "Bearer $bearer")
        }
        return b.build()
    }
}
// --- End: Redeem live wire (Sachin) ---
