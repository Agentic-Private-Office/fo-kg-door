"""
build_kit.py — familyofficeknowledgegraph.ai machine kit of record (FO_START_ME_UP_2 "every surface carries", FO_START_ME_UP_4 kit on the
door host, FO_START_ME_UP_5 checks). Writes every static kit file under SITE/public from facts.json + the records index; digests are real.
Counts in llms.txt are read from the index at build time and labelled with the index as-of; the page reads them live.
Run before every deploy: python rails/build_kit.py
"""
import hashlib, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
PUB = ROOT / "public"
WK = PUB / ".well-known"
O = "https://familyofficeknowledgegraph.ai"
MCP = "https://mcp.fo-kg.ai"  # ORDER-008 (CEO 2026-09-14): doors of record on the short root
AGENT = "https://agent.fo-kg.ai"
MCP_LONG = "https://mcp.familyofficeknowledgegraph.ai"  # keeps answering
AGENT_LONG = "https://agent.familyofficeknowledgegraph.ai"
OFFICE = "https://agent-kg.ai"
OPERATOR = "Agentic KG Holdings"
PRINCIPAL = "Matthew Keddy"
GRAPH = "Family Office Knowledge Graph"
CONTACT = "mk@agent-kg.ai"
KID = "mk-office-2026-09"
X402_KID = "fo-kg-x402-2026-09"

facts = json.load(open(PUB / "facts.json", encoding="utf-8"))
VERSION = facts["surface_version"]; AS_OF = facts["as_of"]
jwks = json.load(open(WK / "jwks.json", encoding="utf-8"))
nodes = json.load(open(PUB / "records" / "nodes.json", encoding="utf-8"))
indexes = {n["id"]: json.load(open(PUB / "records" / n["id"] / "index.json", encoding="utf-8")) for n in nodes["nodes"]}


