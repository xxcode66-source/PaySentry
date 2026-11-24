package com.paysentry.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.viewmodel.compose.viewModel
import com.paysentry.app.ui.PaySentryApp
import com.paysentry.app.ui.PaySentryViewModel
import com.paysentry.app.ui.theme.PaySentryTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            PaySentryTheme {
                val vm: PaySentryViewModel = viewModel()
                PaySentryApp(vm = vm, onSetWallet = {})
            }
        }
    }
}