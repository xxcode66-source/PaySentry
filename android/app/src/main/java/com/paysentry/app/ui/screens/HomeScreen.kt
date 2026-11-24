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
import androidx.compose.foundation.layout.size
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
import com.paysentry.app.ui.theme.Green
import com.paysentry.app.ui.theme.Ink
import com.paysentry.app.ui.theme.TextMuted
import com.paysentry.app.ui.theme.TextPrimary
import com.paysentry.app.ui.theme.Violet
import java.math.BigInteger

/** Dashboard home — total balance hero, token breakdown, quick actions. */
@Composable
fun HomeScreen(vm: com.paysentry.app.ui.PaySentryViewModel) {
    val tusd8 by vm.tusd8.collectAsState()
    val tqday by vm.tqday.collectAsState()
    val wallet by vm.wallet.collectAsState()

    val transition = rememberInfiniteTransition(label = "hero")
    val sheen by transition.animateFloat(
        initialValue = 0.10f,
        targetValue = 0.28f,
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
            // wallet chip
            wallet?.let { addr ->
                WalletTopBar(address = addr, onRefresh = { vm.refreshBalance() })
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
                "in stablecoin value · QDay Aevum Testnet",
                style = MaterialTheme.typography.bodyMedium,
                color = TextMuted,
            )

            Spacer(Modifier.height(26.dp))

            // hero gradient card
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(120.dp)
                    .background(
                        Brush.linearGradient(listOf(Cyan.copy(alpha = 0.16f), Violet.copy(alpha = 0.20f))),
                        RoundedCornerShape(22.dp),
                    )
            ) {
                // animated sheen strip
                Box(
                    Modifier
                        .matchParentSize()
                        .background(
                            Brush.linearGradient(
                                0f to Color.Transparent,
                                0.5f to Color.White.copy(alpha = sheen * 0.5f),
                                1f to Color.Transparent,
                            )
                        )
                )
                Row(
                    Modifier
                        .matchParentSize()
                        .padding(horizontal = 22.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Column {
                        StatLabel("tUSD8 · STABLECOIN", Cyan)
                        Spacer(Modifier.height(6.dp))
                        Text(
                            formatUsd(tusd8),
                            fontSize = 26.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary,
                        )
                        Text("6 decimals · ERC-20", fontSize = 11.sp, color = TextMuted)
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        StatLabel("tQDAY · GAS", Violet)
                        Spacer(Modifier.height(6.dp))
                        Text(
                            formatToken(tqday, 18),
                            fontSize = 26.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary,
                        )
                        Text("for transaction gas", fontSize = 11.sp, color = TextMuted)
                    }
                }
            }

            Spacer(Modifier.height(26.dp))

            // quick actions
            Text("Quick actions", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
            Spacer(Modifier.height(12.dp))

            QuickAction(
                title = "Verify a payee",
                desc = "Check a recipient's on-chain identity before paying",
                accent = Cyan,
            )
            QuickAction(
                title = "Guarded payment",
                desc = "Send tUSD8 with CoP enforcement",
                accent = Violet,
            )
            QuickAction(
                title = "Agent sessions",
                desc = "Budget-capped autonomous spending",
                accent = Green,
            )

            Spacer(Modifier.height(20.dp))

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
private fun QuickAction(title: String, desc: String, accent: Color) {
    GlassCard(Modifier.fillMaxWidth().padding(vertical = 5.dp)) {
        Row(
            Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier
                    .size(44.dp)
                    .background(accent.copy(alpha = 0.14f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Box(
                    Modifier
                        .size(10.dp)
                        .background(accent, RoundedCornerShape(2.dp))
                )
            }
            Spacer(Modifier.size(14.dp))
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                Spacer(Modifier.height(2.dp))
                Text(desc, style = MaterialTheme.typography.bodyMedium, color = TextMuted, fontSize = 12.sp)
            }
            Text("→", color = accent, fontWeight = FontWeight.Bold, fontSize = 18.sp)
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