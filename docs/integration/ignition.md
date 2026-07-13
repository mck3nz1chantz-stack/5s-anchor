# Ignition integration path (design)

## Principles

- 5S Anchor remains the system of record for 5S events and photos.
- Ignition consumes **scores / open counts** via REST (or SQL view later).
- Optional reverse: equipment/area master data pushed into Anchor.

## Recommended first integration

1. Secure API key or plant service account on `GET /api/v1/integrations/ignition/plants/{plantId}/score-snapshots?since=`
2. Ignition Gateway Timer script every 5–15 minutes:
   - HTTP GET
   - Parse JSON
   - Write to memory tags: `[5S]Areas/{areaCode}/ScorePct`
   - Insert historian row if desired
3. Perspective dashboard shows 5S score next to OEE once both tags exist.

## Example tag mapping

| JSON field | Ignition |
|------------|----------|
| `areaCode` | UDT instance name |
| `scorePct` | Float tag |
| `recordedAt` | String / DateTime |
| `pillarScores.sort` | Optional subtags |

## Webhook later

`POST /api/v1/webhooks/equipment-sync` with plant equipment list from Ignition named query export.

## What not to do in v1

- Bidirectional photo sync through Ignition tags  
- Embedding Vision module as the only mobile UI  
- Hard-coding gateway IPs in the PWA  
