// familyofficeknowledgegraph.ai — the doors (FO_START_ME_UP_4). Streamable-HTTP MCP (JSON-RPC 2.0, one response per request),
// public, read-only, session-free, no auth for reads, typed errors, real 404s.
// Five read tools, same names on every office graph: resolve_family_office · get_record · list_events_since · list_aliases · list_nodes;
// FO-03 (2026-11-05): + claim_seat and list_my_receipts (seat.js), and an RCO receipt on chain fo-kg for every cleared read (rco.js).
// Apex door (mcp.<host>) holds the index and forwards; the node door (<node>.<host>) serves the record. Nothing answered from memory:
// every answer is read from the harvested records served as assets by this Worker.

import { claimSeat, listMyReceipts, seatBlock } from "./seat.js";
import { writeReceipts, subjectsOf } from "./rco.js";

export const OPERATOR = "Agentic KG Holdings";
export const SERVER = { name: "Family Office Knowledge Graph", protocolVersion: "2025-06-18" };

const JSONH = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*", "access-control-allow-methods": "POST, GET, OPTIONS", "access-control-allow-headers": "Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version" };

const IDENT = { type: "string", description: "Record id, LEI, legal name, alias, or a register identifier as it appears on the record (case-insensitive)", minLength: 2, maxLength: 200 };
const RO = { readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: false };

export const TOOLS = [
  { name: "resolve_family_office", description: "Resolve an identifier (LEI, legal name, alias or register id) to the family-office records that carry it, with the node that serves each.",
    inputSchema: { type: "object", properties: { identifier: IDENT }, required: ["identifier"], additionalProperties: false },
    outputSchema: { type: "object", properties: { identifier: { type: "string" }, matches: { type: "array", items: { type: "object", properties: { lei: { type: "string" }, legal_name: { type: "string" }, node: { type: "string" }, record: { type: "string" }, matched_on: { type: "string" } } } }, served_by: { type: "object" } }, required: ["identifier", "matches"] }, annotations: { ...RO, title: "Resolve a family office" } },
  { name: "get_record", description: "The Family Office Record for one identifier: every field with value, source_url, read_by and state; optionally a named version.",
    inputSchema: { type: "object", properties: { identifier: IDENT, version: { type: "string", description: "record version as listed by list_nodes (e.g. 2026-09-13.1); omit for current" } }, required: ["identifier"], additionalProperties: false },
    outputSchema: { type: "object", properties: { record: { type: "object" }, served_by: { type: "object" } }, required: ["record"] }, annotations: { ...RO, title: "Get a Family Office Record" } },
  { name: "list_events_since", description: "Dated, URL'd events on one record (registrations, renewals, orders, acquisitions), oldest first, optionally since a date, paged by cursor.",
    inputSchema: { type: "object", properties: { identifier: IDENT, since: { type: "string", description: "ISO date YYYY-MM-DD; events on or after it" }, cursor: { type: "string", description: "next_cursor from a previous page" }, limit: { type: "integer", minimum: 1, maximum: 200, default: 50 } }, required: ["identifier"], additionalProperties: false },
    outputSchema: { type: "object", properties: { lei: { type: "string" }, events: { type: "array" }, next_cursor: { type: ["string", "null"] }, served_by: { type: "object" } }, required: ["lei", "events"] }, annotations: { ...RO, title: "List events on a record" } },
  { name: "list_aliases", description: "Every name the record carries for one identifier — legal name, register names, other names — each with its source.",
    inputSchema: { type: "object", properties: { identifier: IDENT }, required: ["identifier"], additionalProperties: false },
    outputSchema: { type: "object", properties: { lei: { type: "string" }, legal_name: { type: "object" }, aliases: { type: "array" }, served_by: { type: "object" } }, required: ["lei", "aliases"] }, annotations: { ...RO, title: "List aliases" } },
  { name: "list_nodes", description: "The graph's nodes — one per jurisdiction — with record counts read from each node's index, the node door and its as-of.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    outputSchema: { type: "object", properties: { nodes: { type: "array" }, apex: { type: "object" } }, required: ["nodes"] }, annotations: { ...RO, title: "List nodes" } },
  { name: "claim_seat", description: "A family office's own agent claims the seat of its own record. Give card_url (the https URL of the office agent's card) and record_id (the record id as the graph serves it). The record must resolve to the name the card gives; the door then issues a domain challenge (DNS TXT _fo-kg-seat.<domain> or https://<domain>/.well-known/fo-kg-seat.txt). Call again with challenge_id: proven → the record moves listed → claimed and the seat key is answered once. With seat_key and rows, the seat sets its own fields on its own record only (website, aliases, sectors, structure, description, contact_url); the sourced fields are never touched and verified is set by a person, never by a tool. The seat settles on /seat (x402).",
    inputSchema: { type: "object", properties: { card_url: { type: "string", description: "https URL of the office agent's card (A2A agent card JSON)" }, record_id: { type: "string", description: "the office's record id as the graph serves it (resolve_family_office lists it)", minLength: 2, maxLength: 120 },
      challenge_id: { type: "string", description: "the challenge_id from the accepted claim, once the token is published" }, seat_key: { type: "string", description: "the seat key answered when the claim was proven (for rows)" },
      rows: { type: "object", description: "the seat's own fields", properties: { website: { type: "string" }, aliases: { type: "array", items: { type: "string" } }, sectors: { type: "array", items: { type: "string" } }, structure: { type: "string" }, description: { type: "string" }, contact_url: { type: "string" } }, additionalProperties: false } },
      required: ["card_url", "record_id"], additionalProperties: false },
    outputSchema: { type: "object", properties: { result: { type: "string", enum: ["accepted", "proof_failed", "claimed", "rows_set", "rows_refused", "refused", "error"] }, reason: { type: "string" }, record_id: { type: "string" }, seat_id: { type: "string" }, claim_status: { type: "string" }, challenge: { type: "object" }, seat_key: { type: "string" } }, required: ["result"] },
    annotations: { readOnlyHint: false, idempotentHint: false, destructiveHint: false, openWorldHint: true, title: "Claim a seat" } },
  { name: "list_my_receipts", description: "For a seat holder only: the RCO-10060 receipts whose subject is its own record — who read it (as the door saw the reader: user agent, network, country), when, and under which rule (the tool) — newest first, each with its verify URL. Needs record_id and the seat key of that record; nobody else can list them.",
    inputSchema: { type: "object", properties: { record_id: { type: "string", minLength: 2, maxLength: 120 }, seat_key: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 500, default: 100 }, cursor: { type: "string" } }, required: ["record_id", "seat_key"], additionalProperties: false },
    outputSchema: { type: "object", properties: { result: { type: "string" }, record_id: { type: "string" }, receipts: { type: "array", items: { type: "object", properties: { id: { type: "string" }, rule: { type: "string" }, cleared_at: { type: "string" }, reader: { type: "object" }, verify: { type: "string" } } } } }, required: ["result"] },
    annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: false, title: "List the receipts of my record" } },
];
const SEAT_TOOLS = new Set(["claim_seat", "list_my_receipts"]);
export const TEST_NODE = "test-fo-kg";   // FO-03: TEST records for the seat proofs — not a node, not in nodes.json, not in any count

