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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paysentry.app.ui.PaySentryViewModel
import com.paysentry.app.ui.components.GlassCard
import com.paysentry.app.ui.components.GradientButton
import com.paysentry.app.ui.components.InfoRow
import com.paysentry.app.ui.components.PayInput
import com.paysentry.app.ui.components.ScreenHeader
import com.paysentry.app.ui.theme.Cyan
import com.paysentry.app.ui.theme.Green
import com.paysentry.app.ui.theme.Red
import com.paysentry.app.ui.theme.TextMuted
import com.paysentry.app.ui.theme.TextPrimary
import java.math.BigInteger

@Composable
fun PayScreen(vm: PaySentryViewModel) {
    var payee by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var enforce by remember { mutableStateOf(true) }
    var confirmSend by remember { mutableStateOf(false) }
    val wallet by vm.wallet.collectAsState()
    val balance by vm.tusd8.collectAsState()
    val toast by vm.toast.collectAsState()

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .background(Color(0xFF05070D))
            .padding(20.dp)
    ) {
        ScreenHeader(
            "Guarded payment",
            "Enforce mode reverts a mismatched payment on-chain — before any token moves."
        )

        // balance strip
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            color = Color(0xFF0A0E1A),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x1A22D3EE)),
        ) {
            Row(
                Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text("AVAILABLE", fontSize = 9.sp, letterSpacing = 2.sp, color = TextMuted, fontWeight = FontWeight.Bold)
                    Text(
                        formatUsd(balance) + " tUSD8",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Cyan,
                    )
                }
                Text(
                    "tUSD8 · ERC-20",
                    fontSize = 11.sp,
                    color = TextMuted,
                )
            }
        }

        Spacer(Modifier.height(16.dp))

        GlassCard(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                PayInput(payee, { payee = it }, "Payee address", "0x…", monospace = true)
                Spacer(Modifier.height(12.dp))
                PayInput(name, { name = it }, "Payee name as intended", "Your Name here")
                Spacer(Modifier.height(12.dp))
                PayInput(amount, { amount = it }, "Amount (tUSD8)", "10.00")
            }
        }

        Spacer(Modifier.height(16.dp))

        // mode selector
        Text("Guard mode", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
        Spacer(Modifier.height(10.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            ModeCard(
                "WARN",
                "Pays but flags mismatches",
                !enforce,
                onClick = { enforce = false },
                Modifier.weight(1f),
            )
            ModeCard(
                "ENFORCE",
                "Reverts on mismatch",
                enforce,
                onClick = { enforce = true },
                Modifier.weight(1f),
                recommended = true,
            )
        }

        Spacer(Modifier.height(20.dp))

        val amountWei = remember(amount) {
            runCatching {
                val parts = amount.trim().split(".")
                val whole = parts.getOrElse(0) { "0" }.ifEmpty { "0" }
                val frac = parts.getOrElse(1) { "" }.padEnd(6, '0').take(6)
                BigInteger(whole + frac)
            }.getOrNull()
        }

        GradientButton(
            text = if (enforce) "Send ${amount.ifBlank { "0" }} tUSD8 · ENFORCED" else "Send ${amount.ifBlank { "0" }} tUSD8 · WARN",
            onClick = {
                val w = amountWei ?: return@GradientButton
                if (wallet != null && payee.isNotBlank() && name.isNotBlank() && w > BigInteger.ZERO) {
                    confirmSend = true
                }
            },
            enabled = wallet != null && payee.isNotBlank() && name.isNotBlank() && amountWei != null && amountWei > BigInteger.ZERO,
        )

        if (wallet == null) {
            Spacer(Modifier.height(8.dp))
            Text("Connect a wallet to pay.", color = TextMuted, style = MaterialTheme.typography.bodyMedium)
        }

        if (toast != null) {
            Spacer(Modifier.height(16.dp))
            Box(
                Modifier
                    .fillMaxWidth()
                    .background(
                        if (toast?.startsWith("✓") == true) Green.copy(alpha = 0.12f) else Red.copy(alpha = 0.12f),
                        RoundedCornerShape(16.dp),
                    )
            ) {
                Text(
                    toast ?: "",
                    Modifier.padding(14.dp),
                    color = if (toast?.startsWith("✓") == true) Green else Red,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                )
            }
        }
        Spacer(Modifier.height(24.dp))
    }

    // ---- payment confirmation dialog ----
    if (confirmSend) {
        AlertDialog(
            onDismissRequest = { confirmSend = false },
            title = { Text(if (enforce) "Send payment? (Enforced)" else "Send payment? (Warn)") },
            text = {
                Text(
                    "Send $amount tUSD8 to\n\"$name\"\n(${payee.take(10)}…)?\n\n" +
                        if (enforce) "The CoP check runs on-chain — a name mismatch reverts before any token moves." else "Warn mode pays even on mismatch, but flags it on the audit trail."
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    val w = runCatching {
                        val parts = amount.trim().split(".")
                        BigInteger(parts.getOrElse(0) { "0" }.ifEmpty { "0" } + parts.getOrElse(1) { "" }.padEnd(6, '0').take(6))
                    }.getOrNull()
                    if (w != null) vm.guardPay(payee, name, w, enforce)
                    confirmSend = false
                }) { Text("Confirm") }
            },
            dismissButton = {
                TextButton(onClick = { confirmSend = false }) { Text("Cancel") }
            },
        )
    }
}

@Composable
private fun ModeCard(
    title: String,
    desc: String,
    active: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    recommended: Boolean = false,
) {
    Surface(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        color = if (active) Cyan.copy(alpha = 0.14f) else Color(0xFF0A0E1A),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (active) Cyan else Color(0x1AFFFFFF),
        ),
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    title,
                    color = if (active) Cyan else TextPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    letterSpacing = 1.sp,
                )
                if (recommended) {
                    Spacer(Modifier.width(6.dp))
                    Text(
                        "★",
                        color = if (active) Cyan else TextMuted,
                        fontSize = 12.sp,
                    )
                }
            }
            Spacer(Modifier.height(4.dp))
            Text(desc, fontSize = 11.sp, color = TextMuted)
        }
    }
}

private fun formatUsd(wei: BigInteger): String = "%.2f".format(wei.toDouble() / 1e6)