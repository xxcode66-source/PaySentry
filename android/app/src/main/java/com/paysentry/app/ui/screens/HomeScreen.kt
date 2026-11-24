package com.paysentry.app.ui.screens

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.weight
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.paysentry.app.ui.theme.Cyan
import com.paysentry.app.ui.theme.Ink
import com.paysentry.app.ui.theme.Violet

/**
 * Landing / home screen with an animated gradient hero.
 * Self-contained so it compiles standalone.
 */
@Composable
fun HomeScreen(onCheckBalance: () -> Unit) {
    val transition = rememberInfiniteTransition(label = "hero")
    val pulse by transition.animateFloat(
        initialValue = 0.55f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(1200), RepeatMode.Reverse),
        label = "pulse",
    )

    Box(
        Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(Color(0xFF05070D), Color(0xFF0A0E1A), Color(0xFF05070D))
                )
            )
    ) {
        // animated radial glow behind the shield
        Box(
            Modifier
                .size(260.dp)
                .align(Alignment.TopCenter)
                .padding(top = 90.dp)
                .clip(MaterialTheme.shapes.extraLarge)
                .background(
                    Brush.radialGradient(
                        listOf(Cyan.copy(alpha = pulse * 0.35f), Color.Transparent),
                        center = androidx.compose.ui.geometry.Offset(130f, 130f),
                        radius = 130f,
                    )
                )
        )

        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(60.dp))

            ShieldLogo(Modifier.size(84.dp))

            Spacer(Modifier.height(20.dp))

            Text(
                "PaySentry",
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold,
            )
            Text(
                "Check first. Pay second.",
                color = Cyan,
                fontWeight = FontWeight.SemiBold,
            )

            Spacer(Modifier.height(18.dp))

            Text(
                "Trustless Confirmation of Payee for stablecoin payments on QDay Aevum. Every name is verified on-chain before any token moves.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )

            Spacer(Modifier.height(28.dp))

            // Feature chips
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                FeatureChip("Verify", Cyan)
                FeatureChip("Guard", Violet)
                FeatureChip("Agent", MaterialTheme.colorScheme.primary)
            }

            Spacer(Modifier.height(12.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                FeatureChip("Sessions", MaterialTheme.colorScheme.primary)
                FeatureChip("Audit", Cyan)
                FeatureChip("Wallet", Violet)
            }
        }
    }
}

@Composable
private fun ShieldLogo(modifier: Modifier = Modifier) {
    androidx.compose.foundation.Canvas(modifier) {
        val w = size.width
        val h = size.height
        val cx = w / 2
        val cy = h / 2
        val top = cy - h * 0.42f
        val left = cx - w * 0.40f
        val right = cx + w * 0.40f
        val bottom = cy + h * 0.44f

        // shield outline
        val path = androidx.compose.ui.graphics.Path().apply {
            moveTo(cx, top)
            lineTo(right, cy - h * 0.26f)
            lineTo(right, cy + h * 0.06f)
            quadraticBezierTo(right, bottom, cx, bottom)
            quadraticBezierTo(left, bottom, left, cy + h * 0.06f)
            lineTo(left, cy - h * 0.26f)
            close()
        }
        drawPath(
            path,
            color = Color(0xFF05070D),
            style = androidx.compose.ui.graphics.drawscope.Stroke(width = 3.dp.toPx()),
        )
        drawPath(path, color = Cyan.copy(alpha = 0.08f))

        // check
        drawLine(
            color = Violet,
            start = androidx.compose.ui.geometry.Offset(cx - w * 0.20f, cy),
            end = androidx.compose.ui.geometry.Offset(cx - w * 0.03f, cy + h * 0.14f),
            strokeWidth = 5.dp.toPx(),
            cap = androidx.compose.ui.graphics.StrokeCap.Round,
        )
        drawLine(
            color = Violet,
            start = androidx.compose.ui.geometry.Offset(cx - w * 0.03f, cy + h * 0.14f),
            end = androidx.compose.ui.geometry.Offset(cx + w * 0.20f, cy - h * 0.16f),
            strokeWidth = 5.dp.toPx(),
            cap = androidx.compose.ui.graphics.StrokeCap.Round,
        )
    }
}

@Composable
private fun FeatureChip(label: String, color: Color) {
    val transition = rememberInfiniteTransition(label = "chip")
    val a by transition.animateFloat(
        initialValue = 0.55f,
        targetValue = 0.25f,
        animationSpec = infiniteRepeatable(tween(1600), RepeatMode.Reverse),
        label = "chipA",
    )
    Surface(
        modifier = Modifier
            .weight(1f)
            .height(40.dp),
        shape = MaterialTheme.shapes.medium,
        color = color.copy(alpha = 0.12f),
        border = androidx.compose.foundation.BorderStroke(1.dp, color.copy(alpha = a)),
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(
                label,
                color = color,
                fontWeight = FontWeight.SemiBold,
                style = MaterialTheme.typography.labelSmall,
            )
        }
    }
}