// familyofficeknowledgegraph.ai — Family Office Knowledge Graph · Operator: Agentic KG Holdings · Office: https://agent-kg.ai
// Office code, fresh for this surface (shared template and stylesheet with agent-kg.ai; no company estate code).
// Hosts: the surface (apex + www), the apex door mcp.<host>, the Agent Card host agent.<host>, the node door <node>.<host>,
// and the three 301 twins (.com/.org/.io). Every count on a page is read from the records index at request time — never typed.
// Every kit file has its content-type; anything missing is a real 404 (JSON, never HTML).

import { handleApi, handleReceipt, paidStats, preflight, signStatement, X402 } from "./x402.js";
import { protectedResource, asMetadata, handleLicensed } from "./oauth.js";
import { handleMcp, serverCard, TOOLS, graph, resolveIdentifier } from "./mcp.js";

const CANON = "familyofficeknowledgegraph.ai";
const ORIGIN = `https://${CANON}`;
const OFFICE = "https://agent-kg.ai";
const VERSION = "0.19.12";
const OPERATOR = "Agentic KG Holdings";
const CONTACT = "mailto:mk@agent-kg.ai"; // headers + machine kit only, never page copy
const KID = "mk-office-2026-09";
const SHORT = "fo-kg.ai"; // ORDER-008 (CEO 2026-09-14): every FO-KG door goes to the short root; the long names keep answering
const NODE_HOST = /^([a-z]{2,3}-fo-kg)\.familyofficeknowledgegraph\.ai$/;
const NODE_HOST_SHORT = /^([a-z]{2,3})\.fo-kg\.ai$/;
const nodeIdOf = (h) => { const m = h.match(NODE_HOST); if (m) return m[1]; const s = h.match(NODE_HOST_SHORT); return s && !["mcp", "agent", "www"].includes(s[1]) ? `${s[1]}-fo-kg` : null; };
const roleOf = (h) => (h === CANON ? "surface" : h === `mcp.${CANON}` || h === `mcp.${SHORT}` ? "mcp" : h === `agent.${CANON}` || h === `agent.${SHORT}` ? "agent" : nodeIdOf(h) ? "node" : null);
const APEX_DOOR = `https://mcp.${CANON}/mcp`;
const AGENT_CARD = `https://agent.${SHORT}/.well-known/agent-card.json`;
const LOCAL = (h) => h === "localhost" || h.startsWith("127.") || h === "[::1]";

const BASE_HEADERS = {
  "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https://formspree.io; form-action https://formspree.io; base-uri 'none'; frame-ancestors 'none'",
  "content-signal": "search=yes, ai-input=yes, ai-train=yes",
  "x-office": "Family Office Knowledge Graph — Agentic KG Holdings",
  "x-office-operator": OPERATOR,
  "x-office-version": VERSION,
  "x-office-contact": CONTACT,
  "x-office-keyring": `${ORIGIN}/.well-known/jwks.json`,
  "x-office-jwks": `${ORIGIN}/.well-known/jwks.json`,
  "x-office-kid": KID,
  "x-office-source": "public-record",
  "x-office-x402": "ready",
  "x-office-mcp": APEX_DOOR,
  "x-office-card": AGENT_CARD,
  "link": [
    `<${ORIGIN}/llms.txt>; rel="describedby"; type="text/plain"`,
    `<${AGENT_CARD}>; rel="agent-card"; type="application/json"`,
    `<${ORIGIN}/.well-known/ai-catalog.json>; rel="ai-catalog"; type="application/json"`,
    `<${ORIGIN}/.well-known/jwks.json>; rel="jwks"; type="application/json"`,
    `<${ORIGIN}/.well-known/mcp.json>; rel="mcp-server"; type="application/json"`,
    `<${ORIGIN}/.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"`,
    `<${ORIGIN}/openapi.json>; rel="service-desc"; type="application/openapi+json"`,
    `<${ORIGIN}/auth.md>; rel="service-doc"; type="text/markdown"`,
    `<${APEX_DOOR}>; rel="service"`,
  ].join(", "),
};

