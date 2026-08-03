package com.ffsensitivity.app.data

import android.os.Build

/** Exact MODEL/DEVICE match only — no fuzzy contains (avoids wrong Hz). */
object TouchRateDatabase {

    fun lookup(brand: String = Build.BRAND, model: String = Build.MODEL, device: String = Build.DEVICE): Int? {
        val candidates = linkedSetOf<String>()
        listOf(model, device, model.replace("5G", "", ignoreCase = true).trim()).forEach { raw ->
            val n = normalize(raw)
            if (n.length >= 4) candidates.add(n)
        }
        for (c in candidates) {
            TOUCH_BY_KEY[c]?.let { return it }
        }
        return null
    }

    private fun normalize(raw: String): String {
        return raw.lowercase()
            .replace("(", "")
            .replace(")", "")
            .replace("+", "plus")
            .replace(".", "")
            .replace(" ", "")
            .replace("-", "")
            .replace("_", "")
            .trim()
    }

    private val TOUCH_BY_KEY: Map<String, Int> = mapOf(
        "2211133g" to 240,
        "akita" to 120,
        "asusai2201" to 720,
        "asusai2203" to 720,
        "asusi005da" to 720,
        "bluejay" to 120,
        "caiman" to 240,
        "cph2581" to 240,
        "cph2609" to 240,
        "cph2611" to 240,
        "husky" to 240,
        "iqoo11" to 240,
        "iqoo12" to 240,
        "iqoo13" to 240,
        "iqooneo10" to 240,
        "iqooneo7" to 240,
        "iqooneo9" to 240,
        "komodo" to 240,
        "motog24" to 120,
        "motog34" to 120,
        "motog54" to 120,
        "motog84" to 120,
        "motog85" to 120,
        "motorolaedge40" to 240,
        "motorolaedge50" to 240,
        "motorolaedge50pro" to 240,
        "motorolaedge50ultra" to 240,
        "ne2211" to 240,
        "nothingphone2" to 240,
        "nothingphone2a" to 120,
        "nothingphone3a" to 240,
        "nothingphone3apro" to 240,
        "oneplus10pro" to 240,
        "oneplus11" to 240,
        "oneplus11r" to 240,
        "oneplus12" to 240,
        "oneplus12r" to 240,
        "oneplus13" to 240,
        "oneplus13r" to 240,
        "oneplusnord4" to 240,
        "oneplusnordce4" to 120,
        "oppoa17" to 120,
        "oppoa18" to 120,
        "oppoa59" to 120,
        "oppofindx6" to 240,
        "oppofindx7" to 240,
        "oppofindx8" to 240,
        "opporeno12pro" to 240,
        "pixel6a" to 120,
        "pixel7a" to 120,
        "pixel8a" to 120,
        "pixel8pro" to 240,
        "pixel9a" to 120,
        "pixel9pro" to 240,
        "pixel9proxl" to 240,
        "pococ65" to 120,
        "pocof4gt" to 480,
        "pocof5" to 240,
        "pocof5pro" to 240,
        "pocof6" to 240,
        "pocof6pro" to 240,
        "pocom6" to 120,
        "pocox5pro" to 180,
        "pocox6pro" to 240,
        "pocox7pro" to 240,
        "realme11" to 120,
        "realme11proplus" to 180,
        "realme12" to 120,
        "realme12proplus" to 240,
        "realme13pro" to 240,
        "realmec53" to 120,
        "realmec55" to 120,
        "realmec67" to 120,
        "realmegt5" to 240,
        "realmegt6" to 240,
        "realmegt6t" to 240,
        "redmi12" to 120,
        "redmi12c" to 120,
        "redmi13" to 120,
        "redmi13c" to 120,
        "redmi14c" to 120,
        "redmik50gaming" to 480,
        "redmik60" to 240,
        "redmik70" to 240,
        "redmik80" to 240,
        "redminote11" to 120,
        "redminote12" to 120,
        "redminote12pro" to 180,
        "redminote12proplus" to 180,
        "redminote13" to 120,
        "redminote13pro" to 240,
        "redminote13proplus" to 240,
        "redminote14pro" to 240,
        "redminote14proplus" to 240,
        "rogphone6" to 720,
        "rogphone7" to 720,
        "rogphone8" to 720,
        "rogphone9" to 720,
        "sma045f" to 120,
        "sma055f" to 120,
        "sma065f" to 120,
        "sma145f" to 120,
        "sma155f" to 120,
        "sma346b" to 180,
        "sma356b" to 240,
        "sma528b" to 180,
        "sma536b" to 180,
        "sma546b" to 240,
        "sma556b" to 240,
        "smg991b" to 240,
        "smg996b" to 240,
        "smg998b" to 240,
        "sms901b" to 240,
        "sms906b" to 240,
        "sms908b" to 240,
        "sms911b" to 240,
        "sms916b" to 240,
        "sms918b" to 240,
        "sms918u" to 240,
        "sms921b" to 240,
        "sms926b" to 240,
        "sms928b" to 240,
        "sms931b" to 240,
        "sms936b" to 240,
        "sms938b" to 240,
        "vivox100" to 240,
        "vivox100pro" to 240,
        "vivox200" to 240,
        "vivox200pro" to 240,
        "vivox90" to 240,
        "vivoy22" to 120,
        "vivoy27" to 120,
        "vivoy28" to 120,
        "xiaomi13" to 240,
        "xiaomi13pro" to 240,
        "xiaomi14" to 240,
        "xiaomi14pro" to 240,
        "xiaomi14t" to 240,
        "xiaomi15" to 240,
        "xiaomi15pro" to 240
    )
}
