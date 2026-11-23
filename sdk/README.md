# paysentry-sdk

Drop-in **Confirmation-of-Payee** guard for any stablecoin payment flow on QDay Aevum.

One call — `guardPay()` — checks the payee's on-chain identity against the name you
intend to pay, then moves the funds only if it's safe. A mismatched name reverts
before any token leaves the wallet.

**Pure viem.** No wagmi / RainbowKit / framework dependency. Works in the browser,
Node, agent scripts, and (with a viem React-Native transport) mobile.

---

## Install

```bash
npm install paysentry-sdk
```

Requires `viem` ≥ 2 as a peer.

## Quick start

```ts
import { guardPay, createWalletClient, http, privateKeyToAccount } from "paysentry-sdk";

const account = privateKeyToAccount(process.env.SIGNER_KEY as `0x${string}`);
const signer = createWalletClient({ account, chain: QDAY_CHAIN, transport: http() });

const result = await guardPay({
  payee: "0x…",                 // the address you're about to pay
  expectedName: "Warung Maju Jaya", // the name your user typed / invoice said
  amount: "25",                 // tUSD8 (6 decimals)
  signer,
});

if (result.paid) {
  console.log("✓ paid", result.txHashapsed);
} else {
  console.warn("✕ blocked:", result.verdictLabel, result.message);
  // result.verdict.result === ienie NOT FOUND/NO MATCH → show warning, abort checkout
}
```

The SDK defaults to the contracts already **live on QDay Aevum Testnet**:

| | Address |
|---|---|
| PayeeRegistry | `0xfFB0288590944e42aFF84033a8FF5A6c35d34b22` |
| PaymentGuard | `0x47e29aB215712b887F3A642d9ba60Df8d6F83828` |
| tUSD8 | `0x456569838f1d43009A91ebA4263147Afd7233483` |

## API

- **`checkPayee(payee, name, config?)`** → `{ result, matchedAs, level }` — read-only CoP verdict.
- **`isPayeeConfirmed(payee, name, config?)`** → boolean (FULL or CLOSE match).
- **`guardPay({ payee, expectedName, amount, signer, mode?, onAllowanceNeeded? }, config?)`**
  → `{ verdict, verdictLabel, paid, txHash?, message }` — pre-checks then pays.
- **`approveAllowance(signer, spender, amountWei, token, config?)`** → tx hash.
- **`createAgentSession({ agent, token?, maxPerTx, capTotal, durationDays, signer }, config?)`**
  → `{ sessionId, txHash }` — bounded agent spending.

`GuardMode.Enforce` (default) **blocks** mismatches. `GuardMode.Warn` proceeds but
returns the mismatch for your UI to flag.

## Overriding config

```ts
guardPay(args, {
  rpc: "https://my-rpc.example",
  registryAddress: "0x…",
  guardAddress: "0x…",
  tusd8Address: "0x…",
});
```

## Build / test

```bash
npm install
npm run build   # emits dist/
npm run typecheck
```