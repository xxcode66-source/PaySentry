#!/usr/bin/env node
/**
 * paysentry-mcp-server — MCP (stdio) front-end for PaySentry on QDay Aevum Testnet.
 *
 * Read-only tools are always available and need no key:
 *   check_payee, get_payee, get_audit_trail, get_guard_config
 *
 * Write tools are registered ONLY when AGENT_PRIVATE_KEY is set in .env
 * (a dedicated low-balance testnet wallet — never a mainnet key):
 *   register_payee, execute_guarded_payment (Enforce by default)
 *
 * Run:  npm run build && npm start
 * Test: node dist/index.js speaks JSON-RPC on stdin/stdout (MCP stdio).
 */
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { agentWallet } from "./chain.js";
import {
  checkPayee,
  executeGuardedPayment,
  getAuditTrail,
  getGuardConfig,
  getPayee,
  registerPayee,
  simulateGuardedPayment,
} from "./tools.js";

const server = new McpServer({
  name: "paysentry",
  version: "0.1.0",
});

// ---------------------------------------------------------------------------
// Read-only tools (no key needed)
// ---------------------------------------------------------------------------

server.tool(
  "check_payee",
  "Run the on-chain Confirmation-of-Payee check for a payee address + expected name. Returns the verdict (NOT FOUND / NO MATCH / CLOSE MATCH / FULL MATCH), the name it matched as, and whether it is safe to pay.",
  {
    address: z.string().regex(/^0x[0-9a-fA-F]{40}$/, "must be a 0x EVM address"),
    name: z.string().min(1).max(64),
  },
  async ({ address, name }) => checkPayee({ address, name }),
);

server.tool(
  "get_payee",
  "Read a payee's registered identity from PayeeRegistry: display name, registration time, verification level (None/SelfClaimed/Attested), attestation count and verifier-attested alternate names.",
  {
    address: z.string().regex(/^0x[0-9a-fA-F]{40}$/, "must be a 0x EVM address"),
  },
  async ({ address }) => getPayee({ address }),
);

server.tool(
  "get_audit_trail",
  "Scan the on-chain audit trail (PayeeRegistry + PaymentGuard events) from the deploy block to chain head. Returns newest-first events with kind, verdict, amount and tx hash. A full scan covers ~430k blocks and can take a minute; pass fromBlock to bound the window, or kind/address to filter.",
  {
    limit: z.number().int().min(1).max(100).optional().default(50),
    kind: z
      .enum(["check", "exec", "blocked", "agentExec", "agentBlocked", "session", "registry"])
      .optional(),
    address: z
      .string()
      .regex(/^0x[0-9a-fA-F]{40}$/, "must be a 0x EVM address")
      .optional(),
    fromBlock: z.number().int().min(3931234).optional(),
  },
  async ({ limit, kind, address, fromBlock }) =>
    getAuditTrail({ limit, kind, address, fromBlock }),
);

server.tool(
  "get_guard_config",
  "Static config of the live deployment: chain, RPC, contract addresses, token, deploy block, current head block, and whether write tools are enabled for this server instance.",
  {},
  async () => getGuardConfig(),
);

// ---------------------------------------------------------------------------
// Write tools — only when AGENT_PRIVATE_KEY is set
// ---------------------------------------------------------------------------

const agent = agentWallet();
if (agent) {
  console.error(`[paysentry-mcp] write tools enabled for agent ${agent.account.address}`);

  server.tool(
    "register_payee",
    "Register (or update) the AGENT wallet's own display name on-chain via PayeeRegistry.registerPayee. This registers the agent itself as a payee — self-claimed level.",
    { displayName: z.string().min(1).max(64) },
    async ({ displayName }) => registerPayee({ displayName }),
  );

  server.tool(
    "execute_guarded_payment",
    "Pay tUSD8 to a payee through PaymentGuard with a CoP pre-check. Enforce mode (default) BLOCKS the payment when the name does not match — no funds move. The agent must hold enough tUSD8 and tQDAY for gas.",
    {
      payee: z.string().regex(/^0x[0-9a-fA-F]{40}$/, "must be a 0x EVM address"),
      expectedName: z.string().min(1).max(64),
      amount: z.string().regex(/^\d+(\.\d{1,6})?$/, "tUSD8 amount, e.g. \"1.5\""),
      mode: z.number().int().min(0).max(1).optional().default(1),
    },
    async ({ payee, expectedName, amount, mode }) =>
      executeGuardedPayment({ payee, expectedName, amount, mode }),
  );

  server.tool(
    "simulate_guarded_payment",
    "Dry-run a guarded payment via eth_call — runs the CoP check and simulates executeGuarded without sending a transaction or moving funds.",
    {
      payee: z.string().regex(/^0x[0-9a-fA-F]{40}$/, "must be a 0x EVM address"),
      expectedName: z.string().min(1).max(64),
      amount: z.string().regex(/^\d+(\.\d{1,6})?$/, "tUSD8 amount, e.g. \"1.5\""),
    },
    async ({ payee, expectedName, amount }) =>
      simulateGuardedPayment({ payee, expectedName, amount }),
  );
} else {
  console.error("[paysentry-mcp] write tools DISABLED — AGENT_PRIVATE_KEY is not set in .env");
}

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[paysentry-mcp] PaySentry MCP server running on stdio");
