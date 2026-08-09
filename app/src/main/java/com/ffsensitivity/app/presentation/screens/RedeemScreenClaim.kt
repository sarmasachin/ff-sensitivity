package com.ffsensitivity.app.presentation.screens

import android.content.Context
import com.ffsensitivity.app.data.RedeemCatalogCache
import com.ffsensitivity.app.data.RedeemCodeItem
import com.ffsensitivity.app.data.RedeemStatus
import com.ffsensitivity.app.data.ScratchHistoryStore
import com.ffsensitivity.app.data.remote.ApiException
import com.ffsensitivity.app.data.remote.RedeemRepository
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.SafeOps
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Server claim after foil reveal (RedeemScreen size budget). */
internal object RedeemScreenClaim {
    suspend fun run(
        context: Context,
        target: RedeemCodeItem,
        onCodes: (List<RedeemCodeItem>) -> Unit,
        codes: List<RedeemCodeItem>,
        unlocked: MutableMap<String, Boolean>,
        revealed: MutableMap<String, Boolean>,
        clearError: () -> Unit
    ): ScratchClaimUiResult {
        val result = withContext(Dispatchers.IO) {
            RedeemRepository.claimCode(context, target)
        }
        return result.fold(
            onSuccess = { claim ->
                val updated = target.copy(
                    code = claim.code,
                    serverUnlocked = true,
                    status = RedeemStatus.ACTIVE,
                    stockLeft = target.stockLeft?.let { left ->
                        if (claim.alreadyClaimed) left else (left - 1).coerceAtLeast(0)
                    }
                )
                onCodes(codes.map { if (it.id == target.id) updated else it })
                RedeemCatalogCache.put(updated)
                unlocked[target.id] = true
                revealed[target.id] = true
                runCatching {
                    ScratchHistoryStore.addRedeem(context, updated)
                }.onFailure {
                    AppLog.e("Redeem unlock / history failed", it)
                }
                clearError()
                SafeOps.toast(context, "Code unlocked · you can copy now")
                ScratchClaimUiResult(
                    ok = true,
                    message = "Code unlocked",
                    revealedCode = claim.code
                )
            },
            onFailure = { err ->
                AppLog.e("Redeem claim failed", err)
                val message = when (err) {
                    is ApiException -> err.message
                    else -> "Couldn't unlock this code. Please try again."
                }
                ScratchClaimUiResult(ok = false, message = message)
            }
        )
    }
}
