package com.ffsensitivity.app.data

import android.content.Context
import com.ffsensitivity.app.util.AppLog
import org.json.JSONArray
import org.json.JSONObject

/**
 * Local store for FF sensitivity cross-check entries.
 * Used later for personal / crowd offset learning.
 */
object CompareSensitivityStore {
    private const val PREFS = "ff_compare_sensitivity"
    private const val KEY_ENTRIES = "entries"
    private const val MAX_ENTRIES = 50

    fun save(context: Context, entry: SensitivityCompareEntry): Boolean {
        return runCatching {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val arr = JSONArray(prefs.getString(KEY_ENTRIES, "[]") ?: "[]")
            arr.put(entryToJson(entry))
            while (arr.length() > MAX_ENTRIES) {
                arr.remove(0)
            }
            prefs.edit().putString(KEY_ENTRIES, arr.toString()).commit()
        }.getOrElse {
            AppLog.e("CompareSensitivityStore.save failed", it)
            false
        }
    }

    fun loadAll(context: Context): List<SensitivityCompareEntry> {
        return runCatching {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val raw = prefs.getString(KEY_ENTRIES, "[]") ?: "[]"
            val arr = JSONArray(raw)
            val out = ArrayList<SensitivityCompareEntry>(arr.length())
            for (i in 0 until arr.length()) {
                runCatching { out.add(entryFromJson(arr.getJSONObject(i))) }
                    .onFailure { AppLog.w("Skipped corrupt compare entry at $i", it) }
            }
            out
        }.getOrElse {
            AppLog.e("CompareSensitivityStore.loadAll failed", it)
            emptyList()
        }
    }

    /** Average (actual − suggested) for General, prefer same finger + role. */
    fun averageGeneralOffset(
        context: Context,
        fingers: String,
        role: String
    ): Int? {
        return runCatching {
            val all = loadAll(context)
            if (all.isEmpty()) return null
            val matched = all.filter { it.fingers == fingers && it.role == role }
            val use = matched.ifEmpty { all }
            val sum = use.sumOf { it.actual.general - it.suggested.general }
            sum / use.size
        }.getOrElse {
            AppLog.e("CompareSensitivityStore.averageGeneralOffset failed", it)
            null
        }
    }

    private fun entryToJson(entry: SensitivityCompareEntry): JSONObject = JSONObject()
        .put("timestamp", entry.timestamp)
        .put("deviceLabel", entry.deviceLabel)
        .put("fingers", entry.fingers)
        .put("role", entry.role)
        .put("dpiPreference", entry.dpiPreference)
        .put("screenGuard", entry.screenGuard)
        .put("suggested", valuesToJson(entry.suggested))
        .put("actual", valuesToJson(entry.actual))
        .put("feedback", entry.feedback.storageKey)

    private fun valuesToJson(v: SensitivityValues): JSONObject = JSONObject()
        .put("general", v.general)
        .put("redDot", v.redDot)
        .put("scope2x", v.scope2x)
        .put("scope4x", v.scope4x)
        .put("sniper", v.sniper)
        .put("freeLook", v.freeLook)
        .put("fireButton", v.fireButton)

    private fun entryFromJson(obj: JSONObject): SensitivityCompareEntry {
        val feedbackKey = obj.optString("feedback", CompareFeedback.PERFECT.storageKey)
        val feedback = CompareFeedback.entries.firstOrNull { it.storageKey == feedbackKey }
            ?: CompareFeedback.PERFECT
        return SensitivityCompareEntry(
            timestamp = obj.getLong("timestamp"),
            deviceLabel = obj.optString("deviceLabel"),
            fingers = obj.optString("fingers"),
            role = obj.optString("role"),
            dpiPreference = obj.optString("dpiPreference"),
            screenGuard = obj.optString("screenGuard"),
            suggested = valuesFromJson(obj.getJSONObject("suggested")),
            actual = valuesFromJson(obj.getJSONObject("actual")),
            feedback = feedback
        )
    }

    private fun valuesFromJson(obj: JSONObject): SensitivityValues = SensitivityValues(
        general = obj.getInt("general"),
        redDot = obj.getInt("redDot"),
        scope2x = obj.getInt("scope2x"),
        scope4x = obj.getInt("scope4x"),
        sniper = obj.getInt("sniper"),
        freeLook = obj.getInt("freeLook"),
        fireButton = obj.getInt("fireButton")
    )
}
