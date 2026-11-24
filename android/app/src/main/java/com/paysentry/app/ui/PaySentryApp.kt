package com.paysentry.app.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import com.paysentry.app.ui.screens.HomeScreen
import com.paysentry.app.ui.screens.PayScreen
import com.paysentry.app.ui.screens.RegistryScreen
import com.paysentry.app.ui.screens.SessionsScreen
import com.paysentry.app.ui.screens.VerifyScreen

enum class AppTab(val label: String, val icon: ImageVector) {
    Home("Home", Icons.Filled.Home),
    Verify("Verify", Icons.Filled.CheckCircle),
    Pay("Pay", Icons.Filled.Send),
    Sessions("Agents", Icons.Filled.Lock),
    Registry("Registry", Icons.Filled.Person),
}

/** Root scaffold with bottom navigation + shared ViewModel. */
@Composable
fun PaySentryApp(vm: PaySentryViewModel, onSetWallet: (String?) -> Unit) {
    var tab by remember { mutableStateOf(AppTab.Home) }
    val wallet by vm.wallet.collectAsState()

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            // hide bottom nav until wallet is set
            if (wallet != null) {
                NavigationBar(containerColor = MaterialTheme.colorScheme.surfaceVariant) {
                    AppTab.entries.forEach { t ->
                        NavigationBarItem(
                            selected = tab == t,
                            onClick = { tab = t },
                            icon = { Icon(t.icon, contentDescription = t.label) },
                            label = { Text(t.label, fontSize = MaterialTheme.typography.labelSmall.fontSize) },
                        )
                    }
                }
            }
        },
    ) { innerPadding ->
        if (wallet == null) {
            // Full-screen gate — require a private key before anything else.
            com.paysentry.app.ui.components.WalletGate(
                onSubmit = { key ->
                    vm.setWalletKey(key)
                    onSetWallet(key)
                }
            )
        } else {
            androidx.compose.foundation.layout.Column(
                Modifier.padding(innerPadding).fillMaxSize()
            ) {
                when (tab) {
                    AppTab.Home -> HomeScreen(vm)
                    AppTab.Verify -> VerifyScreen(vm)
                    AppTab.Pay -> PayScreen(vm)
                    AppTab.Sessions -> SessionsScreen(vm)
                    AppTab.Registry -> RegistryScreen(vm)
                }
            }
        }
    }
}