const CACHE = { page: "public, max-age=300", kit: "public, max-age=3600", icon: "public, max-age=604800", asset: "public, max-age=86400", record: "public, max-age=600" };
const TYPES = {
  "/llms.txt": "text/plain; charset=utf-8", "/robots.txt": "text/plain; charset=utf-8", "/.well-known/security.txt": "text/plain; charset=utf-8",
  "/auth.md": "text/markdown; charset=utf-8", "/site.webmanifest": "application/manifest+json", "/sitemap.xml": "application/xml; charset=utf-8",
  "/.well-known/api-catalog": "application/linkset+json", "/.well-known/http-message-signatures-directory": "application/http-message-signatures-directory+json",
  "/openapi.json": "application/openapi+json; charset=utf-8", "/webmcp.js": "text/javascript; charset=utf-8",
};
const KIT = new Set(["/llms.txt", "/facts.json", "/ai-catalog.json", "/robots.txt", "/sitemap.xml", "/site.webmanifest", "/auth.md", "/openapi.json", "/health.json",
  "/.well-known/security.txt", "/.well-known/agent-card.json", "/.well-known/ai-catalog.json", "/.well-known/ard.json", "/.well-known/jwks.json", "/x402/jwks.json",
  "/.well-known/api-catalog", "/.well-known/oauth-authorization-server", "/.well-known/openid-configuration", "/.well-known/oauth-protected-resource",
  "/.well-known/mcp/server-card.json", "/.well-known/mcp.json", "/.well-known/skills.json", "/.well-known/agent-skills/index.json", "/.well-known/http-message-signatures-directory"]);
const ICON = /\.(ico|png|svg|jpg)$/;
const RECORD_PAGES = { "/status": "/status.html", "/terms": "/terms.html", "/privacy": "/privacy.html", "/security": "/security.html", "/no-cookies": "/no-cookies.html" };
const STATUS_KIT = ["/llms.txt", "/facts.json", "/ai-catalog.json", "/.well-known/agent-card.json", "/.well-known/jwks.json", "/.well-known/mcp.json", "/.well-known/skills.json", "/.well-known/security.txt", "/robots.txt", "/sitemap.xml", "/records/nodes.json"];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const tokens = (s) => String(Math.ceil(s.length / 4));
const jsonRes = (o, status = 200, extra = {}) => new Response(JSON.stringify(o, null, 1), { status, headers: { "content-type": "application/json; charset=utf-8", ...extra } });

function wantsMarkdown(request) {
  const a = (request.headers.get("accept") || "").toLowerCase();
  if (!a.includes("text/markdown")) return false;
  const md = a.indexOf("text/markdown"), html = a.indexOf("text/html");
  return html === -1 || md < html;
}

// The Markdown twin is the rendered page with the same words: headings, paragraphs, lists, tables, links, form labels.
function htmlToMarkdown(html) {
  const unesc = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
  const strip = (t) => t.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  let body = html.replace(/[\s\S]*?<body[^>]*>/, "").replace(/<\/body>[\s\S]*$/, "");
  body = body.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<nav[\s\S]*?<\/nav>/g, "").replace(/<!--[\s\S]*?-->/g, "");
  body = body.replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, (_, h, t) => `[${strip(t)}](${h.startsWith("/") ? ORIGIN + h : h})`);
  body = body.replace(/<img[^>]*>/g, "");
  body = body.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/g, (_, t) => `\n# ${strip(t)}\n`);
  body = body.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/g, (_, t) => `\n## ${strip(t)}\n`);
  body = body.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/g, (_, t) => `\n### ${strip(t)}\n`);
  body = body.replace(/<div class="sec-eyebrow">([\s\S]*?)<\/div>/g, (_, t) => `\n*${strip(t)}*\n`);
  body = body.replace(/<tr[^>]*>([\s\S]*?)<\/tr>/g, (_, r) => "| " + Array.from(r.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g), (m) => strip(m[1])).join(" | ") + " |\n");
  body = body.replace(/<div class="(?:proof-num|hero-stat-num)[^"]*">([\s\S]*?)<\/div>\s*<div class="(?:proof-label|hero-stat-label)">([\s\S]*?)<\/div>/g, (_, n, l) => `- ${strip(l)}: ${strip(n)}\n`);
  body = body.replace(/<li[^>]*>([\s\S]*?)<\/li>/g, (_, t) => `- ${strip(t)}\n`);
  body = body.replace(/<label[^>]*>([\s\S]*?)<\/label>/g, (_, t) => `- ${strip(t)}: (field)\n`);
  body = body.replace(/<button[^>]*>([\s\S]*?)<\/button>/g, (_, t) => `- ${strip(t)} (button)\n`);
  body = body.replace(/<p[^>]*>([\s\S]*?)<\/p>/g, (_, t) => `\n${strip(t)}\n`);
  body = body.replace(/<span class="footer-sep">·<\/span>/g, " · ");
  body = body.replace(/<[^>]+>/g, "");
  body = unesc(body).split("\n").map((l) => l.replace(/[ \t]+/g, " ").trimEnd()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return body + "\n";
}

