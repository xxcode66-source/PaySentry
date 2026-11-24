package com.paysentry.app.data

import android.content.Context

/**
 * Persists the testnet private key so the user doesn't re-enter it on every
 * app launch. Cleared on explicit logout.
 */
object WalletStorage {
    private const val PREFS = "paysentry_wallet"
    private const val KEY_PRIVATE = "private_key"

    fun saveKey(ctx: Context, key: String?) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_PRIVATE, key)
            .apply()
    }

    fun loadKey(ctx: Context): String? =
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_PRIVATE, null)

    fun clear(ctx: Context) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .remove(KEY_PRIVATE)
            .apply()
    }
}