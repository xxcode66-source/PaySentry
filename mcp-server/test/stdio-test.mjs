#!/usr/bin/env node
/**
 * Minimal MCP stdio test client for the PaySentry MCP server.
 * Spawns `node dist/index.js`, speaks JSON-RPC 2.0 over its stdin/stdout,
 * and calls tools/list + a list of tools/call requests.
 *
 * Usage:
 *   node test/stdio-test.mjs [tool-name ...]
 * With no args it runs the full read-only suite + the guarded-payment dry-run.
 */
import { spawn } from "node:child_process";

const SERVER = new URL("../dist/index.js", import.meta.url).pathname;

const DEFAULT_CALLS = [
  { name: "get_guard_config", arguments: {} },
  {
    name: "check_payee",
    arguments: { address: "0x9f25556d1a0acc49bb05dd9081e74bd4c0dcef94", name: "au" },
  },
  {
    name: "check_payee",
    arguments: { address: "0x9f25556d1a0acc49bb05dd9081e74bd4c0dcef94", name: "not-the-name" },
  },
  {
    name: "get_payee",
    arguments: { address: "0x9f25556d1a0acc49bb05dd9081e74bd4c0dcef94" },
  },
  { name: "get_audit_trail", arguments: { limit: 10 } },
  {
    name: "simulate_guarded_payment",
    arguments: {
      payee: "0x9f25556d1a0acc49bb05dd9081e74bd4c0dcef94",
      expectedName: "au",
      amount: "0.1",
    },
  },
];

const wanted = process.argv.slice(2);
const calls = wanted.length
  ? DEFAULT_CALLS.filter((c) => wanted.includes(c.name))
  : DEFAULT_CALLS;

const child = spawn("node", [SERVER], { stdio: ["pipe", "pipe", "inherit"] });
let buf = "";
let nextId = 1;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}

child.stdout.on("data", (chunk) => {
  buf += chunk.toString();
  let nl;
  while ((nl = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      console.error("[test] non-JSON stdout:", line);
      continue;
    }
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  }
});

child.on("exit", (code) => {
  if (code !== 0 && code !== null) {
    console.error(`[test] server exited with code ${code}`);
    process.exit(1);
  }
});

const init = await send("initialize", {
  protocolVersion: "2025-03-26",
  capabilities: {},
  clientInfo: { name: "paysentry-stdio-test", version: "0.1.0" },
});
console.log("== initialize ==");
console.log(JSON.stringify({ server: init.serverInfo, caps: init.capabilities }, null, 2));
child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

const list = await send("tools/list");
console.log("\n== tools/list ==");
for (const t of list.tools) console.log(`- ${t.name}: ${t.description?.slice(0, 90) ?? ""}`);

for (const call of calls) {
  console.log(`\n== tools/call ${call.name} ${JSON.stringify(call.arguments)} ==`);
  const t0 = Date.now();
  try {
    const res = await send("tools/call", { name: call.name, arguments: call.arguments });
    const text = res.content?.map((c) => c.text).join("\n") ?? JSON.stringify(res);
    console.log(`(${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    console.log(text.length > 4000 ? text.slice(0, 4000) + "\n…[truncated]" : text);
  } catch (e) {
    console.log(`FAILED after ${((Date.now() - t0) / 1000).toFixed(1)}s: ${e.message}`);
  }
}

child.kill();
process.exit(0);
