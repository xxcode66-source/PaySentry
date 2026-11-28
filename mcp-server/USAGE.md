# PaySentry MCP Server

MCP (stdio) front-end for **PaySentry** — trustless Confirmation of Payee on
QDay Aevum Testnet (chain 44005). Lets an AI agent check payee identities,
read the on-chain audit trail, and (when funded) pay through the guard —
without touching a browser.

- RPC: `https://rpc-test.qday.info`
- PayeeRegistry: `0xfFB0288590944e42aFF84033a8FF5A6c35d34b22`
- PaymentGuard: `0x47e29aB215712b887F3A642d9ba60Df8d6F83828`
- tUSD8 (6 decimals): `0x456569838f1d43009A91ebA4263147Afd7233483`
- Deploy block: `3931234`

## Install & run

```bash
cd mcp-server
npm install
npm run build
cp .env.example .env   # only needed for write tools
npm start              # speaks MCP JSON-RPC on stdio
```

Node 20+ required (tested on Node 24).

### Claude Desktop / any MCP client

```json
{
  "mcpServers": {
    "paysentry": {
      "command": "node",
      "args": ["/absolute/path/to/PaySentry/mcp-server/dist/index.js"],
      "env": {}
    }
  }
}
```

### Inspector (interactive test UI)

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

Or run the bundled stdio test (no UI, prints real tool outputs):

```bash
node test/stdio-test.mjs            # full suite
node test/stdio-test.mjs check_payee get_payee   # subset
```

## Tools

### Read-only (always available, no key needed)

| Tool | What it does |
| --- | --- |
| `check_payee` | On-chain CoP check for `{address, name}` → verdict `NOT FOUND / NO MATCH / CLOSE MATCH / FULL MATCH`, `matchedAs`, verification level, and a plain `safeToPay` answer. |
| `get_payee` | Registered identity for an address: display name, registration time, level (`None / SelfClaimed / Attested`), attestation count, verifier-attested alternate names. |
| `get_audit_trail` | Full on-chain audit scan (Registry + Guard events) from the deploy block to head. Params: `limit` (default 50, max 100), `kind`, `address`, `fromBlock`. A full scan is ~425k blocks and takes ~40s. |
| `get_guard_config` | Static deployment config: chain, RPC, contract addresses, token, deploy block, head block, agent wallet (if any), whether write tools are enabled. |

### Write (only when `AGENT_PRIVATE_KEY` is set in `.env`)

The server refuses to register these tools at all without the key, so a
client can never call them by accident.

| Tool | What it does |
| --- | --- |
| `register_payee` | Registers the **agent wallet's own** display name via `PayeeRegistry.registerPayee` (self-claimed level). |
| `execute_guarded_payment` | Pays tUSD8 through `PaymentGuard.executeGuarded` after a CoP pre-check. **Enforce mode by default**: a mismatch blocks the payment and no funds move. Handles the ERC-20 allowance automatically. |
| `simulate_guarded_payment` | Dry-run of a guarded payment via `eth_call` — runs the CoP check and simulates `executeGuarded` without sending a transaction. |

**Key rules:** the key must belong to a dedicated **low-balance testnet
wallet only** — never a mainnet key, never a wallet holding real funds.
`.env` is git-ignored; `.env.example` shows the shape without a real key.
Agents are always Enforce mode (the SDK enforces this too).

## Funding the agent wallet

The agent wallet needs **tQDAY for gas** and **tUSD8 to pay with**.

- Gas faucet: https://faucet.qday.info/en — 5 tQDAY per claim, once per
  24h per address. **It has a gate: the recipient must hold ~0.0001 ETH
  (or 1 USDT/USDC) on Ethereum mainnet**, plus a browser bot check — a
  fresh throwaway wallet is rejected (`eligibility: false`). The tUSD8
  faucet on the same site rejects non-browser requests.
- If you have a funded testnet wallet, send the agent a little tQDAY +
  tUSD8 instead of using the faucet.

Current agent wallet (generated 2026-11-28, unfunded):
`0xbd6AFdc6899dBEa8a9b07Abe14887f079A9b121E` — 0 tQDAY, 0 tUSD8.
The private key lives only in `mcp-server/.env` (git-ignored).

## Verified behaviour (live testnet, 2026-11-28)

- `check_payee` for `0x9f25…ef94` / `"au"` → **FULL MATCH** (code 3),
  matchedAs `"au"`, level SelfClaimed. Same address / `"not-the-name"` →
  **NO MATCH**.
- `get_payee` for that address → registered `true`, displayName `"au"`,
  registeredAt `2026-11-24T14:22:17Z`, 0 attestations.
- `get_audit_trail` full scan (3,931,234 → 4,355,584, 0 failed chunks,
  ~39s) → **38 events: 3 checks, 3 payments, 32 registry** — matches the
  dashboard. Includes the real 1-tUSD8 payment at block 4,022,018.
- `simulate_guarded_payment` for 0.1 tUSD8 to `"au"` → CoP check passes
  (FULL MATCH), then the simulation reverts with
  `ERC20: transfer amount exceeds allowance` — the correct outcome for an
  unfunded agent (0 tUSD8 / 0 allowance). No transaction was sent.
- Real `register_payee` / `execute_guarded_payment` were **not executed**
  because the agent wallet has no gas or tokens.

## Layout

```
mcp-server/
  package.json  tsconfig.json  .env.example  .gitignore  USAGE.md
  src/
    index.ts    # MCP server bootstrap (stdio), tool registration
    tools.ts    # tool handlers (read + write)
    chain.ts    # chain, addresses, ABIs, viem clients
    audit.ts    # standalone port of app/src/lib/audit/trail.ts
  test/
    stdio-test.mjs  # minimal MCP stdio test client
```
