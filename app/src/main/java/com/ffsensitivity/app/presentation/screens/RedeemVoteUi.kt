package com.ffsensitivity.app.presentation.screens

import android.content.Context
import com.ffsensitivity.app.data.RedeemCatalogCache
import com.ffsensitivity.app.data.RedeemCodeItem
import com.ffsensitivity.app.data.remote.RedeemRepository
import com.ffsensitivity.app.util.AppLog
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

internal object RedeemVoteUi {
    fun submit(
        scope: CoroutineScope,
        context: Context,
        item: RedeemCodeItem,
        previous: Boolean?,
        yes: Boolean,
        apply: (RedeemCodeItem) -> Unit,
        fail: () -> Unit
    ) {
        if (previous != null) return
        apply(item.withVote(previous, yes))
        scope.launch {
            val result = withContext(Dispatchers.IO) {
                RedeemRepository.vote(context, item.id, yes)
            }
            result.fold(
                onSuccess = { saved ->
                    val updated = item.copy(
                        yesCount = saved.yesCount,
                        noCount = saved.noCount,
                        myVote = saved.worked
                    )
                    RedeemCatalogCache.put(updated)
                    apply(updated)
                },
                onFailure = {
                    AppLog.e("Redeem vote failed", it)
                    fail()
                }
            )
        }
    }
}
