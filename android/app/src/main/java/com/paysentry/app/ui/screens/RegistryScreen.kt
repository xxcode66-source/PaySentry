package com.paysentry.app.ui.screens

import androidx.compose.foundation.layout.Column
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.paysentry.app.ui.PaySentryViewModel
import com.paysentry.app.ui.components.GlassCard
import com.paysentry.app.ui.components.GradientButton
import com.paysentry.app.ui.components.PayInput
import com.paysentry.app.ui.components.ScreenHeader
import com.paysentry.app.ui.theme.Cyan
import com.paysentry.app.ui.theme.Violet
import com.paysentry.app.ui.theme.TextMuted

@Composable
fun RegistryScreen(vm: PaySentryViewModel) {
    var myName by remember { mutableStateOf("") }
    var attestAddr by remember { mutableStateOf("") }
    var attestName by remember { mutableStateOf("") }
    val wallet by vm.wallet.collectAsState()
    val toast by vm.toast.collectAsState()

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp)
    ) {
        ScreenHeader(
            "Registry",
            "Claim your identity, or verify others. Every write is an on-chain event."
        )

        if (wallet == null) {
            GlassCard(Modifier.fillMaxWidth()) {
                Text(
                    "Connect a wallet to manage identity.",
                    modifier = Modifier.padding(16.dp),
                    color = TextMuted,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
            return@Column
        }

        // identity card
        GlassCard(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                Text("Your identity", style = MaterialTheme.typography.titleMedium, color = Cyan)
                Spacer(Modifier.height(12.dp))
                PayInput(myName, { myName = it }, "Display name", "e.g. Warung Maju Jaya")
                Spacer(Modifier.height(12.dp))
                GradientButton(
                    "Register identity",
                    onClick = { vm.registerPayee(myName) },
                    enabled = myName.isNotBlank(),
                )
            }
        }

        Spacer(Modifier.height(16.dp))

        // verifier card
        GlassCard(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                Text("Attest an identity (verifier)", style = MaterialTheme.typography.titleMedium, color = Violet)
                Spacer(Modifier.height(12.dp))
                PayInput(attestAddr, { attestAddr = it }, "Payee address", "0x…", monospace = true)
                Spacer(Modifier.height(10.dp))
                PayInput(attestName, { attestName = it }, "Verified name", "e.g. BS Mart")
                Spacer(Modifier.height(12.dp))
                GradientButton(
                    "Attest",
                    onClick = { vm.attest(attestAddr, attestName) },
                    enabled = attestAddr.isNotBlank() && attestName.isNotBlank(),
                )
            }
        }

        if (toast != null) {
            Spacer(Modifier.height(14.dp))
            GlassCard(Modifier.fillMaxWidth()) {
                Text(toast ?: "", modifier = Modifier.padding(14.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}