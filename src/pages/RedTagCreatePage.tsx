import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Check } from 'lucide-react'
import { localRepository } from '../api/localRepository'
import { useAuthStore } from '../store/authStore'
import { usePhotoCapture } from '../hooks/usePhotoCapture'
import type { Area, RedTagCategory, Zone } from '../types/domain'

const STEPS = ['Area', 'Photo', 'Category', 'Reason', 'Review'] as const

const QUICK_REASONS = [
  'Unused / obsolete',
  'Wrong location',
  'Broken / scrap',
  'Unknown owner',
  'Blocks aisle',
]

export function RedTagCreatePage() {
  const session = useAuthStore((s) => s.session)!
  const navigate = useNavigate()
  const photo = usePhotoCapture()

  const [step, setStep] = useState(0)
  const [areas, setAreas] = useState<Area[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [areaId, setAreaId] = useState('')
  const [zoneId, setZoneId] = useState<string | undefined>()
  const [category, setCategory] = useState<RedTagCategory | null>(null)
  const [reason, setReason] = useState('')
  const [locationNote, setLocationNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    localRepository.listAreas(session.plantId).then(setAreas)
  }, [session.plantId])

  useEffect(() => {
    if (!areaId) {
      setZones([])
      setZoneId(undefined)
      return
    }
    localRepository.listZones(areaId).then(setZones)
  }, [areaId])

  const canNext = () => {
    if (step === 0) return !!areaId
    if (step === 1) return true // photo optional but recommended
    if (step === 2) return !!category
    if (step === 3) return reason.trim().length >= 3
    return true
  }

  const submit = async () => {
    if (!category || !areaId) return
    setSubmitting(true)
    setError(null)
    try {
      const tag = await localRepository.createRedTag({
        session,
        areaId,
        zoneId,
        category,
        reason: reason.trim(),
        locationNote: locationNote.trim() || undefined,
        photoDataUrl: photo.dataUrl ?? undefined,
        submit: true,
      })
      navigate('/app/tags', { state: { created: tag.tagNumber } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSubmitting(false)
    }
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">New Red Tag</h2>
        <span className="text-sm text-slate-400">
          Step {step + 1}/{STEPS.length}
        </span>
      </div>

      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-sky-500' : 'bg-slate-800'}`}
            title={s}
          />
        ))}
      </div>

      {step === 0 && (
        <section className="space-y-3">
          <p className="text-sm text-slate-400">Where is the item?</p>
          <div className="flex flex-col gap-2">
            {areas.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`chip w-full justify-start px-4 py-4 text-left text-base ${
                  areaId === a.id ? 'chip-active' : ''
                }`}
                onClick={() => setAreaId(a.id)}
              >
                <span className="font-semibold">{a.name}</span>
                <span className="ml-2 text-slate-500">{a.code}</span>
              </button>
            ))}
          </div>
          {zones.length > 0 && (
            <>
              <p className="pt-2 text-sm text-slate-400">Zone (optional)</p>
              <div className="flex flex-wrap gap-2">
                {zones.map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    className={`chip ${zoneId === z.id ? 'chip-active' : ''}`}
                    onClick={() => setZoneId(z.id === zoneId ? undefined : z.id)}
                  >
                    {z.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {step === 1 && (
        <section className="space-y-3">
          <p className="text-sm text-slate-400">Capture the item (recommended)</p>
          {photo.dataUrl ? (
            <div className="space-y-3">
              <img
                src={photo.dataUrl}
                alt="Tag preview"
                className="max-h-72 w-full rounded-xl object-cover"
              />
              <button type="button" className="btn-secondary w-full" onClick={photo.clear}>
                Retake
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn-primary w-full py-8 text-lg"
              onClick={photo.open}
              disabled={photo.busy}
            >
              <Camera className="h-7 w-7" />
              {photo.busy ? 'Processing…' : 'Take photo'}
            </button>
          )}
          <button type="button" className="btn-secondary w-full" onClick={() => setStep(2)}>
            Skip photo
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-3">
          <p className="text-sm text-slate-400">Category</p>
          {(
            [
              { id: 'discard', label: 'Discard', desc: 'Scrap / remove', color: 'bg-red-800 border-red-500' },
              {
                id: 'relocate',
                label: 'Relocate',
                desc: 'Move to correct home',
                color: 'bg-amber-700 border-amber-400 text-slate-950',
              },
              {
                id: 'unsure',
                label: 'Unsure',
                desc: 'Needs supervisor review',
                color: 'bg-lime-800 border-lime-500',
              },
            ] as const
          ).map((c) => (
            <button
              key={c.id}
              type="button"
              className={`card-cta w-full flex-col items-start rounded-xl border-2 px-4 py-5 text-left ${c.color} ${
                category === c.id ? 'ring-2 ring-white' : ''
              }`}
              onClick={() => setCategory(c.id)}
            >
              <div className="text-xl font-bold">{c.label}</div>
              <div className="text-sm opacity-90">{c.desc}</div>
            </button>
          ))}
        </section>
      )}

      {step === 3 && (
        <section className="space-y-3">
          <p className="text-sm text-slate-400">Reason</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_REASONS.map((r) => (
              <button key={r} type="button" className="chip" onClick={() => setReason(r)}>
                {r}
              </button>
            ))}
          </div>
          <textarea
            className="input-field min-h-[6rem]"
            placeholder="Describe the item / situation"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <input
            className="input-field"
            placeholder="Location note (optional)"
            value={locationNote}
            onChange={(e) => setLocationNote(e.target.value)}
          />
        </section>
      )}

      {step === 4 && (
        <section className="card space-y-3 p-4">
          <h3 className="font-semibold text-white">Review</h3>
          {photo.dataUrl && (
            <img src={photo.dataUrl} alt="" className="h-40 w-full rounded-lg object-cover" />
          )}
          <dl className="space-y-2 text-sm">
            <Row label="Area" value={areas.find((a) => a.id === areaId)?.name ?? '—'} />
            <Row label="Zone" value={zones.find((z) => z.id === zoneId)?.name ?? '—'} />
            <Row label="Category" value={category ?? '—'} />
            <Row label="Reason" value={reason} />
            <Row label="Location" value={locationNote || '—'} />
          </dl>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </section>
      )}

      <div className="flex gap-2 pt-2">
        {step > 0 && (
          <button type="button" className="btn-secondary flex-1" onClick={() => setStep((s) => s - 1)}>
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={!canNext()}
            onClick={() => setStep((s) => s + 1)}
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={submitting || !canNext()}
            onClick={submit}
          >
            <Check className="h-5 w-5" />
            {submitting ? 'Saving…' : 'Submit tag'}
          </button>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-800 pb-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-100">{value}</dd>
    </div>
  )
}
