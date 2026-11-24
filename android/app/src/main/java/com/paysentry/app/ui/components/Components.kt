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
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paysentry.app.data.MatchResult
import com.paysentry.app.ui.theme.Amber
import com.paysentry.app.ui.theme.Cyan
import com.paysentry.app.ui.theme.GlassBorder
import com.paysentry.app.ui.theme.GlassFill
import com.paysentry.app.ui.theme.Green
import com.paysentry.app.ui.theme.Red
import com.paysentry.app.ui.theme.TextMuted
import com.paysentry.app.ui.theme.TextPrimary

/** Section header used at the top of each screen. */
@Composable
fun ScreenHeader(title: String, subtitle: String, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxWidth().padding(bottom = 18.dp)) {
        Text(title, style = MaterialTheme.typography.headlineMedium, color = TextPrimary)
        Spacer(Modifier.height(4.dp))
        Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = TextMuted)
    }
}

/** A reusable dark input field with cyan focus. */
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
        label = { Text(label) },
        placeholder = { Text(placeholder, color = TextMuted.copy(alpha = 0.6f)) },
        singleLine = true,
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Cyan,
            unfocusedBorderColor = GlassBorder,
            focusedContainerColor = Color(0xFF0A0E1A),
            unfocusedContainerColor = Color(0xFF0A0E1A),
            cursorColor = Cyan,
        ),
        textStyle = androidx.compose.ui.text.TextStyle(
            color = TextPrimary,
            fontFamily = if (monospace) androidx.compose.ui.text.font.FontFamily.Monospace else androidx.compose.ui.text.font.FontFamily.Default,
            fontSize = if (monospace) 13.sp else 16.sp,
        ),
    )
}

/** Verdict pill matching the on-chain MatchResult. */
@Composable
fun VerdictPill(result: MatchResult?, modifier: Modifier = Modifier, loading: Boolean = false) {
    AnimatedVisibility(visible = result != null, enter = fadeIn(), exit = fadeOut()) {
        val r = result ?: MatchResult.NOT_FOUND
        val (bg, fg) = when (r) {
            MatchResult.FULL_MATCH -> Color(0x1A34D399) to Green
            MatchResult.CLOSE_MATCH -> Color(0x1AFBBF24) to Amber
            MatchResult.NO_MATCH -> Color(0x1AF87171) to Red
            MatchResult.NOT_FOUND -> Color(0x0A64748B) to TextMuted
        }
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

/** Card container with glass styling. */
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

/** Animated primary button. */
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
        initialValue = 0.18f,
        targetValue = 0.42f,
        animationSpec = infiniteRepeatable(tween(1400), RepeatMode.Reverse),
        label = "glow",
    )
    Surface(
        onClick = onClick,
        enabled = enabled && !loading,
        modifier = modifier.fillMaxWidth().height(52.dp),
        shape = RoundedCornerShape(16.dp),
        color = Color.Transparent,
    ) {
        Box(
            Modifier
                .background(
                    Brush.horizontalGradient(listOf(Cyan, Color(0xFF7C6CF0), Violet))
                )
        ) {
            Box(
                Modifier.matchParentSize().background(
                    Brush.horizontalGradient(listOf(Color.Transparent, Color.White.copy(alpha = glow), Color.Transparent))
                )
            )
            androidx.compose.foundation.layout.Box(Modifier.matchParentSize(), contentAlignment = Alignment.Center) {
                if (loading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(22.dp),
                        strokeWidth = 2.5.dp,
                        color = Color(0xFF05070D),
                    )
                } else {
                    Text(text, color = Color(0xFF05070D), fontWeight = FontWeight.Bold, fontSize = 15.sp)
                }
            }
        }
    }
}

/** Key-value info row for detail cards. */
@Composable
fun InfoRow(label: String, value: String, valueColor: Color = TextPrimary) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 5.dp),
        horizontalArrangement = androidx.compose.foundation.layout.Arrangement.SpaceBetween,
    ) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = TextMuted)
        Text(value, style = MaterialTheme.typography.bodyMedium, color = valueColor, fontWeight = FontWeight.Medium)
    }
}