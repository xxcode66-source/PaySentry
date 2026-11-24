package com.paysentry.app.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.paysentry.app.data.AgentSession
import com.paysentry.app.data.CoPVerdict
import com.paysentry.app.data.GuardResult
import com.paysentry.app.data.GuardedPaymentResult
import com.paysentry.app.data.PayeeIdentity
import com.paysentry.app.data.PaySentryClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.math.BigInteger

/**
 * Holds app-wide blockchain state. Reads/writes run on the client (web3j on IO).
 *
 * NOTE: wallet private key is intentionally NOT here — set it on the client before
 * any write, or pass through a wallet screen. For the demo, a testnet key can be
 * injected in MainActivity.
 */
class PaySentryViewModel : ViewModel() {

    private val client = PaySentryClient()

    // --- wallet
    private val _wallet = MutableStateFlow<String?>(null)
    val wallet: StateFlow<String?> = _wallet.asStateFlow()

    // --- balance
    private val _tusd8 = MutableStateFlow<BigInteger>(BigInteger.ZERO)
    val tusd8: StateFlow<BigInteger> = _tusd8.asStateFlow()
    private val _tqday = MutableStateFlow<BigInteger>(BigInteger.ZERO)
    val tqday: StateFlow<BigInteger> = _tqday.asStateFlow()

    // --- verify
    private val _verdict = MutableStateFlow<CoPVerdict?>(null)
    val verdict: StateFlow<CoPVerdict?> = _verdict.asStateFlow()
    private val _identity = MutableStateFlow<PayeeIdentity?>(null)
    val identity: StateFlow<PayeeIdentity?> = _identity.asStateFlow()
    private val _checking = MutableStateFlow(false)
    val checking: StateFlow<Boolean> = _checking.asStateFlow()

    // --- sessions
    private val _sessions = MutableStateFlow<List<AgentSession>>(emptyList())
    val sessions: StateFlow<List<AgentSession>> = _sessions.asStateFlow()

    // --- message / error surface
    private val _toast = MutableStateFlow<String?>(null)
    val toast: StateFlow<String?> = _toast.asStateFlow()

    fun setWalletKey(key: String?) {
        client.setPrivateKey(key)
        _wallet.value = client.address()
        refreshBalance()
    }

    /** Restore a persisted key at startup (no-op if none saved). */
    fun restoreWallet(ctx: android.content.Context) {
        val key = com.paysentry.app.data.WalletStorage.loadKey(ctx) ?: return
        setWalletKey(key)
    }

    /** Persist the key so the app unlocks automatically next launch. */
    fun setWalletKeyPersisted(ctx: android.content.Context, key: String) {
        com.paysentry.app.data.WalletStorage.saveKey(ctx, key)
        setWalletKey(key)
    }

    /** Explicit logout — clears the stored key and state. */
    fun logout(ctx: android.content.Context) {
        com.paysentry.app.data.WalletStorage.clear(ctx)
        client.setPrivateKey(null)
        _wallet.value = null
        _tusd8.value = BigInteger.ZERO
        _tqday.value = BigInteger.ZERO
        _sessions.value = emptyList()
        _verdict.value = null
        _identity.value = null
    }

    fun clearToast() { _toast.value = null }

    fun refreshBalance() {
        val w = _wallet.value ?: return
        viewModelScope.launch {
            _tusd8.value = runCatching { client.tusd8Balance(w) }.getOrDefault(BigInteger.ZERO)
            _tqday.value = runCatching { client.nativeBalance(w) }.getOrDefault(BigInteger.ZERO)
        }
    }

    fun checkPayee(payee: String, name: String) {
        if (payee.isEmpty() || name.isEmpty()) return
        viewModelScope.launch {
            _checking.value = true
            _verdict.value = null
            runCatching { client.checkPayee(payee, name) }
                .onSuccess { _verdict.value = it }
                .onFailure { _toast.value = it.message }
            runCatching { client.payeeOf(payee) }
                .onSuccess { _identity.value = it }
            _checking.value = false
        }
    }

    fun guardPay(payee: String, name: String, amountWei: BigInteger, enforce: Boolean = true) {
        if (_wallet.value == null) { _toast.value = "Connect wallet first"; return }
        viewModelScope.launch {
            runCatching { client.executeGuarded(payee, name, amountWei, enforce) }
                .onSuccess { r ->
                    if (r.paid) {
                        _toast.value = "✓ Paid — ${r.verdict.label}"
                        refreshBalance()
                    } else {
                        _toast.value = "✕ Blocked — ${r.verdict.label}"
                    }
                }
                .onFailure { _toast.value = it.message }
        }
    }

    fun registerPayee(name: String) {
        if (_wallet.value == null) { _toast.value = "Connect wallet first"; return }
        viewModelScope.launch {
            runCatching { client.registerPayee(name) }
                .onSuccess { _toast.value = "Identity registered on-chain" }
                .onFailure { _toast.value = it.message }
        }
    }

    fun attest(payee: String, name: String) {
        if (_wallet.value == null) { _toast.value = "Connect wallet first"; return }
        viewModelScope.launch {
            runCatching { client.attest(payee, name) }
                .onSuccess { _toast.value = "Attestation recorded" }
                .onFailure { _toast.value = it.message }
        }
    }

    fun loadSessions(owner: String) {
        viewModelScope.launch {
            runCatching { client.sessionIdsOf(owner) }
                .onSuccess { ids ->
                    _sessions.value = ids.mapNotNull { runCatching { client.session(it) }.getOrNull() }
                }
                .onFailure { _toast.value = it.message }
        }
    }

    fun createSession(agent: String, maxWei: BigInteger, capWei: BigInteger, days: Long) {
        if (_wallet.value == null) { _toast.value = "Connect wallet first"; return }
        viewModelScope.launch {
            runCatching { client.createSession(agent, maxWei, capWei, days * 86400) }
                .onSuccess { _toast.value = "Session created"; loadSessions(_wallet.value!!) }
                .onFailure { _toast.value = it.message }
        }
    }

    fun revokeSession(id: Long) {
        if (_wallet.value == null) { _toast.value = "Connect wallet first"; return }
        viewModelScope.launch {
            runCatching { client.revokeSession(id) }
                .onSuccess { _toast.value = "Session revoked"; loadSessions(_wallet.value!!) }
                .onFailure { _toast.value = it.message }
        }
    }
}