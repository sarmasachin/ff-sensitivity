package com.ffsensitivity.app.presentation.screens

import androidx.activity.compose.BackHandler
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
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Speed
import androidx.compose.material.icons.outlined.TouchApp
import androidx.compose.material.icons.outlined.WorkspacePremium
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import com.ffsensitivity.app.ads.CalculateRewardedAds
import com.ffsensitivity.app.ads.findActivity
import com.ffsensitivity.app.data.PremiumAdConfig
import com.ffsensitivity.app.data.PremiumAdStore
import com.ffsensitivity.app.data.remote.EconomyPremiumUnlockPrices
import com.ffsensitivity.app.data.remote.EconomyRepository
import com.ffsensitivity.app.data.remote.userMessage
import com.ffsensitivity.app.presentation.components.AtmosphereScaffold
import com.ffsensitivity.app.presentation.components.InlineErrorBanner
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.AmberHot
import com.ffsensitivity.app.presentation.theme.Danger
import com.ffsensitivity.app.presentation.theme.Ember
import com.ffsensitivity.app.presentation.theme.Hairline
import com.ffsensitivity.app.presentation.theme.HairlineStrong
import com.ffsensitivity.app.presentation.theme.InkPrimary
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.presentation.theme.SurfaceLift
import com.ffsensitivity.app.util.AppLog
import java.util.UUID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class PremiumUnlockOption(
    val id: String,
    val title: String,
    val icon: ImageVector,
    val accent: Color
)

private val premiumUnlockOptions = listOf(
    PremiumUnlockOption(
        id = "best_premium",
        title = "Best Premium Sensi Unlock",
        icon = Icons.Outlined.Speed,
        accent = Amber
    ),
    PremiumUnlockOption(
        id = "premium_pro",
        title = "Premium Sensi Pro Unlock",
        icon = Icons.Outlined.WorkspacePremium,
        accent = AmberHot
    ),
    PremiumUnlockOption(
        id = "one_tap_premium",
        title = "One Tap Premium Sensi Unlock",
        icon = Icons.Outlined.TouchApp,
        accent = Ember
    ),
    PremiumUnlockOption(
        id = "daily_challenge",
        title = "Daily Challenge",
        icon = Icons.Outlined.EmojiEvents,
        accent = Danger
    )
)

private enum class PremiumUnlockTarget {
    BEST_PREMIUM,
    PREMIUM_PRO_MAX,
    ONE_TAP_PREMIUM
}

