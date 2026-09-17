---
name: resolve_family_office
description: Resolve an identifier (LEI, legal name, alias or register id) to the family-office records that carry it, with the node that serves each.
---

# resolve_family_office

Resolve an identifier (LEI, legal name, alias or register id) to the family-office records that carry it, with the node that serves each.

## Input

```json
{
  "type": "object",
  "properties": {
    "identifier": {
      "type": "string",
      "description": "LEI, legal name, alias or register id"
    }
  },
  "required": [
    "identifier"
  ]
}
```

## Output

```json
{
  "type": "object",
  "properties": {
    "matches": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "lei": {
            "type": "string"
          },
          "legal_name": {
            "type": "string"
          },
          "node": {
            "type": "string"
          },
          "record": {
            "type": "string"
          }
        }
      }
    }
  },
  "required": [
    "matches"
  ]
}
```

## Endpoints

- https://mcp.fo-kg.ai/mcp
- https://ae.fo-kg.ai/mcp
- https://au.fo-kg.ai/mcp
- https://ca.fo-kg.ai/mcp
- https://ch.fo-kg.ai/mcp
- https://de.fo-kg.ai/mcp
- https://dk.fo-kg.ai/mcp
- https://es.fo-kg.ai/mcp
- https://fr.fo-kg.ai/mcp
- https://it.fo-kg.ai/mcp
- https://lu.fo-kg.ai/mcp
- https://nl.fo-kg.ai/mcp
- https://no.fo-kg.ai/mcp
- https://row.fo-kg.ai/mcp
- https://sg.fo-kg.ai/mcp
- https://uk.fo-kg.ai/mcp
- https://us.fo-kg.ai/mcp
- https://familyofficeknowledgegraph.ai/resolve/{identifier}

Operator: Agentic KG Holdings · Principal: Matthew Keddy · Surface: https://familyofficeknowledgegraph.ai · Keyring: https://familyofficeknowledgegraph.ai/.well-known/jwks.json · Source: public record
