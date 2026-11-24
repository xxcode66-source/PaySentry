package com.paysentry.app.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.unit.dp
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
            .padding(20.dp)
    ) {
        item {
            ScreenHeader(
                "Agent sessions",
                "Grant an agent least-privilege spending — enforced by the contract."
            )
        }

        if (wallet != null) {
            item {
                GlassCard(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        Text("New session", style = MaterialTheme.typography.titleMedium, color = Violet)
                        Spacer(Modifier.height(12.dp))
                        PayInput(agent, { agent = it }, "Agent address", "0x…", monospace = true)
                        Spacer(Modifier.height(10.dp))
                        Row(horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(10.dp)) {
                            PayInput(maxPerTx, { maxPerTx = it }, "Max / tx", "5", modifier = Modifier.weight(1f))
                            PayInput(capTotal, { capTotal = it }, "Cap total", "50", modifier = Modifier.weight(1f))
                        }
                        Spacer(Modifier.height(10.dp))
                        PayInput(days, { days = it }, "Expires after (days)", "7")
                        Spacer(Modifier.height(12.dp))
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
                Spacer(Modifier.height(18.dp))
            }
        }

        if (sessions.isEmpty()) {
            item {
                GlassCard(Modifier.fillMaxWidth()) {
                    Text(
                        if (wallet == null) "Connect a wallet to see sessions." else "No sessions yet.",
                        modifier = Modifier.padding(20.dp),
                        color = TextMuted,
                    )
                }
            }
        } else {
            items(sessions, key = { it.id }) { s -> SessionCard(s) }
        }

        if (toast != null) {
            item { Spacer(Modifier.height(12.dp)); Text(toast ?: "", color = MaterialTheme.colorScheme.onSurfaceVariant) }
        }
    }
}

@Composable
private fun SessionCard(s: AgentSession) {
    GlassCard(Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
        Column(Modifier.padding(16.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = androidx.compose.foundation.layout.Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("#${s.id}", style = MaterialTheme.typography.titleMedium, color = Cyan)
                Text(
                    if (!s.active) "REVOKED" else "ACTIVE",
                    color = if (s.active) Green else Red,
                    style = MaterialTheme.typography.labelSmall,
                )
            }
            Spacer(Modifier.height(8.dp))
            InfoRow("Agent", s.agent.take(10) + "…")
            InfoRow("Max / tx", formatWei(s.maxPerTx))
            InfoRow("Spent / cap", "${formatWei(s.spentTotal)} / ${formatWei(s.capTotal)}")

            // progress bar
            Spacer(Modifier.height(10.dp))
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = androidx.compose.foundation.layout.Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                androidx.compose.foundation.layout.Box(
                    Modifier
                        .width(120.dp)
                        .height(6.dp)
                        .background(Color(0xFF1A2138), androidx.compose.foundation.shape.RoundedCornerShape(3.dp))
                ) {
                    val pct = s.usedPercent.coerceIn(0, 100)
                    androidx.compose.foundation.layout.Box(
                        Modifier
                            .width((120f * pct / 100f).dp)
                            .height(6.dp)
                            .background(
                                Brush.horizontalGradient(listOf(Cyan, Violet)),
                                androidx.compose.foundation.shape.RoundedCornerShape(3.dp),
                            )
                    )
                }
                Text("${s.usedPercent}% used", color = TextMuted, style = MaterialTheme.typography.labelSmall)
            }
            Spacer(Modifier.height(4.dp))
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