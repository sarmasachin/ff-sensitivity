package com.ffsensitivity.app.data.remote

import android.content.Context
import com.ffsensitivity.app.data.StylishNameCatalog
import com.ffsensitivity.app.util.AppLog

// --- Start: Names live wire (Sachin) ---
object NamesCatalogCache {
    @Volatile
    var catalog: NamesCatalogPayload? = null
        private set

    fun set(next: NamesCatalogPayload) {
        catalog = next
        runCatching {
            StylishNameCatalog.applyRemoteCatalog(next)
        }.onFailure {
            AppLog.e("NamesCatalogCache applyRemoteCatalog failed — keeping offline catalog", it)
        }
    }
}

object NamesRepository {
    /** Public Nest catalog — no JWT. Falls back to offline local frames/fonts. */
    fun syncCatalog(context: Context): Result<NamesCatalogPayload> {
        // Keep local assets warm even when remote fails.
        runCatching { StylishNameCatalog.ensureLoaded(context) }
            .onFailure { AppLog.e("NamesRepository local ensureLoaded failed", it) }
        return NamesApi.getCatalog().map { payload ->
            NamesCatalogCache.set(payload)
            payload
        }.onFailure {
            AppLog.e("NamesRepository.syncCatalog failed — using offline catalog", it)
        }
    }
}
// --- End: Names live wire (Sachin) ---
