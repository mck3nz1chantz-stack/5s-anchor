import { useEffect, useState } from 'react'
import { localRepository } from '../api/localRepository'
import { useAuthStore } from '../store/authStore'
import type { Area, CorrectiveAction } from '../types/domain'
import { StatusBadge } from '../components/ui/StatusBadge'
import { formatShortDate } from '../lib/format'
import { usePhotoCapture } from '../hooks/usePhotoCapture'
import { Camera, Check } from 'lucide-react'

export function ActionsPage() {
  const session = useAuthStore((s) => s.session)!
  const [actions, setActions] = useState<CorrectiveAction[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [closingId, setClosingId] = useState<string | null>(null)
  const photo = usePhotoCapture()

  const reload = async () => {
    setActions(await localRepository.listActions(session.plantId))
    setAreas(await localRepository.listAreas(session.plantId))
  }

  useEffect(() => {
    reload()
  }, [session.plantId])

  const areaName = (id: string) => areas.find((a) => a.id === id)?.name ?? id

  const closeWithProof = async (actionId: string) => {
    let proofPhotoId: string | undefined
    if (photo.dataUrl) {
      const p = await localRepository.savePhoto({
        plantId: session.plantId,
        kind: 'action_proof',
        dataUrl: photo.dataUrl,
        capturedBy: session.userId,
      })
      proofPhotoId = p.id
    }
    await localRepository.updateAction(session, actionId, {
      status: 'done',
      proofPhotoId,
    })
    photo.clear()
    setClosingId(null)
    reload()
  }

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
      <h2 className="text-xl font-bold text-white">Corrective actions</h2>
      <p className="text-sm text-slate-400">Linked from audit findings · close with photo proof</p>

      <div className="space-y-3">
        {actions.length === 0 && (
          <p className="card p-6 text-center text-slate-400">
            No actions yet. Low audit scores with findings create actions automatically.
          </p>
        )}
        {actions.map((a) => (
          <article key={a.id} className="card space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={a.status} />
              <span className="text-xs text-slate-500">{areaName(a.areaId)}</span>
            </div>
            <h3 className="font-semibold text-white">{a.title}</h3>
            {a.description && <p className="text-sm text-slate-400">{a.description}</p>}
            <p className="text-xs text-slate-500">
              Due {formatShortDate(a.dueAt)} · Created {formatShortDate(a.createdAt)}
            </p>

            {a.status !== 'done' && a.status !== 'void' && (
              <div className="flex flex-wrap gap-2 pt-1">
                {closingId === a.id ? (
                  <>
                    <button type="button" className="btn-secondary" onClick={photo.open}>
                      <Camera className="h-4 w-4" /> Proof photo
                    </button>
                    {photo.dataUrl && (
                      <img src={photo.dataUrl} alt="" className="h-20 w-full rounded object-cover" />
                    )}
                    <button
                      type="button"
                      className="btn-primary flex-1"
                      onClick={() => closeWithProof(a.id)}
                    >
                      <Check className="h-4 w-4" /> Mark done
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setClosingId(null)
                        photo.clear()
                      }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn-secondary text-sm"
                      onClick={async () => {
                        await localRepository.updateAction(session, a.id, {
                          status: 'in_progress',
                        })
                        reload()
                      }}
                    >
                      Start
                    </button>
                    <button
                      type="button"
                      className="btn-primary text-sm"
                      onClick={() => setClosingId(a.id)}
                    >
                      Close with proof
                    </button>
                  </>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
