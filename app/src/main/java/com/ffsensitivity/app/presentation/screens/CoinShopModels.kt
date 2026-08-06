package com.ffsensitivity.app.presentation.screens

import java.text.NumberFormat
import java.util.Locale

internal enum class ShopTab { STORE, OWNED }

internal enum class ShopRetryKind { REFRESH, BUY, SIGN_IN }

internal data class ShopUiError(
    val code: String,
    val title: String,
    val message: String,
    val retryKind: ShopRetryKind? = null,
    val retryItemId: String? = null
)

internal fun formatShopCoins(value: Int): String =
    NumberFormat.getIntegerInstance(Locale.US).format(value.coerceAtLeast(0))