const rpc = (id, result) => ({ jsonrpc: "2.0", id, result });
const rpcErr = (id, code, message, data) => ({ jsonrpc: "2.0", id, error: { code, message, ...(data ? { data } : {}) } });
const ok = (o) => ({ content: [{ type: "text", text: JSON.stringify(o, null, 1) }], structuredContent: o });
// Typed tool errors: isError true, one typed object, never a stack trace.
const fail = (type, detail) => ({ content: [{ type: "text", text: JSON.stringify({ error: { type, ...detail } }) }], structuredContent: { error: { type, ...detail } }, isError: true });

// ---- the graph as served by this Worker's assets
export function graph(env, url) {
  const asset = async (p) => { const r = await env.ASSETS.fetch(new Request(new URL(p, url), { method: "GET" })); return r.ok ? await r.json() : null; };
  const nodes = () => asset("/records/nodes.json");
  const index = (node) => asset(`/records/${node}/index.json`);
  const record = (node, lei) => asset(`/records/${node}/${lei}.json`);
  const testIndex = () => asset(`/records/${TEST_NODE}/index.json`);
  return { nodes, index, record, testIndex };
}

const norm = (s) => String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export async function resolveIdentifier(g, identifier) {
  const n = norm(identifier);
  const nd = await g.nodes();
  const out = [];
  for (const node of (nd && nd.nodes) || []) {
    const ix = await g.index(node.id);
    for (const r of (ix && ix.records) || []) {
      let on = null;
      if (norm(r.id) === n || (r.lei && norm(r.lei) === n)) on = r.lei && norm(r.lei) === n ? "lei" : "id";
      else if (norm(r.legal_name) === n) on = "legal_name";
      else if ((r.aliases || []).some((a) => norm(a) === n)) on = "alias";
      else if ((r.register_ids || []).some((a) => norm(a) === n)) on = "register_id";
      else if (n.length >= 4 && (norm(r.legal_name).includes(n) || (r.aliases || []).some((a) => norm(a).includes(n)))) on = "name_contains";
      if (on) out.push({ id: r.id, lei: r.lei || null, legal_name: r.legal_name, node: node.id, record: `${node.host}${r.record}`, matched_on: on, version: ix.version });
    }
  }
  // FO-03: TEST records (flagged TEST, outside every count) answer on an exact id, legal name or alias only — never on a contains search
  if (g.testIndex) {
    const tix = await g.testIndex();
    for (const r of (tix && tix.records) || []) {
      const on = norm(r.id) === n ? "id" : norm(r.legal_name) === n ? "legal_name" : (r.aliases || []).some((a) => norm(a) === n) ? "alias" : null;
      if (on) out.push({ id: r.id, lei: null, legal_name: r.legal_name, node: TEST_NODE, record: `https://familyofficeknowledgegraph.ai${r.record}`, matched_on: on, version: tix.version, test: true, flag: "TEST" });
    }
  }
  // exact matches outrank contains
  const exact = out.filter((m) => m.matched_on !== "name_contains");
  return exact.length ? exact : out;
}

