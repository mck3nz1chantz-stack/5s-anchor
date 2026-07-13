import { getDb, getMeta, setMeta, wipeLocalDatabase } from './index'
import type {
  AppUser,
  Area,
  ChecklistItem,
  ChecklistTemplate,
  Plant,
  Schedule,
  VisualStandard,
  Zone,
} from '../types/domain'
import { nowIso } from '../lib/ids'
import type { DataMode } from './dataOps'

/** Bump when mock plant / guided copy changes */
export const SEED_VERSION = 2

/**
 * First launch only auto-loads demo seed.
 * Respects empty / custom (restored) modes so clear + save/restore stay intact.
 */
export async function ensureSeed() {
  const mode = await getMeta<DataMode>('dataMode')
  if (mode === 'empty' || mode === 'custom') return

  const ver = await getMeta<number>('seedVersion')
  if (ver === SEED_VERSION) return

  // Upgrade path for older demos only when still in demo mode
  if (ver != null && ver > 0 && (mode === 'demo' || mode == null)) {
    await wipeLocalDatabase()
  }

  // Fresh install (no mode yet) → demo
  await writeSeedData()
  await setMeta('dataMode', 'demo')
}

/** @deprecated Prefer loadDemoSeed / clearAllData from dataOps */
export async function hardResetAndReseed(): Promise<void> {
  await wipeLocalDatabase()
  await writeSeedData()
  await setMeta('dataMode', 'demo')
}

