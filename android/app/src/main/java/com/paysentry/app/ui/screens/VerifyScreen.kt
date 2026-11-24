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
import com.paysentry.app.data.MatchResult
import com.paysentry.app.ui.PaySentryViewModel
import com.paysentry.app.ui.components.GlassCard
import com.paysentry.app.ui.components.GradientButton
import com.paysentry.app.ui.components.InfoRow
import com.paysentry.app.ui.components.PayInput
import com.paysentry.app.ui.components.ScreenHeader
import com.paysentry.app.ui.theme.Amber
import com.paysentry.app.ui.theme.Cyan
import com.paysentry.app.ui.theme.Green
import com.paysentry.app.ui.theme.Red
import com.paysentry.app.ui.theme.TextMuted
import com.paysentry.app.ui.theme.TextPrimary

@Composable
fun VerifyScreen(vm: PaySentryViewModel) {
    var payee by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    val verdict by vm.verdict.collectAsState()
    val identity by vm.identity.collectAsState()
    val checking by vm.checking.collectAsState()
    val toast by vm.toast.collectAsState()

    val transition = rememberInfiniteTransition(label = "verdict")
    val pulse by transition.animateFloat(
        initialValue = 0.5f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(1400), RepeatMode.Reverse),
        label = "vpulse",
    )

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .background(Color(0xFF05070D))
            .padding(20.dp)
    ) {
        ScreenHeader(
            "Verify a payee",
            "Bank-grade Confirmation of Payee — computed on-chain."
        )

        GlassCard(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                PayInput(payee, { payee = it }, "Payee address", "0x…", monospace = true)
                Spacer(Modifier.height(12.dp))
                PayInput(name, { name = it }, "Name you intend to pay", "Your Name here")
                Spacer(Modifier.height(16.dp))
                GradientButton(
                    "Run CoP check",
                    onClick = { vm.checkPayee(payee, name) },
                    enabled = payee.isNotBlank() && name.isNotBlank(),
                    loading = checking,
                )
            }
        }

        // ---- verdict hero ----
        if (verdict != null && !checking) {
            Spacer(Modifier.height(18.dp))
            val v = verdict!!
            val (accent, headline) = when (v.result) {
                MatchResult.FULL_MATCH -> Green to "Identity confirmed"
                MatchResult.CLOSE_MATCH -> Amber to "Possible typo detected"
                MatchResult.NO_MATCH -> Red to "Name does not match"
                MatchResult.NOT_FOUND -> TextMuted to "Unknown payee"
            }
            Box(
                Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.linearGradient(listOf(accent.copy(alpha = 0.14f), Color.Transparent)),
                        RoundedCornerShape(22.dp),
                    )
                    .background(Color(0xFF0A0E1A), RoundedCornerShape(22.dp))
            ) {
                Column(Modifier.padding(20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            Modifier
                                .size(14.dp)
                                .background(accent, RoundedCornerShape(4.dp))
                        )
                        Spacer(Modifier.size(10.dp))
                        Text(
                            v.result.label,
                            color = accent,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 2.sp,
                            fontSize = 15.sp,
                        )
                    }
                    Spacer(Modifier.height(10.dp))
                    Text(headline, style = MaterialTheme.typography.titleLarge, color = TextPrimary)
                    Spacer(Modifier.height(4.dp))
                    Text(
                        when (v.result) {
                            MatchResult.FULL_MATCH -> "The on-chain identity matches the name. Safe to pay."
                            MatchResult.CLOSE_MATCH -> "A near-identical registered name exists. Double-check the spelling."
                            MatchResult.NO_MATCH -> "This address is known under a different name. Do not pay without verifying."
                            MatchResult.NOT_FOUND -> "Nobody has registered this address. Proceeding is high risk."
                        },
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextMuted,
                    )
                    if (v.matchedAs.isNotBlank()) {
                        Spacer(Modifier.height(12.dp))
                        InfoRow("Matched as", v.matchedAs, Cyan)
                    }
                    identity?.let { id ->
                        InfoRow("Identity level", id.levelLabel)
                        InfoRow("Verifier attestations", id.attestationCount.toString())
                    }
                }
            }
        }

        // toast
        if (toast != null) {
            Spacer(Modifier.height(14.dp))
            GlassCard(Modifier.fillMaxWidth()) {
                Text(
                    toast ?: "",
                    modifier = Modifier.padding(14.dp),
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}