// FO-03: the record a seat claim names — the id must resolve to exactly that record (id or LEI, case-insensitive)
export function resolveOneFor(g) {
  return async (recordId) => {
    const m = (await resolveIdentifier(g, recordId)).filter((x) => norm(x.id) === norm(recordId) || (x.lei && norm(x.lei) === norm(recordId)));
    if (!m.length) return { why: "the record id does not resolve on the graph (resolve_family_office lists what the graph carries)" };
    if (new Set(m.map((x) => x.id)).size > 1) return { why: "the record id is ambiguous on the graph" };
    const rec = await g.record(m[0].node, m[0].id);
    return rec ? { m: m[0], rec } : { why: "the record is listed in the index but not served" };
  };
}

async function one(g, identifier) {
  const m = await resolveIdentifier(g, identifier);
  if (!m.length) return { err: fail("not_found", { identifier, hint: "resolve_family_office lists what the graph carries; list_nodes lists the nodes" }) };
  if (m.length > 1 && new Set(m.map((x) => x.id)).size > 1) return { err: fail("ambiguous", { identifier, matches: m.map((x) => ({ id: x.id, lei: x.lei, legal_name: x.legal_name, node: x.node })) }) };
  return { m: m[0] };
}

// ---- node tools: answered from the node's own records
export async function nodeCall(g, name, args, servedBy) {
  args = args || {};
  if (name === "list_nodes") {
    const nd = await g.nodes();
    if (!nd) return fail("no_nodes", {});
    const nodes = [];
    for (const n of nd.nodes) { const ix = await g.index(n.id); nodes.push({ ...n, records: ix ? ix.records.length : null, version: ix ? ix.version : null, as_of: ix ? ix.as_of : n.as_of, totals: ix ? ix.totals : null }); }
    return ok({ nodes, apex: nd.apex, served_by: servedBy });
  }
  if (!args.identifier || typeof args.identifier !== "string") return fail("invalid_params", { missing: "identifier" });
  if (name === "resolve_family_office") {
    const matches = await resolveIdentifier(g, args.identifier);
    if (!matches.length) return fail("not_found", { identifier: args.identifier });
    return ok({ identifier: args.identifier, matches, served_by: servedBy });
  }
  const { m, err } = await one(g, args.identifier);
  if (err) return err;
  const rec = await g.record(m.node, m.id);
  if (!rec) return fail("not_found", { identifier: args.identifier, id: m.id, node: m.node });
  if (name === "get_record") {
    if (args.version && args.version !== rec.version) return fail("version_not_found", { identifier: args.identifier, asked: args.version, versions: [rec.version] });
    return ok({ record: rec, served_by: servedBy });
  }
  if (name === "list_aliases") {
    return ok({ id: rec.id, lei: rec.lei ? rec.lei.value : null, legal_name: rec.identity.legal_name, aliases: rec.aliases, served_by: servedBy });
  }
  if (name === "list_events_since") {
    let ev = (rec.events || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
    if (args.since) { if (!/^\d{4}-\d{2}-\d{2}$/.test(args.since)) return fail("invalid_params", { since: "YYYY-MM-DD" }); ev = ev.filter((e) => String(e.date) >= args.since); }
    const limit = Math.min(Math.max(parseInt(args.limit || 50, 10) || 50, 1), 200);
    const start = args.cursor ? parseInt(args.cursor, 10) || 0 : 0;
    const page = ev.slice(start, start + limit);
    return ok({ id: rec.id, lei: rec.lei ? rec.lei.value : null, since: args.since || null, events: page, next_cursor: start + limit < ev.length ? String(start + limit) : null, total: ev.length, served_by: servedBy });
  }
  return fail("unknown_tool", { name });
}

// ---- apex door: index + forward. The apex resolves the node from its index, then forwards the call to that node's door on the
// wire; if the node door does not answer (a same-Worker subrequest can be refused at the edge), the node handler answers
// in-process and the response says so in served_by.via. Nothing is answered from the apex's own memory.
export async function apexCall(g, name, args, ctx) {
  args = args || {};
  if (name === "list_nodes") return nodeCall(g, name, args, { role: "apex", door: ctx.apexDoor, via: "index" });
  let nodeId = null;
  if (args.identifier) { const m = await resolveIdentifier(g, args.identifier); if (m.length) nodeId = m[0].node; }
  if (!nodeId) return fail("not_found", { identifier: args.identifier, hint: "no node in the index carries this identifier" });
  if (nodeId === TEST_NODE) return nodeCall(g, name, args, { role: "apex", door: ctx.apexDoor, via: "test record (in-process; flagged TEST)" });
  const nd = await g.nodes();
  const node = (nd.nodes || []).find((n) => n.id === nodeId);
  const servedBy = { role: "node", node: nodeId, door: node.door, via: "apex-forward" };
  try {
    // the forward rides the Worker's own service binding (a Worker cannot fetch its own custom domain at the edge): the request
    // carries the node door's hostname, so the node handler answers under its own role and headers
    const opts = { method: "POST", headers: { "content-type": "application/json", accept: "application/json", "x-office-forwarded-by": ctx.apexDoor }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }), signal: AbortSignal.timeout(5000) };
    const r = ctx.self ? await ctx.self.fetch(node.door, opts) : await fetch(node.door, opts);
    if (r.ok) {
      const j = await r.json();
      if (j && j.result) { const sc = j.result.structuredContent; if (sc && !sc.error) sc.served_by = { ...(sc.served_by || servedBy), via: ctx.self ? "apex-forward (service binding to the node door)" : "apex-forward" }; return j.result; }
    }
    servedBy.via = `in-process (node door answered ${r.status})`;
  } catch (e) {
    servedBy.via = `in-process (node door fetch failed: ${e && e.name ? e.name : "error"})`;
  }
  return nodeCall(g, name, args, servedBy);
}

