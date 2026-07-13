# 5S Anchor — REST API v1

Base URL: `/api/v1`  
Content-Type: `application/json`  
Auth: `Authorization: Bearer <jwt>` (or demo header `X-Demo-User-Id`)  
Timestamps: ISO-8601 UTC  
IDs: UUID strings  

## Common envelopes

**Success**
```json
{ "data": { }, "meta": { "requestId": "…", "serverTime": "2026-07-12T18:00:00.000Z" } }
```

**Error**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Role cannot disposition red tags",
    "details": {}
  }
}
```

**Idempotency:** send `clientMutationId` on creates/updates; server stores in `sync_mutations`.

---

## Health

`GET /health` → `{ "status": "ok", "version": "0.1.0" }`

---

## Plants / areas

### `GET /plants/:plantId/areas`
Returns areas + zones for navigation.

```json
{
  "data": [
    {
      "id": "a1…",
      "code": "WELD-1",
      "name": "Weld Cell 1",
      "areaType": "machine_cell",
      "zones": [{ "id": "z1…", "code": "A", "name": "Station A" }]
    }
  ]
}
```

---

## Red Tags

### `POST /plants/:plantId/red-tags`

**Request**
```json
{
  "clientMutationId": "client-uuid-1",
  "areaId": "a1…",
  "zoneId": "z1…",
  "equipmentId": null,
  "category": "relocate",
  "reason": "Unused fixture blocking aisle",
  "locationNote": "North aisle rack 3",
  "photo": {
    "localBlobId": "blob-1",
    "mimeType": "image/jpeg",
    "dataBase64": null
  },
  "submit": true
}
```

**Response `201`**
```json
{
  "data": {
    "id": "rt…",
    "tagNumber": "RT-2026-0042",
    "category": "relocate",
    "color": "red",
    "status": "open",
    "reason": "Unused fixture blocking aisle",
    "areaId": "a1…",
    "zoneId": "z1…",
    "photoId": "ph…",
    "createdBy": "u…",
    "createdAt": "2026-07-12T14:22:00.000Z",
    "updatedAt": "2026-07-12T14:22:00.000Z"
  }
}
```

**Color logic**
| Category | Default color | Meaning |
|----------|---------------|---------|
| discard | red | Remove / scrap path |
| relocate | yellow | Move to correct home |
| unsure | green → review | Needs supervisor decision (stored as yellow until reviewed, or green for “park”) |

Implementation: `discard→red`, `relocate→yellow`, `unsure→yellow` until disposition; **green** when dispositioned as keep/relabeled standard.

### `GET /plants/:plantId/red-tags?status=open&areaId=`

### `PATCH /red-tags/:id/transition`

```json
{
  "toStatus": "dispositioned",
  "disposition": "Moved to shadow board B",
  "note": "Completed by maintenance"
}
```

### `GET /red-tags/:id/events` — history

---

## Audits

### `POST /plants/:plantId/audits`

**Request (start + optional full submit)**
```json
{
  "clientMutationId": "client-uuid-2",
  "areaId": "a1…",
  "zoneId": "z1…",
  "templateId": "tpl…",
  "status": "submitted",
  "notes": "End of shift walk",
  "items": [
    {
      "checklistItemId": "ci…",
      "pillar": "sort",
      "score": 16,
      "maxPoints": 20,
      "finding": "Two red tags still open in zone",
      "photoBeforeId": null,
      "photoAfterId": null,
      "createAction": {
        "title": "Close open red tags in Station A",
        "ownerId": "u…",
        "dueAt": "2026-07-19T00:00:00.000Z"
      }
    }
  ]
}
```

**Response**
```json
{
  "data": {
    "id": "aud…",
    "status": "submitted",
    "overallScore": 82,
    "maxScore": 100,
    "scorePct": 82.0,
    "pillarScores": {
      "sort": 16,
      "set": 18,
      "shine": 15,
      "standardize": 17,
      "sustain": 16
    },
    "submittedAt": "2026-07-12T15:00:00.000Z",
    "createdActions": ["ca…"]
  }
}
```

**Scoring**
- Mode `points_0_20`: sum item scores / sum max → `scorePct`
- Mode `maturity_1_5`: average maturity × 20 for comparable % (document in UI)

### `GET /plants/:plantId/audits?areaId=&from=&to=`

### `GET /audits/:id`

---

## Dashboard

### `GET /plants/:plantId/dashboard`

```json
{
  "data": {
    "asOf": "2026-07-12T18:00:00.000Z",
    "heatmap": [
      { "areaId": "a1…", "areaName": "Weld Cell 1", "scorePct": 82, "lastAuditAt": "…" }
    ],
    "trends": [
      { "date": "2026-07-01", "avgScorePct": 74 },
      { "date": "2026-07-08", "avgScorePct": 79 }
    ],
    "openRedTags": 12,
    "openActions": 7,
    "overdueActions": 2,
    "completionRate7d": 0.86,
    "topIssues": [
      { "label": "Aisle blocked", "count": 5 },
      { "label": "Missing labels", "count": 4 }
    ]
  }
}
```

### `GET /plants/:plantId/reports/scores.csv`
### `GET /plants/:plantId/reports/summary.pdf` (later)

---

## Corrective actions

### `POST /plants/:plantId/corrective-actions`

```json
{
  "clientMutationId": "…",
  "areaId": "a1…",
  "auditId": "aud…",
  "title": "Install shadow board for tools",
  "description": "From Set-in-order finding",
  "ownerId": "u…",
  "dueAt": "2026-07-20T17:00:00.000Z"
}
```

### `PATCH /corrective-actions/:id`

```json
{
  "status": "done",
  "proofPhotoId": "ph…",
  "note": "Board installed"
}
```

### `GET /plants/:plantId/corrective-actions?status=open`

---

## Visual standards

### `GET /plants/:plantId/areas/:areaId/visual-standards`
### `POST /plants/:plantId/visual-standards` (supervisor+)

---

## Schedules

### `GET /plants/:plantId/schedules`
### `GET /me/reminders` — due today for current user

---

## Sync

### `POST /sync/push`

```json
{
  "mutations": [
    { "clientMutationId": "…", "entityType": "red_tag", "op": "create", "payload": { } }
  ]
}
```

### `GET /sync/pull?since=ISO`

---

## Ignition-oriented score pull

### `GET /integrations/ignition/plants/:plantId/score-snapshots?since=`

```json
{
  "data": [
    {
      "id": "ss…",
      "plantId": "p…",
      "areaId": "a…",
      "areaCode": "WELD-1",
      "scorePct": 82.0,
      "overallScore": 82,
      "maxScore": 100,
      "pillarScores": { "sort": 16, "set": 18, "shine": 15, "standardize": 17, "sustain": 16 },
      "recordedAt": "2026-07-12T15:00:00.000Z",
      "auditId": "aud…"
    }
  ]
}
```

Map in Ignition: `areaCode` → UDT path; `scorePct` → float tag; `recordedAt` → historian.