@Composable
fun PremiumSensiUnlockScreen(
    contentPadding: PaddingValues,
    onBack: () -> Boolean,
    onBestPremiumUnlocked: () -> Boolean = { false },
    onPremiumProMaxUnlocked: () -> Boolean = { false },
    onOneTapPremiumUnlocked: () -> Boolean = { false },
    onOpenDailyChallenge: () -> Boolean = { false }
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var backError by remember { mutableStateOf<String?>(null) }
    var unlockTarget by remember { mutableStateOf<PremiumUnlockTarget?>(null) }
    var unlockBusy by remember { mutableStateOf(false) }
    var unlockError by remember { mutableStateOf<String?>(null) }
    var navError by remember { mutableStateOf<String?>(null) }
    var unlockPrices by remember {
        mutableStateOf(EconomyPremiumUnlockPrices.DEFAULT)
    }

    LaunchedEffect(Unit) {
        val remote = withContext(Dispatchers.IO) {
            EconomyRepository.premiumUnlockPrices(context).getOrNull()
        }
        if (remote != null) unlockPrices = remote
    }

    val showAdUnlock =
        unlockPrices.adUnlockEnabled && PremiumAdConfig.enabled

    // Warm PREMIUM slot while user browses the list (before dialog open).
    LaunchedEffect(showAdUnlock) {
        if (showAdUnlock) {
            CalculateRewardedAds.preload(context, CalculateRewardedAds.Slot.PREMIUM)
        }
    }

    fun backSafe() {
        if (unlockBusy) return
        backError = null
        val ok = runCatching { onBack() }.getOrElse {
            AppLog.e("Premium sensi unlock back crashed", it)
            false
        }
        if (!ok) {
            backError = "Couldn’t go back. Try again."
        }
    }

    fun openUnlock(target: PremiumUnlockTarget) {
        if (unlockBusy) return
        unlockError = null
        unlockTarget = target
        if (showAdUnlock) {
            CalculateRewardedAds.preload(context, CalculateRewardedAds.Slot.PREMIUM)
        }
    }

    fun dismissUnlock() {
        if (unlockBusy) return
        unlockTarget = null
        unlockError = null
    }

    fun startUnlockedFlow(target: PremiumUnlockTarget) {
        val nav = when (target) {
            PremiumUnlockTarget.BEST_PREMIUM -> onBestPremiumUnlocked
            PremiumUnlockTarget.PREMIUM_PRO_MAX -> onPremiumProMaxUnlocked
            PremiumUnlockTarget.ONE_TAP_PREMIUM -> onOneTapPremiumUnlocked
        }
        val ok = runCatching { nav() }.getOrElse {
            AppLog.e("Premium unlock navigate crashed target=$target", it)
            false
        }
        if (!ok) {
            unlockError = "Unlocked, but couldn’t open Premium sensi. Try again."
            unlockTarget = target
        }
    }

    fun unlockSubtitle(): String {
        val coin = unlockPrices.coinUnlockEnabled
        val ad = showAdUnlock
        return when {
            coin && ad ->
                "Pick coins or a short ad — unlock the same Premium sensi."
            coin -> "Spend coins to unlock Premium sensi."
            ad -> "Watch a short ad to unlock Premium sensi."
            else -> "Unlock is temporarily unavailable."
        }
    }

    fun unlockWithCoins(target: PremiumUnlockTarget) {
        if (unlockBusy) return
        if (!unlockPrices.coinUnlockEnabled) {
            unlockError = "Coin unlock is off. Try watch ad."
            return
        }
        unlockBusy = true
        unlockError = null
        val product = when (target) {
            PremiumUnlockTarget.BEST_PREMIUM -> "best_premium"
            PremiumUnlockTarget.PREMIUM_PRO_MAX -> "premium_pro_max"
            PremiumUnlockTarget.ONE_TAP_PREMIUM -> "one_tap_premium"
        }
        val requestId = "pu-${UUID.randomUUID()}"
        scope.launch {
            val result = withContext(Dispatchers.IO) {
                EconomyRepository.premiumUnlock(context, product, requestId)
            }
            unlockBusy = false
            result.fold(
                onSuccess = {
                    AppLog.i(
                        "PREMIUM_UNLOCK_PAID|product=$product|cost=${it.cost}|" +
                            "coins=${it.coins}|idem=${if (it.alreadyApplied) 1 else 0}"
                    )
                    PremiumAdStore.markRewarded(context)
                    unlockTarget = null
                    unlockError = null
                    startUnlockedFlow(target)
                },
                onFailure = { err ->
                    AppLog.e("Premium coin unlock failed target=$target", err)
                    unlockError = err.userMessage(
                        "Could not spend coins. Please try again."
                    )
                }
            )
        }
    }

    fun unlockWithAd(target: PremiumUnlockTarget) {
        if (unlockBusy) return
        if (!showAdUnlock) {
            unlockError = "Watch-ad unlock is turned off. Try coins instead."
            return
        }
        val activity = context.findActivity()
        if (activity == null) {
            unlockError = "Couldn’t open the ad right now. Please try again."
            return
        }
        unlockBusy = true
        unlockError = null
        CalculateRewardedAds.show(
            activity = activity,
            slot = CalculateRewardedAds.Slot.PREMIUM,
            onRewarded = {
                PremiumAdStore.markRewarded(context)
                unlockBusy = false
                unlockTarget = null
                unlockError = null
                startUnlockedFlow(target)
            },
            onNotCompleted = { message ->
                unlockBusy = false
                unlockError = message
            },
            incompleteMessage = PremiumAdConfig.incompleteMessage
        )
    }

    BackHandler {
        if (unlockTarget != null) dismissUnlock() else backSafe()
    }

    when (val target = unlockTarget) {
        PremiumUnlockTarget.BEST_PREMIUM -> PremiumBestUnlockDialog(
            busy = unlockBusy,
            errorMessage = unlockError,
            onDismiss = { dismissUnlock() },
            onUnlockCoins = { unlockWithCoins(target) },
            onWatchAd = { unlockWithAd(target) },
            title = "Best Premium Sensi Unlock",
            eyebrow = "PREMIUM UNLOCK",
            subtitle = unlockSubtitle(),
            coinCost = unlockPrices.bestPremium,
            showCoinUnlock = unlockPrices.coinUnlockEnabled,
            showAdUnlock = showAdUnlock
        )
        PremiumUnlockTarget.PREMIUM_PRO_MAX -> PremiumBestUnlockDialog(
            busy = unlockBusy,
            errorMessage = unlockError,
            onDismiss = { dismissUnlock() },
            onUnlockCoins = { unlockWithCoins(target) },
            onWatchAd = { unlockWithAd(target) },
            title = "Premium Sensi Pro Unlock",
            eyebrow = "PRO MAX UNLOCK",
            subtitle = unlockSubtitle(),
            coinCost = unlockPrices.premiumProMax,
            showCoinUnlock = unlockPrices.coinUnlockEnabled,
            showAdUnlock = showAdUnlock
        )
        PremiumUnlockTarget.ONE_TAP_PREMIUM -> PremiumBestUnlockDialog(
            busy = unlockBusy,
            errorMessage = unlockError,
            onDismiss = { dismissUnlock() },
            onUnlockCoins = { unlockWithCoins(target) },
            onWatchAd = { unlockWithAd(target) },
            title = "One Tap Premium Sensi Unlock",
            eyebrow = "ONE TAP UNLOCK",
            subtitle = unlockSubtitle(),
            coinCost = unlockPrices.oneTapPremium,
            showCoinUnlock = unlockPrices.coinUnlockEnabled,
            showAdUnlock = showAdUnlock
        )
        null -> Unit
    }

    AtmosphereScaffold {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(contentPadding)
                .statusBarsPadding(),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            item {
                PremiumUnlockTopBar(onBack = { backSafe() })
            }

            backError?.let { msg ->
                item(key = "premium_unlock_back_err") {
                    InlineErrorBanner(
                        title = "Navigation failed",
                        message = msg,
                        onDismiss = { backError = null }
                    )
                }
            }

            navError?.let { msg ->
                item(key = "premium_unlock_nav_err") {
                    InlineErrorBanner(
                        title = "Couldn’t open",
                        message = msg,
                        onDismiss = { navError = null }
                    )
                }
            }

            items(
                items = premiumUnlockOptions,
                key = { it.id }
            ) { option ->
                PremiumUnlockOptionCard(
                    option = option,
                    onClick = {
                        when (option.id) {
                            "best_premium" -> openUnlock(PremiumUnlockTarget.BEST_PREMIUM)
                            "premium_pro" -> openUnlock(PremiumUnlockTarget.PREMIUM_PRO_MAX)
                            "one_tap_premium" -> openUnlock(PremiumUnlockTarget.ONE_TAP_PREMIUM)
                            "daily_challenge" -> {
                                if (unlockBusy) return@PremiumUnlockOptionCard
                                navError = null
                                val ok = runCatching { onOpenDailyChallenge() }.getOrElse {
                                    AppLog.e("Open Daily Challenge from premium unlock failed", it)
                                    false
                                }
                                if (!ok) {
                                    navError = "Daily Challenge isn’t available right now."
                                }
                            }
                            else -> Unit
                        }
                    }
                )
            }

            item {
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

@Composable
private fun PremiumUnlockTopBar(onBack: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(42.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(SurfaceLift)
                .border(1.dp, Hairline, RoundedCornerShape(14.dp))
                .clickable(onClick = onBack),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.AutoMirrored.Outlined.ArrowBack,
                contentDescription = "Back",
                tint = InkPrimary
            )
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "PREMIUM",
                color = Amber,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.8.sp
            )
            Text(
                text = "Unlock Premium Pro Sensitivity",
                color = InkPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
        Icon(
            imageVector = Icons.Outlined.Lock,
            contentDescription = null,
            tint = AmberHot,
            modifier = Modifier.size(22.dp)
        )
    }
}

@Composable
private fun PremiumUnlockOptionCard(
    option: PremiumUnlockOption,
    onClick: () -> Unit
) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.985f else 1f,
        animationSpec = tween(120),
        label = "premiumUnlockCardScale"
    )

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .scale(scale)
            .clip(RoundedCornerShape(22.dp))
            .border(1.dp, HairlineStrong, RoundedCornerShape(22.dp))
            .background(Brush.linearGradient(listOf(SurfaceLift, SurfaceCard)))
            .clickable(
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
                .background(option.accent)
        )
        Spacer(modifier = Modifier.width(14.dp))
        Box(
            modifier = Modifier
                .size(52.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(option.accent.copy(alpha = 0.14f))
                .border(1.dp, option.accent.copy(alpha = 0.35f), RoundedCornerShape(16.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = option.icon,
                contentDescription = null,
                tint = option.accent,
                modifier = Modifier.size(26.dp)
            )
        }
        Spacer(modifier = Modifier.width(14.dp))
        Text(
            text = option.title,
            color = InkPrimary,
            fontSize = 18.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.weight(1f)
        )
        Icon(
            imageVector = Icons.Outlined.ChevronRight,
            contentDescription = null,
            tint = InkPrimary.copy(alpha = 0.45f)
        )
    }
}