// The door's description of itself — served at GET / on the mcp and node hosts (humans, link checkers). Never on GET /mcp.
export function doorInfo(url, ctx) {
  const { version, role, nodeId } = ctx;
  return { server: { ...SERVER, version }, operator: OPERATOR, role, node: role === "node" ? nodeId : null, transport: "streamable-http", endpoint: `${url.origin}/mcp`, usage: "POST JSON-RPC 2.0: initialize, tools/list, tools/call", tools: TOOLS.map((t) => t.name), card: `${url.origin}/.well-known/mcp.json`, agent_card: ctx.agentCard };
}

// FO-02 (2026-11-04): the door's audit line — one JSON line per JSON-RPC message to Workers Logs, with the tool name on every tools/call,
// so per-tool counts can be read from the logs. No arguments, no identifiers, no IP are written.
function audit(request, ctx, method, tool, outcome, extra) {
  const cf = request.cf || {};
  console.log(JSON.stringify({ audit: "fo-kg-door", v: ctx.version, role: ctx.role, node: ctx.role === "node" ? ctx.nodeId : null, host: new URL(request.url).hostname, method: String(method || "").slice(0, 64), tool: tool ? String(tool).slice(0, 64) : null, outcome, forwarded: !!request.headers.get("x-office-forwarded-by"), ua: (request.headers.get("user-agent") || "").slice(0, 160), country: cf.country || null, asn: cf.asn || null, ...(extra || {}) }));
}
const readerOf = (request) => { const cf = request.cf || {}; return { ua: (request.headers.get("user-agent") || "").slice(0, 160), asn: cf.asn || null, as_org: cf.asOrganization ? String(cf.asOrganization).slice(0, 80) : null, country: cf.country || null }; };
const SEAT_FAIL = new Set(["refused", "rows_refused", "proof_failed", "error"]);
const seatRes = (o) => ({ content: [{ type: "text", text: JSON.stringify(o, null, 1) }], structuredContent: o, ...(SEAT_FAIL.has(o.result) ? { isError: true } : {}) });

