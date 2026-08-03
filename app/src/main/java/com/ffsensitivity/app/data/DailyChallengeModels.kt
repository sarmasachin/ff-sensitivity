package com.ffsensitivity.app.data

data class DailyQuizQuestion(
    val id: String,
    val question: String,
    val options: List<String>,
    val correctIndex: Int
)

val dailyQuizBank: List<DailyQuizQuestion> = listOf(
    DailyQuizQuestion(
        id = "q1",
        question = "Approx Free Fire nickname character limit is?",
        options = listOf("6", "12", "20", "30"),
        correctIndex = 1
    ),
    DailyQuizQuestion(
        id = "q2",
        question = "Which setting mainly affects aim drag feel?",
        options = listOf("DPI only", "Sensitivity", "Brightness", "Volume"),
        correctIndex = 1
    ),
    DailyQuizQuestion(
        id = "q3",
        question = "Higher refresh rate usually means?",
        options = listOf("Smoother motion", "More storage", "Better battery always", "Lower RAM"),
        correctIndex = 0
    ),
    DailyQuizQuestion(
        id = "q4",
        question = "Safe DPI tip helps avoid?",
        options = listOf("Friend requests", "Crash / black screen risk", "Name change", "Clan join"),
        correctIndex = 1
    ),
    DailyQuizQuestion(
        id = "q5",
        question = "Red Dot sensitivity is usually set?",
        options = listOf("Far above General", "Near / slightly under General", "Always 0", "Only for snipers"),
        correctIndex = 1
    ),
    DailyQuizQuestion(
        id = "q6",
        question = "HUD fire button size depends most on?",
        options = listOf("Wallpaper", "Screen size + fingers", "Clan level", "Server ping only"),
        correctIndex = 1
    ),
    DailyQuizQuestion(
        id = "q7",
        question = "Best practice before sharing sensi?",
        options = listOf("Hide device info", "Test in training", "Set everything to 200", "Disable touch"),
        correctIndex = 1
    )
)

fun quizForToday(dayOfYear: Int): DailyQuizQuestion {
    if (dailyQuizBank.isEmpty()) {
        return DailyQuizQuestion("fallback", "Ready to play?", listOf("Yes", "No", "Maybe", "Later"), 0)
    }
    val index = ((dayOfYear - 1).coerceAtLeast(0)) % dailyQuizBank.size
    val q = dailyQuizBank[index]
    val options = q.options.filter { it.isNotBlank() }.take(4)
    if (options.size < 2) {
        return DailyQuizQuestion("fallback", "Ready to play?", listOf("Yes", "No", "Maybe", "Later"), 0)
    }
    val correct = q.correctIndex.coerceIn(0, options.lastIndex)
    return q.copy(options = options, correctIndex = correct)
}
