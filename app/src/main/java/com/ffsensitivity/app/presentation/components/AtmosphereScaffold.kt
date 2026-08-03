package com.ffsensitivity.app.presentation.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.Ember
import com.ffsensitivity.app.presentation.theme.VoidBlack

@Composable
fun AtmosphereScaffold(content: @Composable BoxScope.() -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(VoidBlack)
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(Amber.copy(alpha = 0.18f), Color.Transparent),
                    center = Offset(size.width * 0.85f, size.height * -0.05f),
                    radius = size.minDimension * 0.95f
                ),
                radius = size.minDimension * 0.95f,
                center = Offset(size.width * 0.85f, size.height * -0.05f)
            )
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(Ember.copy(alpha = 0.10f), Color.Transparent),
                    center = Offset(size.width * 0.1f, size.height * 0.35f),
                    radius = size.minDimension * 0.7f
                ),
                radius = size.minDimension * 0.7f,
                center = Offset(size.width * 0.1f, size.height * 0.35f)
            )
        }
        content()
    }
}
