// seat.js — FO-03 (2026-11-05): a family office's own agent claims its seat on the Family Office Knowledge Graph.
// claim_seat(card_url, record_id)               → the card is read (https only, 512 KB); the record id must resolve on the graph to one record,
//                                                 and the name the card gives (provider.organization or name) must be that record's legal name or
//                                                 one of its names. Accepted → a challenge for the card's domain; the record stays listed.
// claim_seat(card_url, record_id, challenge_id) → the challenge is read on the office's own domain: DNS TXT _fo-kg-seat.<domain> =
//                                                 fo-kg-seat=<token>, or https://<domain>/.well-known/fo-kg-seat.txt carrying the token.
//                                                 Pass → listed → claimed, and the seat key is answered once (kept only as its SHA-256). Fail → listed.
// claim_seat(card_url, record_id, seat_key, rows={…}) → the seat's own fields on its own record only (website, aliases, sectors, structure,
//                                                 description, contact_url), shown on get_record under "seat" with state seat_set. The sourced fields
//                                                 are never touched. verified is set by a person, never by a tool.
// list_my_receipts(record_id, seat_key)         → the RCO receipts whose subject is the seat's own record: who read it (as the door saw the
//                                                 reader), when, under which rule. Nobody else can list them.
// GET /seat                                     → the seat lane: its own 402 offer (x402 v2, USDC and Open USD on Base, the office door's payTo),
//                                                 settled per seat (?seat_id=…) for one year; the receipt is signed under the office x402 key
//                                                 (kid mk-office-x402-2026-09, jwks https://agent-kg.ai/x402/jwks.json). No price on any human page.
// Store: the door's KV (FO_KG_OFFICE): seat:rec:<record id>, seat:keyhash:<sha256 of the seat key>, seat:ch:<challenge id>, mail:<day>:<id>.
// Every claim and seat event is an audit line and a mail blob (the office has no mail rail; the blob waits for a sender — see the FO-03 report).
import { EmailMessage } from "cloudflare:email";
import { X402, OUSD, X402_HEADERS, facilitator, importEd25519Seed, b64, unb64, b64uStr, b64uBuf, hex } from "./x402.js";
import { sha256hex, receiptsOf } from "./rco.js";

export const SEAT_PRICE_ATOMIC = "1000000000";   // the one config value of the seat lane, in the asset's smallest unit (6 decimals), per seat per year
const SEAT_TERM_DAYS = 365;
const OFFICE_X402 = { kid: "mk-office-x402-2026-09", jwks: "https://agent-kg.ai/x402/jwks.json", office: "https://agent-kg.ai" };
const DNS_LABEL = "_fo-kg-seat", WELL_KNOWN = "/.well-known/fo-kg-seat.txt", TOKEN_PREFIX = "fo-kg-seat=";
const TTL = 24 * 3600, UA = "fo-kg-seat/1.0 (+https://familyofficeknowledgegraph.ai)";
export const MAIL = { to: "mk@agent-kg.ai", from: "seats@agent-kg.ai" };
const SUFFIX = new Set(["llp", "lp", "llc", "ltd", "limited", "inc", "corp", "corporation", "co", "company", "plc", "sa", "s a", "ag", "gmbh", "kg", "bv", "b v", "nv", "sarl", "sas", "srl", "spa", "pte", "pty", "ab", "as", "oy", "the", "and"]);
const SETTABLE = { website: "https url", aliases: "list of names", sectors: "list of sectors", structure: "short text", description: "text, at most 600 characters", contact_url: "https url" };
const NEVER = new Set(["verified", "claim_status", "state", "source_url", "read_by"]);

const nowIso = () => new Date().toISOString();
const tok = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const words = (s) => String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter((w) => w && !SUFFIX.has(w));
export function nameMatch(cardNames, recordNames) {
  return cardNames.some((c) => { const a = words(c).join(" "); return a && recordNames.some((r) => words(r).join(" ") === a); });
}
const kv = {
  get: async (env, k) => { try { return JSON.parse((await env.FO_KG_OFFICE.get(k)) || "null"); } catch (e) { return null; } },
  put: (env, k, v, ttl) => env.FO_KG_OFFICE.put(k, JSON.stringify(v), ttl ? { expirationTtl: ttl } : undefined),
};
export const seatOf = (env, recordId) => kv.get(env, `seat:rec:${recordId}`);
const seatId = async (card, recordId) => "seat_" + (await sha256hex(card.trim() + "\n" + recordId)).slice(0, 16);

