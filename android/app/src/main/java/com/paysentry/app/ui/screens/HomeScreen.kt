package com.paysentry.app.ui.screens

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paysentry.app.ui.components.GlassCard
import com.paysentry.app.ui.components.StatLabel
import com.paysentry.app.ui.components.WalletTopBar
import com.paysentry.app.ui.theme.Cyan
import com.paysentry.app.ui.theme.TextMuted
import com.paysentry.app.ui.theme.TextPrimary
import com.paysentry.app.ui.theme.Violet
import java.math.BigInteger

/** Dashboard home — total balance, separate tQDAY + tUSD8 cards, info. */
@Composable
fun HomeScreen(vm: com.paysentry.app.ui.PaySentryViewModel, onLogout: () -> Unit) {
    val tusd8 by vm.tusd8.collectAsState()
    val tqday by vm.tqday.collectAsState()
    val wallet by vm.wallet.collectAsState()

    val transition = rememberInfiniteTransition(label = "hero")
    val sheen by transition.animateFloat(
        initialValue = 0.10f,
        targetValue = 0.26f,
        animationSpec = infiniteRepeatable(tween(2200), RepeatMode.Reverse),
        label = "sheen",
    )

    Box(
        Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(listOf(Color(0xFF05070D), Color(0xFF070B14), Color(0xFF05070D)))
            )
    ) {
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 16.dp)
        ) {
            // wallet chip — tap address to copy, Lock to logout
            wallet?.let { addr ->
                WalletTopBar(address = addr, onRefresh = { vm.refreshBalance() }, onLogout = onLogout)
            }
            Spacer(Modifier.height(22.dp))

            Text("Total balance", style = MaterialTheme.typography.bodyMedium, color = TextMuted)
            Spacer(Modifier.height(6.dp))
            Text(
                "$" + formatUsd(tusd8),
                fontSize = 46.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                "stablecoin value · QDay Aevum Testnet",
                style = MaterialTheme.typography.bodyMedium,
                color = TextMuted,
            )

            Spacer(Modifier.height(24.dp))

            // --- tQDAY card (top)
            TokenCard(
                label = "tQDAY",
                sub = "GAS · native",
                value = formatToken(tqday, 18),
                accent = Violet,
                sheen = sheen,
            )

            Spacer(Modifier.height(14.dp))

            // --- tUSD8 card (below)
            TokenCard(
                label = "tUSD8",
                sub = "STABLECOIN · ERC-20",
                value = formatUsd(tusd8),
                accent = Cyan,
                sheen = sheen,
            )

            Spacer(Modifier.height(24.dp))

            GlassCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Text("How PaySentry protects you", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Every payment runs a Confirmation-of-Payee check first. If the recipient name doesn't match the on-chain identity, the transaction reverts — before any token moves.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextMuted,
                    )
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun TokenCard(
    label: String,
    sub: String,
    value: String,
    accent: Color,
    sheen: Float,
) {
    Box(
        Modifier
            .fillMaxWidth()
            .background(
                Brush.linearGradient(listOf(accent.copy(alpha = 0.13f), Color(0xFF0A0E1A))),
                RoundedCornerShape(20.dp),
            )
            .background(Color(0xFF0A0E1A), RoundedCornerShape(20.dp))
    ) {
        // animated sheen
        Box(
            Modifier
                .matchParentSize()
                .background(
                    Brush.linearGradient(
                        0f to Color.Transparent,
                        0.5f to Color.White.copy(alpha = sheen * 0.4f),
                        1f to Color.Transparent,
                    )
                )
        )
        Row(
            Modifier
                .matchParentSize()
                .padding(horizontal = 20.dp, vertical = 18.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column {
                StatLabel(label, accent)
                Spacer(Modifier.height(6.dp))
                Text(
                    value,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                )
            }
            Text(sub, fontSize = 11.sp, color = TextMuted, letterSpacing = 1.sp)
        }
    }
}

private fun formatUsd(wei: BigInteger): String {
    val value = wei.toDouble() / 1e6
    return "%.2f".format(value)
}

private fun formatToken(wei: BigInteger, decimals: Int): String {
    if (wei == BigInteger.ZERO) return "0"
    val value = wei.toDouble() / Math.pow(10.0, decimals.toDouble())
    return if (value >= 1) "%.2f".format(value) else "%.4f".format(value)
}