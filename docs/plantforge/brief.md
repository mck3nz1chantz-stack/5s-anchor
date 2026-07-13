# 5S Anchor — Brief (human)

| Field | Value |
|-------|--------|
| **Project** | 5SAnchor |
| **Display name** | 5S Anchor (working name — changeable) |
| **Archetype** | `five-s-guider` (expanded product vision) |
| **Deployment** | PWA local-first with offline; hosted Postgres path designed |
| **Stack** | Vite + React + TypeScript + Tailwind + IndexedDB |
| **Roles** | Operator · Supervisor · Manager · Admin |
| **Core workflows** | Red Tag (Sort) · Scored Audits · Corrective Actions · Dashboard |
| **Future** | Ignition REST/score pull, multi-device Supabase |

## Non-goals (v1)

Full MES replacement, live Ignition tag writes, multi-tenant SaaS, photo annotation/voice.

## Phone trial path

1. `npm install && npm run dev`  
2. Open on phone (LAN) or install PWA  
3. Pick **Operator** → create Red Tag → run Audit  
4. Switch to **Manager** → Dashboard  
