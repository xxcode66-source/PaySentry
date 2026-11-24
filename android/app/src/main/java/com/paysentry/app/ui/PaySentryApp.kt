package com.paysentry.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.Button
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.paysentry.app.ui.screens.HomeScreen
import com.paysentry.app.ui.screens.PayScreen
import com.paysentry.app.ui.screens.RegistryScreen
import com.paysentry.app.ui.screens.SessionsScreen
import com.paysentry.app.ui.screens.VerifyScreen
import com.paysentry.app.ui.theme.Cyan

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
        },
    ) { innerPadding ->
        androidx.compose.foundation.layout.Column(
            Modifier.padding(innerPadding).fillMaxSize()
        ) {
            if (wallet == null) {
                WalletBanner(vm, onSetWallet)
            }
            when (tab) {
                AppTab.Home -> HomeScreen(onCheckBalance = { vm.refreshBalance() })
                AppTab.Verify -> VerifyScreen(vm)
                AppTab.Pay -> PayScreen(vm)
                AppTab.Sessions -> SessionsScreen(vm)
                AppTab.Registry -> RegistryScreen(vm)
            }
        }
    }
}

/** Compact banner to set a testnet wallet key (demo purpose only). */
@Composable
private fun WalletBanner(vm: PaySentryViewModel, onSetWallet: (String?) -> Unit) {
    var key by remember { mutableStateOf("") }
    androidx.compose.foundation.layout.Column(
        Modifier
            .fillMaxWidth()
            .background(Cyan.copy(alpha = 0.08f))
            .padding(horizontal = 20.dp, vertical = 10.dp)
    ) {
        Text(
            "Enter a testnet private key to enable writes (demo).",
            color = Cyan,
            style = MaterialTheme.typography.labelSmall,
        )
        androidx.compose.foundation.layout.Row(
            Modifier.fillMaxWidth(),
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        ) {
            androidx.compose.foundation.layout.Box(Modifier.weight(1f)) {
                com.paysentry.app.ui.components.PayInput(
                    value = key,
                    onValueChange = { key = it },
                    label = "",
                    placeholder = "0x… private key",
                    monospace = true,
                )
            }
            Spacer(Modifier.width(8.dp))
            androidx.compose.material3.Button(
                onClick = {
                    onSetWallet(key.trim().ifBlank { null })
                    vm.setWalletKey(key.trim().ifBlank { null })
                },
                enabled = key.isNotBlank(),
            ) {
                Text("Use")
            }
        }
    }
}