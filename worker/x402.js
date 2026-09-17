// familyofficeknowledgegraph.ai — x402 (FO_START_ME_UP_6): GET /api is the surface's one paid resource — $0.01 USDC on Base
// mainnet, x402 v2, scheme exact (EIP-3009 transferWithAuthorization), facilitator Coinbase Developer Platform. No payment →
// 402 with the offer (body + PAYMENT-REQUIRED header). With PAYMENT-SIGNATURE → verify → the node index of record as a signed
// statement (EdDSA, kid fo-kg-x402-2026-09) + a signed receipt resolving forever at /x402/receipt/{nonce} → settle → PAYMENT-RESPONSE.
// Every settlement counted in KV (FO_KG_OFFICE) and served on facts.json → radar.paid_calls.
// Secrets (Worker secrets, never in the repo): X402_PAYTO, CDP_API_KEY_ID, CDP_API_KEY_SECRET, X402_RECEIPT_SEED. Nothing here logs a secret.
// Office code (same shape as agent-kg.ai's door); no company estate code.

export const X402 = {
  origin: "https://familyofficeknowledgegraph.ai",
  operator: "Agentic KG Holdings",
  surface: "Family Office Knowledge Graph",
  network: "eip155:8453",
  asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  assetName: "USD Coin",
  eip712Version: "2",
  amount: "10000",
  amountUsdc: "0.01",
  facilitator: "https://api.cdp.coinbase.com/platform/v2/x402",
  explorer: "https://basescan.org/tx/",
  kid: "fo-kg-x402-2026-09",
  maxTimeoutSeconds: 60,
};

const DESCRIPTION = "The Family Office Knowledge Graph index of record for $0.01 USDC — every node's record list (LEI, legal name, aliases, register ids, field states, as-of) as a signed statement (EdDSA, kid fo-kg-x402-2026-09) with a receipt that resolves forever at /x402/receipt/{nonce}. Operator: Agentic KG Holdings.";

const b64 = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
const unb64 = (s) => JSON.parse(decodeURIComponent(escape(atob(s))));
const b64uBuf = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64uStr = (s) => b64uBuf(new TextEncoder().encode(s));
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const hex = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, "0")).join("");

const X402_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, OPTIONS",
  "access-control-allow-headers": "PAYMENT-SIGNATURE, X-PAYMENT, Content-Type",
  "access-control-expose-headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-PAYMENT-RESPONSE, X-X402-Receipt",
};

export function requirements(env) {
  return { scheme: "exact", network: X402.network, amount: X402.amount, maxAmountRequired: X402.amount, asset: X402.asset, payTo: env.X402_PAYTO, maxTimeoutSeconds: X402.maxTimeoutSeconds, resource: `${X402.origin}/api`, description: DESCRIPTION, mimeType: "application/json", extra: { name: X402.assetName, version: X402.eip712Version } };
}

function bazaar() {
  return { bazaar: { info: { input: { type: "http", method: "GET" }, output: { type: "json", example: { receipt: { receipt_url: `${X402.origin}/x402/receipt/{nonce}`, settled: true, amount_usdc: "0.01", network: X402.network }, statement: "<EdDSA JWT over data, kid fo-kg-x402-2026-09>", data: { graph: "Family Office Knowledge Graph", nodes: [{ id: "ca-fo-kg", records: [{ lei: "…", legal_name: "…" }] }] } } } },
    schema: { $schema: "https://json-schema.org/draft/2020-12/schema", type: "object", properties: { input: { type: "object", properties: { type: { type: "string", const: "http" }, method: { type: "string", enum: ["GET", "HEAD"] } }, required: ["type", "method"] }, output: { type: "object", properties: { type: { type: "string" }, example: { type: "object" } } } }, required: ["input"] } } };
}

export function paymentRequired(env, error) {
  const req = requirements(env);
  const body = { x402Version: 2, error: error || `Payment required: $0.01 USDC on ${req.network}`, accepts: [req], resource: { url: req.resource, description: req.description, mimeType: req.mimeType }, extensions: bazaar(), free_route: `${X402.origin}/records/nodes.json`, receipts: { jwks: `${X402.origin}/x402/jwks.json`, kid: X402.kid, resolve: `${X402.origin}/x402/receipt/{nonce}` }, operator: X402.operator };
  return new Response(JSON.stringify(body, null, 1), { status: 402, headers: { ...X402_HEADERS, "PAYMENT-REQUIRED": b64(body) } });
}

