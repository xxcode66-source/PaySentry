package com.paysentry.app.data

/**
 * QDay Aevum Testnet configuration + the live PaySentry deployment.
 */
object ChainConfig {
    const val CHAIN_ID = 44005L
    const val RPC_URL = "https://rpc-test.qday.info"
    const val EXPLORER_URL = "https://explorer-test.qday.info"

    // PaySentry contracts (live on testnet)
    const val REGISTRY_ADDRESS = "0xfFB0288590944e42aFF84033a8FF5A6c35d34b22"
    const val GUARD_ADDRESS = "0x47e29aB215712b887F3A642d9ba60Df8d6F83828"
    const val TUSD8_ADDRESS = "0x456569838f1d43009A91ebA4263147Afd7233483"

    const val TUSD8_DECIMALS = 6
}