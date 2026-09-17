# fo-kg-door — the Family Office Knowledge Graph door

The MCP door of the Family Office Knowledge Graph, operated by Agentic KG Holdings.

- Door: `https://mcp.familyofficeknowledgegraph.ai/mcp` (MCP over Streamable HTTP, JSON-RPC 2.0, read-only, no authentication)
- Official MCP Registry name: `ai.familyofficeknowledgegraph/fo-kg`
- Surface: https://familyofficeknowledgegraph.ai · agent card: https://agent.fo-kg.ai/.well-known/agent-card.json
- Keys: https://familyofficeknowledgegraph.ai/.well-known/jwks.json

Five tools, the same names on every node door: `resolve_family_office`, `get_record`, `list_events_since`, `list_aliases`, `list_nodes`. One record per family office, drawn from the public record: every field carries where it came from, who read it, when, and its state. Errors are typed. Nothing is answered from memory.

## What this repository holds

The door source only: the Cloudflare Worker (`worker/`), the served machine files and records (`public/`), the Worker config (`wrangler.toml`), the registry listing (`server.json`) and the deploy rails (`rails/`). It is a mirror of the deploy source, refreshed on every roll. It carries no orders, logs, harvest work, keys or private material.

## Connect

- Claude: Settings → Connectors → Add custom connector → `https://mcp.familyofficeknowledgegraph.ai/mcp`
- Any MCP client with Streamable HTTP: point it at the same URL. Machine instructions: https://familyofficeknowledgegraph.ai/llms.txt

## Licence

MIT — see LICENSE.