function withHeaders(res, path, ctx) {
  for (const [k, v] of Object.entries(BASE_HEADERS)) res.headers.set(k, v);
  res.headers.set("x-office-node", ctx.role === "node" ? ctx.nodeId : "apex");
  res.headers.set("x-office-as-of", ctx.asOf || "pending");
  res.headers.set("x-office-role", ctx.role);
  if (path === "/" || path === "/x402" || path === "/status") { if (!res.headers.get("cache-control")) res.headers.set("cache-control", CACHE.page); }
  else if (KIT.has(path)) res.headers.set("cache-control", CACHE.kit);
  else if (path.startsWith("/records/")) res.headers.set("cache-control", CACHE.record);
  else if (ICON.test(path)) res.headers.set("cache-control", CACHE.icon);
  else if (path === "/styles.css" || path === "/webmcp.js") res.headers.set("cache-control", CACHE.asset);
  if (TYPES[path]) res.headers.set("content-type", TYPES[path]);
  else if (path.endsWith(".json")) res.headers.set("content-type", "application/json; charset=utf-8");
  else if (path.endsWith("/SKILL.md")) res.headers.set("content-type", "text/markdown; charset=utf-8");
  return res;
}

const fmt = (n) => (n === null || n === undefined ? "—" : Number(n).toLocaleString("en-CA"));

