import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Download,
  Upload,
  Trash2,
  PackageOpen,
  Save,
  ShieldAlert,
  HardHat,
} from 'lucide-react'
import {
  clearAllData,
  downloadBackup,
  exportAllData,
  getDataMode,
  importAllData,
  loadDemoSeed,
  type AppBackup,
  type DataMode,
} from '../db/dataOps'
import { useAuthStore } from '../store/authStore'
import { ROLE_LABELS } from '../types/domain'

type ConfirmKind = 'clear' | 'seed' | 'import' | null

export function SettingsPage() {
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const setSession = useAuthStore((s) => s.setSession)
  const isAdmin = session?.role === 'admin'
  const fileRef = useRef<HTMLInputElement>(null)

  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmKind>(null)
  const [pendingImport, setPendingImport] = useState<AppBackup | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<DataMode | null>(null)

  useEffect(() => {
    if (!isAdmin) return
    getDataMode().then(setMode).catch(() => setMode(null))
  }, [message, isAdmin])

  const run = async (fn: () => Promise<void>, ok: string, leaveSession = false) => {
    if (!isAdmin) {
      setError('Admin role required for data management.')
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await fn()
      setMessage(ok)
      setConfirm(null)
      setPendingImport(null)
      if (leaveSession) {
        setSession(null)
        setTimeout(() => navigate('/', { replace: true }), 500)
      } else {
        setMode(await getDataMode())
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const onSave = async () => {
    if (!isAdmin) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const backup = await exportAllData()
      downloadBackup(backup)
      setMessage(
        `Saved to file (${backup.exportedAt.slice(0, 19).replace('T', ' ')} UTC). Keep that JSON somewhere safe.`,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setBusy(false)
    }
  }

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    setMessage(null)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as AppBackup
      if (parsed.schema !== 'FiveSAnchorBackup.v1') {
        throw new Error('Not a 5S Anchor save file.')
      }
      setPendingImport(parsed)
      setConfirm('import')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read save file')
    }
  }

  const modeLabel =
    mode === 'empty'
      ? 'Empty (ready for real data)'
      : mode === 'custom'
        ? 'Restored from a save file'
        : 'Demo seed loaded'

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">Settings</h2>
        {session && (
          <p className="mt-1 text-sm text-slate-400">
            Signed in as{' '}
            <span className="font-medium text-slate-200">{ROLE_LABELS[session.role]}</span>
            {' · '}
            {session.displayName}
          </p>
        )}
      </div>

      {!isAdmin && (
        <section className="card space-y-3 border-amber-900/50 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-400" />
            <div>
              <h3 className="font-semibold text-white">Data management is Admin-only</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                Save, clear, and load demo seed require the <strong className="text-slate-200">Admin</strong>{' '}
                role. Switch role from the header chip (demo: pick <strong className="text-sky-300">Admin</strong>
                ), then reopen Settings from the gear icon.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-primary w-full"
            onClick={() => {
              setSession(null)
              navigate('/')
            }}
          >
            <HardHat className="h-5 w-5" /> Switch to Admin role
          </button>
        </section>
      )}

      {isAdmin && (
        <>
          <p className="text-sm text-slate-400">
            Data mode:{' '}
            <span className="font-medium text-sky-300">{mode ? modeLabel : '…'}</span>
          </p>

          <section className="card space-y-3 border-sky-900/40 p-4">
            <div className="flex items-start gap-3">
              <Save className="mt-0.5 h-6 w-6 shrink-0 text-sky-400" />
              <div>
                <h3 className="font-semibold text-white">Save progress</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">
                  Download a JSON backup of everything on this device. Use before clearing, or when a
                  walkthrough went well and you want to keep it.
                </p>
              </div>
            </div>
            <button type="button" className="btn-primary w-full" disabled={busy} onClick={onSave}>
              <Download className="h-5 w-5" /> Save data to file
            </button>
            <button
              type="button"
              className="btn-secondary w-full"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-5 w-5" /> Restore from save file…
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={onPickFile}
            />
          </section>

          <section className="card space-y-3 border-red-900/40 p-4">
            <div className="flex items-start gap-3">
              <Trash2 className="mt-0.5 h-6 w-6 shrink-0 text-red-400" />
              <div>
                <h3 className="font-semibold text-white">Clear data</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">
                  Deletes all tags, audits, actions, photos, areas, and demo content. Leaves a bare
                  local plant and roles only. Does <strong>not</strong> load mock data.
                </p>
              </div>
            </div>
            {confirm !== 'clear' ? (
              <button
                type="button"
                className="btn-danger w-full"
                disabled={busy}
                onClick={() => setConfirm('clear')}
              >
                <Trash2 className="h-5 w-5" /> Clear all data
              </button>
            ) : (
              <ConfirmBar
                text="Delete everything on this device? This does not re-seed."
                busy={busy}
                onCancel={() => setConfirm(null)}
                onYes={() =>
                  run(
                    clearAllData,
                    'Cleared. Empty plant ready — load demo seed anytime, or work with real data.',
                    true,
                  )
                }
                yesLabel="Yes, clear"
              />
            )}
          </section>

          <section className="card space-y-3 border-amber-900/40 p-4">
            <div className="flex items-start gap-3">
              <PackageOpen className="mt-0.5 h-6 w-6 shrink-0 text-amber-400" />
              <div>
                <h3 className="font-semibold text-white">Load demo seed</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">
                  Loads the full mock plant (area{' '}
                  <span className="font-mono text-sky-300">ASM55</span>, guided checklists).{' '}
                  <strong>Replaces</strong> current data — save first if you care about progress.
                </p>
              </div>
            </div>
            {confirm !== 'seed' ? (
              <button
                type="button"
                className="btn-secondary w-full"
                disabled={busy}
                onClick={() => setConfirm('seed')}
              >
                <PackageOpen className="h-5 w-5" /> Load demo seed data
              </button>
            ) : (
              <ConfirmBar
                text="Replace current data with demo seed (ASM55)?"
                busy={busy}
                onCancel={() => setConfirm(null)}
                onYes={() =>
                  run(loadDemoSeed, 'Demo seed loaded. ASM55 guided audit is ready.', true)
                }
                yesLabel="Yes, load demo"
                danger={false}
              />
            )}
          </section>

          {confirm === 'import' && pendingImport && (
            <section className="card space-y-3 border-sky-700 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-400" />
                <div>
                  <h3 className="font-semibold text-white">Restore this save?</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Exported {pendingImport.exportedAt.slice(0, 19).replace('T', ' ')} — replaces all
                    current local data.
                  </p>
                </div>
              </div>
              <ConfirmBar
                text="Continue restore?"
                busy={busy}
                onCancel={() => {
                  setConfirm(null)
                  setPendingImport(null)
                }}
                onYes={() =>
                  run(
                    () => importAllData(pendingImport),
                    'Save restored. Re-pick a role to continue.',
                    true,
                  )
                }
                yesLabel="Restore"
                danger={false}
              />
            </section>
          )}

          {message && <p className="text-sm text-emerald-400">{message}</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}

          <section className="card space-y-2 p-4 text-sm text-slate-400">
            <h3 className="font-semibold text-slate-200">Admin tips</h3>
            <ul className="list-disc space-y-1 pl-4">
              <li>
                <strong className="text-slate-300">Save</strong> after a good walkthrough.
              </li>
              <li>
                <strong className="text-slate-300">Clear</strong> for empty / real-data mode.
              </li>
              <li>
                <strong className="text-slate-300">Load demo</strong> for ASM55 pitch demos.
              </li>
            </ul>
            <p className="font-mono text-xs text-slate-500">5S Anchor · local IndexedDB only</p>
          </section>
        </>
      )}
    </div>
  )
}

function ConfirmBar({
  text,
  busy,
  onCancel,
  onYes,
  yesLabel,
  danger = true,
}: {
  text: string
  busy: boolean
  onCancel: () => void
  onYes: () => void
  yesLabel: string
  danger?: boolean
}) {
  return (
    <div
      className={`space-y-2 rounded-xl border p-3 ${
        danger ? 'border-red-800 bg-red-950/40' : 'border-slate-600 bg-slate-950/60'
      }`}
    >
      <p className={`text-sm font-medium ${danger ? 'text-red-100' : 'text-slate-100'}`}>{text}</p>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary flex-1" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className={`${danger ? 'btn-danger' : 'btn-primary'} flex-1`}
          disabled={busy}
          onClick={onYes}
        >
          {busy ? 'Working…' : yesLabel}
        </button>
      </div>
    </div>
  )
}
