import { useEffect, useState } from 'react'
import { localRepository } from '../api/localRepository'
import { useAuthStore } from '../store/authStore'
import type { Area, VisualStandard } from '../types/domain'
import { PILLAR_LABELS, type Pillar } from '../types/domain'

export function StandardsPage() {
  const session = useAuthStore((s) => s.session)!
  const [standards, setStandards] = useState<VisualStandard[]>([])
  const [areas, setAreas] = useState<Area[]>([])

  useEffect(() => {
    ;(async () => {
      setStandards(await localRepository.listStandards())
      setAreas(await localRepository.listAreas(session.plantId))
    })()
  }, [session.plantId])

  const areaName = (id: string) => areas.find((a) => a.id === id)?.name ?? id

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Visual standards</h2>
      <p className="text-sm text-slate-400">
        Ideal-state references for audits. Photo upload to library ships in week-2 slice;
        seed entries available now.
      </p>
      <div className="space-y-3">
        {standards.map((s) => (
          <article key={s.id} className="card p-4">
            <div className="text-xs font-bold uppercase text-sky-400">
              {s.pillar ? PILLAR_LABELS[s.pillar as Pillar] : 'General'} · {areaName(s.areaId)}
            </div>
            <h3 className="mt-1 text-lg font-semibold text-white">{s.title}</h3>
            {s.description && <p className="mt-1 text-sm text-slate-400">{s.description}</p>}
            <div className="mt-3 flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950 text-sm text-slate-600">
              Ideal photo placeholder
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