async function get(url, accept, limit = 512 * 1024) {
  const u = new URL(url); if (u.protocol !== "https:" || !u.hostname || /^(localhost|\d+\.\d+\.\d+\.\d+|\[.*\])$/i.test(u.hostname)) throw new Error("https host name required");
  const r = await fetch(u.href, { headers: { "user-agent": UA, accept }, redirect: "manual", signal: AbortSignal.timeout(6000) });
  if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
  const b = await r.text(); if (b.length > limit) throw new Error("answer larger than 512 KB"); return b;
}
async function readCard(url) {
  let c; try { c = JSON.parse(await get(url, "application/json")); } catch (e) { return [null, `the agent card could not be read at ${url}: ${String(e.message || e).slice(0, 120)}`]; }
  if (!c || typeof c !== "object") return [null, "the agent card is not a JSON object"];
  const prov = c.provider && typeof c.provider === "object" ? c.provider : {};
  const names = [prov.organization, c.name].filter((x) => typeof x === "string" && x.trim());
  if (!names.length) return [null, "the agent card names no office (provider.organization or name)"];
  let dom = null; try { if (typeof prov.url === "string" && prov.url.startsWith("https://")) dom = new URL(prov.url).hostname; } catch (e) {}
  dom = (dom || new URL(url).hostname).toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  return [{ names, organization: prov.organization || null, name: c.name || null, domain: dom }, null];
}
async function doh(name) {
  for (const u of [`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`, `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=TXT`]) {
    try { const j = await (await fetch(u, { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(5000) })).json(); return (j.Answer || []).filter((a) => a.type === 16).map((a) => String(a.data || "").replace(/" "/g, "").replace(/^"|"$/g, "")); } catch (e) {}
  }
  return null;
}
async function prove(domain, token) {
  const txt = await doh(`${DNS_LABEL}.${domain}`);
  if (txt && txt.some((t) => t.trim() === TOKEN_PREFIX + token)) return [true, "dns", `TXT ${DNS_LABEL}.${domain}`];
  let wk; try { const b = await get(`https://${domain}${WELL_KNOWN}`, "text/plain", 4096); if (b.split(/\s+/).includes(token)) return [true, "well-known", `https://${domain}${WELL_KNOWN}`]; wk = "the well-known file does not carry the token"; }
  catch (e) { wk = `the well-known file was not read (${String(e.message || e).slice(0, 80)})`; }
  return [false, null, `${txt && txt.length ? `the TXT record at ${DNS_LABEL}.${domain} does not carry the token` : `no TXT record at ${DNS_LABEL}.${domain}`}; ${wk}`];
}

