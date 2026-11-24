package com.paysentry.app.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paysentry.app.data.MatchResult
import com.paysentry.app.ui.theme.Amber
import com.paysentry.app.ui.theme.Cyan
import com.paysentry.app.ui.theme.GlassBorder
import com.paysentry.app.ui.theme.GlassFill
import com.paysentry.app.ui.theme.Green
import com.paysentry.app.ui.theme.Ink
import com.paysentry.app.ui.theme.Red
import com.paysentry.app.ui.theme.TextMuted
import com.paysentry.app.ui.theme.TextPrimary
import com.paysentry.app.ui.theme.Violet

// ---------------------------------------------------------------------------
// Screen header — title + subtitle with a subtle accent bar
// ---------------------------------------------------------------------------

@Composable
fun ScreenHeader(title: String, subtitle: String, modifier: Modifier = Modifier) {
    Row(modifier.fillMaxWidth().padding(bottom = 20.dp)) {
        Box(
            Modifier
                .padding(top = 4.dp, end = 12.dp)
                .size(width = 4.dp, height = 42.dp)
                .background(
                    Brush.verticalGradient(listOf(Cyan, Violet)),
                    RoundedCornerShape(2.dp),
                )
        )
        Column {
            Text(title, style = MaterialTheme.typography.headlineMedium, color = TextPrimary)
            Spacer(Modifier.height(3.dp))
            Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = TextMuted)
        }
    }
}

// ---------------------------------------------------------------------------
// Top bar with wallet chip (used on the Home dashboard)
// ---------------------------------------------------------------------------

