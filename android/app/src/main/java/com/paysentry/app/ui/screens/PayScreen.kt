package com.paysentry.app.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.paysentry.app.ui.PaySentryViewModel
import com.paysentry.app.ui.components.GradientButton
import com.paysentry.app.ui.components.InfoRow
import com.paysentry.app.ui.components.PayInput
import com.paysentry.app.ui.components.ScreenHeader
import com.paysentry.app.ui.theme.Cyan
import com.paysentry.app.ui.theme.Green
import com.paysentry.app.ui.theme.Red
import java.math.BigInteger

@Composable
fun PayScreen(vm: PaySentryViewModel) {
    var payee by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var enforce by remember { mutableStateOf(true) }
    val wallet by vm.wallet.collectAsState()
    val balance by vm.tusd8.collectAsState()
    val toast by vm.toast.collectAsState()

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp)
    ) {
        ScreenHeader(
            "Guarded payment",
            "The CoP check runs first. In Enforce mode a mismatch reverts on-chain."
        )

        // balance bar
        Row(
            Modifier.fillMaxWidth().padding(bottom = 12.dp),
            horizontalArrangement = androidx.compose.foundation.layout.Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("tUSD8 balance", style = MaterialTheme.typography.labelSmall, color = androidx.compose.ui.graphics.Color(0xFF64748B))
            Text(
                "%.2f".format(balance.toDouble() / 1e6),
                style = MaterialTheme.typography.titleMedium,
                color = Cyan,
            )
        }

        PayInput(payee, { payee = it }, "Payee address", "0x…", monospace = true)
        Spacer(Modifier.height(10.dp))
        PayInput(name, { name = it }, "Payee name as intended", "e.g. Warung Maju Jaya")
        Spacer(Modifier.height(10.dp))
        PayInput(amount, { amount = it }, "Amount (tUSD8)", "10.00")
        Spacer(Modifier.height(14.dp))

        // mode toggle
        Row(Modifier.fillMaxWidth(), horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(10.dp)) {
            ModeChip("Warn", !enforce, onClick = { enforce = false }, Modifier.weight(1f))
            ModeChip("Enforce", enforce, onClick = { enforce = true }, Modifier.weight(1f))
        }
        Spacer(Modifier.height(14.dp))

        val amountWei = remember(amount) {
            runCatching {
                val parts = amount.trim().split(".")
                val whole = parts.getOrElse(0) { "0" }.ifEmpty { "0" }
                val frac = parts.getOrElse(1) { "" }.padEnd(6, '0').take(6)
                BigInteger(whole + frac)
            }.getOrNull()
        }

        GradientButton(
            text = if (enforce) "Send ${amount.ifBlank { "0" }} tUSD8 · enforced" else "Send ${amount.ifBlank { "0" }} tUSD8 · warn",
            onClick = {
                val w = amountWei ?: return@GradientButton
                vm.guardPay(payee, name, w, enforce)
            },
            enabled = wallet != null && payee.isNotBlank() && name.isNotBlank() && amountWei != null && amountWei > BigInteger.ZERO,
        )
        if (wallet == null) {
            Spacer(Modifier.height(8.dp))
            Text("Connect a wallet to pay.", style = MaterialTheme.typography.bodyMedium, color = androidx.compose.ui.graphics.Color(0xFF64748B))
        }

        // result / toast
        if (toast != null) {
            Spacer(Modifier.height(16.dp))
            InfoRow(
                "Last attempt",
                toast ?: "",
                if (toast?.startsWith("✓") == true) Green else Red,
            )
        }
    }
}

@Composable
private fun ModeChip(label: String, active: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    androidx.compose.material3.Surface(
        onClick = onClick,
        modifier = modifier.height(46.dp),
        shape = androidx.compose.foundation.shape.RoundedCornerShape(14.dp),
        color = if (active) Cyan.copy(alpha = 0.18f) else androidx.compose.ui.graphics.Color(0xFF0A0E1A),
        border = androidx.compose.foundation.BorderStroke(1.dp, if (active) Cyan else androidx.compose.ui.graphics.Color(0x1AFFFFFF)),
    ) {
        androidx.compose.foundation.layout.Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
            Text(label, color = if (active) Cyan else androidx.compose.ui.graphics.Color(0xFFCBD5E1), style = MaterialTheme.typography.titleMedium)
        }
    }
}