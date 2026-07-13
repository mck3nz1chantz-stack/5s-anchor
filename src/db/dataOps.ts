import { getDb, getMeta, setMeta, wipeLocalDatabase } from './index'
import { writeSeedData } from './seed'
import { nowIso, uid } from '../lib/ids'
import type { AppUser, Plant } from '../types/domain'

export const BACKUP_SCHEMA = 'FiveSAnchorBackup.v1' as const

const STORE_NAMES = [
  'meta',
  'plants',
  'areas',
  'zones',
  'users',
  'photos',
  'redTags',
  'redTagEvents',
  'templates',
  'checklistItems',
  'audits',
  'actions',
  'standards',
  'scores',
  'schedules',
  'outbox',
] as const

export type DataMode = 'demo' | 'empty' | 'custom'

export type AppBackup = {
  schema: typeof BACKUP_SCHEMA
  exportedAt: string
  app: '5S Anchor'
  dataMode: DataMode
  stores: Record<string, unknown[]>
}

/** Snapshot every store for download / later restore. */
export async function exportAllData(): Promise<AppBackup> {
  const db = await getDb()
  const stores: Record<string, unknown[]> = {}

  for (const name of STORE_NAMES) {
    if (name === 'meta') {
      // meta is key-value without keyPath on values
      const keys = await db.getAllKeys('meta')
      const rows: { key: string; value: unknown }[] = []
      for (const key of keys) {
        rows.push({ key: String(key), value: await db.get('meta', key) })
      }
      stores.meta = rows
    } else {
      stores[name] = await db.getAll(name as 'plants')
    }
  }

  const dataMode = ((await getMeta<DataMode>('dataMode')) ?? 'demo') as DataMode

  return {
    schema: BACKUP_SCHEMA,
    exportedAt: nowIso(),
    app: '5S Anchor',
    dataMode,
    stores,
  }
}

export function downloadBackup(backup: AppBackup, filename?: string) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const day = backup.exportedAt.slice(0, 10)
  a.href = url
  a.download = filename ?? `5s-anchor-save-${day}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Replace local DB with a previously exported save file. */
export async function importAllData(backup: AppBackup): Promise<void> {
  if (backup.schema !== BACKUP_SCHEMA) {
    throw new Error('Not a 5S Anchor save file (wrong schema).')
  }
  if (!backup.stores || typeof backup.stores !== 'object') {
    throw new Error('Save file is missing store data.')
  }

  await wipeLocalDatabase()
  const db = await getDb()

  for (const name of STORE_NAMES) {
    const rows = backup.stores[name]
    if (!rows || !Array.isArray(rows)) continue

    if (name === 'meta') {
      for (const row of rows as { key: string; value: unknown }[]) {
        if (row && typeof row.key === 'string') {
          await db.put('meta', row.value, row.key)
        }
      }
    } else {
      for (const row of rows) {
        if (row && typeof row === 'object' && 'id' in (row as object)) {
          await db.put(name as 'plants', row as never)
        }
      }
    }
  }

  await setMeta('dataMode', backup.dataMode ?? 'custom')
  await setMeta('restoredAt', nowIso())
}

/**
 * Delete all local data. Leaves a bare plant + one operator so you can still
 * open the app — no demo areas, tags, or audits.
 */
export async function clearAllData(): Promise<void> {
  await wipeLocalDatabase()
  const db = await getDb()
  const plantId = 'plant-local-001'
  const plant: Plant = {
    id: plantId,
    code: 'LOCAL',
    name: 'Local plant (empty)',
    timezone: 'America/Detroit',
  }
  const operator: AppUser = {
    id: uid(),
    plantId,
    displayName: 'Local Operator',
    role: 'operator',
    badgeMeta: {},
  }
  const supervisor: AppUser = {
    id: uid(),
    plantId,
    displayName: 'Local Supervisor',
    role: 'supervisor',
    badgeMeta: {},
  }
  const manager: AppUser = {
    id: uid(),
    plantId,
    displayName: 'Local Manager',
    role: 'manager',
    badgeMeta: {},
  }

  await db.put('plants', plant)
  await db.put('users', operator)
  await db.put('users', supervisor)
  await db.put('users', manager)
  await setMeta('plantId', plantId)
  await setMeta('tagCounter', 0)
  await setMeta('dataMode', 'empty')
  await setMeta('seedVersion', 0)
  await setMeta('clearedAt', nowIso())
}

/** Load full demo plant (ASM55, guided checklists). Replaces current data. */
export async function loadDemoSeed(): Promise<void> {
  await wipeLocalDatabase()
  await writeSeedData()
  await setMeta('dataMode', 'demo')
}

export async function getDataMode(): Promise<DataMode> {
  return (await getMeta<DataMode>('dataMode')) ?? 'demo'
}
