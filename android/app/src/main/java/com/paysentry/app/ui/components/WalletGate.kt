package com.paysentry.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.paysentry.app.ui.theme.Cyan
import com.paysentry.app.ui.theme.Violet
import com.paysentry.app.ui.theme.TextMuted

/**
 * Full-screen gate shown before the app unlocks. A private key is required to
 * sign transactions — once entered, the caller sets it on the ViewModel and the
 * gate disappears.
 */
@Composable
fun WalletGate(onSubmit: (String) -> Unit) {
    var key by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }

    Box(
        Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(listOf(Color(0xFF05070D), Color(0xFF0A0E1A), Color(0xFF05070D)))
            )
    ) {
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            ShieldLogo(Modifier.size(84.dp))
            Spacer(Modifier.height(18.dp))
            Text(
                "PaySentry",
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground,
            )
            Text(
                "Check first. Pay second.",
                color = Cyan,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(Modifier.height(28.dp))

            Text(
                "Connect your wallet to continue.\nPaste a QDay Aevum testnet private key to unlock.",
                color = TextMuted,
                textAlign = TextAlign.Center,
                style = MaterialTheme.typography.bodyMedium,
            )
            Spacer(Modifier.height(24.dp))

            com.paysentry.app.ui.components.PayInput(
                value = key,
                onValueChange = {
                    key = it
                    error = null
                },
                label = "Private key",
                placeholder = "0x… (64 hex chars)",
                monospace = true,
            )
            if (error != null) {
                Spacer(Modifier.height(8.dp))
                Text(error ?: "", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.labelSmall)
            }
            Spacer(Modifier.height(16.dp))

            GradientButton(
                text = "Unlock wallet",
                onClick = {
                    val trimmed = key.trim()
                    if (trimmed.length >= 64) onSubmit(trimmed)
                    else error = "That doesn't look like a 64-hex private key."
                },
                enabled = key.trim().isNotBlank(),
            )

            Spacer(Modifier.height(16.dp))
            Text(
                "Testnet only — never paste a real mainnet key.",
                color = TextMuted.copy(alpha = 0.7f),
                style = MaterialTheme.typography.labelSmall,
            )
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