export async function handleMcp(request, env, url, ctx) {
  const { version, role, apexDoor, nodeId } = ctx;
  const g = graph(env, url);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: JSONH });
  // FO-02 (2026-11-04): this door opens no server-to-client stream. Per MCP streamable-http, GET /mcp answers 405 so clients stop
  // re-opening it (the 200-JSON answer drove a Claude Code reconnect loop: 418,766 GETs in 30 days). Same as the Capital Markets door.
  if (request.method === "GET") {
    return new Response(JSON.stringify(rpcErr(null, -32000, "Method not allowed: this door opens no SSE stream; POST JSON-RPC 2.0 to this URL", { usage: "POST JSON-RPC 2.0: initialize, tools/list, tools/call", info: `${url.origin}/`, card: `${url.origin}/.well-known/mcp.json` })), { status: 405, headers: { ...JSONH, allow: "POST, OPTIONS" } });
  }
  if (request.method !== "POST") return new Response(JSON.stringify(rpcErr(null, -32600, "POST required")), { status: 405, headers: { ...JSONH, allow: "POST, OPTIONS" } });
  let msgs;
  try { msgs = await request.json(); } catch { audit(request, ctx, "(unparsed)", null, "parse_error"); return new Response(JSON.stringify(rpcErr(null, -32700, "parse error")), { status: 400, headers: JSONH }); }
  const batch = Array.isArray(msgs);
  const out = [];
  for (const m of batch ? msgs : [msgs]) {
    const id = m && m.id !== undefined ? m.id : null;
    if (!m || m.jsonrpc !== "2.0" || typeof m.method !== "string") { audit(request, ctx, "(invalid)", null, "invalid_request"); out.push(rpcErr(id, -32600, "invalid request")); continue; }
    const tool = m.method === "tools/call" ? (m.params && m.params.name) : null;
    if (m.method.startsWith("notifications/")) { audit(request, ctx, m.method, null, "accepted"); continue; }
    const before = out.length;
    try {
      if (m.method === "initialize") {
        out.push(rpc(id, { protocolVersion: (m.params && m.params.protocolVersion) || SERVER.protocolVersion, capabilities: { tools: { listChanged: false } }, serverInfo: { name: SERVER.name, version }, instructions: `Read-only door over the Family Office Knowledge Graph (public record, one record per family office, every field with source_url, read_by, state). ${role === "node" ? `This is the ${nodeId} node door; it serves the records.` : "This is the apex door; it holds the index and forwards to the node that serves the record."} Tools: resolve_family_office, get_record, list_events_since, list_aliases, list_nodes (reads; each cleared read is evidenced by an RCO-10060 receipt on chain fo-kg); claim_seat and list_my_receipts (a family office's own agent, its own record only). Errors are typed. Nothing is answered from memory.` }));
      } else if (m.method === "ping") {
        out.push(rpc(id, {}));
      } else if (m.method === "tools/list") {
        out.push(rpc(id, { tools: openSchemas(TOOLS) }));  // 2026-09-17 (CEO order): additionalProperties:false stripped at the schema hook; nothing else changes
      } else if (m.method === "tools/call") {
        const name = m.params && m.params.name;
        if (!TOOLS.some((t) => t.name === name)) out.push(rpcErr(id, -32602, `unknown tool: ${name}`, { tools: TOOLS.map((t) => t.name) }));
        else {
          const args = (m.params && m.params.arguments) || {};
          let res;
          if (SEAT_TOOLS.has(name)) res = seatRes(name === "claim_seat" ? await claimSeat(env, args, resolveOneFor(g)) : await listMyReceipts(env, args));   // FO-03: seat tools answer on any door
          else res = role === "node" ? await nodeCall(g, name, args, { role: "node", node: nodeId, door: `${url.origin}/mcp`, via: "node-door" }) : await apexCall(g, name, args, { apexDoor, self: env.SELF });
          // FO-03: get_record carries the seat block beside the sourced record (claim_status listed when no seat holds it)
          const sc = res && res.structuredContent;
          if (name === "get_record" && sc && sc.record && sc.record.id && !res.isError) { try { sc.seat = await seatBlock(env, sc.record.id); res.content = [{ type: "text", text: JSON.stringify(sc, null, 1) }]; } catch (e) {} }
          out.push(rpc(id, res));
          // FO-03 item 1: every cleared read writes an RCO receipt on chain fo-kg, once per call — at the door the caller reached, never on the
          // apex-to-node hop (forwarded) — after the answer is sent; the receipt ids go on this call's audit line.
          if (!res.isError && !request.headers.get("x-office-forwarded-by") && subjectsOf(name, sc).length) {
            const reader = readerOf(request), nd = await g.nodes(), cc = {};
            for (const n of (nd && nd.nodes) || []) cc[n.id] = n.country && n.country !== "ZZ" ? String(n.country).toUpperCase() : null;
            const nodeBy = {}; for (const x of (sc.matches || [])) nodeBy[x.id] = x.node; if (sc.record) nodeBy[sc.record.id] = sc.record.node; if (sc.node && sc.record_id) nodeBy[sc.record_id] = sc.node;
            const marketOf = (s) => cc[nodeBy[s] || (sc.served_by && sc.served_by.node)] || null;
            const outcome = name === "claim_seat" || name === "list_my_receipts" ? `ok ${sc.result}` : "ok";
            const job = writeReceipts(env, name, sc, reader, marketOf).then((r) => audit(request, ctx, m.method, tool, outcome, { rco: r.map((x) => x.id || `failed:${x.error}`), subjects: r.map((x) => x.subject) }))
              .catch(() => audit(request, ctx, m.method, tool, outcome, { rco: ["failed:exception"] }));
            if (ctx.exec && ctx.exec.waitUntil) ctx.exec.waitUntil(job); else await job;
            continue;
          }
          if (SEAT_TOOLS.has(name)) { audit(request, ctx, m.method, tool, `${res.isError ? "seat_refused" : "ok"} ${sc && sc.result}${sc && sc.reason ? " " + sc.reason : ""}`, { seat_event: true }); continue; }
        }
      } else out.push(rpcErr(id, -32601, `method not found: ${m.method}`));
    } catch (e) {
      out.push(rpcErr(id, -32603, "internal error"));
    }
    const last = out.length > before ? out[out.length - 1] : null;
    const outcome = !last ? "none" : last.error ? `rpc_error ${last.error.code}` : last.result && last.result.isError ? `tool_error ${(last.result.structuredContent && last.result.structuredContent.error && last.result.structuredContent.error.type) || "error"}` : "ok";
    audit(request, ctx, m.method, tool, outcome);
  }
  if (!out.length) return new Response(null, { status: 202, headers: JSONH });
  return new Response(JSON.stringify(batch ? out : out[0], null, 1), { status: 200, headers: JSONH });
}

