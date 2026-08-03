package com.ffsensitivity.app.data

enum class FingerCount(val value: Int, val label: String) {
    TWO(2, "2 Fingers"),
    THREE(3, "3 Fingers"),
    FOUR(4, "4 Fingers"),
    FIVE(5, "5 Fingers"),
    SIX(6, "6 Fingers")
}

enum class PlayerRole(val label: String) {
    RUSHER("Rusher"),
    ONE_TAP("One-Tap Headshot"),
    SNIPER("Sniper"),
    FLANKER("Flanker")
}

enum class DpiPreference(val label: String) {
    NONE("No DPI"),
    MID("Mid DPI"),
    HIGH("High DPI")
}

enum class ScreenGuard(val label: String) {
    MATTE("Matte / Gaming"),
    NORMAL("Normal HD"),
    NONE("No Guard")
}

data class WizardAnswers(
    val fingers: FingerCount,
    val role: PlayerRole,
    val dpiPreference: DpiPreference,
    val screenGuard: ScreenGuard
)
