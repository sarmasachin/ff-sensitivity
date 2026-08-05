package com.ffsensitivity.app.presentation.screens.login

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.Ember

/** Soft tactical glow — login atmosphere only. */
@Composable
fun LoginAtmosphere() {
    Canvas(modifier = Modifier.fillMaxSize()) {
        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(Amber.copy(alpha = 0.22f), Color.Transparent),
                center = Offset(size.width * 0.82f, size.height * 0.08f),
                radius = size.minDimension * 0.9f
            ),
            radius = size.minDimension * 0.9f,
            center = Offset(size.width * 0.82f, size.height * 0.08f)
        )
        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(Ember.copy(alpha = 0.12f), Color.Transparent),
                center = Offset(size.width * 0.12f, size.height * 0.72f),
                radius = size.minDimension * 0.75f
            ),
            radius = size.minDimension * 0.75f,
            center = Offset(size.width * 0.12f, size.height * 0.72f)
        )
        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(Color.White.copy(alpha = 0.04f), Color.Transparent),
                center = Offset(size.width * 0.5f, size.height * 0.45f),
                radius = size.minDimension * 0.55f
            ),
            radius = size.minDimension * 0.55f,
            center = Offset(size.width * 0.5f, size.height * 0.45f)
        )
    }
}
