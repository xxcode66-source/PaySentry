# PaySentry — Demo Day Cheat Sheet

One-page runbook for a **~4 minute** live demo. Everything is on-chain; every step ends
with an explorer link so the judge can verify the transaction happened.

---

## Setup before the demo (do these the day before)

1. **Wallet** with QDay Aevum Testnet added (chain **44005**, RPC `https://rpc-test.qday.info`).
2. **Faucet tokens** for 3 addresses (`https://faucet.qday.info/en`):
   - `payer` (has tUSD8 to send)
   - `payee` (will register + be paid)
   - `agent` (autonomous worker that gets blocked)
   - Faucet has a cooldown — claim them in advance.
3. Have the live addresses handy:
   - Registry `0xfFB0288590944e42aFF84033a8FF5A6c35d34b22`
   - Guard    `0x47e29aB215712b887F3A642d9ba60Df8d6F83828`

---

## The 6 moves (say this out loud)

### 1. Register — "the payee claims an identity"
- Tab **Registry** → type a name, e.g. `"Warung Maju Jaya"` → **Register identity**.
- Shows badge **Self-claimed**.
- 🎯 Judge takeaway: *"Identity now lives on-chain — no database, no backend."*

### 2. Attest — "trust goes up"
- Same tab → **Attest** `"Warung Maju Jaya"` for the payee.
- Badge flips to **Attested**.
- 🎯 Takeaway: *"Verifiers endorse address→name. This is the trustless version of a bank confirming the account holder."*

### 3. Verify — "the happy path"
- Tab **Verify** → paste payee address + exact name → **FULL MATCH**.
- Now change the **last character** of the name → verdict drops to **CLOSE MATCH**.
- 🎯 Takeaway: *"Typo-level detection — a bank-grade Confirmation-of-Payee verdict, computed on-chain."*

### 4. Bound the agent — "least privilege"
- Tab **Sessions** → create a session: agent addr, max/tx `5`, lifetime `50`, `7` days.
- 🎯 Takeaway: *"Limits are enforced by the contract, not the agent. It physically cannot overspend."*

### 5. Agent pays — "the honest worker"
- Terminal:
  ```bash
  export AGENT_PRIVATE_KEY=0x<agent key>
  export GUARD_ADDRESS=0x47e29aB215712b887F3A642d9ba60Df8d6F83828
  export REGISTRY_ADDRESS=0xfFB0288590944e42aFF84033a8FF5A6c35d34b22
  node scripts/agent.mjs inspect --session 0
  node scripts/agent.mjs pay --session 0 --payee 0x<PAYEE> --name "Warung Maju Jaya" --amount 2
  ```
- Agent pre-flights CoP → sees FULL MATCH → pays. Receipt on-chain.

### 6. The scam — "guardrail holds"
- Same command, impostor name:
  ```bash
  node scripts/agent.mjs pay --session 0 --payee 0x<PAYEE> --name "Warung Maju Jaya TRADING" --amount 2
  ```
- Agent **self-aborts** on the pre-flight. Run again with `--force` → the guard **reverts
  the transaction on-chain**. No funds moved.
- Tab **Audit** → show the `AgentPaymentBlocked` row → click through to the explorer.
- 🎯 Takeaway: *"The blocked attempt is permanent, public evidence — a fraud audit trail that cannot be deleted."*

---

## Judge-facing one-liner (say this as the closer)

> "Banks are now legally required to check the recipient's name before money moves.
> PaySentry brings that same safety rail on-chain — so a human, or an AI agent, can't
> pay the wrong address by accident — and when it tries, the blockchain records it forever."

---

## Backup talking points if something breaks

- **Faucet down / no gas?** Deploy already done; just show the explorer contract pages.
- **Wallet won't connect?** Show the Audit tab which reads public RPC without a wallet.
- **Agent CLI hiccup?** Do the blocked payment manually via **Pay** tab with an impostor
  name in **Enforce** mode — it reverts in the UI with the "Payment blocked by
  Confirmation of Payee" toast.