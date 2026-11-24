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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paysentry.app.ui.PaySentryViewModel
import com.paysentry.app.ui.components.GlassCard
import com.paysentry.app.ui.components.GradientButton
import com.paysentry.app.ui.components.PayInput
import com.paysentry.app.ui.components.ScreenHeader
import com.paysentry.app.ui.theme.Cyan
import com.paysentry.app.ui.theme.Green
import com.paysentry.app.ui.theme.TextMuted
import com.paysentry.app.ui.theme.TextPrimary
import com.paysentry.app.ui.theme.Violet

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
            .background(Color(0xFF05070D))
            .padding(20.dp)
    ) {
        ScreenHeader(
            "Registry",
            "Claim an identity, or verify someone else's. Every write is an on-chain event."
        )

        if (wallet == null) {
            GlassCard(Modifier.fillMaxWidth()) {
                Text(
                    "Unlock your wallet first (go to Home → enter your testnet key).",
                    modifier = Modifier.padding(18.dp),
                    color = TextMuted,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
            return@Column
        }

        // --- identity card
        GlassCard(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .size(8.dp)
                            .background(Cyan, RoundedCornerShape(2.dp))
                    )
                    Spacer(Modifier.size(8.dp))
                    Text("YOUR IDENTITY", fontSize = 11.sp, letterSpacing = 2.sp, color = Cyan, fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.height(14.dp))
                Text(
                    "Claim a display name for your own address. Other payers will see this name when they verify you.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextMuted,
                )
                Spacer(Modifier.height(14.dp))
                PayInput(myName, { myName = it }, "Display name", "e.g. Warung Maju Jaya")
                Spacer(Modifier.height(14.dp))
                GradientButton(
                    "Register identity",
                    onClick = { vm.registerPayee(myName) },
                    enabled = myName.isNotBlank(),
                )
            }
        }

        Spacer(Modifier.height(18.dp))

        // --- verifier card
        GlassCard(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .size(8.dp)
                            .background(Violet, RoundedCornerShape(2.dp))
                    )
                    Spacer(Modifier.size(8.dp))
                    Text("VERIFIER", fontSize = 11.sp, letterSpacing = 2.sp, color = Violet, fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.height(14.dp))
                Text(
                    "Endorse an address → name pair. Attested identities carry higher trust than self-claimed ones.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextMuted,
                )
                Spacer(Modifier.height(14.dp))
                PayInput(attestAddr, { attestAddr = it }, "Payee address", "0x…", monospace = true)
                Spacer(Modifier.height(12.dp))
                PayInput(attestName, { attestName = it }, "Verified name", "e.g. BS Mart")
                Spacer(Modifier.height(14.dp))
                GradientButton(
                    "Attest identity",
                    onClick = { vm.attest(attestAddr, attestName) },
                    enabled = attestAddr.isNotBlank() && attestName.isNotBlank(),
                )
            }
        }

        if (toast != null) {
            Spacer(Modifier.height(14.dp))
            Box(
                Modifier
                    .fillMaxWidth()
                    .background(
                        if (toast?.startsWith("✓") == true || toast?.contains("registered") == true || toast?.contains("Attestation") == true)
                            Green.copy(alpha = 0.12f) else RedCopy,
                        RoundedCornerShape(16.dp),
                    )
            ) {
                Text(
                    toast ?: "",
                    Modifier.padding(14.dp),
                    color = if (toast?.startsWith("✓") == true) Green else Color(0xFFF87171),
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}

private val RedCopy = Color(0x1AF87171)