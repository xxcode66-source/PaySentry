package com.paysentry.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val PaySentryDarkColors = darkColorScheme(
    primary = Cyan,
    onPrimary = Ink,
    secondary = Violet,
    onSecondary = Ink,
    background = Ink,
    onBackground = TextPrimary,
    surface = Ink900,
    onSurface = TextPrimary,
    surfaceVariant = Ink800,
    onSurfaceVariant = TextSecondary,
    error = Red,
    onError = Ink,
)

@Composable
fun PaySentryTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = PaySentryDarkColors,
        shapes = PaySentryShapes,
        content = content
    )
}