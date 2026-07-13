import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { localRepository } from '../api/localRepository'
import { ensureSeed } from '../db/seed'
import { useAuthStore } from '../store/authStore'
import type { AppUser } from '../types/domain'
import { ROLE_LABELS } from '../types/domain'
import { Anchor, HardHat } from 'lucide-react'
import { TutorialHelpButton } from '../components/TutorialModal'

export function RoleSelectPage() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [ready, setReady] = useState(false)
  const setSession = useAuthStore((s) => s.setSession)
  const session = useAuthStore((s) => s.session)
  const navigate = useNavigate()

  useEffect(() => {
    ;(async () => {
      await ensureSeed()
      const list = await localRepository.listUsers('plant-demo-001')
      setUsers(list)
      setReady(true)
    })()
  }, [])

  useEffect(() => {
    if (session) navigate('/app', { replace: true })
  }, [session, navigate])

  if (!ready) {
    return (
      <div className="flex min-h-full items-center justify-center p-6 text-slate-400">
        Loading plant data…
      </div>
    )
  }

  return (
    <div className="relative mx-auto flex h-dvh max-w-lg flex-col overflow-y-auto px-4 py-8">
      <div
        className="absolute right-4 z-10"
        style={{ top: 'calc(0.75rem + var(--safe-top))' }}
      >
        <TutorialHelpButton />
      </div>

      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-950 ring-2 ring-sky-600">
          <Anchor className="h-8 w-8 text-sky-400" />
        </div>
        <h1 className="text-3xl font-bold text-white">5S Anchor</h1>
        <p className="mt-2 text-slate-400">
          Shop-floor 5S / 6S guide. Offline-first demo plant ready.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Tap <span className="font-semibold text-sky-400">?</span> for a quick how-to.
        </p>
      </div>

      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Pick a role to start
      </p>
      <div className="flex flex-col gap-3">
        {users.map((u) => (
          <button
            key={u.id}
            type="button"
            className="card-cta min-h-[4.5rem] w-full items-center gap-4 px-4 py-3 text-left"
            onClick={() => {
              setSession({
                userId: u.id,
                plantId: u.plantId,
                role: u.role,
                displayName: u.displayName,
              })
              navigate('/app')
            }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800">
              <HardHat className="h-6 w-6 text-sky-400" />
            </div>
            <div>
              <div className="text-lg font-semibold text-white">{ROLE_LABELS[u.role]}</div>
              <div className="text-sm text-slate-400">{u.displayName}</div>
            </div>
          </button>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-slate-600">
        Demo data stays on this device (IndexedDB). No cloud required.
      </p>
    </div>
  )
}