export async function writeSeedData() {
  const db = await getDb()
  const plantId = 'plant-demo-001'
  const plant: Plant = {
    id: plantId,
    code: 'DEMO',
    name: 'Demo Manufacturing Plant',
    timezone: 'America/Detroit',
  }

  const areas: Area[] = [
    {
      id: 'area-asm55',
      plantId,
      code: 'ASM55',
      name: 'Assembly Cell ASM55',
      areaType: 'assembly_line',
    },
    {
      id: 'area-weld-1',
      plantId,
      code: 'WELD-1',
      name: 'Weld Cell 1',
      areaType: 'machine_cell',
    },
    {
      id: 'area-assy-a',
      plantId,
      code: 'ASSY-A',
      name: 'Assembly Line A',
      areaType: 'assembly_line',
    },
    {
      id: 'area-wh-1',
      plantId,
      code: 'WH-1',
      name: 'Warehouse North',
      areaType: 'warehouse',
    },
    {
      id: 'area-maint',
      plantId,
      code: 'MAINT',
      name: 'Maintenance Shop',
      areaType: 'maintenance_shop',
    },
    {
      id: 'area-ship',
      plantId,
      code: 'SHIP',
      name: 'Shipping Dock',
      areaType: 'shipping',
    },
  ]

  const zones: Zone[] = [
    { id: 'zone-asm55-1', areaId: 'area-asm55', code: '1', name: 'Main line', sortOrder: 1 },
    { id: 'zone-asm55-2', areaId: 'area-asm55', code: '2', name: 'Parts rack', sortOrder: 2 },
    { id: 'zone-weld-a', areaId: 'area-weld-1', code: 'A', name: 'Station A', sortOrder: 1 },
    { id: 'zone-weld-b', areaId: 'area-weld-1', code: 'B', name: 'Station B', sortOrder: 2 },
    { id: 'zone-assy-1', areaId: 'area-assy-a', code: '1', name: 'Station 1', sortOrder: 1 },
    { id: 'zone-assy-2', areaId: 'area-assy-a', code: '2', name: 'Station 2', sortOrder: 2 },
    { id: 'zone-wh-r1', areaId: 'area-wh-1', code: 'R1', name: 'Rack Row 1', sortOrder: 1 },
    { id: 'zone-maint-bay', areaId: 'area-maint', code: 'BAY', name: 'Main Bay', sortOrder: 1 },
    { id: 'zone-ship-dock', areaId: 'area-ship', code: 'D1', name: 'Dock 1', sortOrder: 1 },
  ]

  const users: AppUser[] = [
    {
      id: 'user-op-1',
      plantId,
      displayName: 'Alex Operator',
      role: 'operator',
      email: 'alex@demo.plant',
      badgeMeta: { streak: 0, badges: [] },
    },
    {
      id: 'user-sup-1',
      plantId,
      displayName: 'Sam Supervisor',
      role: 'supervisor',
      email: 'sam@demo.plant',
      badgeMeta: { streak: 0, badges: [] },
    },
    {
      id: 'user-mgr-1',
      plantId,
      displayName: 'Morgan Manager',
      role: 'manager',
      email: 'morgan@demo.plant',
      badgeMeta: { streak: 0, badges: [] },
    },
    {
      id: 'user-admin-1',
      plantId,
      displayName: 'Admin',
      role: 'admin',
      email: 'admin@demo.plant',
      badgeMeta: { streak: 0, badges: [] },
    },
  ]

  const templateId = 'tpl-5s-guided'
  const template6s = 'tpl-6s-guided'
  const templates: ChecklistTemplate[] = [
    {
      id: templateId,
      plantId,
      name: 'Guided 5S walk (any operator)',
      includeSafety: false,
      scoringMode: 'points_0_20',
      version: 2,
      isActive: true,
    },
    {
      id: template6s,
      plantId,
      name: 'Guided 6S walk (+ Safety)',
      includeSafety: true,
      scoringMode: 'points_0_20',
      version: 2,
      isActive: true,
    },
  ]

  const baseItems: Omit<ChecklistItem, 'id' | 'templateId'>[] = [
    {
      pillar: 'sort',
      prompt: 'Sort — only what belongs here',
      guidance:
        'Walk the area slowly. Anything that does not belong for today’s work should be removed or red-tagged.',
      lookFor: [
        'Tools, parts, or totes that no one is using this shift',
        'Personal items, scrap, empty boxes, or broken pieces',
        'Items on the floor or in the aisle that block walking',
        'Unknown items with no label or owner',
      ],
      whyItMatters:
        'Sort frees space and makes problems visible. If you are unsure about an item, flag it with a red tag — do not leave it “for later.”',
      howToScore:
        'Excellent = nothing extra. Needs work = several unknowns or clutter. Poor = blocked paths or piles of unused items.',
      maxPoints: 20,
      sortOrder: 1,
      requiresPhoto: false,
    },
    {
      pillar: 'set',
      prompt: 'Set in order — a place for everything',
      guidance:
        'Check that needed items have a clear home: labels, outlines, shadow boards, and floor marks.',
      lookFor: [
        'Labels on racks, bins, and tools (readable from where you stand)',
        'Shadow boards or outlines match what is hanging there',
        'Floor tape / walkways still visible and respected',
        'Fasteners and parts in the correct bin, not mixed',
      ],
      whyItMatters:
        'Set in order means anyone can find and return tools without asking. Missing homes create waste and defects.',
      howToScore:
        'Excellent = homes marked and used. Needs work = some missing labels. Poor = people hunt for tools every cycle.',
      maxPoints: 20,
      sortOrder: 2,
      requiresPhoto: false,
    },
    {
      pillar: 'shine',
      prompt: 'Shine — clean and inspect',
      guidance:
        'Clean is not only looks — wipe and look for leaks, chips, and damage while you clean.',
      lookFor: [
        'Floors free of oil, coolant, and parts debris',
        'Work surfaces wiped; rags and solvents put away',
        'Machine leaks or chip piles that keep coming back',
        'Trash cans not overflowing; trash in the right place',
      ],
      whyItMatters:
        'Shine surfaces hide defects and trip hazards. Daily shine also finds equipment problems early.',
      howToScore:
        'Excellent = ready for a visitor walk. Needs work = dusty or sticky spots. Poor = spills or unsafe footing.',
      maxPoints: 20,
      sortOrder: 3,
      requiresPhoto: false,
    },
    {
      pillar: 'standardize',
      prompt: 'Standardize — same way every time',
      guidance:
        'Look for posted standards and whether the area matches them (photos, checklists, color codes).',
      lookFor: [
        'Visual standard or photo of the ideal area is posted and current',
        'Color codes / labels match the plant standard',
        'Checklists or daily routines are filled in (if used here)',
        'Everyone’s station looks similar — not each person inventing a layout',
      ],
      whyItMatters:
        'Without a standard, 5S drifts. Standards make “normal” obvious so anyone can audit.',
      howToScore:
        'Excellent = posted and followed. Needs work = old or missing posts. Poor = no standard at all.',
      maxPoints: 20,
      sortOrder: 4,
      requiresPhoto: false,
    },
    {
      pillar: 'sustain',
      prompt: 'Sustain — keep it every day',
      guidance:
        'Check ownership: who owns this area, are open actions closed, are audits not just paper?',
      lookFor: [
        'Area owner or team name is clear',
        'Open red tags or actions are not months old',
        'Last audit score or board is recent',
        'People can explain how they keep the area daily (not only audit day)',
      ],
      whyItMatters:
        'Sustain is where most 5S programs fail. Habits beat one-time cleanups.',
      howToScore:
        'Excellent = live ownership and closed loops. Needs work = open items aging. Poor = audit theater only.',
      maxPoints: 20,
      sortOrder: 5,
      requiresPhoto: false,
    },
  ]

  const safetyItem: Omit<ChecklistItem, 'id' | 'templateId'> = {
    pillar: 'safety',
    prompt: 'Safety — 6th S',
    guidance: 'Safety is non-negotiable. Stop and escalate anything unsafe.',
    lookFor: [
      'PPE required for this cell is worn / available',
      'Exits and aisles clear — no blocked egress',
      'Guards, e-stops, and cables in place and undamaged',
      'Trip, slip, or sharp hazards controlled',
    ],
    whyItMatters: 'A clean cell that is unsafe is still a fail. Flag hazards immediately.',
    howToScore:
      'Excellent = no hazards. Needs work = minor issues fixed same shift. Poor = serious hazard — escalate now.',
    maxPoints: 20,
    sortOrder: 6,
    requiresPhoto: false,
  }

  const checklistItems: ChecklistItem[] = [
    ...baseItems.map((b, i) => ({
      ...b,
      id: `ci-5s-${i + 1}`,
      templateId,
    })),
    ...baseItems.map((b, i) => ({
      ...b,
      id: `ci-6s-${i + 1}`,
      templateId: template6s,
    })),
    { ...safetyItem, id: 'ci-6s-safety', templateId: template6s },
  ]

  const standards: VisualStandard[] = [
    {
      id: 'vs-asm55',
      plantId,
      areaId: 'area-asm55',
      pillar: 'set',
      title: 'ASM55 — ideal station layout',
      description: 'Tools on shadow board, totes labeled, 36" aisle clear.',
      isActive: true,
      createdAt: nowIso(),
    },
    {
      id: 'vs-1',
      plantId,
      areaId: 'area-weld-1',
      pillar: 'set',
      title: 'Weld Cell tool shadow board — ideal',
      description: 'All tools returned; labels readable.',
      isActive: true,
      createdAt: nowIso(),
    },
    {
      id: 'vs-2',
      plantId,
      areaId: 'area-assy-a',
      pillar: 'shine',
      title: 'Assembly aisle — ideal walkway',
      description: 'Clear 36" path, no totes in aisle.',
      isActive: true,
      createdAt: nowIso(),
    },
  ]

  const schedules: Schedule[] = [
    {
      id: 'sch-asm55',
      plantId,
      areaId: 'area-asm55',
      kind: 'weekly_audit',
      title: 'Weekly guided audit — ASM55',
      isActive: true,
      nextDueAt: new Date().toISOString(),
    },
    {
      id: 'sch-1',
      plantId,
      areaId: 'area-weld-1',
      kind: 'daily_shine',
      title: 'Daily Shine — Weld Cell 1',
      isActive: true,
      nextDueAt: new Date().toISOString(),
    },
  ]

  await db.put('plants', plant)
  for (const a of areas) await db.put('areas', a)
  for (const z of zones) await db.put('zones', z)
  for (const u of users) await db.put('users', u)
  for (const t of templates) await db.put('templates', t)
  for (const c of checklistItems) await db.put('checklistItems', c)
  for (const s of standards) await db.put('standards', s)
  for (const s of schedules) await db.put('schedules', s)

  await setMeta('seedVersion', SEED_VERSION)
  await setMeta('plantId', plantId)
  await setMeta('tagCounter', 41)
  await setMeta('dataMode', 'demo')
}
