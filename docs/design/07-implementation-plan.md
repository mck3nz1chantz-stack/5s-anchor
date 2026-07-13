# 5S Anchor — Implementation Plan

## Guiding principle

**Working end-to-end demos &gt; perfect polish.**  
Ship offline Red Tag + Audit + Dashboard seed on a phone install first; wire Postgres/API when multi-device is real.

---

## Week 1 — Demoable core

| Day | Deliverable | Done when |
|-----|-------------|-----------|
| 1 | Vite PWA shell, dark industrial theme, role picker, bottom nav | Install prompt / offline shell loads |
| 2 | IndexedDB schema + seed plant (areas, zones, users, template) | Refresh keeps data |
| 3 | Red Tag create wizard + list + status badges | Operator path on phone |
| 4 | Audit run (1 item/pillar) + live score + submit | Score appears on dashboard |
| 5 | Corrective actions from low scores + Actions list | Close with photo proof |
| 6–7 | Dashboard heatmap + trend chart + CSV export | Manager story for leadership |

## Week 2 — Sustain & product shape

| Focus | Items |
|-------|--------|
| Visual standards | Upload ideal photo per area; open from audit |
| Schedules | Daily Shine + weekly audit occurrences (in-app reminders) |
| Workflow harden | Red tag disposition history; supervisor gates |
| Recognition | Simple streak (N audits ≥ 80%) / badge in profile |
| Docs polish | Ignition payload examples; README setup |
| Optional | Supabase migration applied; read-only remote pull |

## Backlog (post-MVP)

1. HTTP repository + sync outbox flush  
2. Real push notifications (Web Push)  
3. Server PDF reports  
4. Ignition webhook / MQTT  
5. Photo annotation + voice notes  
6. OEE correlation views when KPI feed exists  
7. Multi-plant admin  

---

## Slice order (PlantForge prioritySlices)

1. `shell-roles-pwa`  
2. `offline-store-seed`  
3. `red-tag-workflow`  
4. `audit-checklist-scoring`  
5. `corrective-actions`  
6. `dashboard-heatmap-trends`  
7. `visual-standards`  
8. `schedules-reminders`  
9. `api-contract-ignition-path` (docs + types; live API later)

---

## Solo-developer tips

- Keep domain types in one file matching API JSON (camelCase client).  
- Never special-case “demo mode” deep in UI — seed data is enough.  
- Test with Chrome device mode + real phone on LAN.  
- When adding backend: implement `repository` methods one domain at a time.  
- Don’t build a design system library; 5–6 UI primitives is enough.

## Success criteria for “ready to show a plant lead”

- [ ] Install PWA on phone  
- [ ] Create red tag with photo offline  
- [ ] Complete audit with scores  
- [ ] See area heatmap change  
- [ ] Open action appears from finding  
- [ ] Export CSV of scores  
- [ ] Explain Ignition path from docs in &lt; 2 minutes  
