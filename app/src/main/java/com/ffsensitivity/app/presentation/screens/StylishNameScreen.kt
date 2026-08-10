package com.ffsensitivity.app.presentation.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.ffsensitivity.app.data.StylishNameCatalog
import com.ffsensitivity.app.data.StylishNameCatalog.GeneratedName
import com.ffsensitivity.app.data.remote.NamesRepository
import com.ffsensitivity.app.presentation.components.AtmosphereScaffold
import com.ffsensitivity.app.presentation.components.AppScreenHeader
import com.ffsensitivity.app.presentation.components.InlineErrorBanner
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.SafeOps
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private const val PAGE_SIZE = 20

private enum class StylishRetryKind {
    RELOAD_CATALOG,
    REGENERATE,
    GENERATE_BATCH,
    COPY
}

private data class StylishUiError(
    val code: String,
    val title: String,
    val message: String,
    val retryKind: StylishRetryKind? = null,
    val copyValue: String? = null
)

@Composable
fun StylishNameScreen(
    contentPadding: PaddingValues,
    onOpenMenu: () -> Boolean
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var catalogReady by remember { mutableStateOf(StylishNameCatalog.isLoaded) }
    var catalogFailed by remember { mutableStateOf(false) }
    var baseName by remember { mutableStateOf("") }
    var fontChoiceId by remember { mutableStateOf<String?>(null) }

    var usedValues by remember { mutableStateOf(setOf<String>()) }
    var roundItems by remember { mutableStateOf<List<GeneratedName>>(emptyList()) }
    var visibleCount by remember { mutableIntStateOf(0) }
    var roundIndex by remember { mutableIntStateOf(0) }
    var remainingUnique by remember { mutableIntStateOf(0) }
    var generating by remember { mutableStateOf(false) }
    var actionError by remember { mutableStateOf<StylishUiError?>(null) }

    fun clearError() {
        actionError = null
    }

    fun showError(
        code: String,
        title: String,
        message: String,
        retryKind: StylishRetryKind? = null,
        copyValue: String? = null
    ) {
        actionError = StylishUiError(code, title, message, retryKind, copyValue)
    }

    fun showBusy() {
        showError(
            code = "STYLISH_BUSY",
            title = "Please wait",
            message = "Styles are still generating. Try again in a moment."
        )
    }

    fun openMenuSafe() {
        if (generating) {
            showBusy()
            return
        }
        clearError()
        val ok = runCatching { onOpenMenu() }.getOrElse {
            AppLog.e("Stylish open menu crashed", it)
            false
        }
        if (!ok) {
            showError(
                code = "STYLISH_MENU_FAILED",
                title = "Menu unavailable",
                message = "Could not open the side menu. Try again."
            )
        }
    }

    fun applyRound(
        pool: List<GeneratedName>,
        resetUsed: Boolean,
        nextUsed: Set<String>,
        left: Int
    ) {
        if (resetUsed) usedValues = emptySet() else usedValues = nextUsed
        roundItems = pool
        visibleCount = minOf(PAGE_SIZE, pool.size)
        remainingUnique = left
        if (resetUsed) roundIndex = 1 else roundIndex += 1
    }

    suspend fun loadCatalog(): Boolean {
        // Local assets are enough to generate names. Nest sync is best-effort only —
        // never surface "Could not load" when offline catalog already works.
        return try {
            withContext(Dispatchers.IO) {
                StylishNameCatalog.ensureLoaded(context)
            }
            if (!StylishNameCatalog.isLoaded) {
                catalogFailed = true
                catalogReady = false
                showError(
                    code = "STYLISH_CATALOG_FAILED",
                    title = "Styles unavailable",
                    message = "Could not load stylish name fonts. Try again.",
                    retryKind = StylishRetryKind.RELOAD_CATALOG
                )
                return false
            }
            catalogFailed = false
            catalogReady = true
            clearError()
            // Nest sync must never flip the screen back into a load error.
            runCatching {
                withContext(Dispatchers.IO) {
                    NamesRepository.syncCatalog(context)
                }
            }.onFailure {
                if (it is kotlinx.coroutines.CancellationException) throw it
                AppLog.e("Stylish remote catalog sync failed — using offline fonts", it)
            }
            true
        } catch (t: Throwable) {
            if (t is kotlinx.coroutines.CancellationException) throw t
            AppLog.e("Stylish catalog load failed", t)
            if (StylishNameCatalog.isLoaded) {
                // Offline / local catalog OK — do not block search with a false error.
                catalogFailed = false
                catalogReady = true
                clearError()
                true
            } else {
                catalogFailed = true
                catalogReady = false
                showError(
                    code = "STYLISH_CATALOG_FAILED",
                    title = "Styles unavailable",
                    message = "Could not load stylish name fonts. Try again.",
                    retryKind = StylishRetryKind.RELOAD_CATALOG
                )
                false
            }
        }
    }

    suspend fun buildRoundSuspend(resetUsed: Boolean): List<GeneratedName> {
        val nameSnapshot = baseName
        val fontSnapshot = fontChoiceId
        val usedSnapshot = if (resetUsed) emptySet() else usedValues
        generating = true
        return runCatching {
            val (pool, left) = withContext(Dispatchers.Default) {
                StylishNameCatalog.ensureLoaded(context)
                val all = StylishNameCatalog.generateAll(nameSnapshot)
                val nextPool = StylishNameCatalog.pickUniqueBatch(
                    all = all,
                    usedValues = usedSnapshot,
                    fontChoiceId = fontSnapshot,
                    limit = StylishNameCatalog.maxBatchSize
                )
                val remaining = all
                    .filter { fontSnapshot == null || it.id.startsWith(fontSnapshot + "_") }
                    .count { it.value !in (usedSnapshot + nextPool.map { n -> n.value }.toSet()) }
                nextPool to remaining
            }
            if (nameSnapshot != baseName) return@runCatching emptyList()
            applyRound(
                pool = pool,
                resetUsed = resetUsed,
                nextUsed = usedSnapshot,
                left = left
            )
            pool
        }.getOrElse {
            if (it is kotlinx.coroutines.CancellationException) throw it
            AppLog.e("Stylish generate failed", it)
            showError(
                code = "STYLISH_GENERATE_FAILED",
                title = "Generate failed",
                message = "Could not build stylish names. Try again.",
                retryKind = if (resetUsed) StylishRetryKind.REGENERATE else StylishRetryKind.GENERATE_BATCH
            )
            emptyList()
        }.also {
            generating = false
        }
    }

    fun copyValueRetry(value: String) {
        val ok = SafeOps.copyText(context, "stylish_name", value)
        if (ok) {
            clearError()
            SafeOps.toast(context, "Copied")
        } else {
            showError(
                code = "STYLISH_COPY_FAILED",
                title = "Copy failed",
                message = "Could not copy to clipboard. Try again.",
                retryKind = StylishRetryKind.COPY,
                copyValue = value
            )
        }
    }

    fun copyName(item: GeneratedName) {
        if (generating) {
            showBusy()
            return
        }
        clearError()
        val count = StylishNameCatalog.charCount(item.value)
        if (!StylishNameCatalog.fitsFfLimit(item.value)) {
            showError(
                code = "STYLISH_OVER_LIMIT",
                title = "Too long for Free Fire",
                message = "This style is $count/${StylishNameCatalog.FF_NAME_MAX} characters. Pick a shorter one."
            )
            return
        }
        copyValueRetry(item.value)
    }

    fun generateNewBatch() {
        if (generating) {
            showBusy()
            return
        }
        if (baseName.isBlank()) return
        clearError()
        if (remainingUnique <= 0) {
            showError(
                code = "STYLISH_EXHAUSTED",
                title = "No more unique styles",
                message = "All unique styles for this name (and font filter) were already shown."
            )
            return
        }
        usedValues = usedValues + roundItems.map { it.value }.toSet()
        scope.launch {
            val pool = buildRoundSuspend(resetUsed = false)
            if (pool.isEmpty() && actionError == null) {
                showError(
                    code = "STYLISH_BATCH_EMPTY",
                    title = "No styles for this choice",
                    message = "No more unique styles for the selected font. Try All fonts or another name.",
                    retryKind = StylishRetryKind.GENERATE_BATCH
                )
            } else if (pool.isNotEmpty()) {
                SafeOps.toast(context, "New unique styles ready")
            }
        }
    }

    fun refreshRemainingForFont(id: String?) {
        scope.launch {
            runCatching {
                val nameSnapshot = baseName
                val usedSnapshot = usedValues
                val roundSnapshot = roundItems
                val left = withContext(Dispatchers.Default) {
                    val consumed = usedSnapshot + roundSnapshot.map { it.value }.toSet()
                    StylishNameCatalog.generateAll(nameSnapshot)
                        .filter { id == null || it.id.startsWith(id + "_") }
                        .count { it.value !in consumed }
                }
                if (nameSnapshot == baseName) remainingUnique = left
            }.onFailure {
                AppLog.e("Stylish font remaining count failed", it)
                showError(
                    code = "STYLISH_FONT_COUNT_FAILED",
                    title = "Couldn’t update font count",
                    message = "Font filter applied, but remaining count failed to refresh."
                )
            }
        }
    }

    fun runRetry(error: StylishUiError) {
        when (error.retryKind) {
            StylishRetryKind.RELOAD_CATALOG -> {
                scope.launch {
                    if (loadCatalog() && baseName.isNotBlank()) {
                        buildRoundSuspend(resetUsed = true)
                    }
                }
            }
            StylishRetryKind.REGENERATE -> {
                scope.launch {
                    clearError()
                    buildRoundSuspend(resetUsed = true)
                }
            }
            StylishRetryKind.GENERATE_BATCH -> generateNewBatch()
            StylishRetryKind.COPY -> error.copyValue?.let { copyValueRetry(it) }
            null -> Unit
        }
    }

    LaunchedEffect(Unit) {
        loadCatalog()
    }

    val listState = rememberLazyListState()
    var searchBarVisible by remember { mutableStateOf(true) }
    val searchBarScroll = remember {
        object : NestedScrollConnection {
            override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                val dy = available.y
                when {
                    dy < -10f -> searchBarVisible = false // scroll down → hide
                    dy > 10f -> searchBarVisible = true // scroll up → show
                }
                return Offset.Zero
            }
        }
    }
    LaunchedEffect(listState) {
        snapshotFlow {
            listState.firstVisibleItemIndex to listState.firstVisibleItemScrollOffset
        }.collect { (index, offset) ->
            if (index == 0 && offset <= 6) searchBarVisible = true
        }
    }

    // Debounce regenerate: typing each char used to set generating=true and disable the
    // name field → focus lost → keyboard closed after 1 character.
    LaunchedEffect(baseName, catalogReady) {
        if (!catalogReady) {
            searchBarVisible = true
            return@LaunchedEffect
        }
        if (baseName.isBlank()) {
            fontChoiceId = null
            usedValues = emptySet()
            roundItems = emptyList()
            visibleCount = 0
            roundIndex = 0
            remainingUnique = 0
            generating = false
            searchBarVisible = true
            clearError()
            return@LaunchedEffect
        }
        searchBarVisible = true
        delay(400)
        fontChoiceId = null
        clearError()
        buildRoundSuspend(resetUsed = true)
    }

    val roundCap = StylishNameCatalog.maxBatchSize
    val visible = roundItems.take(visibleCount.coerceAtMost(roundCap))
    val canShowMore =
        visibleCount < roundCap &&
        visibleCount < roundItems.size
    val reachedRoundCap =
        roundItems.isNotEmpty() &&
        (visibleCount >= roundCap || visibleCount >= roundItems.size)

    AtmosphereScaffold {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(contentPadding)
                .statusBarsPadding()
                .padding(horizontal = 20.dp)
                .padding(top = 8.dp)
        ) {
            AppScreenHeader(
                title = "Stylish Names",
                onOpenMenu = { openMenuSafe() },
                eyebrow = "NAME STUDIO",
                subtitle = "Premium FF tags — copy and paste into Free Fire."
            )

            actionError?.let { err ->
                InlineErrorBanner(
                    title = err.title,
                    message = err.message,
                    onDismiss = { clearError() },
                    retryLabel = if (err.retryKind != null) "Retry" else null,
                    onRetry = if (err.retryKind != null) {
                        { runRetry(err) }
                    } else {
                        null
                    }
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            if (catalogFailed && !catalogReady) {
                StylishNameHint("Stylish fonts failed to load. Use Retry above.")
            } else {
                AnimatedVisibility(
                    visible = searchBarVisible,
                    enter = fadeIn() + expandVertically(),
                    exit = fadeOut() + shrinkVertically()
                ) {
                    Column {
                        StylishNameComposer(
                            baseName = baseName,
                            onBaseNameChange = { raw ->
                                clearError()
                                baseName = raw.filter { !it.isWhitespace() }.take(12)
                            },
                            catalogReady = catalogReady
                        )
                        Spacer(modifier = Modifier.height(14.dp))
                    }
                }

                when {
                    !catalogReady -> StylishNameHint("Loading stylish fonts…")
                    baseName.isBlank() -> Unit
                    generating && visible.isEmpty() -> {
                        StylishNameHint("Generating unique styles…")
                    }
                    visible.isEmpty() -> {
                        StylishNameHint("No styles in this batch.")
                    }
                    else -> {
                        LazyColumn(
                            state = listState,
                            modifier = Modifier
                                .fillMaxSize()
                                .nestedScroll(searchBarScroll),
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            contentPadding = PaddingValues(bottom = 28.dp)
                        ) {
                            items(visible, key = { it.id + "_" + it.value }) { item ->
                                StylishNameResultRow(
                                    item = item,
                                    onCopy = { copyName(item) }
                                )
                            }

                            if (canShowMore) {
                                item {
                                    StylishNameShowMoreButton {
                                        runCatching {
                                            visibleCount = minOf(
                                                visibleCount + PAGE_SIZE,
                                                roundCap,
                                                roundItems.size
                                            )
                                        }.onFailure {
                                            AppLog.e("Stylish show more failed", it)
                                            showError(
                                                code = "STYLISH_SHOW_MORE_FAILED",
                                                title = "Couldn’t show more",
                                                message = "Try again in a moment."
                                            )
                                        }
                                    }
                                }
                            }

                            if (reachedRoundCap) {
                                item {
                                    StylishNameBatchCard(
                                        selectedFontId = fontChoiceId,
                                        onSelectFont = { id ->
                                            fontChoiceId = id
                                            refreshRemainingForFont(id)
                                        },
                                        hasMore = remainingUnique > 0 && !generating,
                                        onGenerate = { generateNewBatch() }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