// the mail rail: one blob per event in the door's KV, addressed to the office, then sent through the send_email binding MAIL
// (FO-03 re-close 2026-11-05: sender seats@agent-kg.ai, the CEO's routing rule on agent-kg.ai). A blob that cannot be sent stays queued and
// the door's cron (every 15 minutes) retries it, at most 192 times (two days); every send is an audit line (method "mail").
export async function mail(env, event) {
  const day = nowIso().slice(0, 10), id = `${Date.now()}_${hex(4)}`;
  const lines = Object.entries(event).filter(([k]) => k !== "type").map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`);
  const blob = { id, to: MAIL.to, from: MAIL.from, subject: `[fo-kg seat] ${event.type} · ${event.record_id || ""}`.trim(), text: `Family Office Knowledge Graph — seat event ${event.type}\n\n${lines.join("\n")}\n`, event, queued_at: nowIso(), status: "queued", attempts: 0 };
  const key = `mail:${day}:${id}`;
  try { await env.FO_KG_OFFICE.put(key, JSON.stringify(blob), { expirationTtl: 90 * 24 * 3600 }); } catch (e) { return null; }
  try { await sendBlob(env, key, blob); } catch (e) {}
  return key;
}
const b64utf8 = (s) => btoa(unescape(encodeURIComponent(s)));
function mime(blob) {
  const host = MAIL.from.split("@")[1];
  return [`From: Family Office Knowledge Graph seats <${blob.from}>`, `To: <${blob.to}>`, `Subject: =?UTF-8?B?${b64utf8(blob.subject)}?=`, `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${blob.id}.${hex(4)}@${host}>`, "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", b64utf8(blob.text).replace(/(.{76})/g, "$1\r\n"), ""].join("\r\n");
}
async function sendBlob(env, key, blob) {
  let status, err = null;
  if (!env.MAIL) { status = "queued"; err = "no send_email binding"; }
  else {
    try { await env.MAIL.send(new EmailMessage(blob.from, blob.to, mime(blob))); status = "sent"; }
    catch (e) { status = "queued"; err = String((e && e.message) || e).slice(0, 200); }
  }
  const next = { ...blob, status, attempts: (blob.attempts || 0) + (env.MAIL ? 1 : 0), ...(status === "sent" ? { sent_at: nowIso(), last_error: null } : { last_error: err }) };
  try { await env.FO_KG_OFFICE.put(key, JSON.stringify(next), { expirationTtl: 90 * 24 * 3600 }); } catch (e) {}
  console.log(JSON.stringify({ audit: "fo-kg-door", method: "mail", tool: null, outcome: status === "sent" ? "sent" : "send_failed", mail: key, event: blob.event && blob.event.type, attempts: next.attempts, error: err }));
  return next;
}
// the cron: every queued blob is sent (at most 192 attempts each, two days of 15-minute tries); blobs from before the sender existed ("queued: …") are queued too
export async function flushMail(env) {
  const out = { sent: 0, failed: 0, skipped: 0 };
  let cursor;
  do {
    const l = await env.FO_KG_OFFICE.list({ prefix: "mail:", limit: 1000, cursor });
    for (const k of l.keys) {
      const b = await kv.get(env, k.name);
      if (!b || b.status === "sent" || !String(b.status || "").startsWith("queued")) { out.skipped++; continue; }
      if ((b.attempts || 0) >= 192) { out.skipped++; continue; }
      const r = await sendBlob(env, k.name, b); out[r.status === "sent" ? "sent" : "failed"]++;
    }
    cursor = l.list_complete ? null : l.cursor;
  } while (cursor);
  return out;
}

// the record a claim names: the record id must resolve to exactly that record (resolveOne → { m, rec } or { why })
async function recordFor(resolveOne, recordId) {
  const r = await resolveOne(recordId);
  if (!r || !r.rec) return [null, (r && r.why) || "the record id does not resolve on the graph"];
  const names = [r.rec.identity && r.rec.identity.legal_name && r.rec.identity.legal_name.value, r.m.legal_name,
    ...((r.rec.aliases || []).map((a) => (a && typeof a === "object" ? a.value || a.name : a)))].filter((x) => typeof x === "string" && x.trim());
  return [{ id: r.rec.id, node: r.m.node, names: [...new Set(names)], legal_name: names[0] || null, test: !!r.rec.test }, null];
}

async function keyRow(env, seatKey) { return seatKey ? kv.get(env, `seat:keyhash:${await sha256hex(String(seatKey))}`) : null; }

export async function claimSeat(env, a, resolveOne) {
  a = a || {};
  const card_url = String(a.card_url || "").trim(), record_id = String(a.record_id || "").trim(), claim_id = "claim_" + hex(8);
  if (!env.FO_KG_OFFICE) return { claim_id, result: "error", error: "the seat store is not bound" };
  if (!card_url.startsWith("https://")) return { claim_id, result: "refused", reason: "BAD_INPUT", detail: "card_url must be the https URL of the office agent's card" };
  if (!record_id) return { claim_id, result: "refused", reason: "BAD_INPUT", detail: "record_id must be the office's record id as the graph serves it (resolve_family_office lists it)" };
  // ---- the seat's own fields
  if (a.rows !== undefined) {
    const k = await keyRow(env, a.seat_key);
    if (!k) return { claim_id, result: "rows_refused", record_id, reason: "SEAT_KEY_REQUIRED", detail: "rows are set with the seat key answered when the domain challenge passed; prove the domain again for a new one" };
    if (k.record_id !== record_id) return { claim_id, result: "rows_refused", record_id, seat_id: k.seat_id, reason: "NOT_YOUR_RECORD", detail: "a seat key sets the fields of its own record only" };
    const seat = await seatOf(env, record_id);
    if (!seat || seat.seat_id !== k.seat_id) return { claim_id, result: "rows_refused", record_id, seat_id: k.seat_id, reason: "NOT_YOUR_RECORD", detail: "this record is not held by this seat" };
    const rows = a.rows && typeof a.rows === "object" && !Array.isArray(a.rows) ? a.rows : null;
    if (!rows || !Object.keys(rows).length) return { claim_id, result: "rows_refused", record_id, seat_id: k.seat_id, reason: "BAD_INPUT", detail: `rows is an object of the seat's own fields: ${Object.keys(SETTABLE).join(", ")}` };
    const set = {}, refused = [];
    for (const [f, v] of Object.entries(rows)) {
      if (NEVER.has(f)) { refused.push({ field: f, reason: f === "verified" || f === "claim_status" ? "VERIFIED_NOT_SETTABLE" : "FIELD_NOT_SETTABLE", detail: f === "verified" || f === "claim_status" ? "verified is set by a person, never by a tool" : `${f} belongs to the sourced record and is never set by a seat` }); continue; }
      if (!(f in SETTABLE)) { refused.push({ field: f, reason: "FIELD_NOT_SETTABLE", detail: `a seat sets ${Object.keys(SETTABLE).join(", ")} only; the sourced fields are never touched` }); continue; }
      let val = null, err = null;
      if (f === "website" || f === "contact_url") { try { const u = new URL(String(v)); if (u.protocol === "https:" && String(v).length <= 300) val = u.href; else err = "an https URL of at most 300 characters"; } catch (e) { err = "an https URL"; } }
      else if (f === "aliases" || f === "sectors") { if (Array.isArray(v) && v.length <= 20 && v.every((x) => typeof x === "string" && x.trim() && x.length <= 200)) val = v.map((x) => x.trim()); else err = "a list of at most 20 non-empty strings"; }
      else if (f === "structure") { if (typeof v === "string" && v.trim() && v.length <= 80) val = v.trim(); else err = "a string of at most 80 characters"; }
      else if (f === "description") { if (typeof v === "string" && v.trim() && v.length <= 600) val = v.trim(); else err = "a string of at most 600 characters"; }
      if (err) refused.push({ field: f, reason: "BAD_INPUT", detail: `${f} must be ${err}` }); else set[f] = { value: val, state: "seat_set", by: k.seat_id, source_url: seat.card_url, set_at: nowIso() };
    }
    if (Object.keys(set).length) { seat.rows = { ...(seat.rows || {}), ...set }; seat.rows_set_at = nowIso(); await kv.put(env, `seat:rec:${record_id}`, seat); }
    const result = Object.keys(set).length ? "rows_set" : "rows_refused";
    if (result === "rows_set") await mail(env, { type: "rows_set", record_id, seat_id: k.seat_id, fields: Object.keys(set), refused: refused.map((r) => r.field) });
    return { claim_id, result, record_id, seat_id: k.seat_id, set, refused, claim_status: seat.claim_status, note: "seat fields sit beside the sourced record under get_record → seat; verified is set by a person, never by a tool" };
  }
  // ---- the claim and the proof
  const [rec, rwhy] = await recordFor(resolveOne, record_id);   // the record first: an id the graph does not carry is refused before any fetch
  if (!rec) return { claim_id, result: "refused", reason: "UNRESOLVED", detail: rwhy, card_url, record_id };
  const [card, cwhy] = await readCard(card_url);
  if (!card) return { claim_id, result: "refused", reason: "CARD_UNREADABLE", detail: cwhy, card_url, record_id: rec.id, claim_status: "listed" };
  const sid = await seatId(card_url, rec.id);
  const base = { claim_id, card_url, record_id: rec.id, node: rec.node, seat_id: sid, office: card.organization || card.name, domain: card.domain, ...(rec.test ? { test: true } : {}) };
  if (!nameMatch(card.names, rec.names)) return { ...base, result: "refused", reason: "NAME_MISMATCH", detail: `the record's name is '${rec.legal_name}'; the card names ${card.names.join(" / ")}`, claim_status: "listed" };
  const held = await seatOf(env, rec.id);
  if (held && held.seat_id !== sid) return { ...base, result: "refused", reason: "SEAT_HELD", detail: "this record is claimed by another seat", claim_status: held.claim_status };
  if (!a.challenge_id) {
    const token = tok(), cid = "ch_" + hex(10), exp = new Date(Date.now() + TTL * 1000).toISOString();
    await kv.put(env, `seat:ch:${cid}`, { challenge_id: cid, token, card_url, domain: card.domain, record_id: rec.id, issued_at: nowIso(), expires_at: exp, claim_id }, TTL + 3600);
    await mail(env, { type: "claim_accepted", record_id: rec.id, seat_id: sid, office: base.office, domain: card.domain, card_url, challenge_id: cid });
    return { ...base, result: "accepted", claim_status: (held && held.claim_status) || "listed", challenge: { challenge_id: cid, domain: card.domain, expires_at: exp,
      dns: { name: `${DNS_LABEL}.${card.domain}`, type: "TXT", value: TOKEN_PREFIX + token }, well_known: { url: `https://${card.domain}${WELL_KNOWN}`, body: token },
      then: "publish one of the two, then call claim_seat again with the same card_url, the same record_id and this challenge_id" } };
  }
  const ch = await kv.get(env, `seat:ch:${String(a.challenge_id).replace(/[^a-z0-9_]/g, "")}`); let fail = null, method = null, where = null;
  if (!ch) fail = "no such challenge on this door";
  else if (ch.card_url !== card_url || ch.domain !== card.domain) fail = "the challenge was issued to another card or domain";
  else if (ch.record_id !== rec.id) fail = "the record is not the one the challenge was issued for";
  else if (ch.expires_at < nowIso()) fail = "the challenge has expired; claim again for a new one";
  if (!fail) { const [ok, m, w] = await prove(card.domain, ch.token); if (ok) { method = m; where = w; } else fail = w; }
  if (fail) { await mail(env, { type: "proof_failed", record_id: rec.id, seat_id: sid, domain: card.domain, challenge_id: a.challenge_id, detail: fail }); return { ...base, result: "proof_failed", reason: "DOMAIN_NOT_PROVEN", detail: fail, challenge_id: a.challenge_id, claim_status: "listed" }; }
  const key = tok() + tok(), at = nowIso(), kh = await sha256hex(key);
  if (held && held.key_sha256) { try { await env.FO_KG_OFFICE.delete(`seat:keyhash:${held.key_sha256}`); } catch (e) {} }   // a fresh proof replaces the seat's key
  await kv.put(env, `seat:keyhash:${kh}`, { seat_id: sid, record_id: rec.id, card_url, issued_at: at });
  await kv.put(env, `seat:rec:${rec.id}`, { record_id: rec.id, node: rec.node, seat_id: sid, card_url, office: base.office, domain: card.domain, claim_status: "claimed", claimed_at: (held && held.claimed_at) || at, proven_at: at,
    proof: { method, where, challenge_id: a.challenge_id }, claim_id, key_sha256: kh, paid_through: (held && held.paid_through) || null, rows: (held && held.rows) || {}, ...(rec.test ? { test: true } : {}) });
  await mail(env, { type: "claimed", record_id: rec.id, seat_id: sid, office: base.office, domain: card.domain, proof: method, where });
  return { ...base, result: "claimed", claim_status: "claimed", proof: { method, where }, seat_key: key,
    seat_key_note: "answered once and kept only as its SHA-256: pass it with rows={website, aliases, sectors, structure, description, contact_url} to set this record's seat fields, and to list_my_receipts",
    seat_lane: { url: `${X402.origin}/seat?seat_id=${sid}`, note: "the seat settles on /seat (x402); the offer is on the 402 there" },
    next: "claimed → verified is a person's step, not a tool's" };
}

