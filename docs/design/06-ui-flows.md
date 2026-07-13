# 5S Anchor — UI Flows (Red Tag + Audit)

Industrial constraints applied everywhere:
- Min **48×48px** tap targets (prefer 56px primary actions)
- High contrast dark theme (slate/blue)
- One primary CTA per step; avoid dense forms
- Minimal scroll: step wizards over long pages
- Large status colors (red/yellow/green) with text labels (not color-only)

---

## Screen A — Create Red Tag

### Goal
Operator captures a Sort item in &lt; 30 seconds with gloves on.

### Flow

```
[Home] → Red Tags → + New Tag
  Step 1: Area / Zone (large chips)
  Step 2: Photo (full-width capture button)
  Step 3: Category (3 huge tiles: Discard | Relocate | Unsure)
  Step 4: Reason (optional chips + free text)
  Step 5: Review → Submit
       → success toast + tag number → list
```

### Component tree

```
RedTagCreatePage
├── StepIndicator (1–5)
├── AreaZonePicker
│   └── ChipButton[]
├── PhotoCapture
│   ├── CameraInput (capture="environment")
│   ├── PreviewImage
│   └── RetakeButton
├── CategoryTiles
│   ├── CategoryTile (discard / red)
│   ├── CategoryTile (relocate / yellow)
│   └── CategoryTile (unsure / amber-green)
├── ReasonForm
│   ├── QuickReasonChip[]
│   └── TextArea (large font)
└── FooterBar
    ├── BackButton
    └── PrimaryButton (Next / Submit)
```

### Scoring / tagging logic (UI)

| Category | Badge color | Default status on submit |
|----------|-------------|---------------------------|
| Discard | Red | `open` |
| Relocate | Yellow | `open` |
| Unsure | Yellow + “Needs review” | `open` (supervisor path) |

Disposition later:
- Scrap / remove → close red
- Moved home → green closed
- Keep as standard → green + optional visual standard create

### Photo handling

1. `input[type=file] accept="image/*" capture="environment"`
2. Read as data URL (MVP) or compress via canvas max 1280px edge
3. Save in IDB with `localBlobId`
4. Preview on review step
5. List thumbnails from same store

### Role gates

| Action | Operator | Supervisor | Manager |
|--------|----------|------------|---------|
| Create / submit | ✓ | ✓ | ✓ |
| Disposition / close | — | ✓ | ✓ |
| Void | — | ✓ | ✓ |

---

## Screen B — Audit / Checklist

### Goal
Complete a zone audit with pillar scores, photos on findings, and one-tap corrective actions.

### Flow

```
[Home] → Audits → Start audit
  Pick area + zone + template (5S or 5S+Safety)
  → AuditRunPage
       Header: area, progress bar, live overall %
       Pillar tabs: Sort | Set | Shine | Std | Sustain | [Safety]
       For each item:
         - Prompt + guidance
         - Score control (0–20 stepper or 1–5 maturity)
         - Optional finding text
         - Photo before / after
         - “Create action” if score < threshold
       Footer: Save draft | Submit
  → Summary sheet (pillar breakdown) → Actions created
```

### Component tree

```
AuditRunPage
├── AuditHeader
│   ├── Title / zone
│   ├── ProgressBar (items scored / total)
│   └── LiveScorePct
├── PillarTabs
├── ItemCard (current or list)
│   ├── Prompt
│   ├── Guidance (collapsed)
│   ├── ItemScoreControl
│   │   ├── MinusButton / PlusButton (large)
│   │   └── ValueDisplay
│   ├── FindingTextArea
│   ├── PhotoRow (before | after)
│   ├── LinkToVisualStandard
│   └── CreateActionToggle
├── ItemNav (Prev / Next item)
└── FooterBar
    ├── SaveDraft
    └── SubmitAudit
```

### Scoring

```ts
// points_0_20
overall = sum(item.score) / sum(item.maxPoints) * 100

// pillar_scores[p] = sum scores for pillar / sum max for pillar * 100 (or raw)
```

- Default template: 4 items × 5 pillars × 20 pts = 400 max (or 1 item/pillar for demo speed)
- MVP seed uses **one item per pillar** (100 max) for fast demos
- Threshold: score &lt; 70% of max_points → suggest corrective action

### Photo handling on items

- Before: optional on any item; required if `requires_photo`
- After: for re-audit / improvement proof (can be empty on first pass)
- Comparison: Standards page + audit history modal “Before | After” side-by-side

### Visual standards during audit

- `LinkToVisualStandard` opens bottom sheet of ideal-state photos for this area/pillar
- Operator does not leave the audit flow

### Role gates

| Action | Operator | Supervisor | Manager |
|--------|----------|------------|---------|
| Run audit | ✓ | ✓ | ✓ |
| Review / lock | — | ✓ | ✓ |
| Edit templates | — | — | ✓ |

---

## Shared navigation

Bottom nav (thumb zone):

1. Home  
2. Tags  
3. Audit  
4. Actions  
5. More (Dashboard, Standards, Role)

Dashboard is manager/supervisor primary; operators see “My work” summary on Home.
