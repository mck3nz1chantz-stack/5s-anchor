import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Tag,
  Lightbulb,
  Eye,
} from 'lucide-react'
import { localRepository } from '../api/localRepository'
import { useAuthStore } from '../store/authStore'
import { usePhotoCapture } from '../hooks/usePhotoCapture'
import { computeAuditTotals, shouldSuggestAction } from '../lib/scoring'
import { forceScrollToTopAfterPaint } from '../lib/scrollToTop'
import { FlagRedTagSheet } from '../components/FlagRedTagSheet'
import type {
  Area,
  AuditItemScore,
  ChecklistItem,
  ChecklistTemplate,
  Pillar,
  VisualStandard,
  Zone,
} from '../types/domain'
import { PILLAR_LABELS } from '../types/domain'

/** Simple maturity buttons — operators don’t need raw 0–20 math */
const SCORE_PRESETS = [
  { label: 'Excellent', score: 20, hint: 'Ideal state' },
  { label: 'Good', score: 15, hint: 'Minor gaps' },
  { label: 'Needs work', score: 10, hint: 'Clear issues' },
  { label: 'Poor', score: 5, hint: 'Major clutter / risk' },
] as const

type Phase = 'boot' | 'intro' | 'run' | 'done'

export function AuditRunPage() {
  const session = useAuthStore((s) => s.session)!
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const photo = usePhotoCapture()

  const codeParam = (params.get('area') || params.get('code') || '').toUpperCase()
  const wantGuided = params.get('guided') !== '0'

  const [phase, setPhase] = useState<Phase>('boot')
  const [area, setArea] = useState<Area | null>(null)
  const [zones, setZones] = useState<Zone[]>([])
  const [zoneId, setZoneId] = useState<string | undefined>()
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
  const [templateId, setTemplateId] = useState('')
  const [includeSafety, setIncludeSafety] = useState(false)
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [itemIndex, setItemIndex] = useState(0)
  const [scores, setScores] = useState<Record<string, AuditItemScore>>({})
  const [standards, setStandards] = useState<VisualStandard[]>([])
  const [showStandards, setShowStandards] = useState(false)
  const [showFlag, setShowFlag] = useState(false)
  const [flagsThisAudit, setFlagsThisAudit] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resultPct, setResultPct] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bootError, setBootError] = useState<string | null>(null)
  const stepTopRef = useRef<HTMLDivElement>(null)

  /** New step → hard scroll so content starts at the pillar title, not the Next button */
  useEffect(() => {
    if (phase !== 'run') return
    forceScrollToTopAfterPaint(stepTopRef.current)
  }, [itemIndex, phase])

  const goToStep = (next: number) => {
    setItemIndex(next)
    // Immediate attempt (before paint) + after-paint passes in the effect
    forceScrollToTopAfterPaint(stepTopRef.current)
  }

  // Resolve area from query or fall back to picker list
  useEffect(() => {
    ;(async () => {
      const tpls = await localRepository.listTemplates(session.plantId)
      setTemplates(tpls)
      const guided =
        tpls.find((t) => t.name.toLowerCase().includes('guided') && !t.includeSafety) ??
        tpls.find((t) => !t.includeSafety) ??
        tpls[0]
      const guided6 =
        tpls.find((t) => t.includeSafety) ?? guided
      setTemplateId(includeSafety ? guided6?.id ?? '' : guided?.id ?? '')

      if (codeParam) {
        const found = await localRepository.findAreaByCode(session.plantId, codeParam)
        if (!found) {
          setBootError(`Area “${codeParam}” not found. Go Home and enter a valid code.`)
          setPhase('intro')
          return
        }
        setArea(found)
        const zs = await localRepository.listZones(found.id)
        setZones(zs)
        setZoneId(zs[0]?.id)
        setStandards(await localRepository.listStandards(found.id))
        setPhase(wantGuided ? 'intro' : 'intro')
      } else {
        setPhase('intro')
      }
    })()
  }, [session.plantId, codeParam, wantGuided])

  useEffect(() => {
    if (!templates.length) return
    const pick = includeSafety
      ? templates.find((t) => t.includeSafety) ?? templates[0]
      : templates.find((t) => !t.includeSafety) ?? templates[0]
    if (pick) setTemplateId(pick.id)
  }, [includeSafety, templates])

  useEffect(() => {
    if (!templateId) return
    localRepository.listChecklistItems(templateId).then((list) => {
      setItems(list)
      const init: Record<string, AuditItemScore> = {}
      for (const it of list) {
        init[it.id] = {
          checklistItemId: it.id,
          pillar: it.pillar,
          score: 15,
          maxPoints: it.maxPoints,
          createAction: false,
        }
      }
      setScores(init)
      setItemIndex(0)
    })
  }, [templateId])

  const current = items[itemIndex]
  const currentScore = current ? scores[current.id] : undefined

  const liveTotals = useMemo(() => {
    const list = Object.values(scores)
    if (!list.length) return { scorePct: 0, overallScore: 0, maxScore: 0 }
    return computeAuditTotals(list)
  }, [scores])

  const patchCurrent = (patch: Partial<AuditItemScore>) => {
    if (!current) return
    setScores((prev) => ({
      ...prev,
      [current.id]: { ...prev[current.id], ...patch },
    }))
  }

  const attachPhoto = async () => {
    if (!photo.dataUrl || !current) return
    const p = await localRepository.savePhoto({
      plantId: session.plantId,
      kind: 'audit_item',
      dataUrl: photo.dataUrl,
      capturedBy: session.userId,
    })
    patchCurrent({ photoBeforeId: p.id })
    photo.clear()
  }

  const startWalk = () => {
    if (!area || !templateId) {
      setError('Select an area to continue.')
      return
    }
    setPhase('run')
  }

  const submit = async () => {
    if (!area) return
    setSubmitting(true)
    setError(null)
    try {
      const itemList = items.map((it) => {
        const s = scores[it.id]
        const suggest = shouldSuggestAction(s.score, s.maxPoints)
        return {
          ...s,
          createAction: s.createAction || (suggest && !!s.finding),
        }
      })
      const noteParts = [
        notes.trim(),
        flagsThisAudit.length
          ? `Red tags during walk: ${flagsThisAudit.join(', ')}`
          : '',
      ].filter(Boolean)
      const audit = await localRepository.submitAudit({
        session,
        areaId: area.id,
        zoneId,
        templateId,
        items: itemList,
        notes: noteParts.join('\n') || undefined,
        status: 'submitted',
      })
      setResultPct(audit.scorePct)
      setPhase('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (phase === 'boot') {
    return <p className="text-slate-400">Loading guided audit…</p>
  }

  if (phase === 'done') {
    return (
      <div className="space-y-4 text-center">
        <h2 className="text-2xl font-bold text-white">Walk complete</h2>
        <p className="text-5xl font-bold tabular-nums text-sky-400">{resultPct}%</p>
        <p className="text-slate-400">
          {area?.code} · {area?.name}
          {flagsThisAudit.length > 0 && (
            <>
              <br />
              {flagsThisAudit.length} red tag{flagsThisAudit.length === 1 ? '' : 's'} flagged
            </>
          )}
        </p>
        <button type="button" className="btn-primary w-full" onClick={() => navigate('/app/dashboard')}>
          View dashboard
        </button>
        <button type="button" className="btn-secondary w-full" onClick={() => navigate('/app')}>
          Home
        </button>
      </div>
    )
  }

  if (phase === 'intro') {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Guided audit</h2>
        <p className="text-sm leading-relaxed text-slate-400">
          We coach you step by step (Sort → Set → Shine → Standardize → Sustain
          {includeSafety ? ' → Safety' : ''}). At any step, tap{' '}
          <strong className="text-red-300">Flag issue</strong> to create a red tag without leaving
          the walk.
        </p>

        {bootError && <p className="text-sm text-red-400">{bootError}</p>}

        {!area && (
          <AreaCodeEntry
            plantId={session.plantId}
            onFound={(a, zs) => {
              setArea(a)
              setZones(zs)
              setZoneId(zs[0]?.id)
              localRepository.listStandards(a.id).then(setStandards)
              setBootError(null)
            }}
          />
        )}

        {area && (
          <div className="card space-y-2 border-sky-800/40 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-sky-400">Area</div>
            <div className="text-2xl font-bold font-mono text-white">{area.code}</div>
            <div className="text-slate-300">{area.name}</div>
            {zones.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {zones.map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    className={`chip ${zoneId === z.id ? 'chip-active' : ''}`}
                    onClick={() => setZoneId(z.id)}
                  >
                    {z.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={includeSafety}
            onChange={(e) => setIncludeSafety(e.target.checked)}
          />
          Include Safety pillar (6S)
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="button"
          className="btn-primary w-full py-4 text-lg"
          disabled={!area || !templateId}
          onClick={startWalk}
        >
          Begin walkthrough
          <ChevronRight className="h-5 w-5" />
        </button>
        <button type="button" className="btn-secondary w-full" onClick={() => navigate('/app')}>
          Back to home
        </button>
      </div>
    )
  }

  // —— run: one teaching step at a time ——
  return (
    <div className="space-y-4">
      <input
        ref={photo.inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={photo.onFileChange}
      />

      <header
        ref={stepTopRef}
        id={`audit-step-${itemIndex}`}
        tabIndex={-1}
        className="card space-y-2 p-3 outline-none"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-mono text-sm font-bold text-sky-400">
              {area?.code}
              {zoneId ? ` · ${zones.find((z) => z.id === zoneId)?.name ?? ''}` : ''}
            </div>
            <div className="text-xs text-slate-500">
              Step {itemIndex + 1} of {items.length}
              {flagsThisAudit.length > 0 && (
                <span className="ml-2 text-red-300">· {flagsThisAudit.length} flagged</span>
              )}
            </div>
          </div>
          <div className="text-lg font-bold tabular-nums text-sky-400">{liveTotals.scorePct}%</div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-sky-500 transition-all"
            style={{ width: `${((itemIndex + 1) / Math.max(items.length, 1)) * 100}%` }}
          />
        </div>
      </header>

      {current && currentScore && (
        <section className="card space-y-4 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-sky-400">
            {PILLAR_LABELS[current.pillar as Pillar]}
          </div>
          <h3 className="text-xl font-bold leading-snug text-white">{current.prompt}</h3>
          {current.guidance && (
            <p className="text-sm leading-relaxed text-slate-300">{current.guidance}</p>
          )}

          {current.lookFor && current.lookFor.length > 0 && (
            <div className="rounded-xl border border-slate-700 bg-slate-950/80 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-300">
                <Eye className="h-4 w-4" /> What to look for
              </div>
              <ul className="space-y-2">
                {current.lookFor.map((line) => (
                  <li key={line} className="flex gap-2 text-sm text-slate-200">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {current.whyItMatters && (
            <div className="flex gap-2 rounded-xl border border-sky-900/50 bg-sky-950/30 p-3 text-sm text-sky-100">
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" />
              <span>{current.whyItMatters}</span>
            </div>
          )}

          <button
            type="button"
            className="btn-danger w-full py-3"
            onClick={() => setShowFlag(true)}
          >
            <Tag className="h-5 w-5" /> Flag issue (red tag)
          </button>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              How does this step look?
            </p>
            {current.howToScore && (
              <p className="mb-2 text-xs text-slate-500">{current.howToScore}</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {SCORE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className={`rounded-xl border px-3 py-3 text-left transition-transform active:scale-[0.98] ${
                    currentScore.score === p.score
                      ? 'border-sky-400 bg-sky-950 ring-1 ring-sky-400'
                      : 'border-slate-600 bg-slate-900'
                  }`}
                  onClick={() =>
                    patchCurrent({
                      score: Math.min(p.score, currentScore.maxPoints),
                      createAction: p.score <= 10,
                    })
                  }
                >
                  <div className="font-bold text-white">{p.label}</div>
                  <div className="text-xs text-slate-400">{p.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <textarea
            className="input-field min-h-[4rem]"
            placeholder="Optional note / finding (auto action if Needs work or Poor)"
            value={currentScore.finding ?? ''}
            onChange={(e) => patchCurrent({ finding: e.target.value })}
          />

          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={photo.open}>
              <Camera className="h-5 w-5" /> Photo
            </button>
            <button
              type="button"
              className="btn-secondary flex-1"
              onClick={() => setShowStandards((v) => !v)}
            >
              <BookOpen className="h-5 w-5" /> Ideal
            </button>
          </div>
          {photo.dataUrl && (
            <div className="space-y-2">
              <img src={photo.dataUrl} alt="" className="h-32 w-full rounded-lg object-cover" />
              <button type="button" className="btn-primary w-full" onClick={attachPhoto}>
                Attach to this step
              </button>
            </div>
          )}
          {currentScore.photoBeforeId && (
            <p className="text-xs text-emerald-400">Photo attached ✓</p>
          )}

          {showStandards && (
            <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Visual standards</p>
              {standards.length === 0 && (
                <p className="text-sm text-slate-500">None for this area yet.</p>
              )}
              {standards.map((s) => (
                <div key={s.id} className="border-b border-slate-800 py-2 last:border-0">
                  <div className="font-medium text-slate-200">{s.title}</div>
                  {s.description && <div className="text-xs text-slate-500">{s.description}</div>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <textarea
        className="input-field min-h-[3rem] text-sm"
        placeholder="Walk notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          className="btn-secondary flex-1"
          disabled={itemIndex === 0}
          onClick={() => goToStep(Math.max(0, itemIndex - 1))}
        >
          <ChevronLeft className="h-5 w-5" /> Back
        </button>
        {itemIndex < items.length - 1 ? (
          <button
            type="button"
            className="btn-primary flex-1"
            onClick={() => goToStep(itemIndex + 1)}
          >
            Next step <ChevronRight className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={submitting}
            onClick={submit}
          >
            {submitting ? 'Saving…' : 'Complete audit'}
          </button>
        )}
      </div>

      {showFlag && area && (
        <FlagRedTagSheet
          areaId={area.id}
          zoneId={zoneId}
          pillarLabel={current ? PILLAR_LABELS[current.pillar] : undefined}
          defaultReason={currentScore?.finding || current?.prompt || ''}
          onClose={() => setShowFlag(false)}
          onCreated={(tag) => {
            setFlagsThisAudit((prev) => [...prev, tag.tagNumber])
            if (currentScore && currentScore.score > 10) {
              patchCurrent({ score: 10, createAction: true })
            }
          }}
        />
      )}
    </div>
  )
}

function AreaCodeEntry({
  plantId,
  onFound,
}: {
  plantId: string
  onFound: (area: Area, zones: Zone[]) => void
}) {
  const [code, setCode] = useState('ASM55')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const go = async () => {
    setBusy(true)
    setErr(null)
    try {
      const area = await localRepository.findAreaByCode(plantId, code)
      if (!area) {
        setErr('Area not found')
        return
      }
      const zones = await localRepository.listZones(area.id)
      onFound(area, zones)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <input
        className="input-field font-mono uppercase"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="ASM55"
      />
      <button type="button" className="btn-secondary w-full" disabled={busy} onClick={go}>
        Look up area
      </button>
      {err && <p className="text-sm text-red-400">{err}</p>}
    </div>
  )
}
