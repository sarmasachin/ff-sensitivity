package com.ffsensitivity.app.presentation.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AspectRatio
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.Gamepad
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.ShoppingBag
import androidx.compose.material.icons.outlined.Speed
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.AppLinks
import com.ffsensitivity.app.data.RatePromptStore
import com.ffsensitivity.app.data.remote.AppConfigRepository
import com.ffsensitivity.app.data.remote.CopyRepository
import com.ffsensitivity.app.data.remote.DeviceRepository
import com.ffsensitivity.app.data.remote.PromoCatalogCache
import com.ffsensitivity.app.data.remote.PromoPayload
import com.ffsensitivity.app.data.remote.PromoRepository
import com.ffsensitivity.app.data.remote.PushRepository
import com.ffsensitivity.app.presentation.components.AppScreenHeader
import com.ffsensitivity.app.presentation.components.AtmosphereScaffold
import com.ffsensitivity.app.presentation.components.InlineErrorBanner
import com.ffsensitivity.app.presentation.components.RatePromptDialog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.AmberHot
import com.ffsensitivity.app.presentation.theme.Danger
import com.ffsensitivity.app.presentation.theme.Ember
import com.ffsensitivity.app.presentation.theme.HairlineStrong
import com.ffsensitivity.app.presentation.theme.InfoBlue
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.InkSecondary
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.presentation.theme.SurfaceLift
import com.ffsensitivity.app.presentation.theme.Success
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.SafeOps

data class HomeFeature(
    val id: String,
    val title: String,
    val subtitle: String,
    val icon: ImageVector,
    val accent: Color
)

/** Stable route ids Home is allowed to open. */
private val AllowedHomeFeatureIds = setOf(
    "sensi",
    "hud",
    "graphics",
    "dpi",
    "share_sensi",
    "coin_shop",
    "daily_challenge"
)

private val defaultHomeFeatures = listOf(
    HomeFeature(
        id = "sensi",
        title = "Best Sensitivity",
        subtitle = "Sensitivity tuned to your RAM, Hz & playstyle.",
        icon = Icons.Outlined.Speed,
        accent = Amber
    ),
    HomeFeature(
        id = "hud",
        title = "Custom HUD",
        subtitle = "Fire, Gloo & action sizes from screen inches + fingers.",
        icon = Icons.Outlined.Gamepad,
        accent = Ember
    ),
    HomeFeature(
        id = "graphics",
        title = "Graphics Settings",
        subtitle = "Smooth / Standard / Ultra mapped to device RAM.",
        icon = Icons.Outlined.Tune,
        accent = InfoBlue
    ),
    HomeFeature(
        id = "dpi",
        title = "DPI & Resolution",
        subtitle = "Safe gaming DPI limits — avoid crash & black screen.",
        icon = Icons.Outlined.AspectRatio,
        accent = Success
    ),
    HomeFeature(
        id = "share_sensi",
        title = "Share Your Sensitivity Settings",
        subtitle = "Share your tuned settings with friends in one tap.",
        icon = Icons.Outlined.Share,
        accent = AmberHot
    ),
    HomeFeature(
        id = "coin_shop",
        title = "Coin Shop",
        subtitle = "Spend coins on rewards, packs & unlocks.",
        icon = Icons.Outlined.ShoppingBag,
        accent = Amber
    ),
    HomeFeature(
        id = "daily_challenge",
        title = "Daily Challenge",
        subtitle = "Check-in, daily quiz & earn coins for rewards.",
        icon = Icons.Outlined.EmojiEvents,
        accent = Danger
    )
)

private data class HomeUiError(
    val code: String,
    val title: String,
    val message: String,
    val retryFeature: HomeFeature? = null
)

/**
 * @param onFeatureClick return true if navigation started successfully; false to show in-page error.
 * @param onOpenMenu return true if drawer opened (or launch accepted); false for banner.
 * @param onPromoDeepLink return true if promo deep-link navigation started.
 */
