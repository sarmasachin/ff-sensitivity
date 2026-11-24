package com.ffsensitivity.app.presentation.screens

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshots.SnapshotStateMap
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.ffsensitivity.app.data.RedeemCadenceOption
import com.ffsensitivity.app.data.RedeemCodeItem
import com.ffsensitivity.app.data.remote.ApiException
import com.ffsensitivity.app.data.remote.RedeemRepository
import com.ffsensitivity.app.data.remote.SessionExpiry
import com.ffsensitivity.app.data.remote.isAuthFailureCode
import com.ffsensitivity.app.util.AppLog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** First ON_RESUME is skipped; later resumes request a catalog reload. */
@Composable
internal fun RedeemCatalogResumeBinder(onResumeRefresh: () -> Unit) {
    val lifecycleOwner = LocalLifecycleOwner.current
    var skip by remember { mutableIntStateOf(1) }
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event != Lifecycle.Event.ON_RESUME) return@LifecycleEventObserver
            if (skip > 0) skip -= 1 else onResumeRefresh()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }
}

@Composable
internal fun RedeemCatalogLoadEffect(
    context: Context,
    catalogGeneration: Int,
    selectedCadenceId: String,
    unlocked: SnapshotStateMap<String, Boolean>,
    onCodes: (List<RedeemCodeItem>) -> Unit,
    onCadences: (List<RedeemCadenceOption>) -> Unit,
    onSelectCadenceIfMissing: (String) -> Unit,
    onLoading: (Boolean) -> Unit,
    onFailed: (Boolean, Throwable?) -> Unit
) {
    LaunchedEffect(catalogGeneration) {
        onLoading(true)
        val result = withContext(Dispatchers.IO) {
            RedeemRepository.loadCatalog(context)
        }
        result.fold(
            onSuccess = { payload ->
                val cleaned = payload.items
                    .filter { it.id.isNotBlank() && !it.id.contains('/') }
                    .distinctBy { it.id }
                onCodes(cleaned)
                if (payload.cadences.isNotEmpty()) {
                    onCadences(payload.cadences)
                    if (payload.cadences.none { it.id == selectedCadenceId }) {
                        onSelectCadenceIfMissing(payload.cadences.first().id)
                    }
                }
                unlocked.clear()
                cleaned.filter { it.serverUnlocked }.forEach { unlocked[it.id] = true }
                onFailed(false, null)
            },
            onFailure = {
                AppLog.e("Redeem catalog failed", it)
                onCodes(emptyList())
                onFailed(true, it)
                val api = it as? ApiException
                if (api != null && isAuthFailureCode(api.code)) {
                    SessionExpiry.notifyExpired()
                }
            }
        )
        onLoading(false)
    }
}

internal fun redeemCatalogErrorUi(
    loading: Boolean,
    failed: Boolean,
    cause: Throwable?,
    codesEmpty: Boolean
): RedeemUiError? = when {
    loading -> null
    failed -> redeemCatalogLoadError(cause)
    codesEmpty -> RedeemUiError(
        code = "REDEEM_CATALOG_EMPTY",
        title = "No rewards right now",
        message = "There are no scratch cards to show. Check back later."
    )
    else -> null
}
