/** Domain types — shaped like REST JSON (camelCase, ISO timestamps, UUID strings). */

export type UserRole = 'operator' | 'supervisor' | 'manager' | 'admin'

export type RedTagCategory = 'discard' | 'relocate' | 'unsure'
export type RedTagColor = 'red' | 'yellow' | 'green'
export type RedTagStatus = 'draft' | 'open' | 'in_review' | 'dispositioned' | 'closed' | 'void'

export type ActionStatus = 'open' | 'in_progress' | 'blocked' | 'done' | 'void'
export type AuditStatus = 'scheduled' | 'in_progress' | 'submitted' | 'reviewed' | 'void'
export type Pillar = 'sort' | 'set' | 'shine' | 'standardize' | 'sustain' | 'safety'
export type ScoringMode = 'points_0_20' | 'maturity_1_5'
export type AreaType =
  | 'machine_cell'
  | 'assembly_line'
  | 'warehouse'
  | 'maintenance_shop'
  | 'shipping'
  | 'other'

export interface Plant {
  id: string
  code: string
  name: string
  timezone: string
}

export interface Area {
  id: string
  plantId: string
  code: string
  name: string
  areaType: AreaType
}

export interface Zone {
  id: string
  areaId: string
  code: string
  name: string
  sortOrder: number
}

export interface AppUser {
  id: string
  plantId: string
  displayName: string
  role: UserRole
  email?: string
  badgeMeta: { streak?: number; badges?: string[] }
}

export interface Photo {
  id: string
  plantId: string
  kind: string
  dataUrl?: string
  mimeType: string
  capturedAt: string
  capturedBy?: string
}

export interface RedTag {
  id: string
  plantId: string
  areaId: string
  zoneId?: string
  tagNumber: string
  category: RedTagCategory
  color: RedTagColor
  status: RedTagStatus
  reason: string
  locationNote?: string
  photoId?: string
  createdBy: string
  assignedTo?: string
  disposition?: string
  createdAt: string
  updatedAt: string
}

export interface RedTagEvent {
  id: string
  redTagId: string
  fromStatus?: RedTagStatus
  toStatus: RedTagStatus
  actorId?: string
  note?: string
  createdAt: string
}

export interface ChecklistTemplate {
  id: string
  plantId: string
  name: string
  areaType?: AreaType
  includeSafety: boolean
  scoringMode: ScoringMode
  version: number
  isActive: boolean
}

export interface ChecklistItem {
  id: string
  templateId: string
  pillar: Pillar
  /** Short step title */
  prompt: string
  /** Plain-language coach text */
  guidance?: string
  /** Step-by-step “what to look for” for any operator */
  lookFor?: string[]
  /** Why this step matters (teach) */
  whyItMatters?: string
  /** How to pick a score without 5S expertise */
  howToScore?: string
  maxPoints: number
  sortOrder: number
  requiresPhoto: boolean
}

export interface AuditItemScore {
  checklistItemId: string
  pillar: Pillar
  score: number
  maxPoints: number
  finding?: string
  photoBeforeId?: string
  photoAfterId?: string
  createAction?: boolean
  actionTitle?: string
}

export interface Audit {
  id: string
  plantId: string
  areaId: string
  zoneId?: string
  templateId: string
  status: AuditStatus
  auditorId: string
  startedAt: string
  submittedAt?: string
  overallScore: number
  maxScore: number
  scorePct: number
  pillarScores: Partial<Record<Pillar, number>>
  notes?: string
  items: AuditItemScore[]
  createdAt: string
  updatedAt: string
}

export interface CorrectiveAction {
  id: string
  plantId: string
  areaId: string
  auditId?: string
  redTagId?: string
  title: string
  description?: string
  status: ActionStatus
  ownerId?: string
  dueAt?: string
  closedAt?: string
  proofPhotoId?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface VisualStandard {
  id: string
  plantId: string
  areaId: string
  zoneId?: string
  pillar?: Pillar
  title: string
  description?: string
  photoId?: string
  isActive: boolean
  createdAt: string
}

export interface ScoreSnapshot {
  id: string
  plantId: string
  areaId: string
  zoneId?: string
  auditId?: string
  scorePct: number
  overallScore: number
  maxScore: number
  pillarScores: Partial<Record<Pillar, number>>
  recordedAt: string
}

export interface Schedule {
  id: string
  plantId: string
  areaId: string
  kind: 'daily_shine' | 'weekly_audit' | 'custom'
  title: string
  isActive: boolean
  nextDueAt?: string
}

export interface Session {
  userId: string
  plantId: string
  role: UserRole
  displayName: string
}

export interface DashboardData {
  asOf: string
  heatmap: { areaId: string; areaName: string; scorePct: number | null; lastAuditAt?: string }[]
  trends: { date: string; avgScorePct: number }[]
  openRedTags: number
  openActions: number
  overdueActions: number
  completionRate7d: number
  topIssues: { label: string; count: number }[]
}

export const PILLAR_LABELS: Record<Pillar, string> = {
  sort: 'Sort',
  set: 'Set',
  shine: 'Shine',
  standardize: 'Standardize',
  sustain: 'Sustain',
  safety: 'Safety',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  operator: 'Operator',
  supervisor: 'Supervisor',
  manager: 'Manager',
  admin: 'Admin',
}
