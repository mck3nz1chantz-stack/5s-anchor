import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  AppUser,
  Area,
  Audit,
  ChecklistItem,
  ChecklistTemplate,
  CorrectiveAction,
  Photo,
  Plant,
  RedTag,
  RedTagEvent,
  Schedule,
  ScoreSnapshot,
  VisualStandard,
  Zone,
} from '../types/domain'

interface FiveSDB extends DBSchema {
  meta: { key: string; value: unknown }
  plants: { key: string; value: Plant }
  areas: { key: string; value: Area; indexes: { 'by-plant': string } }
  zones: { key: string; value: Zone; indexes: { 'by-area': string } }
  users: { key: string; value: AppUser; indexes: { 'by-plant': string } }
  photos: { key: string; value: Photo }
  redTags: {
    key: string
    value: RedTag
    indexes: { 'by-plant': string; 'by-status': string }
  }
  redTagEvents: { key: string; value: RedTagEvent; indexes: { 'by-tag': string } }
  templates: { key: string; value: ChecklistTemplate }
  checklistItems: { key: string; value: ChecklistItem; indexes: { 'by-template': string } }
  audits: { key: string; value: Audit; indexes: { 'by-plant': string; 'by-area': string } }
  actions: {
    key: string
    value: CorrectiveAction
    indexes: { 'by-plant': string; 'by-status': string }
  }
  standards: { key: string; value: VisualStandard; indexes: { 'by-area': string } }
  scores: { key: string; value: ScoreSnapshot; indexes: { 'by-plant': string; 'by-area': string } }
  schedules: { key: string; value: Schedule }
  outbox: {
    key: string
    value: { id: string; entityType: string; op: string; payload: unknown; createdAt: string }
  }
}

export const DB_NAME = 'five-s-anchor-v1'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<FiveSDB>> | null = null

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<FiveSDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('meta')
        db.createObjectStore('plants', { keyPath: 'id' })
        const areas = db.createObjectStore('areas', { keyPath: 'id' })
        areas.createIndex('by-plant', 'plantId')
        const zones = db.createObjectStore('zones', { keyPath: 'id' })
        zones.createIndex('by-area', 'areaId')
        const users = db.createObjectStore('users', { keyPath: 'id' })
        users.createIndex('by-plant', 'plantId')
        db.createObjectStore('photos', { keyPath: 'id' })
        const redTags = db.createObjectStore('redTags', { keyPath: 'id' })
        redTags.createIndex('by-plant', 'plantId')
        redTags.createIndex('by-status', 'status')
        const events = db.createObjectStore('redTagEvents', { keyPath: 'id' })
        events.createIndex('by-tag', 'redTagId')
        db.createObjectStore('templates', { keyPath: 'id' })
        const items = db.createObjectStore('checklistItems', { keyPath: 'id' })
        items.createIndex('by-template', 'templateId')
        const audits = db.createObjectStore('audits', { keyPath: 'id' })
        audits.createIndex('by-plant', 'plantId')
        audits.createIndex('by-area', 'areaId')
        const actions = db.createObjectStore('actions', { keyPath: 'id' })
        actions.createIndex('by-plant', 'plantId')
        actions.createIndex('by-status', 'status')
        const standards = db.createObjectStore('standards', { keyPath: 'id' })
        standards.createIndex('by-area', 'areaId')
        const scores = db.createObjectStore('scores', { keyPath: 'id' })
        scores.createIndex('by-plant', 'plantId')
        scores.createIndex('by-area', 'areaId')
        db.createObjectStore('schedules', { keyPath: 'id' })
        db.createObjectStore('outbox', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await getDb()
  return (await db.get('meta', key)) as T | undefined
}

export async function setMeta(key: string, value: unknown) {
  const db = await getDb()
  await db.put('meta', value, key)
}

/** Close handle, delete IndexedDB, clear promise so next getDb() is fresh. */
export async function wipeLocalDatabase(): Promise<void> {
  if (dbPromise) {
    try {
      const db = await dbPromise
      db.close()
    } catch {
      /* ignore */
    }
    dbPromise = null
  }
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error ?? new Error('Failed to delete database'))
    req.onblocked = () => {
      // Still resolve — next open may work after tabs release
      resolve()
    }
  })
}