def w(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    open(path, "w", encoding="utf-8", newline="\n").write(text if text.endswith("\n") else text + "\n")


def wj(path, obj): w(path, json.dumps(obj, indent=2, ensure_ascii=False))


# robots.txt
w(PUB / "robots.txt", f"""# familyofficeknowledgegraph.ai — {GRAPH} · Operator: {OPERATOR}
# Open to all agents. Machine register: {O}/llms.txt

User-agent: *
Allow: /

User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-Web
Allow: /
User-agent: anthropic-ai
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: Googlebot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Perplexity-User
Allow: /
User-agent: Bingbot
Allow: /
User-agent: CCBot
Allow: /
User-agent: Applebot-Extended
Allow: /
User-agent: meta-externalagent
Allow: /

Sitemap: {O}/sitemap.xml
Content-Signal: search=yes, ai-input=yes, ai-train=yes

# LLM discovery:  {O}/llms.txt
# Agent Card:     {AGENT}/.well-known/agent-card.json
# ARD catalog:    {O}/.well-known/ai-catalog.json
# MCP:            {O}/.well-known/mcp.json → {MCP}/mcp (apex) · node doors listed in {O}/records/nodes.json
# Keyring:        {O}/.well-known/jwks.json
# Paid door:      {O}/api (x402) · human door {O}/x402
""")

# llms.txt
node_lines = "\n".join(f"- {n['id']} — {n['jurisdiction']} · {indexes[n['id']]['totals'] and len(indexes[n['id']]['records'])} records as of {indexes[n['id']]['as_of']} · door {n['door']} · index {n['index']} · spine {n['spine']}" for n in nodes["nodes"])
src_lines = "\n".join(f"- {s['name']} — {s['url']} · {s['role']}" for n in nodes["nodes"] for s in indexes[n["id"]]["sources"])
tot = {k: sum(indexes[n["id"]]["totals"].get(k, 0) for n in nodes["nodes"]) for k in ("fields", "confirmed", "sourced", "filled", "conflict", "unverified", "gaps", "events", "registrations")}
w(PUB / "llms.txt", f"""# {GRAPH}

> One record per family office, drawn from the public record: the GLEIF spine first, then the national registers that fill and confirm it. Every field carries where it came from, who read it, when, and its state. Nothing is inferred and nothing is typed.

Operator: {OPERATOR} · Principal: {PRINCIPAL} · Office: {OFFICE} · Surface: {O} · Surface version {VERSION} · as of {AS_OF}

## What it is

A knowledge graph of the office's kind (FO_START_ME_UP_3): one Family Office Record (FOR) per subject. Field = {{ value, source_url, read_by, read, state }} — second_source_url, second_read_by where two independent public sources agree. States: sourced · filled · confirmed · conflict · unverified. Passes: harvest → fill → confirm. Records are confirmed, not signed.

## Nodes (counts read from each node's index at build; the page reads them live)

{node_lines}
- Totals at build: {tot['fields']} fields · {tot['confirmed']} confirmed · {tot['sourced']} sourced · {tot['filled']} filled · {tot['conflict']} conflict · {tot['unverified']} unverified · {tot['registrations']} register entries · {tot['events']} events · {tot['gaps']} declared gaps

## Doors

- Apex door (MCP, streamable-http): {MCP}/mcp — holds the index, forwards to the node door · card {O}/.well-known/mcp.json · node doors <node>.fo-kg.ai/mcp (ca.fo-kg.ai … row.fo-kg.ai) · long names keep answering ({MCP_LONG}/mcp, <node>.familyofficeknowledgegraph.ai/mcp, {AGENT_LONG})
- Node doors: {' · '.join(n['door'] for n in nodes['nodes'])} — serve the records
- Tools (five, same names on every office graph): resolve_family_office(identifier) · get_record(identifier, version?) · list_events_since(identifier, since?, cursor?, limit?) · list_aliases(identifier) · list_nodes()
- Agent Card (A2A): {AGENT}/.well-known/agent-card.json
- Over HTTP: {O}/resolve/{{identifier}} · {O}/records/nodes.json · {O}/records/<node>/index.json · {O}/records/<node>/<LEI>.json
- Paid door (x402 v2, $0.01 USDC, Base mainnet): GET {O}/api → 402 offer; with PAYMENT-SIGNATURE → {{ receipt, statement, data }} = the graph index of record signed (kid {X402_KID}); human door {O}/x402; doctrine {OFFICE}/x402
- Licensed route: GET {O}/licensed/index with a Bearer token from the office authorization server ({OFFICE}/oauth/token, scope office:read); protected-resource metadata {O}/.well-known/oauth-protected-resource; instructions {O}/auth.md
- Human contact: {O}/#contact — the form is the only door on the page

## Sources read for the nodes above

{src_lines}

## Machine kit

- {O}/facts.json — facts of record (live counts and paid-calls line)
- {AGENT}/.well-known/agent-card.json — A2A Agent Card (the five tools as skills); also served at {O}/.well-known/agent-card.json
- {O}/.well-known/mcp.json — MCP server card (also /.well-known/mcp/server-card.json)
- {O}/.well-known/ai-catalog.json — ARD catalog (also /.well-known/ard.json); {O}/ai-catalog.json — resource catalogue
- {O}/.well-known/skills.json — skills with input/output shapes; {O}/.well-known/agent-skills/index.json — skills index with digests
- {O}/.well-known/jwks.json — office keyring, kid {KID}; {O}/x402/jwks.json — x402 receipt key, kid {X402_KID}
- {O}/.well-known/api-catalog — RFC 9727 linkset; {O}/openapi.json — OpenAPI 3.1; {O}/health.json — status
- {O}/.well-known/security.txt — security contact; {O}/.well-known/http-message-signatures-directory — Web Bot Auth key directory
- {O}/robots.txt (open, Content-Signal permissive) · {O}/sitemap.xml
- Signal headers on every response: X-Office-Version · X-Office-Operator · X-Office-Node · X-Office-As-Of · X-Office-Source: public-record · X-Office-Keyring · X-Office-Contact · X-Office-X402

## Twins

- https://familyofficeknowledgegraph.com/, https://familyofficeknowledgegraph.org/ and https://familyofficeknowledgegraph.io/ forward (301) to {O}/
""")

# security.txt
w(WK / "security.txt", f"""Contact: mailto:{CONTACT}
Expires: 2027-09-13T00:00:00.000Z
Canonical: {O}/.well-known/security.txt
Preferred-Languages: en
Policy: {O}/security
""")

# auth.md
w(PUB / "auth.md", f"""# auth.md — familyofficeknowledgegraph.ai ({OPERATOR})

## Posture

Every record, index, kit file, llms.txt, Markdown twin and /.well-known/ document on this surface is **open** — no authentication to read. The MCP doors need no token. The paid door (GET /api, x402) is priced, not gated. One route is licensed: **/licensed/index**, the graph index of record signed to a registered agent by name.

## Authorization server

This surface runs no authorization server of its own. It is a protected resource of the office's server at {OFFICE}:

- Issuer: {OFFICE} · metadata [{OFFICE}/.well-known/oauth-authorization-server]({OFFICE}/.well-known/oauth-authorization-server) (also served here at /.well-known/oauth-authorization-server, fetched live)
- Protected-resource metadata: [/.well-known/oauth-protected-resource]({O}/.well-known/oauth-protected-resource)
- Keyring the tokens verify against: [{OFFICE}/.well-known/jwks.json]({OFFICE}/.well-known/jwks.json) — EdDSA, kid {KID}
- Grant: client_credentials only. Scope for this surface: office:read.

## Agent registration (self-contained, anonymous — at the office)

1. `POST {OFFICE}/oauth/register` with JSON `{{"client_name": "<your agent>"}}` → `client_id`, `client_secret` (shown once).
2. `POST {OFFICE}/oauth/token` with `grant_type=client_credentials&client_id=…&client_secret=…&scope=office:read` → `access_token` (Bearer, 3600 s).
3. `GET {O}/licensed/index` with `Authorization: Bearer <token>` → `{{ licensed_to, statement, data }}` — the graph index signed to your client by name (kid {X402_KID}, key at {O}/x402/jwks.json).

Humans reach the office through the form at {O}/#contact.

Operator: {OPERATOR} · Principal: {PRINCIPAL} · Machine contact: {CONTACT}
""")

# openapi.json
ident = {"name": "identifier", "in": "path", "required": True, "schema": {"type": "string"}, "description": "LEI, legal name, alias or register id"}
openapi = {
    "openapi": "3.1.0",
    "info": {"title": f"{GRAPH} — the doors", "version": VERSION, "description": f"{GRAPH}. Operator: {OPERATOR}. Public record, read-only; MCP doors (apex + node); one paid call (x402); one licensed route (office OAuth).", "contact": {"name": OPERATOR, "email": CONTACT, "url": f"{O}/#contact"}},
    "servers": [{"url": O}, {"url": MCP, "description": "apex door"}] + [{"url": n["host"], "description": f"node door {n['id']}"} for n in nodes["nodes"]],
    "paths": {
        "/mcp": {"post": {"operationId": "mcp", "summary": "MCP door (streamable-http, JSON-RPC 2.0): initialize, tools/list, tools/call — resolve_family_office, get_record, list_events_since, list_aliases, list_nodes", "requestBody": {"content": {"application/json": {"schema": {"type": "object"}}}}, "responses": {"200": {"description": "JSON-RPC response"}}}, "get": {"operationId": "mcpInfo", "summary": "Door description", "responses": {"200": {"description": "door"}}}},
        "/resolve/{identifier}": {"get": {"operationId": "resolve", "summary": "Resolve an identifier to records over HTTP", "parameters": [ident], "responses": {"200": {"description": "matches"}, "404": {"description": "not found (typed)"}}}},
        "/records/nodes.json": {"get": {"operationId": "nodes", "summary": "The nodes", "responses": {"200": {"description": "nodes"}}}},
        "/records/{node}/index.json": {"get": {"operationId": "nodeIndex", "summary": "A node's index (records, totals, sources)", "parameters": [{"name": "node", "in": "path", "required": True, "schema": {"type": "string"}}], "responses": {"200": {"description": "index"}, "404": {"description": "unknown node"}}}},
        "/records/{node}/{lei}.json": {"get": {"operationId": "record", "summary": "A Family Office Record", "parameters": [{"name": "node", "in": "path", "required": True, "schema": {"type": "string"}}, {"name": "lei", "in": "path", "required": True, "schema": {"type": "string", "pattern": "^[A-Z0-9]{20}$"}}], "responses": {"200": {"description": "record"}, "404": {"description": "unknown record"}}}},
        "/facts.json": {"get": {"operationId": "facts", "summary": "Facts of record (live counts, paid-calls line)", "responses": {"200": {"description": "facts"}}}},
        "/api": {"get": {"operationId": "paidCall", "summary": "Paid call (x402 v2): 402 offer without payment; { receipt, statement, data } with PAYMENT-SIGNATURE — the graph index of record, signed", "parameters": [{"name": "PAYMENT-SIGNATURE", "in": "header", "required": False, "schema": {"type": "string"}}], "responses": {"402": {"description": "x402 v2 PaymentRequired (body + PAYMENT-REQUIRED header)"}, "200": {"description": "settled: receipt, statement (EdDSA JWT), data", "headers": {"PAYMENT-RESPONSE": {"schema": {"type": "string"}}, "X-X402-Receipt": {"schema": {"type": "string"}}}}}}},
        "/x402/receipt/{nonce}": {"get": {"operationId": "receipt", "summary": "Resolve a receipt, forever", "parameters": [{"name": "nonce", "in": "path", "required": True, "schema": {"type": "string", "pattern": "^[a-f0-9]{32}$"}}], "responses": {"200": {"description": "the receipt"}, "404": {"description": "unknown nonce"}}}},
        "/x402/jwks.json": {"get": {"operationId": "x402Jwks", "summary": f"Receipt signing key, kid {X402_KID}", "responses": {"200": {"description": "JWKS"}}}},
        "/licensed/index": {"get": {"operationId": "licensedIndex", "summary": "The graph index signed to a registered agent (office OAuth, scope office:read)", "security": [{"office": ["office:read"]}], "responses": {"200": {"description": "{ licensed_to, statement, data }"}, "401": {"description": "Bearer required"}}}},
        "/health.json": {"get": {"operationId": "health", "summary": "Status", "responses": {"200": {"description": "ok"}}}},
    },
    "components": {"securitySchemes": {"office": {"type": "oauth2", "flows": {"clientCredentials": {"tokenUrl": f"{OFFICE}/oauth/token", "scopes": {"office:read": "read the licensed index"}}}}}},
    "x-office": {"operator": OPERATOR, "principal": PRINCIPAL, "office": OFFICE, "keyring": f"{O}/.well-known/jwks.json", "kid": KID, "x402_kid": X402_KID, "agent_card": f"{AGENT}/.well-known/agent-card.json", "apex_door": f"{MCP}/mcp", "node_doors": [n["door"] for n in nodes["nodes"]]},
}
wj(PUB / "openapi.json", openapi)

# api-catalog (RFC 9727 linkset)
wj(WK / "api-catalog", {"linkset": [
    {"anchor": f"{MCP}/mcp", "service-desc": [{"href": f"{O}/openapi.json", "type": "application/openapi+json"}], "service-doc": [{"href": f"{O}/llms.txt", "type": "text/plain"}], "status": [{"href": f"{O}/health.json"}], "service-meta": [{"href": f"{O}/.well-known/mcp.json", "type": "application/json"}]},
    *[{"anchor": n["door"], "service-desc": [{"href": f"{O}/openapi.json", "type": "application/openapi+json"}], "service-doc": [{"href": f"{O}/llms.txt", "type": "text/plain"}], "status": [{"href": f"{O}/health.json"}], "service-meta": [{"href": f"{n['host']}/.well-known/mcp.json", "type": "application/json"}]} for n in nodes["nodes"]],
    {"anchor": f"{O}/api", "service-desc": [{"href": f"{O}/openapi.json", "type": "application/openapi+json"}], "service-doc": [{"href": f"{O}/x402", "type": "text/html"}], "status": [{"href": f"{O}/health.json"}]},
]})

# skills — the five tools, with input/output shapes; digests over SKILL.md files
IDENT = {"type": "string", "description": "LEI, legal name, alias or register id"}
FIELD = {"type": "object", "properties": {"value": {}, "source_url": {"type": "string"}, "read_by": {"type": "string"}, "read": {"type": "string"}, "state": {"type": "string", "enum": ["sourced", "filled", "confirmed", "conflict", "unverified"]}}, "required": ["value", "source_url", "read_by", "state"]}
skills = [
    {"name": "resolve_family_office", "description": "Resolve an identifier (LEI, legal name, alias or register id) to the family-office records that carry it, with the node that serves each.", "input": {"type": "object", "properties": {"identifier": IDENT}, "required": ["identifier"]}, "output": {"type": "object", "properties": {"matches": {"type": "array", "items": {"type": "object", "properties": {"lei": {"type": "string"}, "legal_name": {"type": "string"}, "node": {"type": "string"}, "record": {"type": "string"}}}}}, "required": ["matches"]}},
    {"name": "get_record", "description": "The Family Office Record for one identifier: identity, registrations, lei, principals, sectors, website, aliases, events, gaps — every field with value, source_url, read_by, read and state; optionally a named version.", "input": {"type": "object", "properties": {"identifier": IDENT, "version": {"type": "string"}}, "required": ["identifier"]}, "output": {"type": "object", "properties": {"record": {"type": "object", "properties": {"lei": FIELD, "identity": {"type": "object"}, "registrations": {"type": "array"}, "principals": {"type": "array"}, "aliases": {"type": "array"}, "events": {"type": "array"}, "gaps": {"type": "array"}}}}, "required": ["record"]}},
    {"name": "list_events_since", "description": "Dated, URL'd events on one record, oldest first, optionally since a date, paged by cursor.", "input": {"type": "object", "properties": {"identifier": IDENT, "since": {"type": "string", "format": "date"}, "cursor": {"type": "string"}, "limit": {"type": "integer", "minimum": 1, "maximum": 200}}, "required": ["identifier"]}, "output": {"type": "object", "properties": {"lei": {"type": "string"}, "events": {"type": "array"}, "next_cursor": {"type": ["string", "null"]}}, "required": ["lei", "events"]}},
    {"name": "list_aliases", "description": "Every name the record carries for one identifier, each with its source.", "input": {"type": "object", "properties": {"identifier": IDENT}, "required": ["identifier"]}, "output": {"type": "object", "properties": {"lei": {"type": "string"}, "legal_name": FIELD, "aliases": {"type": "array", "items": FIELD}}, "required": ["lei", "aliases"]}},
    {"name": "list_nodes", "description": "The graph's nodes with record counts read from each node's index, the node door and its as-of.", "input": {"type": "object", "properties": {}}, "output": {"type": "object", "properties": {"nodes": {"type": "array"}}, "required": ["nodes"]}},
]
for s in skills:
    s["endpoints"] = [f"{MCP}/mcp"] + [n["door"] for n in nodes["nodes"]] + ([f"{O}/resolve/{{identifier}}"] if s["name"] == "resolve_family_office" else []) + ([f"{O}/records/nodes.json"] if s["name"] == "list_nodes" else [])
    body = f"""---
name: {s['name']}
description: {s['description']}
---

# {s['name']}

{s['description']}

## Input

```json
{json.dumps(s['input'], indent=2)}
```

## Output

```json
{json.dumps(s['output'], indent=2)}
```

## Endpoints

""" + "\n".join(f"- {e}" for e in s["endpoints"]) + f"""

Operator: {OPERATOR} · Principal: {PRINCIPAL} · Surface: {O} · Keyring: {O}/.well-known/jwks.json · Source: public record
"""
    p = WK / "agent-skills" / s["name"] / "SKILL.md"
    w(p, body)
    s["digest"] = "sha256:" + hashlib.sha256(open(p, "rb").read()).hexdigest()
wj(WK / "skills.json", {"$schema": "https://schemas.agentskills.io/discovery/0.2.0/schema.json", "operator": OPERATOR, "principal": PRINCIPAL, "surface": O, "version": VERSION,
                        "skills": [{"name": s["name"], "type": "skill-md", "description": s["description"], "url": f"/.well-known/agent-skills/{s['name']}/SKILL.md", "digest": s["digest"], "input": s["input"], "output": s["output"], "endpoints": s["endpoints"]} for s in skills]})
wj(WK / "agent-skills" / "index.json", {"$schema": "https://schemas.agentskills.io/discovery/0.2.0/schema.json", "skills": [{"name": s["name"], "type": "skill-md", "description": s["description"], "url": f"/.well-known/agent-skills/{s['name']}/SKILL.md", "digest": s["digest"]} for s in skills]})

# A2A Agent Card (FO_START_ME_UP_4): name, description, url, provider, version, capabilities, skills, supportedInterfaces, securitySchemes, contact
card = {
    "protocolVersion": "0.3.0",
    "kind": "agent-card",
    "name": GRAPH,
    "description": "One record per family office, drawn from the public record: the GLEIF spine first, then the national registers that fill and confirm it. Every field carries where it came from, who read it, when, and its state. Read-only, session-free, typed errors. Nodes: " + ", ".join(f"{n['jurisdiction']} ({n['id']})" for n in nodes["nodes"]) + ".",
    "url": f"{MCP}/mcp",
    "version": VERSION,
    "documentationUrl": f"{O}/llms.txt",
    "iconUrl": f"{O}/icon-512.png",
    "provider": {"organization": OPERATOR, "url": OFFICE},
    "operator": {"name": OPERATOR, "principal": PRINCIPAL, "url": OFFICE, "surface": O, "contact": f"mailto:{CONTACT}", "keyring": f"{O}/.well-known/jwks.json", "kid": KID},
    "contact": f"mailto:{CONTACT}",
    "capabilities": {"streaming": False, "pushNotifications": False, "stateTransitionHistory": False},
    "securitySchemes": {
        "none": {"type": "noAuth", "description": "every read, the MCP doors and the records need no authentication"},
        "office": {"type": "oauth2", "flows": {"clientCredentials": {"tokenUrl": f"{OFFICE}/oauth/token", "scopes": {"office:read": "read the licensed index"}}}, "description": f"office-issued EdDSA tokens (kid {KID}) for /licensed/index"},
        "x402": {"type": "http", "scheme": "x402", "description": "GET /api: $0.01 USDC on Base mainnet (x402 v2) buys the signed index with a receipt"},
    },
    "security": [{"none": []}],
    "defaultInputModes": ["application/json", "text/plain"],
    "defaultOutputModes": ["application/json", "text/markdown"],
    "supportedInterfaces": [
        {"url": f"{MCP}/mcp", "protocolBinding": "HTTP+JSON", "transport": "streamable-http", "protocolVersion": "2025-06-18", "description": "apex door — index, forwards to the node door"},
        *[{"url": n["door"], "protocolBinding": "HTTP+JSON", "transport": "streamable-http", "protocolVersion": "2025-06-18", "description": f"node door {n['id']} — serves the records"} for n in nodes["nodes"]],
        {"url": f"{O}/", "protocolBinding": "HTTP+JSON", "transport": "HTTP+JSON", "protocolVersion": "1.0", "description": "the surface, its Markdown twin, /resolve/{identifier} and the records"},
    ],
    "skills": [{"id": s["name"], "name": s["name"].replace("_", " ").capitalize(), "description": s["description"], "tags": ["family-office", "public-record", "mcp", "read-only"], "examples": [f"POST {MCP}/mcp tools/call {s['name']}"], "inputModes": ["application/json"], "outputModes": ["application/json"], "input": s["input"], "output": s["output"]} for s in skills],
    "nodes": [{"id": n["id"], "jurisdiction": n["jurisdiction"], "door": n["door"], "index": n["index"], "as_of": n["as_of"]} for n in nodes["nodes"]],
    "x402": {"route": f"{O}/api", "page": f"{O}/x402", "jwks": f"{O}/x402/jwks.json", "kid": X402_KID, "network": "eip155:8453", "price_usdc": "0.01"},
    "source": "public-record",
    "supportsAuthenticatedExtendedCard": False,
}
wj(WK / "agent-card.json", card)

# ARD catalog — envelope, domain-anchored URNs, representativeQueries; also /.well-known/ard.json
ard = {
    "specVersion": "1.0",
    "host": {"displayName": GRAPH, "identifier": "did:web:familyofficeknowledgegraph.ai", "url": O},
    "publisher": {"displayName": OPERATOR, "identifier": "did:web:agent-kg.ai", "principal": PRINCIPAL, "url": OFFICE, "contact": f"mailto:{CONTACT}"},
    "entries": [
        {"displayName": "The apex door", "identifier": "urn:air:familyofficeknowledgegraph.ai:server:apex", "type": "application/mcp-server+json", "url": f"{MCP}/mcp",
         "description": "Streamable-http MCP door over the Family Office Knowledge Graph: holds the index, forwards to the node that serves the record. Five tools: resolve_family_office, get_record, list_events_since, list_aliases, list_nodes. No authentication for reads.",
         "capabilities": ["resolve-family-office", "family-office-record", "events", "aliases", "nodes"],
         "representativeQueries": ["Which Canadian family offices carry an LEI?", "Give me the public record for Samara Multi-Family Office.", "What registers is Werklund Family Office listed on?", "What happened to Northwood Family Office and when?"],
         "metadata": {"operator": OPERATOR, "principal": PRINCIPAL, "serverCard": f"{O}/.well-known/mcp.json", "keyring": f"{O}/.well-known/jwks.json", "source": "public-record"}},
        *[{"displayName": f"Node door {n['id']}", "identifier": f"urn:air:familyofficeknowledgegraph.ai:server:{n['id']}", "type": "application/mcp-server+json", "url": n["door"],
           "description": f"The {n['jurisdiction']} node of the Family Office Knowledge Graph: serves the records (spine {n['spine']}; fill and confirm from the national registers). As of {n['as_of']}.",
           "capabilities": ["family-office-record", "events", "aliases"], "representativeQueries": [f"List the family offices on the {n['jurisdiction']} node.", "Which fields on this record are confirmed by two sources?"],
           "metadata": {"operator": OPERATOR, "node": n["id"], "index": n["index"], "serverCard": f"{n['host']}/.well-known/mcp.json"}} for n in nodes["nodes"]],
        {"displayName": "The graph as an A2A party", "identifier": "urn:air:familyofficeknowledgegraph.ai:agent:graph", "type": "application/json", "url": f"{AGENT}/.well-known/agent-card.json",
         "description": "A2A Agent Card: the five tools as skills; supported interfaces the apex door, the node doors and HTTP+JSON; security schemes none, office OAuth and x402.",
         "capabilities": ["resolve-family-office", "family-office-record"], "representativeQueries": ["How do I query the Family Office Knowledge Graph as an agent?", "Which node serves a given family office?"],
         "metadata": {"operator": OPERATOR, "principal": PRINCIPAL, "office": OFFICE}},
        {"displayName": "The paid door (x402)", "identifier": "urn:air:familyofficeknowledgegraph.ai:api:x402", "type": "application/json", "url": f"{O}/api",
         "description": "GET /api answers 402 (x402 v2, $0.01 USDC on Base mainnet, scheme exact); with payment it returns { receipt, statement, data } — the graph index of record signed, with a receipt that resolves forever at /x402/receipt/{nonce}.",
         "capabilities": ["x402", "signed-receipt"], "representativeQueries": ["How much does the signed index cost?", "Where do receipts resolve and which key signs them?"],
         "metadata": {"operator": OPERATOR, "price_usdc": "0.01", "network": "eip155:8453", "facilitator": "https://api.cdp.coinbase.com/platform/v2/x402", "kid": X402_KID, "page": f"{O}/x402"}},
    ],
}
wj(WK / "ai-catalog.json", ard); wj(WK / "ard.json", ard)

# Web Bot Auth key directory — the office key, informational
k = dict(jwks["keys"][0]); k.update({"nbf": 1757721600, "exp": 1789257600})
wj(WK / "http-message-signatures-directory", {"keys": [k], "operator": OPERATOR})

# resource catalogue at /ai-catalog.json
wj(PUB / "ai-catalog.json", {"name": GRAPH, "host": "familyofficeknowledgegraph.ai", "canonical": f"{O}/", "version": VERSION, "as_of": AS_OF, "operator": OPERATOR, "principal": PRINCIPAL, "office": OFFICE,
    "access": "open, read-only, no auth — except /api, a paid call (x402), and /licensed/index (office OAuth)",
    "resources": [
        {"id": "home", "url": f"{O}/", "type": "text/html", "description": "The surface: the record shape, states, nodes, the door, sources, records, RADAR, machine kit, operator, contact form"},
        {"id": "llms", "url": f"{O}/llms.txt", "type": "text/plain", "description": "Plain-text guide for language models"},
        {"id": "facts", "url": f"{O}/facts.json", "type": "application/json", "description": "Facts of record (live counts and paid-calls line)"},
        {"id": "nodes", "url": f"{O}/records/nodes.json", "type": "application/json", "description": "The nodes"},
        *[{"id": f"index-{n['id']}", "url": n["index"], "type": "application/json", "description": f"Node index {n['id']}: records, totals, sources, exclusions"} for n in nodes["nodes"]],
        {"id": "record", "url": f"{O}/records/{{node}}/{{lei}}.json", "type": "application/json", "description": "A Family Office Record"},
        {"id": "resolve", "url": f"{O}/resolve/{{identifier}}", "type": "application/json", "description": "Resolve an identifier over HTTP"},
        {"id": "mcp-apex", "url": f"{MCP}/mcp", "type": "application/json", "description": "Apex MCP door (streamable-http); card /.well-known/mcp.json"},
        *[{"id": f"mcp-{n['id']}", "url": n["door"], "type": "application/json", "description": f"Node MCP door {n['id']}"} for n in nodes["nodes"]],
        {"id": "agent-card", "url": f"{AGENT}/.well-known/agent-card.json", "type": "application/json", "description": "A2A Agent Card, the five tools as skills"},
        {"id": "jwks", "url": f"{O}/.well-known/jwks.json", "type": "application/json", "description": f"Office keyring, kid {KID}"},
        {"id": "x402", "url": f"{O}/x402", "type": "text/html", "description": "x402: a paid call with a signed receipt"},
        {"id": "api", "url": f"{O}/api", "type": "application/json", "description": "Paid call: 402 without payment; with payment { receipt, statement, data } — the graph index of record, signed"},
        {"id": "x402-jwks", "url": f"{O}/x402/jwks.json", "type": "application/json", "description": f"Receipt signing key, kid {X402_KID}"},
        {"id": "x402-receipt", "url": f"{O}/x402/receipt/{{nonce}}", "type": "application/json", "description": "Resolve a receipt, forever"},
        {"id": "oauth-pr", "url": f"{O}/.well-known/oauth-protected-resource", "type": "application/json", "description": "Protected-resource metadata; the authorization server is the office's at agent-kg.ai; licensed route /licensed/index"},
        {"id": "auth-md", "url": f"{O}/auth.md", "type": "text/markdown", "description": "Agent registration instructions"},
        {"id": "ard", "url": f"{O}/.well-known/ai-catalog.json", "type": "application/json", "description": "ARD catalog (envelope), also /.well-known/ard.json"},
        {"id": "skills", "url": f"{O}/.well-known/skills.json", "type": "application/json", "description": "Skills with input/output shapes; index with digests at /.well-known/agent-skills/index.json"},
        {"id": "api-catalog", "url": f"{O}/.well-known/api-catalog", "type": "application/linkset+json", "description": "RFC 9727 API catalog"},
        {"id": "openapi", "url": f"{O}/openapi.json", "type": "application/openapi+json", "description": "OpenAPI 3.1 for the doors"},
        {"id": "health", "url": f"{O}/health.json", "type": "application/json", "description": "Status"},
        {"id": "security", "url": f"{O}/.well-known/security.txt", "type": "text/plain", "description": "Security contact (RFC 9116)"},
        {"id": "sitemap", "url": f"{O}/sitemap.xml", "type": "application/xml", "description": "Sitemap"},
        {"id": "robots", "url": f"{O}/robots.txt", "type": "text/plain", "description": "Crawl policy: open"},
        {"id": "entity-mark", "url": f"{O}/akgh-icon.svg", "type": "image/svg+xml", "description": "Agentic KG Holdings entity mark (also /akgh-icon-64.png)"},
    ]})

# facts.json kit list
facts["kit"] = sorted({f"{O}/.well-known/agent-card.json", f"{AGENT}/.well-known/agent-card.json", f"{O}/.well-known/agent-skills/index.json", f"{O}/.well-known/ai-catalog.json", f"{O}/.well-known/api-catalog", f"{O}/.well-known/ard.json", f"{O}/.well-known/http-message-signatures-directory", f"{O}/.well-known/jwks.json", f"{O}/.well-known/mcp.json", f"{O}/.well-known/oauth-authorization-server", f"{O}/.well-known/oauth-protected-resource", f"{O}/.well-known/security.txt", f"{O}/.well-known/skills.json", f"{O}/ai-catalog.json", f"{O}/api", f"{O}/auth.md", f"{O}/facts.json", f"{O}/health.json", f"{O}/licensed/index", f"{O}/llms.txt", f"{MCP}/mcp", *[n["door"] for n in nodes["nodes"]], f"{O}/openapi.json", f"{O}/records/nodes.json", f"{O}/resolve/{{identifier}}", f"{O}/robots.txt", f"{O}/sitemap.xml", f"{O}/x402", f"{O}/x402/jwks.json"})
wj(PUB / "facts.json", facts)
print("kit built for", VERSION, "| skills:", ", ".join(f"{s['name']} {s['digest'][:19]}" for s in skills), "| nodes:", ", ".join(indexes))
