# 5S Anchor — Recommended Tech Stack

## Decision summary

| Layer | Choice | Why |
|-------|--------|-----|
| **Client** | Vite + React 19 + TypeScript | Multi-view industrial PWA; fast DX; same stack as other ChantzMedia projects |
| **Styling** | Tailwind CSS v4 | Rapid shop-floor UI; high-contrast tokens; large touch targets |
| **Routing** | React Router | Simple role-gated screens |
| **Client state** | Zustand + IndexedDB (`idb`) | Offline-first; minimal boilerplate for a solo builder |
| **Charts** | Recharts | Lightweight score trends / heatmaps without heavy BI kits |
| **PWA** | `vite-plugin-pwa` (Workbox) | Installable, offline shell, background sync hooks |
| **API (phase 2+)** | Versioned REST on Node (Hono/Fastify) **or** Supabase Edge Functions | Thin, JSON-first, easy for Ignition `httpClient` / WebDev modules |
| **Database** | PostgreSQL (Supabase now → self-hosted later) | Relational integrity, RLS, audit trails; Ignition can SQL or REST-ingest |
| **Auth** | Session/JWT with roles; MVP uses **local demo roles** | Ship floor demo today; swap to Supabase Auth / OIDC without rewriting domain |
| **Files/photos** | Client blob store (IDB) → later object storage (R2/S3) | Offline capture first; signed URLs later |
| **Export** | CSV + print-to-PDF (MVP); server PDF later | Leadership reviews without heavy PDF engines day one |

## Why this supports Ignition adoption

1. **API-first domain model** — every entity uses stable UUIDs (`plant_id`, `area_id`, `zone_id`, `equipment_id`, `user_id`). Payloads are plain JSON with ISO-8601 timestamps.
2. **Score & event streams** — audits produce append-only score snapshots and state-change events Ignition can map to tags, historian, or named queries.
3. **No proprietary client protocol** — REST + optional webhooks/MQTT later. Ignition Perspective or gateway scripts can poll/push without embedding the PWA.
4. **Postgres is familiar to MES stacks** — many plants already run SQL; schema is documented so a plant DBA or Ignition module can read scores without owning the app UI.
5. **Offline client does not block MES** — phone works on the floor; sync reconciles when Wi‑Fi returns; gateway never depends on the device being online.

## Explicit non-choices (for now)

| Avoid | Reason |
|-------|--------|
| Next.js full-stack monolith | Overkill for local/plant deploy; harder offline edge |
| Firebase only | Harder self-host / plant firewall stories |
| GraphQL first | REST maps cleaner to Ignition HTTP + simple Postman demos |
| Native-only (Flutter/Swift) | TimeTrack-style web PWA ships faster; native later if needed |

## Runtime modes

| Mode | When | Storage |
|------|------|---------|
| **Demo / solo plant trial** | Weeks 1–2 | IndexedDB + optional JSON export |
| **Multi-device plant** | After auth | Supabase/Postgres + sync queue |
| **Ignition-integrated** | When plant ready | REST pull/push + optional MQTT |
