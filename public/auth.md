# auth.md — familyofficeknowledgegraph.ai (Agentic KG Holdings)

## Posture

Every record, index, kit file, llms.txt, Markdown twin and /.well-known/ document on this surface is **open** — no authentication to read. The MCP doors need no token. The paid door (GET /api, x402) is priced, not gated. One route is licensed: **/licensed/index**, the graph index of record signed to a registered agent by name.

## Authorization server

This surface runs no authorization server of its own. It is a protected resource of the office's server at https://agent-kg.ai:

- Issuer: https://agent-kg.ai · metadata [https://agent-kg.ai/.well-known/oauth-authorization-server](https://agent-kg.ai/.well-known/oauth-authorization-server) (also served here at /.well-known/oauth-authorization-server, fetched live)
- Protected-resource metadata: [/.well-known/oauth-protected-resource](https://familyofficeknowledgegraph.ai/.well-known/oauth-protected-resource)
- Keyring the tokens verify against: [https://agent-kg.ai/.well-known/jwks.json](https://agent-kg.ai/.well-known/jwks.json) — EdDSA, kid mk-office-2026-09
- Grant: client_credentials only. Scope for this surface: office:read.

## Agent registration (self-contained, anonymous — at the office)

1. `POST https://agent-kg.ai/oauth/register` with JSON `{"client_name": "<your agent>"}` → `client_id`, `client_secret` (shown once).
2. `POST https://agent-kg.ai/oauth/token` with `grant_type=client_credentials&client_id=…&client_secret=…&scope=office:read` → `access_token` (Bearer, 3600 s).
3. `GET https://familyofficeknowledgegraph.ai/licensed/index` with `Authorization: Bearer <token>` → `{ licensed_to, statement, data }` — the graph index signed to your client by name (kid fo-kg-x402-2026-09, key at https://familyofficeknowledgegraph.ai/x402/jwks.json).

Humans reach the office through the form at https://familyofficeknowledgegraph.ai/#contact.

Operator: Agentic KG Holdings · Principal: Matthew Keddy · Machine contact: mk@agent-kg.ai