export function serverCard(version, origin, ctx) {
  return {
    serverInfo: { name: SERVER.name, version },
    transport: { type: "streamable-http", endpoint: `${origin}/mcp` },
    capabilities: { tools: {} },
    tools: openSchemas(TOOLS),  // FO-02 (2026-11-04): the card carries each tool exactly as tools/list serves it — inputSchema and outputSchema included
    authentication: { reads: "none" },
    role: ctx.role, node: ctx.role === "node" ? ctx.nodeId : null,
    doors: { apex: ctx.apexDoor, nodes: ctx.nodeDoors },
    operator: OPERATOR, principal: "Matthew Keddy", office: "https://agent-kg.ai",
    surface: `https://${ctx.canon}`,
    agent_card: ctx.agentCard,
    keyring: `https://${ctx.canon}/.well-known/jwks.json`,
    source: "public-record",
  };
}

// 2026-09-17 (CEO order, FO-KG SCHEMA STRIP): google-genai's MCP schema converter rejects "additionalProperties": false; strip that one key
// from every served tool schema at the tools/list hook. Names, descriptions, required, property types identical. Same rule as the GSC doors.
function openSchemas(node) {
  if (Array.isArray(node)) return node.map(openSchemas);
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) { if (k === "additionalProperties" && v === false) continue; out[k] = openSchemas(v); }
    return out;
  }
  return node;
}