async function cdpJwt(env, method, host, path) {
  const id = env.CDP_API_KEY_ID, secret = env.CDP_API_KEY_SECRET;
  if (!id || !secret) return null;
  const now = Math.floor(Date.now() / 1000);
  const claims = { sub: id, iss: "cdp", aud: ["cdp_service"], nbf: now, exp: now + 120, uris: [`${method} ${host}${path}`] };
  let alg, key, sigAlg;
  if (secret.includes("BEGIN")) {
    const der = Uint8Array.from(atob(secret.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")), (c) => c.charCodeAt(0));
    alg = "ES256"; key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]); sigAlg = { name: "ECDSA", hash: "SHA-256" };
  } else {
    const raw = Uint8Array.from(atob(secret), (c) => c.charCodeAt(0));
    alg = "EdDSA"; key = await importEd25519Seed(raw.slice(0, 32)); sigAlg = { name: "Ed25519" };
  }
  const h = b64uStr(JSON.stringify({ alg, kid: id, typ: "JWT", nonce: hex(16) }));
  const p = b64uStr(JSON.stringify(claims));
  const sig = await crypto.subtle.sign(sigAlg, key, new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${b64uBuf(sig)}`;
}

function importEd25519Seed(seed) {
  const pkcs8 = new Uint8Array([0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20, ...seed]);
  return crypto.subtle.importKey("pkcs8", pkcs8, { name: "Ed25519" }, false, ["sign"]);
}

async function facilitator(env, path, body) {
  const base = env.X402_FACILITATOR || X402.facilitator;
  const u = new URL(base + path);
  const h = { "content-type": "application/json", accept: "application/json" };
  if (u.hostname.endsWith("coinbase.com")) { const jwt = await cdpJwt(env, "POST", u.hostname, u.pathname); if (jwt) h["Authorization"] = "Bearer " + jwt; }
  try {
    const r = await fetch(u.toString(), { method: "POST", headers: h, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
    let j = null; try { j = await r.json(); } catch { j = { error: "facilitator answered " + r.status }; }
    return { status: r.status, body: j };
  } catch { return { status: 0, body: { error: "facilitator unreachable" } }; }
}

async function signReceipt(env, claims) {
  const key = await importEd25519Seed(unb64u(env.X402_RECEIPT_SEED));
  const h = b64uStr(JSON.stringify({ alg: "EdDSA", typ: "JWT", kid: X402.kid }));
  const p = b64uStr(JSON.stringify(claims));
  const sig = await crypto.subtle.sign({ name: "Ed25519" }, key, new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${b64uBuf(sig)}`;
}
export async function signStatement(env, claims) { return signReceipt(env, claims); }

export function preflight() { return new Response(null, { status: 204, headers: X402_HEADERS }); }

// GET /api — the paid resource: the graph index of record (loadIndex returns { graph, operator, as_of, nodes: [{ id, ..., records: [...] }] })
export async function handleApi(request, env, loadIndex) {
  if (!env.X402_PAYTO) {
    return new Response(JSON.stringify({ error: "receiver_not_configured", note: "the pay-to address (Worker secret X402_PAYTO) is not set", free_route: `${X402.origin}/records/nodes.json` }, null, 1), { status: 503, headers: X402_HEADERS });
  }
  const sig = request.headers.get("PAYMENT-SIGNATURE") || request.headers.get("X-PAYMENT");
  if (!sig) return paymentRequired(env);
  let payload;
  try { payload = unb64(sig); } catch { return paymentRequired(env, "PAYMENT-SIGNATURE is not base64 JSON"); }
  const req = requirements(env);
  const v = await facilitator(env, "/verify", { x402Version: payload.x402Version || 2, paymentPayload: payload, paymentRequirements: req });
  if (!(v.body && v.body.isValid)) return paymentRequired(env, "payment not valid: " + ((v.body && (v.body.invalidReason || v.body.error)) || v.status));
  const data = await loadIndex();
  const s = await facilitator(env, "/settle", { x402Version: payload.x402Version || 2, paymentPayload: payload, paymentRequirements: req });
  const settled = !!(s.body && (s.body.success || s.body.transaction || s.body.txHash));
  const tx = (s.body && (s.body.transaction || s.body.txHash)) || null;
  const now = Math.floor(Date.now() / 1000);
  const nonce = hex(16);
  const payer = (s.body && s.body.payer) || (payload.payload && payload.payload.authorization && payload.payload.authorization.from) || "payer";
  const claims = { iss: X402.origin, sub: payer, jti: nonce, iat: now, resource: req.resource, scheme: "exact", standard: "EIP-3009 transferWithAuthorization", network: req.network, asset: req.asset, amount: req.amount, amount_usdc: X402.amountUsdc, payTo: req.payTo, transaction: tx, explorer: tx ? X402.explorer + tx : null, settled, facilitator: env.X402_FACILITATOR || X402.facilitator, receipt_url: `${X402.origin}/x402/receipt/${nonce}`, operator: X402.operator };
  let jwt = null, statement = null;
  try { jwt = await signReceipt(env, claims); } catch { jwt = null; }
  try { statement = await signReceipt(env, { iss: X402.origin, iat: now, jti: nonce, typ: "fo-kg-index", statement: data }); } catch { statement = null; }
  const receipt = { ...claims, jwt, kid: X402.kid, jwks: `${X402.origin}/x402/jwks.json` };
  try { await env.FO_KG_OFFICE.put(`x402:receipt:${nonce}`, JSON.stringify(receipt)); } catch {}
  try {
    if (settled) {
      const c = parseInt((await env.FO_KG_OFFICE.get("x402:count")) || "0", 10) + 1;
      await env.FO_KG_OFFICE.put("x402:count", String(c));
      await env.FO_KG_OFFICE.put("x402:last", JSON.stringify({ x402Version: 2, success: true, transaction: tx, network: req.network, amount: req.amount, asset: req.asset, payer, explorer: claims.explorer, at: new Date().toISOString(), resource: req.resource, receipt: claims.receipt_url }));
    }
  } catch {}
  const pr = { x402Version: 2, success: settled, transaction: tx, network: req.network, amount: req.amount, asset: req.asset, payer, receipt: claims.receipt_url, errorReason: settled ? null : (s.body && (s.body.errorReason || s.body.error)) || null };
  const enc = b64(pr);
  return new Response(JSON.stringify({ receipt, statement, data }, null, 1), { status: settled ? 200 : 402, headers: { ...X402_HEADERS, "PAYMENT-RESPONSE": enc, "X-PAYMENT-RESPONSE": enc, "X-X402-Receipt": claims.receipt_url } });
}

export async function handleReceipt(env, nonce) {
  if (!/^[a-f0-9]{32}$/.test(nonce)) return new Response(JSON.stringify({ error: "bad nonce" }), { status: 400, headers: X402_HEADERS });
  let r = null; try { r = await env.FO_KG_OFFICE.get(`x402:receipt:${nonce}`, "json"); } catch {}
  if (!r) return new Response(JSON.stringify({ error: "unknown receipt", nonce }), { status: 404, headers: X402_HEADERS });
  return new Response(JSON.stringify(r, null, 1), { status: 200, headers: { ...X402_HEADERS, "cache-control": "public, max-age=31536000, immutable" } });
}

export async function paidStats(env) {
  let count = 0, last = null, source = "facilitator settlement receipts counted in KV";
  try { count = parseInt((await env.FO_KG_OFFICE.get("x402:count")) || "0", 10); last = await env.FO_KG_OFFICE.get("x402:last", "json"); } catch { source = "KV unavailable"; }
  return { paid_calls: count, last, price_usdc: X402.amountUsdc, network: X402.network, asset: X402.asset, route: `${X402.origin}/api`, facilitator: env.X402_FACILITATOR || X402.facilitator, receipts: `${X402.origin}/x402/receipt/{nonce}`, jwks: `${X402.origin}/x402/jwks.json`, kid: X402.kid, receiver_configured: !!env.X402_PAYTO, source };
}