export async function listMyReceipts(env, a) {
  a = a || {};
  const record_id = String(a.record_id || "").trim(), k = await keyRow(env, a.seat_key);
  if (!record_id) return { result: "refused", reason: "BAD_INPUT", detail: "record_id is required" };
  if (!k) return { result: "refused", reason: "SEAT_KEY_REQUIRED", record_id, detail: "the receipts of a record are listed to the seat that holds it, with its seat key; nobody else can list them" };
  if (k.record_id !== record_id) return { result: "refused", reason: "NOT_YOUR_RECORD", record_id, detail: "a seat key lists the receipts of its own record only" };
  const seat = await seatOf(env, record_id);
  if (!seat || seat.seat_id !== k.seat_id) return { result: "refused", reason: "NOT_YOUR_RECORD", record_id, detail: "this record is not held by this seat" };
  const r = await receiptsOf(env, record_id, a.limit, a.cursor);
  return { result: "listed", record_id, seat_id: k.seat_id, chain: "fo-kg", ...r,
    reader_note: "reader = the caller as the door saw it (user agent, network ASN, country); the door holds no identity and no IP. Each receipt verifies at its verify URL (RCO-10060)." };
}

// get_record → seat: the seat block beside the sourced record (claim_status listed when no seat holds it)
export async function seatBlock(env, recordId) {
  const s = await seatOf(env, recordId);
  if (!s) return { claim_status: "listed" };
  return { claim_status: s.claim_status, seat_id: s.seat_id, office: s.office, domain: s.domain, claimed_at: s.claimed_at, paid_through: s.paid_through || null, rows: s.rows || {}, note: "seat fields are set by the office's own agent with its seat key; the sourced fields are unchanged; verified is set by a person, never by a tool" };
}

