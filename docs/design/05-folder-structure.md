# 5S Anchor — Folder Structure & Key Tech Choices

```
5SAnchor/
├── CHANTZMEDIA.md
├── README.md
├── build-state.json
├── package.json
├── vite.config.ts
├── index.html
├── public/
│   ├── manifest.webmanifest
│   ├── icons/
│   └── favicon.svg
├── docs/
│   ├── plantforge/
│   │   ├── industrial-app-brief.v1.json
│   │   └── brief.md
│   ├── design/
│   │   ├── 01-tech-stack.md
│   │   ├── 02-architecture.md
│   │   ├── 03-database-schema.sql
│   │   ├── 04-rest-api.md
│   │   ├── 05-folder-structure.md
│   │   ├── 06-ui-flows.md
│   │   └── 07-implementation-plan.md
│   └── integration/
│       └── ignition.md
├── supabase/                    # optional hosted path
│   └── migrations/
│       └── 20260712000000_5s_anchor_v1.sql
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── types/
    │   └── domain.ts            # shared domain types (API-shaped)
    ├── lib/
    │   ├── ids.ts
    │   ├── scoring.ts
    │   ├── workflow.ts
    │   └── format.ts
    ├── db/
    │   ├── index.ts             # IndexedDB open/schema
    │   └── seed.ts
    ├── store/
    │   ├── authStore.ts
    │   └── appStore.ts          # reactive lists + mutations
    ├── api/
    │   ├── client.ts            # HTTP client (future)
    │   ├── localRepository.ts   # offline repo (MVP)
    │   └── repository.ts        # interface
    ├── hooks/
    │   └── usePhotoCapture.ts
    ├── components/
    │   ├── layout/
    │   │   ├── AppShell.tsx
    │   │   └── BottomNav.tsx
    │   ├── ui/
    │   │   ├── BigButton.tsx
    │   │   ├── ScorePill.tsx
    │   │   └── StatusBadge.tsx
    │   └── audit/
    │       ├── PillarTabs.tsx
    │       └── ItemScoreControl.tsx
    └── pages/
        ├── HomePage.tsx
        ├── RedTagListPage.tsx
        ├── RedTagCreatePage.tsx
        ├── AuditListPage.tsx
        ├── AuditRunPage.tsx
        ├── DashboardPage.tsx
        ├── ActionsPage.tsx
        ├── StandardsPage.tsx
        └── RoleSelectPage.tsx
```

## State management

- **Zustand** for session (user/role) and screen data refresh tokens.
- **IndexedDB** is the source of truth offline; Zustand holds derived lists for UI.
- No Redux — too heavy for solo pace.

## Offline strategy (MVP)

| Concern | Approach |
|---------|----------|
| Persistence | `idb` (IndexedDB wrapper) |
| Mutations | Write-through + `outbox` store |
| Sync | Stub `flushOutbox()` that no-ops until API exists; export JSON works now |
| Photos | `blob` stored in IDB `photos` store as data URL (demo); compress later |
| SW | vite-plugin-pwa precaches shell; runtime cache for assets |

## Auth flow (MVP → production)

```
MVP: RoleSelectPage → set session in localStorage
  → all routes read role for button enable/disable

Later: Supabase Auth / plant SSO
  → JWT with plant_id + role
  → repository uses Bearer token
  → RLS enforces plant isolation
```

## API boundary

All UI calls `repository.*` only — never fetch/IDB directly from components (except photo file input helpers). Swap `localRepository` → `httpRepository` without rewriting screens.
