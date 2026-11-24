package com.ffsensitivity.app.data

import android.content.Context
import com.ffsensitivity.app.data.remote.CompareRepository
import com.ffsensitivity.app.data.remote.ProMaxOffsetPayload
import com.ffsensitivity.app.util.AppLog

/**
 * Deep peer offsets for One Tap Premium only — role forced to One-Tap Headshot.
 * Uses a separate disk cache from Pro Max (peer bucket stays isolated).
 * Classic / Best / Pro Max never call this.
 */
object OneTapCrowdOffsetLoader {
    private const val GEN = 8
    private const val SCOPE = 8
    private const val FIRE = 3
    private const val SHARE_W_MAX = 0.24

    /** Always the One-Tap Headshot peer bucket. */
    val FORCED_ROLE: String = PlayerRole.ONE_TAP.label

    fun resolve(
        context: Context,
        device: DeviceInfo,
        fingers: String,
        dpiPreference: String,
        screenGuard: String
    ): ProMaxCrowdOffsets {
        val f = fingers.trim()
        val r = FORCED_ROLE
        val label = device.deviceLabel.trim()
        val panelHz = device.maxRefreshRateHz.coerceAtLeast(device.refreshRateHz)
        val payload = CompareRepository.promaxOffset(
            context = context,
            fingers = f,
            role = r,
            deviceLabel = label,
            ramGb = device.ramGb,
            processorBrand = device.processorBrand.trim(),
            processorType = device.processorType.trim(),
            gpuLabel = device.gpuLabel.trim(),
            gpuVendor = device.gpuVendor.trim(),
            dpiPreference = dpiPreference.trim(),
            screenGuard = screenGuard.trim(),
            refreshHz = panelHz,
            // Strict One Tap Premium peer bucket — never mix Pro Max / legacy.
            engine = "one_tap"
        ).onFailure {
            AppLog.e("OneTap deep crowd resolve failed", it)
        }.getOrNull()

        if (payload != null) {
            val mapped = mapPayload(payload)
            OneTapCrowdOffsetCache.save(context, label, f, r, mapped)
            return mapped
        }

        val cached = OneTapCrowdOffsetCache.load(context, label, f, r)
        if (cached != null) {
            AppLog.w(
                "OneTap crowd using last-good cache from=${cached.matchFrom} " +
                    "n=${cached.matchCount}"
            )
            return cached
        }
        return ProMaxCrowdOffsets()
    }

    private fun mapPayload(payload: ProMaxOffsetPayload): ProMaxCrowdOffsets {
        val o = payload.offsets
        val community = payload.community?.let { c ->
            ProMaxCommunityPull(
                general = c.averages.general.coerceIn(50, 200),
                redDot = c.averages.redDot.coerceIn(40, 200),
                scope2x = c.averages.scope2x.coerceIn(30, 200),
                scope4x = c.averages.scope4x.coerceIn(20, 200),
                sniper = c.averages.sniper.coerceIn(20, 150),
                freeLook = c.averages.freeLook.coerceIn(20, 200),
                weight = c.weight.coerceIn(0.0, SHARE_W_MAX),
                matchCount = c.n,
                source = c.source
            )
        } ?: ProMaxCommunityPull()
        val fa = payload.fieldAgreement
        return ProMaxCrowdOffsets(
            general = o.general.coerceIn(-GEN, GEN),
            redDot = o.redDot.coerceIn(-SCOPE, SCOPE),
            scope2x = o.scope2x.coerceIn(-SCOPE, SCOPE),
            scope4x = o.scope4x.coerceIn(-SCOPE, SCOPE),
            sniper = o.sniper.coerceIn(-SCOPE, SCOPE),
            freeLook = o.freeLook.coerceIn(-SCOPE, SCOPE),
            fireButton = o.fireButton.coerceIn(-FIRE, FIRE),
            matchFrom = payload.offsetFrom,
            matchCount = payload.matchCount,
            confidence = payload.confidence,
            blendFrom = payload.blendFrom.trim(),
            fieldAgreement = ProMaxFieldAgreement(
                general = fa.general.coerceIn(0.0, 1.0),
                redDot = fa.redDot.coerceIn(0.0, 1.0),
                scope2x = fa.scope2x.coerceIn(0.0, 1.0),
                scope4x = fa.scope4x.coerceIn(0.0, 1.0),
                sniper = fa.sniper.coerceIn(0.0, 1.0),
                freeLook = fa.freeLook.coerceIn(0.0, 1.0),
                fireButton = fa.fireButton.coerceIn(0.0, 1.0)
            ),
            community = community,
            shareConflict = ProMaxShareConflictKnobs(
                softGap = payload.shareConflict.softGap.coerceIn(0.0, 50.0),
                hardGap = payload.shareConflict.hardGap.coerceIn(1.0, 100.0),
                maxShrink = payload.shareConflict.maxShrink.coerceIn(0.0, 0.95)
            )
        )
    }
}