@Composable
fun HomeScreen(
    contentPadding: PaddingValues,
    onOpenMenu: () -> Boolean,
    onFeatureClick: (HomeFeature) -> Boolean,
    onPromoDeepLink: (String) -> Boolean = { false }
) {
    val context = LocalContext.current
    var actionError by remember { mutableStateOf<HomeUiError?>(null) }
    var isOpening by remember { mutableStateOf(false) }
    var banners by remember { mutableStateOf(PromoCatalogCache.banners()) }
    var strips by remember { mutableStateOf(PromoCatalogCache.strips()) }
    var configRev by remember { mutableStateOf(0) }
    var showRatePrompt by remember { mutableStateOf(false) }
    val rateStore = remember { RatePromptStore(context) }

    LaunchedEffect(Unit) {
        withContext(Dispatchers.IO) {
            AppConfigRepository.syncLive()
            CopyRepository.syncLive()
            // Register FCM before heartbeat so pushEnabled is restored first
            // (heartbeat only sees enabled tokens).
            PushRepository.registerAndSync(context)
            DeviceRepository.syncHeartbeat(context)
            PromoRepository.syncLive()
        }
        banners = PromoCatalogCache.banners()
        strips = PromoCatalogCache.strips()
        configRev += 1
        rateStore.bumpSession()
        showRatePrompt = CopyRepository.shouldShowRatePrompt(
            sessionCount = rateStore.sessionCount(),
            dismissed = rateStore.dismissed()
        )
    }

    if (showRatePrompt) {
        val rate = CopyRepository.snapshot().rate
        RatePromptDialog(
            rate = rate,
            onPrimary = {
                rateStore.markRated()
                showRatePrompt = false
                runCatching {
                    val ok = SafeOps.openUrl(context, AppLinks.PLAY_STORE)
                    if (!ok) SafeOps.toast(context, "Could not open Play Store")
                }.onFailure {
                    AppLog.e("Rate prompt Play Store failed", it)
                }
            },
            onSecondary = {
                rateStore.dismiss()
                showRatePrompt = false
            }
        )
    }

    val featuresLoad = remember(configRev) {
        runCatching {
            defaultHomeFeatures
                .filter { it.id in AllowedHomeFeatureIds }
                .filter { it.id.isNotBlank() && !it.id.contains('/') && !it.id.contains('.') }
                .filter { AppConfigRepository.homeTileVisible(it.id) }
                .distinctBy { it.id }
        }
    }
    val features = featuresLoad.getOrElse {
        AppLog.e("Home feature catalog failed", it)
        emptyList()
    }
    val catalogError = when {
        featuresLoad.isFailure -> HomeUiError(
            code = "HOME_CATALOG_FAILED",
            title = "Home unavailable",
            message = "Could not load tools on this screen. Restart the app and try again."
        )
        features.isEmpty() -> HomeUiError(
            code = "HOME_CATALOG_EMPTY",
            title = "No tools available",
            message = "No tools to show. Restart the app and try again."
        )
        else -> null
    }

    fun clearActionError() {
        actionError = null
    }

    fun showOpenFailed(feature: HomeFeature) {
        actionError = HomeUiError(
            code = "HOME_OPEN_FAILED",
            title = "Couldn’t open ${feature.title}",
            message = "Couldn’t open this tool. Try again.",
            retryFeature = feature
        )
    }

    fun showInvalidFeature(feature: HomeFeature) {
        actionError = HomeUiError(
            code = "HOME_FEATURE_INVALID",
            title = "Tool unavailable",
            message = "“${feature.title}” is not available right now.",
            retryFeature = null
        )
        AppLog.w("Blocked invalid home feature id=${feature.id}")
    }

    fun showBusy() {
        actionError = HomeUiError(
            code = "HOME_BUSY",
            title = "Please wait",
            message = "Another screen is already opening. Try again in a moment.",
            retryFeature = null
        )
    }

    fun openFeature(feature: HomeFeature) {
        if (isOpening) {
            showBusy()
            return
        }
        clearActionError()
        if (feature.id !in AllowedHomeFeatureIds ||
            feature.id.contains('/') ||
            feature.id.contains('.')
        ) {
            showInvalidFeature(feature)
            return
        }
        isOpening = true
        val ok = runCatching { onFeatureClick(feature) }
            .getOrElse {
                AppLog.e("Home feature click crashed id=${feature.id}", it)
                false
            }
        isOpening = false
        if (!ok) showOpenFailed(feature)
    }

    fun openMenuSafe() {
        if (isOpening) {
            showBusy()
            return
        }
        clearActionError()
        val ok = runCatching { onOpenMenu() }
            .getOrElse {
                AppLog.e("Home open menu crashed", it)
                false
            }
        if (!ok) {
            actionError = HomeUiError(
                code = "HOME_MENU_FAILED",
                title = "Menu unavailable",
                message = "Could not open the side menu. Try again.",
                retryFeature = null
            )
        }
    }

    fun openPromo(promo: PromoPayload) {
        if (isOpening) {
            showBusy()
            return
        }
        clearActionError()
        isOpening = true
        val ok = runCatching { onPromoDeepLink(promo.deepLink) }
            .getOrElse {
                AppLog.e("Home promo click crashed id=${promo.id}", it)
                false
            }
        isOpening = false
        if (!ok) {
            actionError = HomeUiError(
                code = "HOME_PROMO_FAILED",
                title = "Couldn’t open promo",
                message = "This promo link isn’t available right now.",
                retryFeature = null
            )
        }
    }

    AtmosphereScaffold {
        when {
            catalogError != null -> {
                HomeCatalogError(
                    contentPadding = contentPadding,
                    error = catalogError,
                    onOpenMenu = { openMenuSafe() }
                )
            }
            else -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(contentPadding)
                        .statusBarsPadding(),
                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    item {
                        AppScreenHeader(
                            title = "FF Sensitivity Settings",
                            onOpenMenu = { openMenuSafe() },
                            brandAiTitle = true
                        )
                    }

                    if (banners.isNotEmpty()) {
                        item(key = "home_promo_banners") {
                            HomePromoBanners(
                                banners = banners,
                                onOpen = { openPromo(it) }
                            )
                        }
                    }
                    if (strips.isNotEmpty()) {
                        item(key = "home_promo_strips") {
                            HomePromoStrips(
                                strips = strips,
                                onOpen = { openPromo(it) }
                            )
                        }
                    }

                    actionError?.let { err ->
                        item(key = "home_error_${err.code}") {
                            InlineErrorBanner(
                                title = err.title,
                                message = err.message,
                                onDismiss = { clearActionError() },
                                retryLabel = if (err.retryFeature != null) "Retry" else null,
                                onRetry = err.retryFeature?.let { feature ->
                                    { openFeature(feature) }
                                }
                            )
                        }
                    }

                    items(
                        items = features,
                        key = { it.id }
                    ) { feature ->
                        FeatureCard(
                            feature = feature,
                            enabled = !isOpening,
                            onClick = { openFeature(feature) }
                        )
                    }

                    item {
                        Spacer(modifier = Modifier.height(24.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun HomeCatalogError(
    contentPadding: PaddingValues,
    error: HomeUiError,
    onOpenMenu: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(contentPadding)
            .statusBarsPadding()
            .padding(horizontal = 20.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        AppScreenHeader(
            title = "FF Sensitivity Settings",
            onOpenMenu = onOpenMenu,
            brandAiTitle = true
        )
        Spacer(modifier = Modifier.height(24.dp))
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(SurfaceCard)
                .border(1.dp, HairlineStrong, RoundedCornerShape(16.dp))
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = error.title,
                color = InkPrimary,
                fontSize = 17.sp,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = error.message,
                color = InkSecondary,
                fontSize = 13.sp,
                lineHeight = 18.sp,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
private fun FeatureCard(
    feature: HomeFeature,
    enabled: Boolean,
    onClick: () -> Unit
) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed && enabled) 0.985f else 1f,
        animationSpec = tween(120),
        label = "cardScale"
    )

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .scale(scale)
            .clip(RoundedCornerShape(22.dp))
            .border(1.dp, HairlineStrong, RoundedCornerShape(22.dp))
            .background(Brush.linearGradient(listOf(SurfaceLift, SurfaceCard)))
            .clickable(
                enabled = enabled,
                interactionSource = interaction,
                indication = null,
                onClick = onClick
            )
            .padding(start = 0.dp, end = 16.dp, top = 16.dp, bottom = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .width(4.dp)
                .height(48.dp)
                .clip(RoundedCornerShape(topEnd = 4.dp, bottomEnd = 4.dp))
                .background(feature.accent.copy(alpha = if (enabled) 1f else 0.45f))
        )
        Spacer(modifier = Modifier.width(14.dp))
        Box(
            modifier = Modifier
                .size(52.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(feature.accent.copy(alpha = 0.14f))
                .border(1.dp, feature.accent.copy(alpha = 0.35f), RoundedCornerShape(16.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = feature.icon,
                contentDescription = null,
                tint = feature.accent.copy(alpha = if (enabled) 1f else 0.5f),
                modifier = Modifier.size(26.dp)
            )
        }
        Spacer(modifier = Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = feature.title,
                color = InkPrimary.copy(alpha = if (enabled) 1f else 0.55f),
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = feature.subtitle,
                color = InkSecondary,
                fontSize = 12.sp,
                lineHeight = 17.sp
            )
        }
        Icon(
            imageVector = Icons.Outlined.ChevronRight,
            contentDescription = null,
            tint = AmberHot.copy(alpha = if (enabled) 0.7f else 0.35f)
        )
    }
}
