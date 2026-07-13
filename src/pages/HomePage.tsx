import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ClipboardCheck, Tag, ListTodo, Image, Bell, ArrowRight } from 'lucide-react'
import { localRepository } from '../api/localRepository'
import { useAuthStore } from '../store/authStore'
import type { Area, DashboardData, Schedule } from '../types/domain'
import { formatShortDate } from '../lib/format'

export function HomePage() {
  const session = useAuthStore((s) => s.session)!
  const navigate = useNavigate()
  const [dash, setDash] = useState<DashboardData | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [areaCode, setAreaCode] = useState('ASM55')
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [looking, setLooking] = useState(false)

  useEffect(() => {
    ;(async () => {
      setDash(await localRepository.getDashboard(session.plantId))
      setSchedules(await localRepository.listSchedules(session.plantId))
      setAreas(await localRepository.listAreas(session.plantId))
    })()
  }, [session.plantId])

  const startGuided = async (code?: string) => {
    const raw = (code ?? areaCode).trim()
    if (!raw) {
      setLookupError('Enter an area code (e.g. ASM55).')
      return
    }
    setLooking(true)
    setLookupError(null)
    try {
      const area = await localRepository.findAreaByCode(session.plantId, raw)
      if (!area) {
        setLookupError(`No area found for “${raw.toUpperCase()}”. Try a demo code below.`)
        return
      }
      navigate(`/app/audits/run?area=${encodeURIComponent(area.code)}&guided=1`)
    } finally {
      setLooking(false)
    }
  }

  const secondary = [
    {
      to: '/app/tags/new',
      title: 'New Red Tag',
      desc: 'Flag outside a full audit',
      icon: Tag,
      color: 'border-red-700/60 bg-red-950/40',
    },
    {
      to: '/app/actions',
      title: 'Corrective Actions',
      desc: 'Close the loop with proof',
      icon: ListTodo,
      color: 'border-amber-700/60 bg-amber-950/30',
    },
    {
      to: '/app/standards',
      title: 'Visual Standards',
      desc: 'Ideal-state library',
      icon: Image,
      color: 'border-slate-600 bg-slate-900',
    },
  ]

  return (
    <div className="space-y-5">
      <section className="card space-y-4 border-sky-800/50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-950 ring-2 ring-sky-600">
            <ClipboardCheck className="h-6 w-6 text-sky-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Guided area audit</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              Enter an area code. We walk you through what to look for — no 5S expertise required.
              Flag red tags anytime during the walk.
            </p>
          </div>
        </div>

        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Area code
        </label>
        <input
          className="input-field font-mono text-lg uppercase tracking-wide"
          value={areaCode}
          onChange={(e) => setAreaCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') startGuided()
          }}
          placeholder="ASM55"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
        />

        <button
          type="button"
          className="btn-primary w-full py-4 text-lg"
          disabled={looking}
          onClick={() => startGuided()}
        >
          {looking ? 'Looking up…' : 'Start guided audit'}
          <ArrowRight className="h-5 w-5" />
        </button>

        {lookupError && <p className="text-sm text-red-400">{lookupError}</p>}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Demo areas — tap to start
          </p>
          <div className="flex flex-wrap gap-2">
            {areas.slice(0, 6).map((a) => (
              <button
                key={a.id}
                type="button"
                className="chip font-mono"
                onClick={() => {
                  setAreaCode(a.code)
                  startGuided(a.code)
                }}
              >
                {a.code}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="text-lg font-bold text-white">My work</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="Open tags" value={dash?.openRedTags ?? '—'} />
          <Stat label="Open CA" value={dash?.openActions ?? '—'} />
          <Stat label="Overdue" value={dash?.overdueActions ?? '—'} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3">
        {secondary.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className={`card-cta min-h-[4.25rem] items-center gap-4 border px-4 py-3 ${a.color}`}
          >
            <a.icon className="h-7 w-7 shrink-0 text-sky-300" />
            <div>
              <div className="text-base font-semibold text-white">{a.title}</div>
              <div className="text-sm text-slate-400">{a.desc}</div>
            </div>
          </Link>
        ))}
      </section>

      <section>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <Bell className="h-4 w-4" /> Schedules
        </div>
        <div className="space-y-2">
          {schedules.map((s) => (
            <div key={s.id} className="card flex items-start justify-between gap-2 px-3 py-3">
              <div>
                <div className="font-medium text-slate-100">{s.title}</div>
                <div className="text-xs uppercase text-slate-500">{s.kind.replace('_', ' ')}</div>
              </div>
              <div className="text-right text-xs text-amber-300">
                Due {formatShortDate(s.nextDueAt)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-slate-950/80 py-3">
      <div className="text-2xl font-bold tabular-nums text-white">{value}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  )
}
