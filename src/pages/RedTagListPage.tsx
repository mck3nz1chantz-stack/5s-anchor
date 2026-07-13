import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { localRepository } from '../api/localRepository'
import { useAuthStore } from '../store/authStore'
import type { Area, RedTag } from '../types/domain'
import { StatusBadge } from '../components/ui/StatusBadge'
import { formatShortDate } from '../lib/format'

export function RedTagListPage() {
  const session = useAuthStore((s) => s.session)!
  const [tags, setTags] = useState<RedTag[]>([])
  const [areas, setAreas] = useState<Area[]>([])

  const reload = async () => {
    setTags(await localRepository.listRedTags(session.plantId))
    setAreas(await localRepository.listAreas(session.plantId))
  }

  useEffect(() => {
    reload()
  }, [session.plantId])

  const areaName = (id: string) => areas.find((a) => a.id === id)?.name ?? id

  const canDisposition = ['supervisor', 'manager', 'admin'].includes(session.role)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-white">Red Tags</h2>
        <Link to="/app/tags/new" className="btn-primary">
          <Plus className="h-5 w-5" /> New
        </Link>
      </div>

      <div className="space-y-3">
        {tags.length === 0 && (
          <p className="card p-6 text-center text-slate-400">
            No tags yet. Create one for Sort / red-tag workflow.
          </p>
        )}
        {tags.map((t) => (
          <article key={t.id} className="card space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={t.color} label={t.color} />
              <StatusBadge value={t.status} />
              <span className="ml-auto font-mono text-sm text-slate-300">{t.tagNumber}</span>
            </div>
            <p className="text-base font-medium text-white">{t.reason}</p>
            <p className="text-sm text-slate-400">
              {areaName(t.areaId)} · {t.category} · {formatShortDate(t.createdAt)}
            </p>
            {canDisposition && t.status === 'open' && (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={async () => {
                    await localRepository.transitionRedTag(
                      session,
                      t.id,
                      'dispositioned',
                      'Supervisor disposition',
                      'Handled on floor',
                    )
                    reload()
                  }}
                >
                  Disposition
                </button>
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={async () => {
                    await localRepository.transitionRedTag(session, t.id, 'closed', 'Closed')
                    reload()
                  }}
                >
                  Close
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
