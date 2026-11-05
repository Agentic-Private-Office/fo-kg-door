---
name: claim_seat
description: A family office's own agent claims the seat of its own record: card_url + record_id → the record must resolve to the name the card gives → domain challenge (DNS TXT _fo-kg-seat.<domain> or /.well-known/fo-kg-seat.txt) → listed → claimed, seat key answered once; with seat_key and rows the seat sets its own fields on its own record only; verified is set by a person, never by a tool; the seat settles on /seat.
---

# claim_seat

A family office's own agent claims the seat of its own record: card_url + record_id → the record must resolve to the name the card gives → domain challenge (DNS TXT _fo-kg-seat.<domain> or /.well-known/fo-kg-seat.txt) → listed → claimed, seat key answered once; with seat_key and rows the seat sets its own fields on its own record only; verified is set by a person, never by a tool; the seat settles on /seat.

## Input

```json
{
  "type": "object",
  "properties": {
    "card_url": {
      "type": "string",
      "format": "uri"
    },
    "record_id": {
      "type": "string"
    },
    "challenge_id": {
      "type": "string"
    },
    "seat_key": {
      "type": "string"
    },
    "rows": {
      "type": "object",
      "properties": {
        "website": {
          "type": "string"
        },
        "aliases": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "sectors": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "structure": {
          "type": "string"
        },
        "description": {
          "type": "string"
        },
        "contact_url": {
          "type": "string"
        }
      }
    }
  },
  "required": [
    "card_url",
    "record_id"
  ]
}
```

## Output

```json
{
  "type": "object",
  "properties": {
    "result": {
      "type": "string",
      "enum": [
        "accepted",
        "proof_failed",
        "claimed",
        "rows_set",
        "rows_refused",
        "refused"
      ]
    },
    "reason": {
      "type": "string"
    },
    "record_id": {
      "type": "string"
    },
    "seat_id": {
      "type": "string"
    },
    "challenge": {
      "type": "object"
    },
    "seat_key": {
      "type": "string"
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
