// rco.js — FO-03 item 1 (2026-11-05): every cleared read on the family-office door writes an RCO-10060 receipt on chain fo-kg
// (rco-records.ai, writer key ka931de140f: writer = chain = fo-kg, subject_type fo-record, scope write_receipt only).
// subject = the record id as the door serves it · rule_version = the tool that cleared the read · market = the record's node country
// answer_hash = sha256 over the canonical JSON (keys sorted, no whitespace) of the answer the caller was given.
// The key is the Worker secret RCO_FO_KG_KEY; it is never logged. Each receipt is also indexed in the door's KV under its subject
// (rcpt:<record id>:<cleared_at>:<receipt id>) with the reader as the door saw it (user agent, network, country — never an IP), so a seat
// holder can list the receipts of its own record (seat.js listMyReceipts). Nobody else can read that index.

export const RCO_DOOR = "https://mcp.rco-records.ai/mcp";
export const RCO_VERIFY = "https://rco-records.ai/receipts/";
const RCPT_TTL = 400 * 24 * 3600;

const enc = new TextEncoder();
export async function sha256hex(s) { const d = await crypto.subtle.digest("SHA-256", enc.encode(s)); return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
export function canonical(v) {
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  if (v && typeof v === "object") return "{" + Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => JSON.stringify(k) + ":" + canonical(v[k])).join(",") + "}";
  return JSON.stringify(v === undefined ? null : v);
}
const second = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

// The record ids a tool's answer cleared. list_nodes reads the index of nodes, not a record: it has no fo-record subject.
export function subjectsOf(tool, sc) {
  if (!sc || sc.error) return [];
  if (tool === "resolve_family_office") return [...new Set((sc.matches || []).map((m) => m.id).filter(Boolean))].slice(0, 10);
  if (tool === "get_record") return sc.record && sc.record.id ? [sc.record.id] : [];
  if (tool === "list_events_since" || tool === "list_aliases") return sc.id ? [sc.id] : [];
  if (tool === "claim_seat") return ["accepted", "claimed", "rows_set"].includes(sc.result) && sc.record_id ? [sc.record_id] : [];
  if (tool === "list_my_receipts") return sc.record_id && Array.isArray(sc.receipts) ? [sc.record_id] : [];
  return [];
}

// One receipt per subject. Returns [{ subject, id } | { subject, error }].
export async function writeReceipts(env, tool, sc, reader, marketOf) {
  const subjects = subjectsOf(tool, sc);
  if (!subjects.length) return [];
  if (!env.RCO_FO_KG_KEY) return subjects.map((s) => ({ subject: s, error: "rco_key_not_set" }));
  const answer_hash = "sha256:" + (await sha256hex(canonical(sc)));
  const cleared_at = second();
  const out = [];
  for (const subject of subjects) {
    const args = { subject, subject_type: "fo-record", rule_version: tool, cleared_at, answer_hash, market: marketOf(subject) || undefined };
    try {
      const r = await fetch(RCO_DOOR, { method: "POST", headers: { "content-type": "application/json", accept: "application/json", authorization: "Bearer " + env.RCO_FO_KG_KEY, "user-agent": "fo-kg-door (+https://familyofficeknowledgegraph.ai)" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "write_receipt", arguments: args } }), signal: AbortSignal.timeout(8000) });
      const j = await r.json().catch(() => ({}));
      const res = (j && j.result) || {}, s = res.structuredContent || {};
      const rec = s.receipt || null;
      if (res.isError || !rec || !rec.id) { out.push({ subject, error: s.code || `rco answered ${r.status}` }); continue; }
      out.push({ subject, id: rec.id, seq: rec.seq, idempotent: !!s.idempotent });
      try { await env.FO_KG_OFFICE.put(`rcpt:${subject}:${cleared_at}:${rec.id}`, JSON.stringify({ id: rec.id, seq: rec.seq, rule: tool, cleared_at, subject, answer_hash, reader, verify: RCO_VERIFY + rec.id }), { expirationTtl: RCPT_TTL }); } catch (e) {}
    } catch (e) { out.push({ subject, error: "rco_unreachable" }); }
  }
  return out;
}

// The receipts whose subject is one record, newest first (the KV index above). Only seat.js calls this, after the seat key is proven.
export async function receiptsOf(env, recordId, limit = 100, cursor) {
  const l = await env.FO_KG_OFFICE.list({ prefix: `rcpt:${recordId}:`, limit: 1000, cursor: cursor || undefined });
  const keys = l.keys.map((k) => k.name).sort().reverse().slice(0, Math.min(Math.max(limit | 0 || 100, 1), 500));
  const rows = [];
  for (const k of keys) { try { const v = await env.FO_KG_OFFICE.get(k, "json"); if (v) rows.push(v); } catch (e) {} }
  return { receipts: rows, total_indexed: l.keys.length, more: !l.list_complete, cursor: l.list_complete ? null : l.cursor };
}
