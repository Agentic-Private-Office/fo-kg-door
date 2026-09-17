---
name: list_aliases
description: Every name the record carries for one identifier, each with its source.
---

# list_aliases

Every name the record carries for one identifier, each with its source.

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
    "lei": {
      "type": "string"
    },
    "legal_name": {
      "type": "object",
      "properties": {
        "value": {},
        "source_url": {
          "type": "string"
        },
        "read_by": {
          "type": "string"
        },
        "read": {
          "type": "string"
        },
        "state": {
          "type": "string",
          "enum": [
            "sourced",
            "filled",
            "confirmed",
            "conflict",
            "unverified"
          ]
        }
      },
      "required": [
        "value",
        "source_url",
        "read_by",
        "state"
      ]
    },
    "aliases": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "value": {},
          "source_url": {
            "type": "string"
          },
          "read_by": {
            "type": "string"
          },
          "read": {
            "type": "string"
          },
          "state": {
            "type": "string",
            "enum": [
              "sourced",
              "filled",
              "confirmed",
              "conflict",
              "unverified"
            ]
          }
        },
        "required": [
          "value",
          "source_url",
          "read_by",
          "state"
        ]
      }
    }
  },
  "required": [
    "lei",
    "aliases"
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
