import { Outlet, useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { BottomNav } from './BottomNav'
import { TutorialHelpButton } from '../TutorialModal'
import { ROLE_LABELS } from '../../types/domain'

export function AppShell() {
  const session = useAuthStore((s) => s.session)
  const setSession = useAuthStore((s) => s.setSession)
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex h-dvh max-h-dvh min-h-0 w-full max-w-lg flex-col overflow-hidden bg-slate-950">
      <header
        className="z-20 shrink-0 border-b border-slate-800 bg-slate-950/95 px-4 pb-3 backdrop-blur"
        style={{ paddingTop: 'calc(0.75rem + var(--safe-top))' }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-widest text-sky-400">
              ChantzMedia · PlantForge
            </div>
            <h1 className="text-xl font-bold text-white">5S Anchor</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <TutorialHelpButton />
            <button
              type="button"
              className="help-btn tap-target inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 text-sky-300"
              onClick={() => navigate('/app/settings')}
              aria-label="Settings"
              title="Settings"
            >
              <Settings className="h-5 w-5" strokeWidth={2.25} />
            </button>
            {session && (
              <button
                type="button"
                className="chip text-left"
                onClick={() => {
                  setSession(null)
                  navigate('/')
                }}
                title="Switch role"
              >
                <span className="block text-[10px] uppercase text-slate-400">Role</span>
                <span className="text-sm font-semibold">{ROLE_LABELS[session.role]}</span>
              </button>
            )}
          </div>
        </div>
        {session && (
          <p className="mt-1 truncate text-sm text-slate-400">{session.displayName}</p>
        )}
      </header>

      <main
        id="app-scroll"
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 py-4"
        style={{ paddingBottom: 'calc(var(--nav-h) + var(--safe-bottom) + 1rem)' }}
      >
        <Outlet />
      </main>

      {session && <BottomNav />}
    </div>
  )
}
