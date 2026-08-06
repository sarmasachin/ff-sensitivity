package com.ffsensitivity.app.util

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.widget.Toast
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream

object SafeOps {

    fun toast(context: Context, message: String) {
        runCatching {
            Toast.makeText(context.applicationContext, message, Toast.LENGTH_SHORT).show()
        }.onFailure { AppLog.e("Toast failed", it) }
    }

    fun copyText(context: Context, label: String, text: String): Boolean {
        return runCatching {
            val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
                ?: return false
            cm.setPrimaryClip(ClipData.newPlainText(label, text))
            true
        }.getOrElse {
            AppLog.e("Clipboard copy failed", it)
            false
        }
    }

    fun openUrl(context: Context, url: String): Boolean {
        return runCatching {
            val uri = Uri.parse(url.trim())
            val scheme = uri.scheme?.lowercase()
            if (scheme != "http" && scheme != "https") {
                AppLog.w("Blocked non-http URL: $url")
                return false
            }
            val intent = Intent(Intent.ACTION_VIEW, uri)
            if (context !is Activity) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            true
        }.getOrElse {
            AppLog.e("Open URL failed", it)
            false
        }
    }

    fun shareText(context: Context, title: String, text: String): Boolean {
        return runCatching {
            val body = text.trim()
            if (body.isEmpty()) {
                AppLog.w("Share blocked: empty text")
                return false
            }
            val send = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, body)
            }
            val chooser = Intent.createChooser(send, title).apply {
                if (context !is Activity) {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            }
            if (chooser.resolveActivity(context.packageManager) == null) {
                AppLog.w("Share blocked: no activity to handle ACTION_SEND")
                return false
            }
            context.startActivity(chooser)
            true
        }.getOrElse {
            AppLog.e("Share text failed", it)
            false
        }
    }

    /**
     * Compress PNG to cache. Call from a background dispatcher (IO) — not Main.
     * Returns null if write/compress fails.
     */
    fun writeSharePng(context: Context, bitmap: Bitmap): File? {
        return runCatching {
            val dir = File(context.cacheDir, "share").apply { mkdirs() }
            val file = File(dir, "sensi_card_${System.currentTimeMillis()}.png")
            FileOutputStream(file).use { out ->
                if (!bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)) {
                    return null
                }
            }
            file
        }.getOrElse {
            AppLog.e("Share PNG write failed", it)
            null
        }
    }

    /** Launch share sheet for a cached PNG. Call from Main. */
    fun shareImageFile(
        context: Context,
        title: String,
        file: File,
        caption: String
    ): Boolean {
        return runCatching {
            if (!file.exists() || file.length() <= 0L) {
                AppLog.w("Share image blocked: missing file")
                return false
            }
            val uri = FileProvider.getUriForFile(
                context,
                context.packageName + ".fileprovider",
                file
            )
            val send = Intent(Intent.ACTION_SEND).apply {
                type = "image/png"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_TEXT, caption.trim())
                clipData = ClipData.newUri(context.contentResolver, "sensitivity_card", uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            val chooser = Intent.createChooser(send, title).apply {
                if (context !is Activity) {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            if (chooser.resolveActivity(context.packageManager) == null) {
                AppLog.w("Share image blocked: no handler")
                return false
            }
            context.startActivity(chooser)
            true
        }.getOrElse {
            AppLog.e("Share image failed", it)
            false
        }
    }

    /** Share premium card image + caption. Prefer IO write + Main launch from callers. */
    fun shareImageAndText(
        context: Context,
        title: String,
        bitmap: Bitmap,
        caption: String
    ): Boolean {
        val file = writeSharePng(context, bitmap) ?: return false
        return shareImageFile(context, title, file, caption)
    }

    inline fun <T> runOrNull(label: String, block: () -> T): T? {
        return runCatching(block).getOrElse {
            AppLog.e(label, it)
            null
        }
    }
}
