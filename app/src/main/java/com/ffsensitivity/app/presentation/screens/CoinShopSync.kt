package com.ffsensitivity.app.presentation.screens

import android.content.Context
import com.ffsensitivity.app.data.remote.ApiException
import com.ffsensitivity.app.data.remote.EconomyRepository
import com.ffsensitivity.app.util.AppLog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

internal sealed class ShopRefreshOutcome {
    data class Ok(val frozen: Boolean) : ShopRefreshOutcome()
    data class AuthRequired(val message: String) : ShopRefreshOutcome()
    data class Failed(val message: String) : ShopRefreshOutcome()
}

internal suspend fun refreshShopFromServer(context: Context): ShopRefreshOutcome {
    return runCatching {
        val wallet = withContext(Dispatchers.IO) {
            EconomyRepository.refreshWallet(context)
        }
        wallet.fold(
            onSuccess = {
                ShopRefreshOutcome.Ok(frozen = EconomyRepository.lastFrozen)
            },
            onFailure = { err ->
                AppLog.e("Shop wallet refresh failed", err)
                val auth = err is ApiException && err.code == "AUTH_REQUIRED"
                if (auth) {
                    ShopRefreshOutcome.AuthRequired(
                        (err as? ApiException)?.message
                            ?: "Please sign in again to use Coin Shop."
                    )
                } else {
                    ShopRefreshOutcome.Failed(
                        when (err) {
                            is ApiException -> err.message
                            is java.net.ConnectException,
                            is java.net.SocketTimeoutException,
                            is java.net.UnknownHostException,
                            is java.io.IOException ->
                                "Can't reach the server. Check Wi‑Fi and try again."
                            else -> "Could not load wallet or shop. Try again."
                        }
                    )
                }
            }
        )
    }.getOrElse {
        AppLog.e("Shop refresh crashed", it)
        ShopRefreshOutcome.Failed("Could not load wallet or shop. Try again.")
    }
}