@Composable
fun WalletTopBar(address: String, onRefresh: () -> Unit, onLogout: () -> Unit, modifier: Modifier = Modifier) {
    val transition = rememberInfiniteTransition(label = "topbar")
    val dot by transition.animateFloat(
        initialValue = 0.4f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(1200), RepeatMode.Reverse),
        label = "dot",
    )
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        color = GlassFill,
        border = androidx.compose.foundation.BorderStroke(1.dp, GlassBorder),
    ) {
        Row(
            Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier
                    .size(10.dp)
                    .background(Green.copy(alpha = dot), CircleShape)
            )
            Spacer(Modifier.width(10.dp))
            // address — tap to copy
            Surface(
                onClick = {
                    androidx.compose.ui.platform.LocalClipboardManager.current.setText(
                        androidx.compose.ui.text.AnnotatedString(address)
                    )
                },
                shape = RoundedCornerShape(12.dp),
                color = Color.Transparent,
            ) {
                Column(Modifier.weight(1f).padding(vertical = 2.dp)) {
                    Text("CONNECTED · TAP TO COPY", fontSize = 9.sp, letterSpacing = 2.sp, color = TextMuted, fontWeight = FontWeight.Bold)
                    Text(
                        address.take(6) + "…" + address.takeLast(4),
                        fontFamily = FontFamily.Monospace,
                        fontSize = 14.sp,
                        color = TextPrimary,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
            Spacer(Modifier.width(8.dp))
            Surface(
                onClick = onRefresh,
                shape = CircleShape,
                color = Cyan.copy(alpha = 0.15f),
            ) {
                Text(
                    "Refresh",
                    Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    color = Cyan,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 12.sp,
                )
            }
            Spacer(Modifier.width(8.dp))
            Surface(
                onClick = onLogout,
                shape = CircleShape,
                color = Red.copy(alpha = 0.15f),
            ) {
                Text(
                    "Lock",
                    Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    color = Red,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 12.sp,
                )
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Dark input field
// ---------------------------------------------------------------------------

@Composable
fun PayInput(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    placeholder: String = "",
    monospace: Boolean = false,
    modifier: Modifier = Modifier,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, color = TextMuted) },
        placeholder = { Text(placeholder, color = TextMuted.copy(alpha = 0.5f)) },
        singleLine = true,
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Cyan,
            unfocusedBorderColor = GlassBorder,
            focusedContainerColor = Color(0xFF0A0E1A),
            unfocusedContainerColor = Color(0xFF0A0E1A),
            cursorColor = Cyan,
            focusedLabelColor = Cyan,
        ),
        textStyle = androidx.compose.ui.text.TextStyle(
            color = TextPrimary,
            fontFamily = if (monospace) FontFamily.Monospace else FontFamily.Default,
            fontSize = if (monospace) 13.sp else 15.sp,
        ),
    )
}

// ---------------------------------------------------------------------------
// Verdict pill
// ---------------------------------------------------------------------------

private fun verdictColors(r: MatchResult): Pair<Color, Color> = when (r) {
    MatchResult.FULL_MATCH -> Color(0x1A34D399) to Green
    MatchResult.CLOSE_MATCH -> Color(0x1AFBBF24) to Amber
    MatchResult.NO_MATCH -> Color(0x1AF87171) to Red
    MatchResult.NOT_FOUND -> Color(0x0A64748B) to TextMuted
}

@Composable
fun VerdictPill(result: MatchResult?, modifier: Modifier = Modifier, loading: Boolean = false) {
    AnimatedVisibility(visible = result != null || loading, enter = fadeIn(), exit = fadeOut()) {
        val r = result ?: MatchResult.NOT_FOUND
        val (bg, fg) = verdictColors(r)
        Surface(
            modifier = modifier,
            shape = CircleShape,
            color = bg,
            border = androidx.compose.foundation.BorderStroke(1.dp, fg.copy(alpha = 0.5f)),
        ) {
            Row(
                Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (loading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(14.dp),
                        strokeWidth = 2.dp,
                        color = Cyan,
                    )
                    Spacer(Modifier.size(8.dp))
                }
                Text(
                    if (loading) "CHECKING…" else r.label,
                    color = fg,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.5.sp,
                    fontSize = 13.sp,
                )
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Glass card
// ---------------------------------------------------------------------------

@Composable
fun GlassCard(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        color = GlassFill,
        border = androidx.compose.foundation.BorderStroke(1.dp, GlassBorder),
    ) {
        content()
    }
}

// ---------------------------------------------------------------------------
// Premium gradient button with animated sheen
// ---------------------------------------------------------------------------

@Composable
fun GradientButton(
    text: String,
    onClick: () -> Unit,
    enabled: Boolean = true,
    loading: Boolean = false,
    modifier: Modifier = Modifier,
) {
    val transition = rememberInfiniteTransition(label = "btn")
    val glow by transition.animateFloat(
        initialValue = 0.12f,
        targetValue = 0.35f,
        animationSpec = infiniteRepeatable(tween(1600), RepeatMode.Reverse),
        label = "glow",
    )
    Surface(
        onClick = onClick,
        enabled = enabled && !loading,
        modifier = modifier.fillMaxWidth().height(54.dp),
        shape = RoundedCornerShape(16.dp),
        color = Color.Transparent,
    ) {
        Box(
            Modifier
                .background(
                    if (enabled) Brush.horizontalGradient(listOf(Color(0xFF22D3EE), Color(0xFF7C6CF0), Violet))
                    else Brush.horizontalGradient(listOf(Color(0xFF1A2138), Color(0xFF1A2138)))
                )
        ) {
            // animated sheen
            if (enabled) {
                Box(
                    Modifier
                        .matchParentSize()
                        .background(
                            Brush.horizontalGradient(
                                0f to Color.Transparent,
                                0.5f to Color.White.copy(alpha = glow),
                                1f to Color.Transparent,
                            )
                        )
                )
            }
            Box(Modifier.matchParentSize(), contentAlignment = Alignment.Center) {
                if (loading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(22.dp),
                        strokeWidth = 2.5.dp,
                        color = Ink,
                    )
                } else {
                    Text(
                        text,
                        color = if (enabled) Ink else TextMuted,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        letterSpacing = 0.3.sp,
                    )
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Info row
// ---------------------------------------------------------------------------

@Composable
fun InfoRow(label: String, value: String, valueColor: Color = TextPrimary) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 5.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = TextMuted)
        Text(
            value,
            style = MaterialTheme.typography.bodyMedium,
            color = valueColor,
            fontWeight = FontWeight.Medium,
            fontFamily = if (value.length > 20) FontFamily.Monospace else FontFamily.Default,
            fontSize = if (value.length > 20) 12.sp else 14.sp,
        )
    }
}

// ---------------------------------------------------------------------------
// Small labelled stat chip (used in balance cards)
// ---------------------------------------------------------------------------

@Composable
fun StatLabel(text: String, color: Color, modifier: Modifier = Modifier) {
    Text(
        text,
        modifier = modifier,
        color = color,
        fontSize = 11.sp,
        letterSpacing = 1.5.sp,
        fontWeight = FontWeight.Bold,
    )
}