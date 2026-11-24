package com.ffsensitivity.app.data.remote

/**
 * User-facing English for API / throwable errors.
 * Never show ops jargon, error codes, or stack text in the UI.
 */
fun Throwable.userMessage(fallback: String): String {
    return when (this) {
        is ApiException -> friendlyApiMessage(code, message).ifBlank { fallback }
        else -> {
            val raw = message?.trim().orEmpty()
            if (raw.isNotBlank() && !looksTechnicalUserCopy(raw)) raw else fallback
        }
    }
}

fun friendlyApiMessage(code: String, serverMessage: String = ""): String {
    val c = code.trim()
    mappedApiMessage(c)?.let { return it }

    val raw = serverMessage.trim()
    if (raw.isBlank() || looksTechnicalUserCopy(raw)) {
        return "Something went wrong. Please try again."
    }
    return raw.take(160)
}

private fun mappedApiMessage(code: String): String? = when (code) {
    "AUTH_REQUIRED", "AUTH_EXPIRED", "AUTH_INVALID", "AUTH_REVOKED",
    "HTTP_401", "Unauthorized" ->
        "Session expired. Please sign in again."

    "AUTH_SUSPENDED" ->
        "This account is suspended. Contact support if you need help."

    "AUTH_GOOGLE_INVALID" ->
        "Google sign-in failed. Please try again."

    "WALLET_FROZEN" ->
        "Your coin wallet is temporarily locked. Contact support."

    "NOT_ENOUGH_COINS" ->
        "Not enough coins."

    "SHOP_BAD_REQUEST", "PREMIUM_UNLOCK_BAD_REQUEST" ->
        "That request didn’t work. Please try again."

    "PREMIUM_UNLOCK_BAD_PRODUCT" ->
        "That Premium unlock isn’t available right now."

    "PREMIUM_UNLOCK_COIN_DISABLED" ->
        "Coin unlock is turned off. Try watching an ad."

    "PREMIUM_UNLOCK_AD_DISABLED" ->
        "Watch-ad unlock is turned off. Try coins."

    "SHOP_ITEM_NOT_FOUND" ->
        "That item is no longer available."

    "SHOP_ALREADY_OWNED" ->
        "You already own this item."

    "SHOP_OUT_OF_STOCK" ->
        "This item is out of stock right now."

    "USER_NOT_FOUND" ->
        "Account not found. Please sign in again."

    "PROFILE_INVALID" ->
        "Please check your profile details and try again."

    "COMPARE_INVALID" ->
        "Please enter the comparison details."

    "COMPARE_SAME_AS_APP" ->
        "Enter your Free Fire sensitivity — not the same numbers as the app suggestion."

    "COMPARE_DAILY_LIMIT" ->
        "You can save 30 comparisons a day. Try again tomorrow."

    "CHALLENGE_NO_QUIZ" ->
        "No quiz is available right now. Try again later."

    "CHALLENGE_BAD_QUESTION", "CHALLENGE_BAD_OPTION", "CHALLENGE_BAD_ID" ->
        "That quiz answer couldn’t be submitted. Please try again."

    "ECONOMY_DAILY_CAP" ->
        "You’ve reached today’s coin limit. Come back tomorrow."

    "ECONOMY_QUIZ_CLOSED" ->
        "Today’s quiz is closed."

    "ECONOMY_AD_DISABLED" ->
        "Ad bonus is turned off right now."

    "ECONOMY_CHECKIN_DISABLED" ->
        "Daily check-in is turned off right now."

    "ECONOMY_QUIZ_DISABLED" ->
        "Quiz rewards are turned off right now."

    "ECONOMY_STREAK_REQUIRED" ->
        "Keep your streak going to unlock this reward."

    "ECONOMY_MILESTONE_INVALID", "ECONOMY_INVALID" ->
        "That reward isn’t available right now."

    "PUSH_BAD_TOKEN" ->
        "Couldn’t update notification settings. Please try again."

    else -> null
}

private fun looksTechnicalUserCopy(text: String): Boolean {
    val t = text.lowercase()
    return t.contains("by ops") ||
        t.contains("request id") ||
        t.contains("admob") ||
        t.contains("(code ") ||
        t.contains("http_") ||
        t.contains("exception") ||
        t.contains("nullpointer") ||
        t.contains("stack") ||
        t.contains("debug apk") ||
        t.contains("app id missing") ||
        t.contains("invalid id.") ||
        t.contains("unknown unlock") ||
        t.contains("user not found") ||
        t.contains("[debug]") ||
        Regex("""\bat\s+[\w.$]+\(""").containsMatchIn(text)
}
