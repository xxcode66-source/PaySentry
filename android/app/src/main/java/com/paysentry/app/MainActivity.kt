package com.paysentry.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.paysentry.app.ui.screens.HomeScreen
import com.paysentry.app.ui.theme.PaySentryTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            PaySentryTheme {
                HomeScreen(
                    onCheckBalance = {},
                )
            }
        }
    }
}