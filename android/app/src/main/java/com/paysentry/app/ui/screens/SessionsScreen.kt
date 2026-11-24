package com.paysentry.app.ui.screens

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paysentry.app.data.AgentSession
import com.paysentry.app.ui.PaySentryViewModel
import com.paysentry.app.ui.components.GlassCard
import com.paysentry.app.ui.components.GradientButton
import com.paysentry.app.ui.components.InfoRow
import com.paysentry.app.ui.components.PayInput
import com.paysentry.app.ui.components.ScreenHeader
import com.paysentry.app.ui.theme.Cyan
import com.paysentry.app.ui.theme.Green
import com.paysentry.app.ui.theme.Red
import com.paysentry.app.ui.theme.Violet
import com.paysentry.app.ui.theme.TextMuted
import com.paysentry.app.ui.theme.TextPrimary
import java.math.BigInteger

@Composable
fun SessionsScreen(vm: PaySentryViewModel) {
    var agent by remember { mutableStateOf("") }
    var maxPerTx by remember { mutableStateOf("5") }
    var capTotal by remember { mutableStateOf("50") }
    var days by remember { mutableStateOf("7") }
    val wallet by vm.wallet.collectAsState()
    val sessions by vm.sessions.collectAsState()
    val toast by vm.toast.collectAsState()

    LaunchedEffect(wallet) {
        if (wallet != null) vm.loadSessions(wallet!!)
    }

    LazyColumn(
        Modifier
            .fillMaxSize()
            .background(Color(0xFF05070D))
            .padding(20.dp)
    ) {
        item {
            ScreenHeader(
                "Agent sessions",
                "Least-privilege autonomous spending — enforced by the contract, never by the agent."
            )
        }

        if (wallet != null) {
            item {
                GlassCard(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                Modifier
                                    .size(8.dp)
                                    .background(Violet, RoundedCornerShape(2.dp))
                            )
                            Spacer(Modifier.size(8.dp))
                            Text(
                                "NEW SESSION",
                                fontSize = 11.sp,
                                letterSpacing = 2.sp,
                                color = Violet,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                        Spacer(Modifier.height(14.dp))
                        Text(
                            "Grant an agent wallet permission to spend your tUSD8 inside hard limits: per-transaction cap, lifetime cap, expiry, instant revocation.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextMuted,
                        )
                        Spacer(Modifier.height(14.dp))
                        PayInput(agent, { agent = it }, "Agent address", "0x…", monospace = true)
                        Spacer(Modifier.height(10.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            PayInput(maxPerTx, { maxPerTx = it }, "Max / tx", "5", modifier = Modifier.weight(1f))
                            PayInput(capTotal, { capTotal = it }, "Lifetime cap", "50", modifier = Modifier.weight(1f))
                        }
                        Spacer(Modifier.height(10.dp))
                        PayInput(days, { days = it }, "Expires after (days)", "7")
                        Spacer(Modifier.height(14.dp))
                        GradientButton(
                            "Create session",
                            onClick = {
                                val maxW = toWei(maxPerTx)
                                val capW = toWei(capTotal)
                                if (maxW != null && capW != null) {
                                    vm.createSession(agent, maxW, capW, days.toLongOrNull() ?: 7)
                                }
                            },
                            enabled = agent.isNotBlank() && toWei(maxPerTx) != null && toWei(capTotal) != null,
                        )
                    }
                }
                Spacer(Modifier.height(20.dp))
            }
        }

        item {
            Text("Your sessions", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
            Spacer(Modifier.height(10.dp))
        }

        if (sessions.isEmpty()) {
            item {
                GlassCard(Modifier.fillMaxWidth()) {
                    Text(
                        if (wallet == null) "Unlock your wallet to see sessions." else "No sessions yet — create one above.",
                        modifier = Modifier.padding(18.dp),
                        color = TextMuted,
                    )
                }
            }
        } else {
            items(sessions, key = { it.id }) { s -> SessionCard(s) }
        }

        if (toast != null) {
            item {
                Spacer(Modifier.height(12.dp))
                Text(toast ?: "", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyMedium)
            }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun SessionCard(s: AgentSession) {
    GlassCard(Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
        Column(Modifier.padding(16.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    "SESSION #${s.id}",
                    fontSize = 12.sp,
                    letterSpacing = 1.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = Cyan,
                )
                Text(
                    if (!s.active) "REVOKED" else "ACTIVE",
                    color = if (s.active) Green else Red,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                )
            }
            Spacer(Modifier.height(10.dp))
            InfoRow("Agent", s.agent)
            InfoRow("Max / tx", formatWei(s.maxPerTx) + " tUSD8")
            InfoRow("Spent", formatWei(s.spentTotal) + " / " + formatWei(s.capTotal) + " tUSD8")

            // usage bar
            Spacer(Modifier.height(12.dp))
            val pct = s.usedPercent.coerceIn(0, 100)
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .background(Color(0xFF1A2138), RoundedCornerShape(4.dp))
            ) {
                Box(
                    Modifier
                        .fillMaxWidth(pct / 100f)
                        .height(8.dp)
                        .background(
                            if (pct > 80) Brush.horizontalGradient(listOf(Red, Red))
                            else Brush.horizontalGradient(listOf(Cyan, Violet)),
                            RoundedCornerShape(4.dp),
                        )
                )
            }
            Spacer(Modifier.height(6.dp))
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text("${pct}% of cap used", color = TextMuted, fontSize = 11.sp)
                Text(
                    if (s.active) "expires " + java.text.SimpleDateFormat("MMM d", java.util.Locale.US).format(java.util.Date(s.expiresAt * 1000))
                    else "revoked",
                    color = TextMuted,
                    fontSize = 11.sp,
                )
            }

            if (s.active) {
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                    androidx.compose.material3.Surface(
                        onClick = { vm.revokeSession(s.id) },
                        shape = RoundedCornerShape(12.dp),
                        color = Red.copy(alpha = 0.15f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Red.copy(alpha = 0.4f)),
                    ) {
                        Text(
                            "Revoke",
                            Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                            color = Red,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 12.sp,
                        )
                    }
                }
            }
        }
    }
}

private fun toWei(s: String): BigInteger? =
    runCatching {
        val parts = s.trim().split(".")
        val w = parts.getOrElse(0) { "0" }.ifEmpty { "0" }
        val f = parts.getOrElse(1) { "" }.padEnd(6, '0').take(6)
        BigInteger(w + f)
    }.getOrNull()

private fun formatWei(wei: Long): String = "%.2f".format(wei / 1e6)