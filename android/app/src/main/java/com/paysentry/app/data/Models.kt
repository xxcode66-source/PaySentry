package com.paysentry.app.data

/**
 * Confirmation-of-Payee verdict — mirrors the on-chain PayeeRegistry.MatchResult.
 */
enum class MatchResult(val code: Int, val label: String) {
    NOT_FOUND(0, "NOT FOUND"),
    NO_MATCH(1, "NO MATCH"),
    CLOSE_MATCH(2, "CLOSE MATCH"),
    FULL_MATCH(3, "FULL MATCH");

    val isBad: Boolean get() = this == NOT_FOUND || this == NO_MATCH

    companion object {
        fun fromCode(code: Int): MatchResult =
            entries.firstOrNull { it.code == code } ?: NOT_FOUND
    }
}

/** Payee identity card returned from the registry. */
data class PayeeIdentity(
    val displayName: String,
    val registeredAt: Long,
    val level: Int,           // 0 none · 1 self-claimed · 2 attested
    val attestationCount: Long,
    val isRegistered: Boolean,
) {
    val levelLabel: String
        get() = when (level) {
            2 -> "Attested"
            1 -> "Self-claimed"
            else -> "Unknown"
        }
}

/** Full CoP verdict for a payee/name pair. */
data class CoPVerdict(
    val result: MatchResult,
    val matchedAs: String,
    val level: Int,
) {
    val label: String get() = result.label
    val isSafe: Boolean get() = result == MatchResult.FULL_MATCH || result == MatchResult.CLOSE_MATCH
}

/** A bounded agent session. */
data class AgentSession(
    val id: Long,
    val owner: String,
    val agent: String,
    val token: String,
    val maxPerTx: Long,
    val capTotal: Long,
    val spentTotal: Long,
    val expiresAt: Long,
    val active: Boolean,
) {
    val usedPercent: Int
        get() = if (capTotal > 0) ((spentTotal * 100) / capTotal).toInt() else 0
}

/** Guarded payment result. */
data class GuardedPaymentResult(
    val verdict: CoPVerdict,
    val paid: Boolean,
    val txHash: String?,
)

sealed class GuardResult<out T> {
    data class Success<T>(val data: T) : GuardResult<T>()
    data class Error(val message: String) : GuardResult<Nothing>()
    data class Blocked(val message: String) : GuardResult<Nothing>()
}