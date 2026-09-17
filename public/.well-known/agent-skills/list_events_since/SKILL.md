---
name: list_events_since
description: Dated, URL'd events on one record, oldest first, optionally since a date, paged by cursor.
---

# list_events_since

Dated, URL'd events on one record, oldest first, optionally since a date, paged by cursor.

## Input

```json
{
  "type": "object",
  "properties": {
    "identifier": {
      "type": "string",
      "description": "LEI, legal name, alias or register id"
    },
    "since": {
      "type": "string",
      "format": "date"
    },
    "cursor": {
      "type": "string"
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 200
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
    "lei": {
      "type": "string"
    },
    "events": {
      "type": "array"
    },
    "next_cursor": {
      "type": [
        "string",
        "null"
      ]
    }
  },
  "required": [
    "lei",
    "events"
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
