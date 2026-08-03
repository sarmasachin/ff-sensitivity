package com.ffsensitivity.app.util

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import com.ffsensitivity.app.data.SharedSensiCard
import java.util.Locale

/**
 * Renders a premium shareable sensitivity card image.
 * Card image branding: sensitivitysettings.com (+ site URL drawn on image).
 * Share caption uses the mobile app Play Store link (not the website URL).
 * Does NOT paint full sensitivity numbers (tease card only).
 */
object ShareCardBitmap {

    const val BRAND = "sensitivitysettings.com"
    const val SITE_URL = "https://sensitivitysettings.com"
    /** Shared with the image as EXTRA_TEXT — app install link, not website. */
    const val APP_STORE_URL =
        "https://play.google.com/store/apps/details?id=com.ffsensitivity.app"

    private const val W = 1080
    private const val H = 1480

    fun render(card: SharedSensiCard): Bitmap {
        val bmp = Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888)
        val c = Canvas(bmp)

        // Background
        val bg = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = LinearGradient(
                0f, 0f, 0f, H.toFloat(),
                intArrayOf(0xFF07080A.toInt(), 0xFF0E1116.toInt(), 0xFF151A22.toInt()),
                floatArrayOf(0f, 0.45f, 1f),
                Shader.TileMode.CLAMP
            )
        }
        c.drawRect(0f, 0f, W.toFloat(), H.toFloat(), bg)

        // Soft ambient glow
        val glow = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0x22E8A838
        }
        c.drawCircle(W * 0.5f, 220f, 280f, glow)

        // Top brand — centered
        val brandPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xFFF5C56B.toInt()
            textSize = 42f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textAlign = Paint.Align.CENTER
            letterSpacing = 0.08f
        }
        c.drawText(BRAND, W / 2f, 110f, brandPaint)

        val brandSub = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xFF9AA3B2.toInt()
            textSize = 28f
            textAlign = Paint.Align.CENTER
        }
        c.drawText("PRO SENSITIVITY CARD", W / 2f, 160f, brandSub)

        // Card panel
        val cardLeft = 72f
        val cardTop = 210f
        val cardRight = W - 72f
        val cardBottom = 1120f
        val cardRect = RectF(cardLeft, cardTop, cardRight, cardBottom)

        val cardFill = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = LinearGradient(
                cardLeft, cardTop, cardLeft, cardBottom,
                intArrayOf(0xFF1C2330.toInt(), 0xFF151A22.toInt()),
                null,
                Shader.TileMode.CLAMP
            )
        }
        c.drawRoundRect(cardRect, 48f, 48f, cardFill)

        val cardStroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = 3f
            color = 0x66E8A838
        }
        c.drawRoundRect(cardRect, 48f, 48f, cardStroke)

        // Left accent bar
        val accent = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = LinearGradient(
                cardLeft, cardTop, cardLeft, cardBottom,
                intArrayOf(0xFFF5C56B.toInt(), 0xFFE8A838.toInt()),
                null,
                Shader.TileMode.CLAMP
            )
        }
        c.drawRoundRect(
            RectF(cardLeft, cardTop + 18f, cardLeft + 10f, cardBottom - 18f),
            8f, 8f, accent
        )

        var y = cardTop + 78f
        val cx = (cardLeft + cardRight) / 2f

        // PRO SETUP
        val eyebrow = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xFFE8A838.toInt()
            textSize = 26f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textAlign = Paint.Align.CENTER
            letterSpacing = 0.18f
        }
        c.drawText("PRO SETUP", cx, y, eyebrow)
        y += 70f

        // Name
        val namePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xFFF2F0EB.toInt()
            textSize = 72f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textAlign = Paint.Align.CENTER
        }
        c.drawText(fitText(card.name, namePaint, cardRight - cardLeft - 80f), cx, y, namePaint)
        y += 42f

        val idPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xFF9AA3B2.toInt()
            textSize = 28f
            textAlign = Paint.Align.CENTER
        }
        c.drawText(
            fitText("FF ID · ${card.freeFireId}", idPaint, cardRight - cardLeft - 90f),
            cx, y, idPaint
        )
        y += 52f

        // Rank + Role chips
        drawChip(c, card.rank, cx - 150f, y)
        drawChip(c, card.role, cx + 150f, y)
        y += 90f

        // Device
        val devicePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xFF9AA3B2.toInt()
            textSize = 34f
            textAlign = Paint.Align.CENTER
        }
        c.drawText(
            fitText(card.deviceLabel, devicePaint, cardRight - cardLeft - 90f),
            cx, y, devicePaint
        )
        y += 42f
        if (card.deviceMeta.isNotBlank()) {
            val metaPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = 0xFF6B7380.toInt()
                textSize = 28f
                textAlign = Paint.Align.CENTER
            }
            c.drawText(card.deviceMeta, cx, y, metaPaint)
            y += 50f
        } else {
            y += 20f
        }

        // Stats panel
        val statsTop = y
        val statsRect = RectF(cardLeft + 48f, statsTop, cardRight - 48f, statsTop + 140f)
        val statsBg = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0x990E1116.toInt() }
        c.drawRoundRect(statsRect, 28f, 28f, statsBg)
        val statsStroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = 2f
            color = 0x2EFFFFFF
        }
        c.drawRoundRect(statsRect, 28f, 28f, statsStroke)

        val colW = (statsRect.width()) / 4f
        drawStat(c, "MATCHES", formatCount(card.matches), statsRect.left + colW * 0.5f, statsTop + 52f)
        drawStat(c, "KILLS", formatCount(card.kills), statsRect.left + colW * 1.5f, statsTop + 52f)
        drawStat(c, "HS", formatCount(card.headshots), statsRect.left + colW * 2.5f, statsTop + 52f)
        drawStat(c, "KD", card.kd, statsRect.left + colW * 3.5f, statsTop + 52f)

        y = statsRect.bottom + 70f

        // Locked CTA strip
        val ctaRect = RectF(cardLeft + 48f, y, cardRight - 48f, y + 88f)
        val ctaBg = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = LinearGradient(
                ctaRect.left, 0f, ctaRect.right, 0f,
                intArrayOf(0xFFE8A838.toInt(), 0xFFF5C56B.toInt()),
                null,
                Shader.TileMode.CLAMP
            )
        }
        c.drawRoundRect(ctaRect, 24f, 24f, ctaBg)
        val ctaText = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xFF07080A.toInt()
            textSize = 32f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textAlign = Paint.Align.CENTER
        }
        c.drawText("View full settings in app", cx, y + 56f, ctaText)

        // Caption under card
        val captionY = cardBottom + 80f
        val captionTitle = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xFFF2F0EB.toInt()
            textSize = 34f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textAlign = Paint.Align.CENTER
        }
        c.drawText("Get pro Free Fire sensitivity", W / 2f, captionY, captionTitle)

        val captionBody = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xFF9AA3B2.toInt()
            textSize = 28f
            textAlign = Paint.Align.CENTER
        }
        c.drawText("Tuned for your device · share with your squad", W / 2f, captionY + 48f, captionBody)

        val linkPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xFFF5C56B.toInt()
            textSize = 30f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textAlign = Paint.Align.CENTER
        }
        c.drawText(SITE_URL, W / 2f, captionY + 110f, linkPaint)

        return bmp
    }

    fun captionText(card: SharedSensiCard): String {
        return buildString {
            appendLine("${card.name} · ${card.rank} · ${card.role}")
            appendLine("FF ID ${card.freeFireId} · ${card.deviceLabel}")
            appendLine("KD ${card.kd} · HS ${card.headshots}")
            appendLine()
            appendLine("Get pro Free Fire sensitivity in the app")
            append(APP_STORE_URL)
        }
    }

    private fun drawChip(c: Canvas, text: String, centerX: Float, baselineY: Float) {
        val p = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xFFF2F0EB.toInt()
            textSize = 28f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textAlign = Paint.Align.CENTER
        }
        val w = p.measureText(text) + 48f
        val rect = RectF(centerX - w / 2f, baselineY - 34f, centerX + w / 2f, baselineY + 16f)
        val bg = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xCC0E1116.toInt() }
        c.drawRoundRect(rect, 18f, 18f, bg)
        val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = 2f
            color = 0x2EFFFFFF
        }
        c.drawRoundRect(rect, 18f, 18f, stroke)
        c.drawText(text, centerX, baselineY, p)
    }

    private fun drawStat(c: Canvas, label: String, value: String, x: Float, y: Float) {
        val labelP = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xFF6B7380.toInt()
            textSize = 22f
            textAlign = Paint.Align.CENTER
            letterSpacing = 0.08f
        }
        val valueP = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xFFF2F0EB.toInt()
            textSize = 40f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textAlign = Paint.Align.CENTER
        }
        c.drawText(label, x, y, labelP)
        c.drawText(value, x, y + 48f, valueP)
    }

    private fun fitText(text: String, paint: Paint, maxWidth: Float): String {
        if (paint.measureText(text) <= maxWidth) return text
        var t = text
        while (t.isNotEmpty() && paint.measureText("$t…") > maxWidth) {
            t = t.dropLast(1)
        }
        return if (t.isEmpty()) "…" else "$t…"
    }

    private fun formatCount(value: Int): String =
        String.format(Locale.US, "%,d", value.coerceAtLeast(0))
}
