import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Camera, Tag, X } from 'lucide-react'
import { localRepository } from '../api/localRepository'
import { useAuthStore } from '../store/authStore'
import { usePhotoCapture } from '../hooks/usePhotoCapture'
import type { RedTag, RedTagCategory } from '../types/domain'

type Props = {
  areaId: string
  zoneId?: string
  /** Pre-fill reason from current audit step */
  defaultReason?: string
  pillarLabel?: string
  onClose: () => void
  onCreated: (tag: RedTag) => void
}

const CATEGORIES: { id: RedTagCategory; label: string; hint: string; cls: string }[] = [
  { id: 'discard', label: 'Discard', hint: 'Scrap / remove', cls: 'bg-red-800 border-red-500' },
  {
    id: 'relocate',
    label: 'Relocate',
    hint: 'Move to correct home',
    cls: 'bg-amber-700 border-amber-400 text-slate-950',
  },
  {
    id: 'unsure',
    label: 'Unsure',
    hint: 'Needs supervisor',
    cls: 'bg-lime-800 border-lime-500',
  },
]

/** Mid-audit flag: create a red tag without leaving the guided walk. */
export function FlagRedTagSheet({
  areaId,
  zoneId,
  defaultReason = '',
  pillarLabel,
  onClose,
  onCreated,
}: Props) {
  const session = useAuthStore((s) => s.session)!
  const photo = usePhotoCapture()
  const [category, setCategory] = useState<RedTagCategory | null>(null)
  const [reason, setReason] = useState(defaultReason)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!category || reason.trim().length < 2) {
      setError('Pick a category and describe the issue.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const tag = await localRepository.createRedTag({
        session,
        areaId,
        zoneId,
        category,
        reason: reason.trim(),
        locationNote: pillarLabel ? `During audit · ${pillarLabel}` : 'During guided audit',
        photoDataUrl: photo.dataUrl ?? undefined,
        submit: true,
      })
      onCreated(tag)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save tag')
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="tutorial-overlay" style={{ zIndex: 100000 }} role="dialog" aria-modal="true">
      <button type="button" className="tutorial-scrim" aria-label="Close" onClick={onClose} />
      <div className="tutorial-shell" style={{ maxHeight: 'min(92dvh, 40rem)' }}>
        <header className="tutorial-header">
          <div>
            <p className="tutorial-kicker">Flag issue</p>
            <p className="tutorial-progress-label">Creates a red tag for this area</p>
          </div>
          <button type="button" className="tutorial-icon-btn" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="tutorial-body space-y-3">
          <input
            ref={photo.inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={photo.onFileChange}
          />

          <p className="text-sm text-slate-400">
            See something that does not belong or has no home? Tag it now — keep walking the audit
            after.
          </p>

          <div className="flex flex-col gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`card-cta w-full flex-col items-start border-2 px-4 py-3 text-left ${c.cls} ${
                  category === c.id ? 'ring-2 ring-white' : ''
                }`}
                onClick={() => setCategory(c.id)}
              >
                <span className="text-lg font-bold">{c.label}</span>
                <span className="text-sm opacity-90">{c.hint}</span>
              </button>
            ))}
          </div>

          <textarea
            className="input-field min-h-[5rem]"
            placeholder="What did you find?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          {photo.dataUrl ? (
            <div className="space-y-2">
              <img src={photo.dataUrl} alt="" className="h-36 w-full rounded-xl object-cover" />
              <button type="button" className="btn-secondary w-full" onClick={photo.clear}>
                Retake photo
              </button>
            </div>
          ) : (
            <button type="button" className="btn-secondary w-full" onClick={photo.open}>
              <Camera className="h-5 w-5" /> Photo (recommended)
            </button>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <footer className="tutorial-footer">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary flex-1" disabled={busy} onClick={submit}>
            <Tag className="h-5 w-5" />
            {busy ? 'Saving…' : 'Save red tag'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