const handler = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    const role = LOCAL(host) ? (url.searchParams.get("role") || "surface") : roleOf(host);

    // Twins (familyofficeknowledgegraph.com / .org / .io) and every www host forward to the canonical surface.
    if (!role) {
      return new Response(null, { status: 301, headers: { location: `${ORIGIN}${url.pathname === "/" ? "/" : url.pathname}`, "x-office-version": VERSION, "x-office-operator": OPERATOR } });
    }

    const path = url.pathname;
    const g = graph(env, url);
    const asset = (p) => env.ASSETS.fetch(new Request(new URL(p, url), { method: "GET" }));
    const loadJson = async (p) => { const r = await asset(p); return r.ok ? await r.json() : {}; };
    const nodesDoc = await g.nodes();
    const nodeId = role === "node" ? nodeIdOf(host) : null;
    const ctx = { role, nodeId, version: VERSION, apexDoor: APEX_DOOR, agentCard: AGENT_CARD, canon: CANON, nodeDoors: (nodesDoc && nodesDoc.nodes || []).map((n) => n.door), asOf: null };
    // as-of = the node's sweep start (from its index); the apex carries the latest node as-of
    const indexes = {};
    for (const n of (nodesDoc && nodesDoc.nodes) || []) indexes[n.id] = await g.index(n.id);
    const asOfs = Object.values(indexes).filter(Boolean).map((i) => i.as_of).sort();
    ctx.asOf = role === "node" ? (indexes[nodeId] && indexes[nodeId].as_of) || null : asOfs[asOfs.length - 1] || null;

    // The graph index of record — what the paid call and the licensed route return, and what every count is read from.
    const loadIndex = async () => {
      const nodes = ((nodesDoc && nodesDoc.nodes) || []).map((n) => { const ix = indexes[n.id] || {}; return { ...n, version: ix.version || null, as_of: ix.as_of || null, totals: ix.totals || null, sources: ix.sources || [], records: ix.records || [] }; });
      return { graph: "Family Office Knowledge Graph", surface: ORIGIN, operator: OPERATOR, office: OFFICE, surface_version: VERSION, spine: "GLEIF", record_shape: "Family Office Record (FOR)", states: ["sourced", "filled", "confirmed", "conflict", "unverified"], nodes, generated: new Date().toISOString() };
    };
    const totals = () => {
      const t = { records: 0, nodes: 0, fields: 0, sourced: 0, filled: 0, confirmed: 0, conflict: 0, unverified: 0, gaps: 0, events: 0, sources: 0, registrations: 0, association_listings: 0, association_records: 0 };
      const jur = new Set(); // CEO ruling 2026-09-14: distinct countries the records sit in — the node's country, and on row-fo-kg each record's own jurisdiction
      for (const ix of Object.values(indexes)) { if (!ix) continue; t.nodes += 1; t.records += ix.records.length; for (const k of Object.keys(t)) if (ix.totals && typeof ix.totals[k] === "number" && !["records", "nodes"].includes(k)) t[k] += ix.totals[k];
        if (ix.country && ix.country !== "ZZ") jur.add(ix.jurisdiction || ix.country); else for (const r of ix.records) if (r.jurisdiction && r.jurisdiction !== "Rest of world") jur.add(r.jurisdiction); }
      t.jurisdictions = jur.size; t.jurisdiction_list = [...jur].sort();
      return t;
    };
    const loadFacts = async () => {
      const f = await loadJson("/facts.json");
      f.radar = f.radar || {};
      const t = totals();
      f.radar.counts = { ...t, source: "read from /records/<node>/index.json at request time" };
      f.radar.paid_calls = "held in KV for the office's own read; never rendered publicly (CEO ruling 2026-09-14: usage counts are competitive data)";
      f.radar.as_of = ctx.asOf;
      f.nodes = ((nodesDoc && nodesDoc.nodes) || []).map((n) => ({ ...n, records: (indexes[n.id] || { records: [] }).records.length, as_of: (indexes[n.id] || {}).as_of || null, version: (indexes[n.id] || {}).version || null }));
      return f;
    };

    // ---- doors that accept POST
    if (path === "/mcp") return withHeaders(await handleMcp(request, env, url, ctx), path, ctx);
    if (path === "/api" && request.method === "OPTIONS") return preflight();
    if (request.method !== "GET" && request.method !== "HEAD") {
      return withHeaders(new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, HEAD", "content-type": "text/plain; charset=utf-8" } }), path, ctx);
    }

    // ---- x402
    if (path === "/api") return withHeaders(await handleApi(request, env, loadIndex), path, ctx);
    const rm = path.match(/^\/x402\/receipt\/([^/]+)$/);
    if (rm) return withHeaders(await handleReceipt(env, rm[1]), path, ctx);

    // ---- OAuth documents (protected resource of the office AS) + the licensed route
    if (path === "/.well-known/oauth-authorization-server" || path === "/.well-known/openid-configuration") { const m = await asMetadata(); return withHeaders(jsonRes(m.body, m.status, { "cache-control": "public, max-age=3600" }), path, ctx); }
    if (path === "/.well-known/oauth-protected-resource") return withHeaders(jsonRes(protectedResource()), path, ctx);
    if (path === "/licensed/index") return withHeaders(await handleLicensed(request, env, loadIndex, signStatement), path, ctx);

    // ---- MCP card (both names), on every host
    if (path === "/.well-known/mcp/server-card.json" || path === "/.well-known/mcp.json") return withHeaders(jsonRes(serverCard(VERSION, ctx.role === "node" ? url.origin : `https://mcp.${SHORT}`, ctx)), path, ctx); // ORDER-008: the card names the short door of record

    // ---- resolve over HTTP (GET), for humans and agents without an MCP client
    const rs = path.match(/^\/resolve\/(.+)$/);
    if (rs) {
      const identifier = decodeURIComponent(rs[1]);
      const matches = await resolveIdentifier(g, identifier);
      if (!matches.length) return withHeaders(jsonRes({ error: { type: "not_found", identifier } }, 404, { "cache-control": "no-store" }), path, ctx);
      return withHeaders(jsonRes({ identifier, matches, door: APEX_DOOR }, 200, { "cache-control": CACHE.record }), path, ctx);
    }

    // ---- live documents
    if (path === "/facts.json") {
      const f = await loadFacts();
      return withHeaders(new Response(request.method === "HEAD" ? null : JSON.stringify(f, null, 2), { status: 200, headers: { "content-type": "application/json; charset=utf-8" } }), path, ctx);
    }
    if (path === "/health.json") {
      let kv = "ok"; try { await env.FO_KG_OFFICE.get("x402:count"); } catch { kv = "unavailable"; }
      const t = totals();
      return withHeaders(jsonRes({ status: "ok", surface: CANON, role, node: nodeId, operator: OPERATOR, version: VERSION, as_of: ctx.asOf, time: new Date().toISOString(), kv, records: t.records, nodes: t.nodes, jurisdictions: t.jurisdictions, doors: { page: ORIGIN + "/", apex: APEX_DOOR, nodes: ctx.nodeDoors, agent_card: AGENT_CARD, x402: ORIGIN + "/api", licensed: ORIGIN + "/licensed/index", resolve: ORIGIN + "/resolve/{identifier}" } }, 200, { "cache-control": "no-store" }), path, ctx);
    }
    // the agent host's root is the card; the door hosts' roots describe the door
    if (path === "/" && role === "agent") return Response.redirect(AGENT_CARD, 302);
    if (path === "/" && (role === "mcp" || role === "node")) return withHeaders(await handleMcp(new Request(request.url, { method: "GET" }), env, url, ctx), path, ctx);

    // ---- pages (HTML, or the Markdown twin on Accept: text/markdown — same words)
    const page = async (tplPath, map, cache, raw = []) => {
      const html = (await (await asset(tplPath)).text()).replace(/\{\{([a-z_.0-9]+)\}\}/g, (_, k) => (map[k] === null || map[k] === undefined ? "—" : (raw.includes(k) ? map[k] : esc(map[k]))));
      if (wantsMarkdown(request)) {
        const md = htmlToMarkdown(html);
        return new Response(request.method === "HEAD" ? null : md, { status: 200, headers: { "content-type": "text/markdown; charset=utf-8", vary: "Accept", "cache-control": cache, "x-markdown-tokens": tokens(md) } });
      }
      return new Response(request.method === "HEAD" ? null : html, { status: 200, headers: { "content-type": "text/html; charset=utf-8", vary: "Accept", "cache-control": cache } });
    };

    if (path === "/" || path === "/index.html") {
      const facts = await loadFacts();
      const t = totals();
      const nodeRows = facts.nodes.map((n) => `<tr><td>${esc(n.id)}</td><td>${esc(n.jurisdiction)}</td><td>${n.as_of ? esc(n.as_of) : "pending"}</td><td>${n.records ? fmt(n.records) : "pending"}</td><td><a href="${esc(n.door)}">${esc(n.door.replace("https://", ""))}</a></td><td>${esc(n.spine)}</td></tr>`).join("\n");
      // ORDER-008 (CEO 2026-09-14): §05 Sources and §06 Records are off the page — the record is served only via the door; metrics and the node table stay.
      const map = {
        "counts.records": fmt(t.records), "counts.nodes": fmt(t.nodes), "counts.fields": fmt(t.fields), "counts.sourced": fmt(t.sourced), "counts.filled": fmt(t.filled), "counts.confirmed": fmt(t.confirmed), "counts.conflict": fmt(t.conflict), "counts.unverified": fmt(t.unverified), "counts.gaps": fmt(t.gaps), "counts.events": fmt(t.events), "counts.sources": fmt(t.sources), "counts.registrations": fmt(t.registrations),
        "counts.sourced_plus": fmt(t.sourced + t.confirmed), "counts.jurisdictions": fmt(t.jurisdictions), as_of: ctx.asOf || "pending", surface_version: VERSION,
        "nodes.rows": nodeRows, "nodes.list": facts.nodes.map((n) => `${n.jurisdiction} (${n.id}, ${fmt(n.records)} records)`).join(" · ") || "pending",
      };
      return withHeaders(await page("/index.html", map, CACHE.page, ["nodes.rows"]), "/", ctx);
    }
    if (path === "/x402" || path === "/x402/" || path === "/x402.html") {
      const ps = await paidStats(env);
      const last = ps.last || {};
      const map = {
        "x402.state": ps.receiver_configured ? "LIVE · BASE MAINNET" : "RECEIVER NOT CONFIGURED", "x402.kid": ps.kid,
        "x402.receiver": ps.receiver_configured ? "configured (Worker secret; the address is on the 402 offer)" : "not configured — /api answers 503 until the pay-to address is placed",
        "x402.last_tx": last.explorer ? `<a href="${esc(last.explorer)}" rel="noopener" target="_blank">${esc(last.transaction)}</a>` : null,
        "x402.last_receipt": last.receipt ? `<a href="${esc(last.receipt)}">${esc(last.receipt)}</a>` : null,
        "x402.last_at": last.at ? esc(last.at) : null, surface_version: VERSION, as_of: ctx.asOf || "pending",
      };
      return withHeaders(await page("/x402.html", map, "no-store", ["x402.last_tx", "x402.last_receipt"]), "/x402", ctx);
    }

    // ---- the five record pages; /status rows are live-probed at render
    if (RECORD_PAGES[path]) {
      const map = { surface_version: VERSION, as_of: ctx.asOf || "pending" };
      if (path === "/status") {
        const row = (label, ok, right, cls) => `<li class="${cls || (ok ? "ok" : "bad")}"><span>${esc(label)}</span><span class="${cls || (ok ? "ok" : "bad")}">${esc(right)}</span></li>`;
        const probe = async (p, expect) => {
          try { const r = await handler.fetch(new Request(ORIGIN + p, { method: "GET", headers: { accept: "application/json, text/plain, */*" } }), env); const ct = (r.headers.get("content-type") || "").split(";")[0]; return row(p, r.status === expect, `${r.status} · ${ct}`); }
          catch { return row(p, false, "no answer"); }
        };
        const rows = [];
        for (const p of STATUS_KIT) rows.push(await probe(p, 200));
        for (const n of (nodesDoc && nodesDoc.nodes) || []) rows.push(await probe(`/records/${n.id}/index.json`, 200));
        rows.push(await probe("/api", 402));
        // the doors, on the wire
        for (const [label, u] of [["apex door · " + APEX_DOOR, APEX_DOOR], ...((nodesDoc && nodesDoc.nodes) || []).map((n) => [`node door · ${n.id}`, n.door]), ["agent card · " + AGENT_CARD, AGENT_CARD]]) {
          try { const r = await (env.SELF ? env.SELF.fetch(u, { method: "GET", headers: { accept: "application/json" } }) : fetch(u, { method: "GET", headers: { accept: "application/json" }, signal: AbortSignal.timeout(4000) })); rows.push(row(label, r.status === 200, `${r.status} · ${(r.headers.get("content-type") || "").split(";")[0]}`)); }
          catch (e) { rows.push(row(label, false, `no answer (${e && e.name})`, "warn")); }
        }
        const ps = await paidStats(env);
        if (ps.last && ps.last.receipt) rows.push(await probe(new URL(ps.last.receipt).pathname, 200)); else rows.push(row("/x402/receipt/{nonce}", true, "endpoint up · no receipt yet"));
        try {
          const ds = await (await fetch(`https://cloudflare-dns.com/dns-query?name=${CANON}&type=DS&do=1`, { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(4000), cf: { cacheTtl: 300 } })).json();
          const n = (ds.Answer || []).length;
          rows.push(row(`DNSSEC · ${CANON}`, n > 0 && ds.AD, n > 0 ? (ds.AD ? "DS at parent · validating (AD)" : "DS at parent · not yet validating") : "enabled at Cloudflare · DS not at parent yet (registrar pushes it)", n > 0 && ds.AD ? "ok" : "warn"));
        } catch { rows.push(row(`DNSSEC · ${CANON}`, false, "resolver did not answer", "warn")); }
        const facts = await loadJson("/facts.json"); const rd = facts.radar && facts.radar.readiness;
        rows.push(rd ? row(`Readiness scan · ${rd.date}`, true, `Level ${rd.level} ${rd.level_name || ""} · ${rd.pass} pass / ${rd.fail} fail`, rd.fail ? "warn" : "ok") : row("Readiness scan", false, "no scan recorded", "warn"));
        for (const n of Object.keys(indexes)) rows.push(indexes[n] ? row(`node ${n} · as of ${indexes[n].as_of}`, true, `${indexes[n].records.length} records · version ${indexes[n].version}`) : row(`node ${n}`, false, "pending — no index", "warn"));
        map["status.rows"] = rows.join("\n");
      }
      const res = await page(RECORD_PAGES[path], map, path === "/status" ? "no-store" : CACHE.page, path === "/status" ? ["status.rows"] : []);
      return withHeaders(res, path === "/status" ? "/status" : "/", ctx);
    }

    // ---- static kit, records and assets; anything missing is a real 404 (JSON, never HTML)
    const a = await env.ASSETS.fetch(request);
    if (a.status === 404 || (a.headers.get("content-type") || "").includes("text/html")) {
      return withHeaders(jsonRes({ error: "not_found", surface: CANON, path }, 404, { "cache-control": "no-store" }), "/404", ctx);
    }
    return withHeaders(new Response(a.body, a), path, ctx);
  },
};

export default handler;
