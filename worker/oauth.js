// familyofficeknowledgegraph.ai — OAuth posture. This surface runs no authorization server of its own: it is a protected
// resource (RFC 9728) of the office's authorization server at https://agent-kg.ai (client_credentials to registered agents,
// tokens EdDSA-signed against the office keyring, kid mk-office-2026-09). The authorization-server metadata served here is the
// office's, fetched live from agent-kg.ai (edge-cached one hour) so it never drifts from what exists. One licensed route:
// GET /licensed/index — the graph index of record signed to the registered agent by name (kid fo-kg-x402-2026-09).

const ISS = "https://agent-kg.ai";
const RES = "https://familyofficeknowledgegraph.ai";
const SCOPES = ["office:read"];
const JSONH = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" };
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const hex = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, "0")).join("");
const json = (o, status = 200, extra = {}) => new Response(JSON.stringify(o, null, 1), { status, headers: { ...JSONH, ...extra } });

export function protectedResource() {
  return { resource: RES, authorization_servers: [ISS], scopes_supported: SCOPES, bearer_methods_supported: ["header"], resource_documentation: `${RES}/auth.md`, resource_name: "Family Office Knowledge Graph", licensed_routes: [`${RES}/licensed/index`], reads: "open — every record, index and kit file needs no token" };
}

// The office authorization server's metadata, fetched live; a document that names what exists, not a server this host runs.
export async function asMetadata() {
  try {
    const r = await fetch(`${ISS}/.well-known/oauth-authorization-server`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(4000), cf: { cacheTtl: 3600, cacheEverything: true } });
    if (r.ok) { const m = await r.json(); m.served_for = RES; m.note = "The authorization server is the office's at agent-kg.ai; this surface is one of its protected resources."; return { status: 200, body: m }; }
    return { status: 503, body: { error: "authorization_server_unreachable", authorization_server: ISS, protected_resource: `${RES}/.well-known/oauth-protected-resource` } };
  } catch { return { status: 503, body: { error: "authorization_server_unreachable", authorization_server: ISS } }; }
}

async function verifyOffice(token) {
  try {
    const [h, p, s] = token.split(".");
    const header = JSON.parse(new TextDecoder().decode(unb64u(h)));
    const claims = JSON.parse(new TextDecoder().decode(unb64u(p)));
    const r = await fetch(`${ISS}/.well-known/jwks.json`, { signal: AbortSignal.timeout(4000), cf: { cacheTtl: 3600, cacheEverything: true } });
    const keys = ((await r.json()) || {}).keys || [];
    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk || header.alg !== "EdDSA") return { active: false, reason: "kid" };
    const key = await crypto.subtle.importKey("jwk", { kty: "OKP", crv: "Ed25519", x: jwk.x }, { name: "Ed25519" }, false, ["verify"]);
    const ok = await crypto.subtle.verify({ name: "Ed25519" }, key, unb64u(s), new TextEncoder().encode(`${h}.${p}`));
    if (!ok) return { active: false, reason: "signature" };
    const now = Math.floor(Date.now() / 1000);
    if (claims.exp && claims.exp < now) return { active: false, reason: "expired" };
    if (claims.iss !== ISS) return { active: false, reason: "issuer" };
    // revocation is the office's: ask its introspection endpoint
    try {
      const i = await fetch(`${ISS}/oauth/introspect`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: `token=${encodeURIComponent(token)}`, signal: AbortSignal.timeout(4000) });
      const ij = await i.json(); if (ij && ij.active === false) return { active: false, reason: ij.reason || "revoked" };
    } catch {}
    return { active: true, claims };
  } catch { return { active: false, reason: "malformed" }; }
}

export async function handleLicensed(request, env, loadIndex, signStatement) {
  const auth = request.headers.get("authorization") || "";
  const challenge = (err, desc, status) => new Response(JSON.stringify({ error: err, error_description: desc, resource_metadata: `${RES}/.well-known/oauth-protected-resource`, authorization_server: ISS }, null, 1), { status, headers: { ...JSONH, "www-authenticate": `Bearer realm="familyofficeknowledgegraph.ai", resource_metadata="${RES}/.well-known/oauth-protected-resource"${err ? `, error="${err}", error_description="${desc}"` : ""}` } });
  if (!auth.toLowerCase().startsWith("bearer ")) return challenge("", "a Bearer token from https://agent-kg.ai/oauth/token is required", 401);
  const v = await verifyOffice(auth.slice(7).trim());
  if (!v.active) return challenge("invalid_token", v.reason, 401);
  if (!String(v.claims.scope || "").split(" ").includes("office:read")) return challenge("insufficient_scope", "office:read required", 403);
  const data = await loadIndex();
  const now = Math.floor(Date.now() / 1000);
  const statement = await signStatement(env, { iss: RES, iat: now, jti: hex(16), typ: "fo-kg-index", aud: v.claims.sub, licensed_to: v.claims.client_name, statement: data });
  return json({ licensed_to: { client_id: v.claims.sub, client_name: v.claims.client_name }, statement, data, kid: "fo-kg-x402-2026-09", jwks: `${RES}/x402/jwks.json` });
}
