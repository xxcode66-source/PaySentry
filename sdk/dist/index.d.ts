/**
 * paysentry-sdk — drop-in Confirmation-of-Payee for stablecoin payments on QDay Aevum.
 *
 * Any dapp (checkout, invoice, agent) calls `guardPay()` right before it moves funds.
 * The SDK runs the on-chain CoP check first and refuses to proceed when the intended
 * recipient name does not match the payee's verified identity.
 *
 * Pure viem — no wagmi/RainbowKit dependency — so it works anywhere viem works
 * (browser, Node, agent scripts, and later React Native / mobile).
 *
 * Defaults point at the PaySentry contracts already deployed to QDay Aevum Testnet
 * (chain 44005); every address is overridable so you can plug in your own deployment.
 */
import { Address, Chain, createPublicClient, createWalletClient, defineChain, http } from "viem";
export declare const QDAY_CHAIN_ID = 44005;
export declare const QDAY_RPC = "https://rpc-test.qday.info";
export declare const DEFAULT_REGISTRY_ADDRESS = "0xfFB0288590944e42aFF84033a8FF5A6c35d34b22";
export declare const DEFAULT_GUARD_ADDRESS = "0x47e29aB215712b887F3A642d9ba60Df8d6F83828";
export declare const DEFAULT_TUSD8_ADDRESS = "0x456569838f1d43009A91ebA4263147Afd7233483";
/** Ready-to-use chain object for `createWalletClient`/`createPublicClient`. */
export declare const QDAY_CHAIN: Chain;
export declare enum MatchResult {
    NotFound = 0,
    NoMatch = 1,
    CloseMatch = 2,
    FullMatch = 3
}
export declare enum GuardMode {
    Warn = 0,
    Enforce = 1
}
export type CoPVerdict = {
    result: MatchResult;
    /** registry label matched, if any */
    matchedAs: string;
    /** 0 None · 1 SelfClaimed · 2 Attested */
    level: number;
};
export type PaySentryConfig = {
    rpc?: string;
    chain?: Chain;
    registryAddress?: Address;
    guardAddress?: Address;
    tusd8Address?: Address;
};
export type GuardPayResult = {
    verdict: CoPVerdict;
    verdictLabel: "NOT FOUND" | "NO MATCH" | "CLOSE MATCH" | "FULL MATCH";
    /** true when the transfer was executed on-chain */
    paid: boolean;
    /** transaction hash when `paid` */
    txHash?: Address;
    /** human explanation (use for UI messaging / logs) */
    message: string;
};
/** Wallet-ish signer: anything viem can writeContract with. */
type Signer = {
    account: {
        address: Address;
    };
    writeContract: (p: unknown) => Promise<Address>;
};
export declare const verdictLabel: (r: MatchResult) => "NOT FOUND" | "NO MATCH" | "CLOSE MATCH" | "FULL MATCH";
/** Read the on-chain CoP verdict for a payee/name pair. */
export declare function checkPayee(payee: Address, expectedName: string, config?: PaySentryConfig): Promise<CoPVerdict>;
/** Convenience: does this payee/name pair pass the CoP check? */
export declare function isPayeeConfirmed(payee: Address, expectedName: string, config?: PaySentryConfig): Promise<boolean>;
export declare function approveAllowance(signer: Signer, spender: Address, amountWei: bigint, token: Address, config?: PaySentryConfig): Promise<Address>;
/**
 * Run the CoP check, then — if safe — pay `amount` tUSD8 to `payee`.
 *
 * In Enforce mode a NoMatch/NotFound is blocked (returned `paid:false`, no funds move).
 * In Warn mode it still pays but the verdict + mismatch are returned for UI messaging.
 */
export declare function guardPay(args: {
    payee: Address;
    expectedName: string;
    amount: string;
    signer: Signer;
    mode?: GuardMode;
    onAllowanceNeeded?: () => void;
}, config?: PaySentryConfig): Promise<GuardPayResult>;
/**
 * Create a bounded session so an agent can spend the owner's tokens inside hard
 * limits (per-tx, lifetime cap, expiry). Returns the on-chain session id.
 */
export declare function createAgentSession(args: {
    agent: Address;
    token?: Address;
    maxPerTx: string;
    capTotal: string;
    durationDays: number;
    signer: Signer;
}, config?: PaySentryConfig): Promise<{
    sessionId: bigint;
    txHash: Address;
}>;
export { createPublicClient, createWalletClient, defineChain, http };
