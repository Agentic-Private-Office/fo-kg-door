---
name: list_my_receipts
description: For a seat holder only: the RCO-10060 receipts whose subject is its own record — who read it (as the door saw the reader), when, under which rule — each with its verify URL. Nobody else can list them.
---

# list_my_receipts

For a seat holder only: the RCO-10060 receipts whose subject is its own record — who read it (as the door saw the reader), when, under which rule — each with its verify URL. Nobody else can list them.

## Input

```json
{
  "type": "object",
  "properties": {
    "record_id": {
      "type": "string"
    },
    "seat_key": {
      "type": "string"
    },
    "limit": {
      "type": "integer"
    },
    "cursor": {
      "type": "string"
    }
  },
  "required": [
    "record_id",
    "seat_key"
  ]
}
```

## Output

```json
{
  "type": "object",
  "properties": {
    "result": {
      "type": "string"
    },
    "receipts": {
      "type": "array"
    }
  },
  "required": [
    "result"
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

Operator: Agentic KG Holdings · Principal: Matthew Keddy · Surface: https://familyofficeknowledgegraph.ai · Keyring: https://familyofficeknowledgegraph.ai/.well-known/jwks.json · Source: public record
