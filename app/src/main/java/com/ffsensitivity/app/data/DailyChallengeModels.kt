package com.ffsensitivity.app.data

data class DailyQuizQuestion(
    val id: String,
    val question: String,
    val options: List<String>,
    val correctIndex: Int
)
