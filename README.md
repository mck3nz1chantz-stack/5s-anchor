# 5S Anchor

**Working name** — changeable. Mobile-first PWA for guiding and sustaining **5S / 6S** on the manufacturing shop floor.

Part of **ChantzMedia PlantForge** (`five-s-guider` archetype, productized).

## What works today (MVP demo)

| Feature | Status |
|---------|--------|
| Role picker (Operator / Supervisor / Manager / Admin) | ✅ Offline |
| Digital Red Tag wizard (photo, category, reason) | ✅ |
| Red tag list + supervisor disposition | ✅ |
| Zone audits with 5S / 6S templates & live scoring | ✅ |
| Corrective actions from findings + photo close | ✅ |
| Dashboard heatmap, trends, CSV export | ✅ |
| Visual standards list (seed) + schedules on Home | ✅ |
| IndexedDB offline store + outbox stub | ✅ |
| PWA install (vite-plugin-pwa) | ✅ |
| Live Postgres / REST API | 📋 Schema + API docs ready |

## Design package (read first)

All under `docs/design/`:

1. `01-tech-stack.md`  
2. `02-architecture.md`  
3. `03-database-schema.sql`  
4. `04-rest-api.md`  
5. `05-folder-structure.md`  
6. `06-ui-flows.md`  
7. `07-implementation-plan.md`  

Ignition notes: `docs/integration/ignition.md`  
Brief: `docs/plantforge/`

## Quick start

```bash
cd ~/Desktop/ChantzMediaProjects/5SAnchor
npm install
npm run dev
```

- Local: http://localhost:5175  
- Phone on same Wi‑Fi: use the LAN URL Vite prints  
- Install: browser → Add to Home Screen (PWA)

### Demo path (2 minutes)

1. Pick **Operator**  
2. **New Red Tag** → area → photo → Discard/Relocate/Unsure → submit  
3. **Start Audit** → score pillars → add a finding on a low score → submit  
4. **Actions** → close with proof  
5. Switch role to **Manager** (tap role chip in header) → **Dashboard** → export CSV  

## Stack

- Vite + React 19 + TypeScript  
- Tailwind CSS v4  
- Zustand (session)  
- IndexedDB via `idb`  
- Recharts  
- vite-plugin-pwa  

## Project layout

See `docs/design/05-folder-structure.md`. App code lives only under this project (not in the launcher).

## Roadmap (next)

Week 2: visual standard photo upload, richer schedules/reminders, recognition badges.  
Later: Supabase/Postgres + `/api/v1` sync + Ignition score pull.

## License / brand

ChantzMedia first-party tooling. Product name is a working title.
