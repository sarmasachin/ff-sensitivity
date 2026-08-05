package com.ffsensitivity.app.data.remote

import com.ffsensitivity.app.util.AppLog

// --- Start: Economy live wire (Sachin) ---
/** @deprecated Prefer EconomyApi.getWallet — kept as thin alias. */
object WalletApi {
    fun sync(accessToken: String, coins: Int): Result<Int> {
        // Client-trusted sync removed. Always pull server balance.
        void(coins)
        return EconomyApi.getWallet(accessToken).map { it.coins }.onFailure {
            AppLog.e("WalletApi.get (legacy sync) failed", it)
        }
    }

    private fun void(@Suppress("UNUSED_PARAMETER") x: Int) = Unit
}
// --- End: Economy live wire (Sachin) ---
