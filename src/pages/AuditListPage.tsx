import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { localRepository } from '../api/localRepository'
import { useAuthStore } from '../store/authStore'
import type { Area, Audit } from '../types/domain'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ScorePill } from '../components/ui/ScorePill'
import { formatShortDate } from '../lib/format'
import { Plus } from 'lucide-react'

export function AuditListPage() {
  const session = useAuthStore((s) => s.session)!
  const [audits, setAudits] = useState<Audit[]>([])
  const [areas, setAreas] = useState<Area[]>([])

  useEffect(() => {
    ;(async () => {
      setAudits(await localRepository.listAudits(session.plantId))
      setAreas(await localRepository.listAreas(session.plantId))
    })()
  }, [session.plantId])

  const areaName = (id: string) => areas.find((a) => a.id === id)?.name ?? id

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Audits</h2>
        <Link to="/app/audits/run" className="btn-primary">
          <Plus className="h-5 w-5" /> Start
        </Link>
      </div>

      <div className="space-y-3">
        {audits.length === 0 && (
          <p className="card p-6 text-center text-slate-400">No audits yet. Run your first zone score.</p>
        )}
        {audits.map((a) => (
          <article key={a.id} className="card flex items-center justify-between gap-3 p-4">
            <div>
              <div className="font-semibold text-white">{areaName(a.areaId)}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <StatusBadge value={a.status} />
                <span className="text-xs text-slate-500">{formatShortDate(a.startedAt)}</span>
              </div>
            </div>
            <ScorePill pct={a.scorePct} />
          </article>
        ))}
      </div>
    </div>
  )
}