// ---- the seat lane: GET /seat
function seatRequirements(env, url, asset) {
  const usdc = { scheme: "exact", network: X402.network, amount: SEAT_PRICE_ATOMIC, maxAmountRequired: SEAT_PRICE_ATOMIC, asset: X402.asset, payTo: env.X402_PAYTO, maxTimeoutSeconds: X402.maxTimeoutSeconds, resource: url, description: "A seat on the Family Office Knowledge Graph for one year: the office's own record, claimed with claim_seat (domain proven), its seat fields and the receipts of its record. Operator: Agentic KG Holdings.", mimeType: "application/json", extra: { name: X402.assetName, version: X402.eip712Version } };
  const ousd = { ...usdc, asset: OUSD.asset, payTo: env.X402_PAYTO_OUSD || env.X402_PAYTO, extra: { assetTransferMethod: "permit2", name: OUSD.name, version: OUSD.version } };
  return asset ? [usdc, ousd].find((x) => x.asset.toLowerCase() === asset) || usdc : [usdc, ousd];
}
function seatOffer(env, url, error) {
  const body = { x402Version: 2, error: error || "PAYMENT-SIGNATURE header is required", accepts: seatRequirements(env, url), resource: { url, description: "the seat lane of the Family Office Knowledge Graph", mimeType: "application/json" },
    extensions: { eip2612GasSponsoring: { info: { description: "The facilitator accepts EIP-2612 gasless Permit to Permit2 canonical contract.", version: "1" }, schema: { type: "object" } } },
    seat: { term_days: SEAT_TERM_DAYS, per: "seat per year", claim_tool: "claim_seat", door: "https://mcp.fo-kg.ai/mcp", settle: `${X402.origin}/seat?seat_id=<seat id from claim_seat>`, requires: "a claimed seat (domain proven)", per_call_lane: `${X402.origin}/api` },
    receipts: { kid: OFFICE_X402.kid, jwks: OFFICE_X402.jwks, resolve: `${X402.origin}/x402/receipt/{nonce}` }, operator: X402.operator };
  return new Response(JSON.stringify(body, null, 1), { status: 402, headers: { ...X402_HEADERS, "PAYMENT-REQUIRED": b64(body) } });
}
async function signOffice(env, claims) {
  const key = await importEd25519Seed(Uint8Array.from(atob(String(env.OFFICE_X402_RECEIPT_SEED).replace(/-/g, "+").replace(/_/g, "/") + "===".slice((String(env.OFFICE_X402_RECEIPT_SEED).length + 3) % 4)), (c) => c.charCodeAt(0)));
  const h = b64uStr(JSON.stringify({ alg: "EdDSA", typ: "JWT", kid: OFFICE_X402.kid })), p = b64uStr(JSON.stringify(claims));
  const sig = await crypto.subtle.sign({ name: "Ed25519" }, key, new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${b64uBuf(sig)}`;
}
export async function handleSeat(request, env) {
  const u = new URL(request.url), sid = (u.searchParams.get("seat_id") || "").replace(/[^a-z0-9_]/g, "");
  const resource = `${X402.origin}/seat${sid ? `?seat_id=${sid}` : ""}`;
  if (!env.X402_PAYTO) return new Response(JSON.stringify({ error: "receiver_not_configured" }), { status: 503, headers: X402_HEADERS });
  const sig = request.headers.get("PAYMENT-SIGNATURE") || request.headers.get("X-PAYMENT");
  if (!sig) return seatOffer(env, resource);
  if (!sid) return seatOffer(env, resource, "seat_id is required: settle a claimed seat (claim_seat answers its seat_id)");
  // the seat must be claimed before any payment is verified, so no payment is taken for a seat that does not exist
  const seats = await env.FO_KG_OFFICE.list({ prefix: "seat:rec:", limit: 1000 }); let seat = null;
  for (const k of seats.keys) { const s = await kv.get(env, k.name); if (s && s.seat_id === sid) { seat = s; break; } }
  if (!seat || seat.claim_status !== "claimed") return seatOffer(env, resource, "no claimed seat with this seat_id; claim it first with claim_seat");
  if (!env.OFFICE_X402_RECEIPT_SEED) return new Response(JSON.stringify({ error: "receipt_key_not_configured" }), { status: 503, headers: X402_HEADERS });
  let payload; try { payload = unb64(sig); } catch (e) { return seatOffer(env, resource, "PAYMENT-SIGNATURE is not base64 JSON"); }
  const req = seatRequirements(env, resource, String((payload.accepted && payload.accepted.asset) || "").toLowerCase());
  const v = await facilitator(env, "/verify", { x402Version: payload.x402Version || 2, paymentPayload: payload, paymentRequirements: req });
  if (!(v.body && v.body.isValid)) return seatOffer(env, resource, "payment not valid: " + ((v.body && (v.body.invalidReason || v.body.error)) || v.status));
  const s = await facilitator(env, "/settle", { x402Version: payload.x402Version || 2, paymentPayload: payload, paymentRequirements: req });
  const settled = !!(s.body && (s.body.success || s.body.transaction || s.body.txHash)), tx = (s.body && (s.body.transaction || s.body.txHash)) || null;
  const now = Math.floor(Date.now() / 1000), nonce = hex(16);
  const payer = (s.body && s.body.payer) || (payload.payload && payload.payload.authorization && payload.payload.authorization.from) || (payload.payload && payload.payload.permit2Authorization && payload.payload.permit2Authorization.from) || "payer";
  const from = seat.paid_through && seat.paid_through > nowIso() ? new Date(seat.paid_through) : new Date();
  const through = new Date(from.getTime() + SEAT_TERM_DAYS * 86400000).toISOString();
  const claims = { iss: X402.origin, sub: payer, jti: nonce, iat: now, resource, lane: "seat", seat_id: sid, record_id: seat.record_id, paid_through: settled ? through : seat.paid_through || null, scheme: "exact", network: req.network, asset: req.asset, amount: req.amount, payTo: req.payTo, transaction: tx, explorer: tx ? X402.explorer + tx : null, settled, receipt_url: `${X402.origin}/x402/receipt/${nonce}`, operator: X402.operator, office: OFFICE_X402.office };
  let jwt = null; try { jwt = await signOffice(env, claims); } catch (e) {}
  const receipt = { ...claims, jwt, kid: OFFICE_X402.kid, jwks: OFFICE_X402.jwks };
  try { await env.FO_KG_OFFICE.put(`x402:receipt:${nonce}`, JSON.stringify(receipt)); } catch (e) {}
  if (settled) {
    seat.paid_through = through; seat.last_settlement = { transaction: tx, receipt: claims.receipt_url, at: nowIso() }; await kv.put(env, `seat:rec:${seat.record_id}`, seat);
    try { const c = parseInt((await env.FO_KG_OFFICE.get("seat:x402:count")) || "0", 10) + 1; await env.FO_KG_OFFICE.put("seat:x402:count", String(c)); } catch (e) {}
    await mail(env, { type: "seat_settled", record_id: seat.record_id, seat_id: sid, paid_through: through, transaction: tx, receipt: claims.receipt_url });
  }
  const pr = { x402Version: 2, success: settled, transaction: tx, network: req.network, amount: req.amount, asset: req.asset, payer, receipt: claims.receipt_url, errorReason: settled ? null : (s.body && (s.body.errorReason || s.body.error)) || null };
  return new Response(JSON.stringify({ receipt, seat: { seat_id: sid, record_id: seat.record_id, paid_through: seat.paid_through } }, null, 1), { status: settled ? 200 : 402, headers: { ...X402_HEADERS, "PAYMENT-RESPONSE": b64(pr), "X-PAYMENT-RESPONSE": b64(pr), "X-X402-Receipt": claims.receipt_url } });
}
