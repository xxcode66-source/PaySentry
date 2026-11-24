package com.paysentry.app.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.web3j.abi.TypeReference
import org.web3j.abi.datatypes.Function
import org.web3j.abi.datatypes.Type
import org.web3j.abi.datatypes.Utf8String
import org.web3j.abi.datatypes.generated.Uint256
import org.web3j.crypto.Credentials
import org.web3j.protocol.Web3j
import org.web3j.protocol.core.DefaultBlockParameterName
import org.web3j.protocol.http.HttpService
import org.web3j.tx.RawTransactionManager
import org.web3j.tx.gas.DefaultGasProvider
import java.math.BigInteger

/**
 * Thin web3j wrapper around PaySentry's contracts.
 *
 * Uses raw contract calls (via Function + eth_call) rather than generated Java
 * wrappers, so it stays light and the ABI lives in one place.
 */
class PaySentryClient(
    private val privateKey: String? = null,
) {
    private val web3j: Web3j = Web3j.build(HttpService(ChainConfig.RPC_URL))

    private val fromAddress: String?
        get() = privateKey?.let { Credentials.create(it).address }

    private val credentials: Credentials?
        get() = privateKey?.let { Credentials.create(it) }

    // ------------------------------------------------------------------ registry

    /** checkPayee(payee, name) → (result, matchedAs, level) */
    suspend fun checkPayee(payee: String, name: String): CoPVerdict = withContext(Dispatchers.IO) {
        val fn = Function(
            "checkPayee",
            listOf<Type<*>>(
                org.web3j.abi.datatypes.Address(payee),
                Utf8String(name),
            ),
            listOf(
                TypeReference.create(java.lang.Integer::class.java, false) as TypeReference<Type<*>>,
                TypeReference.create(String::class.java, true) as TypeReference<Type<*>>,
                TypeReference.create(java.lang.Integer::class.java, false) as TypeReference<Type<*>>,
            ),
        )
        val raw = web3j.ethCall(
            org.web3j.protocol.core.methods.request.Transaction.createEthCallTransaction(
                fromAddress ?: "0x0000000000000000000000000000000000000000",
                ChainConfig.REGISTRY_ADDRESS,
                org.web3j.abi.FunctionEncoder.encode(fn),
            ),
            DefaultBlockParameterName.LATEST,
        ).send()

        if (raw.hasError()) throw RuntimeException(raw.error.message)

        val decoded = org.web3j.abi.FunctionReturnDecoder.decode(raw.value, fn.outputParameters)
        val result = (decoded.getOrNull(0) as? Uint256)?.value?.toInt() ?: 0
        val matchedAs = (decoded.getOrNull(1) as? Utf8String)?.value ?: ""
        val level = (decoded.getOrNull(2) as? Uint256)?.value?.toInt() ?: 0
        CoPVerdict(MatchResult.fromCode(result), matchedAs, level)
    }

    /** payeeOf(payee) → (displayName, registeredAt, level, attestations) */
    suspend fun payeeOf(payee: String): PayeeIdentity = withContext(Dispatchers.IO) {
        val fn = Function(
            "payeeOf",
            listOf<Type<*>>(org.web3j.abi.datatypes.Address(payee)),
            listOf(
                TypeReference.create(String::class.java, true) as TypeReference<Type<*>>,
                TypeReference.create(java.lang.Long::class.java, false) as TypeReference<Type<*>>,
                TypeReference.create(java.lang.Integer::class.java, false) as TypeReference<Type<*>>,
                TypeReference.create(java.lang.Long::class.java, false) as TypeReference<Type<*>>,
            ),
        )
        val raw = call(fn, ChainConfig.REGISTRY_ADDRESS)
        val decoded = org.web3j.abi.FunctionReturnDecoder.decode(raw, fn.outputParameters)
        PayeeIdentity(
            displayName = (decoded.getOrNull(0) as? Utf8String)?.value ?: "",
            registeredAt = (decoded.getOrNull(1) as? Uint256)?.value?.toLong() ?: 0,
            level = (decoded.getOrNull(2) as? Uint256)?.value?.toInt() ?: 0,
            attestationCount = (decoded.getOrNull(3) as? Uint256)?.value?.toLong() ?: 0,
            isRegistered = (decoded.getOrNull(1) as? Uint256)?.value?.toLong()?.let { it > 0 } ?: false,
        )
    }

    suspend fun isVerifier(addr: String): Boolean = withContext(Dispatchers.IO) {
        val fn = Function(
            "isVerifier",
            listOf<Type<*>>(org.web3j.abi.datatypes.Address(addr)),
            listOf(TypeReference.create(java.lang.Boolean::class.java, false) as TypeReference<Type<*>>),
        )
        val raw = call(fn, ChainConfig.REGISTRY_ADDRESS)
        val decoded = org.web3j.abi.FunctionReturnDecoder.decode(raw, fn.outputParameters)
        (decoded.getOrNull(0) as? org.web3j.abi.datatypes.Bool)?.value ?: false
    }

    // ------------------------------------------------------------------ guard (read)

    suspend fun sessionIdsOf(owner: String): List<Long> = withContext(Dispatchers.IO) {
        val fn = Function(
            "getSessionIds",
            listOf<Type<*>>(org.web3j.abi.datatypes.Address(owner)),
            listOf(
                TypeReference.create(object : org.web3j.abi.TypeReference<org.web3j.abi.datatypes.DynamicArray<Type<*>>>() {})
                    as TypeReference<Type<*>>,
            ),
        )
        val raw = call(fn, ChainConfig.GUARD_ADDRESS)
        val decoded = org.web3j.abi.FunctionReturnDecoder.decode(raw, fn.outputParameters)
        val arr = decoded.getOrNull(0) as? org.web3j.abi.datatypes.DynamicArray<*>
        arr?.value?.mapNotNull { (it as? Uint256)?.value?.toLong() } ?: emptyList()
    }

    suspend fun session(id: Long): AgentSession = withContext(Dispatchers.IO) {
        val fn = Function(
            "sessions",
            listOf<Type<*>>(Uint256(BigInteger.valueOf(id))),
            listOf(
                TypeReference.create(String::class.java, false) as TypeReference<Type<*>>,
                TypeReference.create(String::class.java, false) as TypeReference<Type<*>>,
                TypeReference.create(String::class.java, false) as TypeReference<Type<*>>,
                TypeReference.create(java.lang.Long::class.java, false) as TypeReference<Type<*>>,
                TypeReference.create(java.lang.Long::class.java, false) as TypeReference<Type<*>>,
                TypeReference.create(java.lang.Long::class.java, false) as TypeReference<Type<*>>,
                TypeReference.create(java.lang.Long::class.java, false) as TypeReference<Type<*>>,
                TypeReference.create(java.lang.Boolean::class.java, false) as TypeReference<Type<*>>,
                TypeReference.create(java.lang.Integer::class.java, false) as TypeReference<Type<*>>,
            ),
        )
        val raw = call(fn, ChainConfig.GUARD_ADDRESS)
        val decoded = org.web3j.abi.FunctionReturnDecoder.decode(raw, fn.outputParameters)
        AgentSession(
            id = id,
            owner = (decoded.getOrNull(0) as? org.web3j.abi.datatypes.Address)?.value ?: "",
            agent = (decoded.getOrNull(1) as? org.web3j.abi.datatypes.Address)?.value ?: "",
            token = (decoded.getOrNull(2) as? org.web3j.abi.datatypes.Address)?.value ?: "",
            maxPerTx = (decoded.getOrNull(3) as? Uint256)?.value?.toLong() ?: 0,
            capTotal = (decoded.getOrNull(4) as? Uint256)?.value?.toLong() ?: 0,
            spentTotal = (decoded.getOrNull(5) as? Uint256)?.value?.toLong() ?: 0,
            expiresAt = (decoded.getOrNull(6) as? Uint256)?.value?.toLong() ?: 0,
            active = (decoded.getOrNull(7) as? org.web3j.abi.datatypes.Bool)?.value ?: false,
        )
    }

    // ------------------------------------------------------------------ writes

    /** registerPayee(displayName) */
    suspend fun registerPayee(displayName: String): String = withContext(Dispatchers.IO) {
        requireNotNull(credentials) { "Wallet not configured" }
        val fn = Function(
            "registerPayee",
            listOf<Type<*>>(Utf8String(displayName)),
            emptyList(),
        )
        send(fn, ChainConfig.REGISTRY_ADDRESS)
    }

    /** attest(payee, name) — verifier only */
    suspend fun attest(payee: String, name: String): String = withContext(Dispatchers.IO) {
        requireNotNull(credentials) { "Wallet not configured" }
        val fn = Function(
            "attest",
            listOf<Type<*>>(org.web3j.abi.datatypes.Address(payee), Utf8String(name)),
            emptyList(),
        )
        send(fn, ChainConfig.REGISTRY_ADDRESS)
    }

    /** executeGuarded(token, payee, name, amount, mode) — returns tx hash */
    suspend fun executeGuarded(
        payee: String,
        name: String,
        amountWei: BigInteger,
        enforce: Boolean = true,
    ): GuardedPaymentResult = withContext(Dispatchers.IO) {
        requireNotNull(credentials) { "Wallet not configured" }

        // 1. pre-check
        val verdict = checkPayeeInternal(payee, name)
        val bad = verdict.isBad
        if (bad && enforce) {
            return@withContext GuardedPaymentResult(verdict, paid = false, txHash = null)
        }

        // 2. approve the guard for amount
        approve(ChainConfig.TUSD8_ADDRESS, ChainConfig.GUARD_ADDRESS, amountWei)

        // 3. executeGuarded
        val fn = Function(
            "executeGuarded",
            listOf<Type<*>>(
                org.web3j.abi.datatypes.Address(ChainConfig.TUSD8_ADDRESS),
                org.web3j.abi.datatypes.Address(payee),
                Utf8String(name),
                Uint256(amountWei),
                Uint256(BigInteger.valueOf(if (enforce) 1L else 0L)),
            ),
            listOf(TypeReference.create(java.lang.Integer::class.java, false) as TypeReference<Type<*>>),
        )
        val tx = send(fn, ChainConfig.GUARD_ADDRESS)
        GuardedPaymentResult(verdict, paid = true, txHash = tx)
    }

    /** createSession(agent, token, maxPerTx, capTotal, durationSec, mode) */
    suspend fun createSession(
        agent: String,
        maxPerTxWei: BigInteger,
        capTotalWei: BigInteger,
        durationSeconds: Long,
    ): String = withContext(Dispatchers.IO) {
        requireNotNull(credentials) { "Wallet not configured" }

        approve(ChainConfig.TUSD8_ADDRESS, ChainConfig.GUARD_ADDRESS, capTotalWei)

        val fn = Function(
            "createSession",
            listOf<Type<*>>(
                org.web3j.abi.datatypes.Address(agent),
                org.web3j.abi.datatypes.Address(ChainConfig.TUSD8_ADDRESS),
                Uint256(maxPerTxWei),
                Uint256(capTotalWei),
                Uint256(BigInteger.valueOf(durationSeconds)),
                Uint256(BigInteger.ONE), // Enforce — agents always enforced
            ),
            emptyList(),
        )
        send(fn, ChainConfig.GUARD_ADDRESS)
    }

    suspend fun revokeSession(id: Long): String = withContext(Dispatchers.IO) {
        requireNotNull(credentials) { "Wallet not configured" }
        val fn = Function(
            "revokeSession",
            listOf<Type<*>>(Uint256(BigInteger.valueOf(id))),
            emptyList(),
        )
        send(fn, ChainConfig.GUARD_ADDRESS)
    }

    // ------------------------------------------------------------------ erc20

    suspend fun balanceOf(token: String, owner: String): BigInteger = withContext(Dispatchers.IO) {
        val fn = Function(
            "balanceOf",
            listOf<Type<*>>(org.web3j.abi.datatypes.Address(owner)),
            listOf(TypeReference.create(java.lang.Long::class.java, false) as TypeReference<Type<*>>),
        )
        val raw = call(fn, token)
        val decoded = org.web3j.abi.FunctionReturnDecoder.decode(raw, fn.outputParameters)
        (decoded.getOrNull(0) as? Uint256)?.value ?: BigInteger.ZERO
    }

    suspend fun tusd8Balance(owner: String): BigInteger =
        balanceOf(ChainConfig.TUSD8_ADDRESS, owner)

    private suspend fun checkPayeeInternal(payee: String, name: String): CoPVerdict =
        checkPayee(payee, name)

    private suspend fun approve(token: String, spender: String, amount: BigInteger) {
        val fn = Function(
            "approve",
            listOf<Type<*>>(
                org.web3j.abi.datatypes.Address(spender),
                Uint256(amount),
            ),
            listOf(TypeReference.create(java.lang.Boolean::class.java, false) as TypeReference<Type<*>>),
        )
        send(fn, token)
    }

    // ------------------------------------------------------------------ internals

    private fun call(fn: Function, to: String): String {
        val tx = org.web3j.protocol.core.methods.request.Transaction.createEthCallTransaction(
            fromAddress ?: "0x0000000000000000000000000000000000000000",
            to,
            org.web3j.abi.FunctionEncoder.encode(fn),
        )
        val resp = web3j.ethCall(tx, DefaultBlockParameterName.LATEST).send()
        if (resp.hasError()) throw RuntimeException(resp.error.message)
        return resp.value
    }

    private fun send(fn: Function, to: String): String {
        val cred = requireNotNull(credentials)
        val manager = RawTransactionManager(web3j, cred, ChainConfig.CHAIN_ID)
        val encoded = org.web3j.abi.FunctionEncoder.encode(fn)
        val hash = manager.sendTransaction(DefaultGasProvider.GAS_PRICE, DefaultGasProvider.GAS_LIMIT, to, encoded, BigInteger.ZERO)
        return hash.transactionHash
    }

    private fun TypeReference<*>.unused() = this
}