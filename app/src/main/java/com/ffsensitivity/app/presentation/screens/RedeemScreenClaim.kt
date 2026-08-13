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

/** Server claim / scratch after foil reveal (RedeemScreen size budget). */
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
        if (target.isScratchReward) {
            return runScratch(context, target, onCodes, codes, unlocked, revealed, clearError)
        }
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

    private suspend fun runScratch(
        context: Context,
        target: RedeemCodeItem,
        onCodes: (List<RedeemCodeItem>) -> Unit,
        codes: List<RedeemCodeItem>,
        unlocked: MutableMap<String, Boolean>,
        revealed: MutableMap<String, Boolean>,
        clearError: () -> Unit
    ): ScratchClaimUiResult {
        val result = withContext(Dispatchers.IO) {
            RedeemRepository.scratchReward(context, target)
        }
        return result.fold(
            onSuccess = { scratch ->
                val wonCode = scratch.code?.takeIf { it.isNotBlank() }
                val updated = target.copy(
                    code = wonCode ?: target.code,
                    serverUnlocked = wonCode != null || target.serverUnlocked,
                    status = RedeemStatus.ACTIVE,
                    needsAd = true,
                    canScratch = false,
                    poolLeft = target.poolLeft?.let { left ->
                        if (wonCode != null) (left - 1).coerceAtLeast(0) else left
                    },
                    stockLeft = target.stockLeft?.let { left ->
                        if (wonCode != null) (left - 1).coerceAtLeast(0) else left
                    },
                    tip = scratch.tip
                )
                onCodes(codes.map { if (it.id == target.id) updated else it })
                RedeemCatalogCache.put(updated)
                if (wonCode != null) {
                    unlocked[target.id] = true
                    revealed[target.id] = true
                    runCatching {
                        ScratchHistoryStore.addRedeem(context, updated)
                    }.onFailure {
                        AppLog.e("Redeem scratch history failed", it)
                    }
                }
                clearError()
                val toast = if (wonCode != null) {
                    "+${scratch.coinsGranted} coins · bonus code unlocked"
                } else {
                    "+${scratch.coinsGranted} coins"
                }
                SafeOps.toast(context, toast)
                ScratchClaimUiResult(
                    ok = true,
                    message = if (wonCode != null) {
                        "+${scratch.coinsGranted} coins · code unlocked"
                    } else {
                        "+${scratch.coinsGranted} coins"
                    },
                    revealedCode = wonCode,
                    coinsGranted = scratch.coinsGranted
                )
            },
            onFailure = { err ->
                AppLog.e("Redeem scratch failed", err)
                val message = when (err) {
                    is ApiException -> err.message
                    else -> "Couldn't complete scratch. Please try again."
                }
                ScratchClaimUiResult(ok = false, message = message)
            }
        )
    }
}
