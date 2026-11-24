package com.paysentry.app.ui.screens

import androidx.compose.animation.AnimatedVisibility
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
import com.paysentry.app.data.MatchResult
import com.paysentry.app.ui.PaySentryViewModel
import com.paysentry.app.ui.components.GlassCard
import com.paysentry.app.ui.components.GradientButton
import com.paysentry.app.ui.components.InfoRow
import com.paysentry.app.ui.components.PayInput
import com.paysentry.app.ui.components.ScreenHeader
import com.paysentry.app.ui.components.VerdictPill
import com.paysentry.app.ui.theme.Cyan
import com.paysentry.app.ui.theme.TextMuted

@Composable
fun VerifyScreen(vm: PaySentryViewModel) {
    var payee by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    val verdict by vm.verdict.collectAsState()
    val identity by vm.identity.collectAsState()
    val checking by vm.checking.collectAsState()
    val toast by vm.toast.collectAsState()

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp)
    ) {
        ScreenHeader(
            "Verify a payee",
            "Does this address really belong to the name you intend to pay?"
        )

        PayInput(payee, { payee = it }, "Payee address", "0x…", monospace = true)
        Spacer(Modifier.height(10.dp))
        PayInput(name, { name = it }, "Name you intend to pay", "e.g. Warung Maju Jaya")
        Spacer(Modifier.height(14.dp))

        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        ) {
            VerdictPill(verdict?.result, loading = checking)
            GradientButton(
                "Check",
                onClick = { vm.checkPayee(payee, name) },
                enabled = payee.isNotBlank() && name.isNotBlank(),
                loading = checking,
                modifier = Modifier.weight(1f),
            )
        }

        AnimatedVisibility(visible = verdict != null || identity != null) {
            Column(Modifier.padding(top = 16.dp)) {
                GlassCard(Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                    Column(Modifier.padding(18.dp)) {
                        verdict?.let {
                            Text(
                                when (it.result) {
                                    MatchResult.FULL_MATCH -> "FULL MATCH — safe to proceed."
                                    MatchResult.CLOSE_MATCH -> "CLOSE MATCH — likely a typo."
                                    MatchResult.NO_MATCH -> "NO MATCH — name does not match. Do not pay."
                                    MatchResult.NOT_FOUND -> "NOT FOUND — address has no verified identity."
                                },
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            if (it.matchedAs.isNotBlank()) {
                                Spacer(Modifier.height(8.dp))
                                InfoRow("Matched", it.matchedAs, Cyan)
                            }
                            Spacer(Modifier.height(6.dp))
                            InfoRow("Identity level", identity?.levelLabel ?: "Unknown")
                        }
                    }
                }
            }
        }

        // Toast surface
        androidx.compose.animation.AnimatedVisibility(
            visible = toast != null,
            enter = androidx.compose.animation.fadeIn(),
            exit = androidx.compose.animation.fadeOut(),
        ) {
            Spacer(Modifier.height(16.dp))
            GlassCard(Modifier.fillMaxWidth()) {
                Text(
                    toast ?: "",
                    modifier = Modifier.padding(14.dp),
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }
    }
}