import { getDb } from '../db'
import { uid, nowIso } from '../lib/ids'
import { categoryColor, computeAuditTotals, shouldSuggestAction } from '../lib/scoring'
import type {
  Audit,
  AuditItemScore,
  CorrectiveAction,
  DashboardData,
  Photo,
  RedTag,
  RedTagCategory,
  RedTagStatus,
  Session,
} from '../types/domain'

async function nextTagNumber(_plantId: string): Promise<string> {
  const db = await getDb()
  const raw = (await db.get('meta', 'tagCounter')) as number | undefined
  const n = (raw ?? 0) + 1
  await db.put('meta', n, 'tagCounter')
  const year = new Date().getFullYear()
  return `RT-${year}-${String(n).padStart(4, '0')}`
}

async function enqueue(entityType: string, op: string, payload: unknown) {
  const db = await getDb()
  await db.put('outbox', {
    id: uid(),
    entityType,
    op,
    payload,
    createdAt: nowIso(),
  })
}

export const localRepository = {
  async listAreas(plantId: string) {
    const db = await getDb()
    return db.getAllFromIndex('areas', 'by-plant', plantId)
  },

  async findAreaByCode(plantId: string, code: string) {
    const areas = await this.listAreas(plantId)
    const normalized = code.trim().toUpperCase().replace(/\s+/g, '')
    return (
      areas.find((a) => a.code.toUpperCase().replace(/\s+/g, '') === normalized) ?? null
    )
  },

  async listZones(areaId: string) {
    const db = await getDb()
    return db.getAllFromIndex('zones', 'by-area', areaId)
  },

  async listUsers(plantId: string) {
    const db = await getDb()
    return db.getAllFromIndex('users', 'by-plant', plantId)
  },

  async listTemplates(plantId: string) {
    const db = await getDb()
    const all = await db.getAll('templates')
    return all.filter((t) => t.plantId === plantId && t.isActive)
  },

  async listChecklistItems(templateId: string) {
    const db = await getDb()
    const items = await db.getAllFromIndex('checklistItems', 'by-template', templateId)
    return items.sort((a, b) => a.sortOrder - b.sortOrder)
  },

  async savePhoto(input: {
    plantId: string
    kind: string
    dataUrl: string
    mimeType?: string
    capturedBy?: string
  }): Promise<Photo> {
    const db = await getDb()
    const photo: Photo = {
      id: uid(),
      plantId: input.plantId,
      kind: input.kind,
      dataUrl: input.dataUrl,
      mimeType: input.mimeType ?? 'image/jpeg',
      capturedAt: nowIso(),
      capturedBy: input.capturedBy,
    }
    await db.put('photos', photo)
    return photo
  },

  async getPhoto(id: string) {
    const db = await getDb()
    return db.get('photos', id)
  },

  async listRedTags(plantId: string) {
    const db = await getDb()
    const tags = await db.getAllFromIndex('redTags', 'by-plant', plantId)
    return tags.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async createRedTag(input: {
    session: Session
    areaId: string
    zoneId?: string
    category: RedTagCategory
    reason: string
    locationNote?: string
    photoDataUrl?: string
    submit?: boolean
  }): Promise<RedTag> {
    const db = await getDb()
    const ts = nowIso()
    let photoId: string | undefined
    if (input.photoDataUrl) {
      const photo = await this.savePhoto({
        plantId: input.session.plantId,
        kind: 'red_tag',
        dataUrl: input.photoDataUrl,
        capturedBy: input.session.userId,
      })
      photoId = photo.id
    }

    const status: RedTagStatus = input.submit === false ? 'draft' : 'open'
    const tag: RedTag = {
      id: uid(),
      plantId: input.session.plantId,
      areaId: input.areaId,
      zoneId: input.zoneId,
      tagNumber: await nextTagNumber(input.session.plantId),
      category: input.category,
      color: categoryColor(input.category),
      status,
      reason: input.reason,
      locationNote: input.locationNote,
      photoId,
      createdBy: input.session.userId,
      createdAt: ts,
      updatedAt: ts,
    }
    await db.put('redTags', tag)
    await db.put('redTagEvents', {
      id: uid(),
      redTagId: tag.id,
      toStatus: status,
      actorId: input.session.userId,
      note: 'Created',
      createdAt: ts,
    })
    await enqueue('red_tag', 'create', tag)
    return tag
  },

  async transitionRedTag(
    session: Session,
    tagId: string,
    toStatus: RedTagStatus,
    note?: string,
    disposition?: string,
  ) {
    const allowed = ['supervisor', 'manager', 'admin']
    if (!allowed.includes(session.role) && toStatus !== 'open') {
      throw new Error('Your role cannot change this red tag status')
    }
    const db = await getDb()
    const tag = await db.get('redTags', tagId)
    if (!tag) throw new Error('Red tag not found')
    const from = tag.status
    tag.status = toStatus
    tag.updatedAt = nowIso()
    if (disposition) tag.disposition = disposition
    if (toStatus === 'dispositioned' || toStatus === 'closed') {
      tag.color = 'green'
    }
    await db.put('redTags', tag)
    await db.put('redTagEvents', {
      id: uid(),
      redTagId: tagId,
      fromStatus: from,
      toStatus,
      actorId: session.userId,
      note,
      createdAt: nowIso(),
    })
    await enqueue('red_tag', 'transition', { tagId, toStatus, note })
    return tag
  },

  async listAudits(plantId: string) {
    const db = await getDb()
    const audits = await db.getAllFromIndex('audits', 'by-plant', plantId)
    return audits.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  },

  async submitAudit(input: {
    session: Session
    areaId: string
    zoneId?: string
    templateId: string
    items: AuditItemScore[]
    notes?: string
    status?: 'in_progress' | 'submitted'
  }): Promise<Audit> {
    const db = await getDb()
    const ts = nowIso()
    const totals = computeAuditTotals(input.items)
    const audit: Audit = {
      id: uid(),
      plantId: input.session.plantId,
      areaId: input.areaId,
      zoneId: input.zoneId,
      templateId: input.templateId,
      status: input.status ?? 'submitted',
      auditorId: input.session.userId,
      startedAt: ts,
      submittedAt: (input.status ?? 'submitted') === 'submitted' ? ts : undefined,
      overallScore: totals.overallScore,
      maxScore: totals.maxScore,
      scorePct: totals.scorePct,
      pillarScores: totals.pillarScores,
      notes: input.notes,
      items: input.items,
      createdAt: ts,
      updatedAt: ts,
    }
    await db.put('audits', audit)

    if (audit.status === 'submitted') {
      await db.put('scores', {
        id: uid(),
        plantId: audit.plantId,
        areaId: audit.areaId,
        zoneId: audit.zoneId,
        auditId: audit.id,
        scorePct: audit.scorePct,
        overallScore: audit.overallScore,
        maxScore: audit.maxScore,
        pillarScores: audit.pillarScores,
        recordedAt: ts,
      })

      for (const item of input.items) {
        if (item.createAction || shouldSuggestAction(item.score, item.maxPoints)) {
          if (item.finding || item.createAction) {
            const action: CorrectiveAction = {
              id: uid(),
              plantId: audit.plantId,
              areaId: audit.areaId,
              auditId: audit.id,
              title: item.actionTitle || item.finding || `${item.pillar} improvement`,
              description: item.finding,
              status: 'open',
              ownerId: input.session.userId,
              dueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
              createdBy: input.session.userId,
              createdAt: ts,
              updatedAt: ts,
            }
            await db.put('actions', action)
            await enqueue('corrective_action', 'create', action)
          }
        }
      }
    }

    await enqueue('audit', 'submit', audit)
    return audit
  },

  async listActions(plantId: string) {
    const db = await getDb()
    const actions = await db.getAllFromIndex('actions', 'by-plant', plantId)
    return actions.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async updateAction(
    _session: Session,
    actionId: string,
    patch: Partial<Pick<CorrectiveAction, 'status' | 'proofPhotoId' | 'ownerId'>>,
  ) {
    const db = await getDb()
    const action = await db.get('actions', actionId)
    if (!action) throw new Error('Action not found')
    Object.assign(action, patch, { updatedAt: nowIso() })
    if (patch.status === 'done') action.closedAt = nowIso()
    await db.put('actions', action)
    await enqueue('corrective_action', 'update', { actionId, patch })
    return action
  },

  async listStandards(areaId?: string) {
    const db = await getDb()
    if (areaId) return db.getAllFromIndex('standards', 'by-area', areaId)
    return db.getAll('standards')
  },

  async listSchedules(plantId: string) {
    const db = await getDb()
    const all = await db.getAll('schedules')
    return all.filter((s) => s.plantId === plantId)
  },

  async getDashboard(plantId: string): Promise<DashboardData> {
    const db = await getDb()
    const areas = await db.getAllFromIndex('areas', 'by-plant', plantId)
    const scores = await db.getAllFromIndex('scores', 'by-plant', plantId)
    const tags = await db.getAllFromIndex('redTags', 'by-plant', plantId)
    const actions = await db.getAllFromIndex('actions', 'by-plant', plantId)
    const audits = await db.getAllFromIndex('audits', 'by-plant', plantId)

    const heatmap = areas.map((area) => {
      const areaScores = scores
        .filter((s) => s.areaId === area.id)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
      const latest = areaScores[0]
      return {
        areaId: area.id,
        areaName: area.name,
        scorePct: latest ? latest.scorePct : null,
        lastAuditAt: latest?.recordedAt,
      }
    })

    // Trends: last 8 buckets by day
    const byDay = new Map<string, number[]>()
    for (const s of scores) {
      const day = s.recordedAt.slice(0, 10)
      const arr = byDay.get(day) ?? []
      arr.push(s.scorePct)
      byDay.set(day, arr)
    }
    const trends = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([date, vals]) => ({
        date,
        avgScorePct: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
      }))

    const openRedTags = tags.filter((t) => ['open', 'in_review', 'draft'].includes(t.status)).length
    const openActions = actions.filter((a) => ['open', 'in_progress', 'blocked'].includes(a.status))
      .length
    const now = Date.now()
    const overdueActions = actions.filter(
      (a) =>
        ['open', 'in_progress', 'blocked'].includes(a.status) &&
        a.dueAt &&
        new Date(a.dueAt).getTime() < now,
    ).length

    const weekAgo = now - 7 * 86400000
    const recentAudits = audits.filter((a) => new Date(a.startedAt).getTime() >= weekAgo)
    const submitted = recentAudits.filter((a) => a.status === 'submitted' || a.status === 'reviewed')
    const completionRate7d =
      recentAudits.length === 0 ? 1 : submitted.length / Math.max(recentAudits.length, 1)

    const issueMap = new Map<string, number>()
    for (const a of audits) {
      for (const item of a.items) {
        if (item.finding) {
          const key = item.finding.slice(0, 48)
          issueMap.set(key, (issueMap.get(key) ?? 0) + 1)
        }
      }
    }
    for (const t of tags) {
      const key = t.reason.slice(0, 48)
      issueMap.set(key, (issueMap.get(key) ?? 0) + 1)
    }
    const topIssues = [...issueMap.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      asOf: nowIso(),
      heatmap,
      trends,
      openRedTags,
      openActions,
      overdueActions,
      completionRate7d,
      topIssues,
    }
  },

  async exportScoresCsv(plantId: string): Promise<string> {
    const db = await getDb()
    const scores = await db.getAllFromIndex('scores', 'by-plant', plantId)
    const areas = await db.getAllFromIndex('areas', 'by-plant', plantId)
    const nameOf = (id: string) => areas.find((a) => a.id === id)?.name ?? id
    const header = 'recordedAt,area,scorePct,overallScore,maxScore,auditId'
    const rows = scores
      .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
      .map(
        (s) =>
          `${s.recordedAt},${JSON.stringify(nameOf(s.areaId))},${s.scorePct},${s.overallScore},${s.maxScore},${s.auditId ?? ''}`,
      )
    return [header, ...rows].join('\n')
  },
}
