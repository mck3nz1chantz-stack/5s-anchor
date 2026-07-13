import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  CircleHelp,
  Tag,
  ClipboardCheck,
  ListTodo,
  LayoutDashboard,
  HardHat,
  Home,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'

type WalkStep = {
  id: string
  icon: typeof CircleHelp
  title: string
  subtitle: string
  /** What to do right now */
  actions: string[]
  tip?: string
  /** In-app route when logged in */
  route?: string
}

const STEPS: WalkStep[] = [
  {
    id: 'welcome',
    icon: CircleHelp,
    title: 'How 5S Anchor works',
    subtitle: 'Teach while you audit — any operator can run a cell walk.',
    actions: [
      'Enter an area code (try ASM55) → guided step-by-step audit',
      'Each step shows what to look for and why it matters',
      'Flag red tags mid-walk without leaving the audit',
      'Dashboard tracks sustain; Settings can hard-reset demo data',
    ],
    tip: 'Reopen this anytime with the ? button.',
  },
  {
    id: 'roles',
    icon: HardHat,
    title: 'Step 1 · Pick a role',
    subtitle: 'Permissions match shop-floor jobs.',
    actions: [
      'Operator — guided audits, red tags, close your actions',
      'Supervisor — disposition tags, review work',
      'Manager — dashboard and CSV export',
      'Switch later: Role chip in the header',
    ],
    route: '/',
  },
  {
    id: 'home',
    icon: Home,
    title: 'Step 2 · Start with area code',
    subtitle: 'Home is built around the guided walk.',
    actions: [
      'Type area code ASM55 (or tap a demo chip)',
      'Tap Start guided audit',
      'Optional: include Safety for a 6S walk',
      'Hard reset lives under Settings if demo data gets messy',
    ],
    route: '/app',
  },
  {
    id: 'audits',
    icon: ClipboardCheck,
    title: 'Step 3 · Guided audit',
    subtitle: 'Coach text first, then a simple score.',
    actions: [
      'Read “What to look for” for that pillar',
      'Pick Excellent / Good / Needs work / Poor',
      'Tap Flag issue to create a red tag, then continue',
      'Complete audit — score hits the heatmap',
    ],
    route: '/app/audits/run?area=ASM55&guided=1',
    tip: 'You do not need to know 5S jargon — the app teaches each step.',
  },
  {
    id: 'tags',
    icon: Tag,
    title: 'Step 4 · Red tags',
    subtitle: 'Sort issues — during audit or standalone.',
    actions: [
      'Best: Flag during the guided walk',
      'Or Tags → New for a one-off tag',
      'Discard / Relocate / Unsure + photo',
      'Supervisors disposition from the Tags list',
    ],
    route: '/app/tags',
  },
  {
    id: 'actions',
    icon: ListTodo,
    title: 'Step 5 · Close the loop',
    subtitle: 'Sustain = actions finished with proof.',
    actions: [
      'Actions tab for open work from findings',
      'Close with proof photo when done',
      'Home counts open / overdue tags and actions',
    ],
    route: '/app/actions',
  },
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    title: 'Step 6 · Dashboard',
    subtitle: 'Leadership view of zone health.',
    actions: [
      'Heatmap by area after guided audits',
      'Trends and top issues',
      'Export CSV for reviews',
    ],
    route: '/app/dashboard',
  },
  {
    id: 'done',
    icon: CheckCircle2,
    title: 'You’re ready',
    subtitle: 'Demo path in under three minutes.',
    actions: [
      'Operator → ASM55 → guided audit',
      'Flag one red tag mid-walk',
      'Complete audit → Manager → Dashboard',
      'Settings → hard reset when you need a clean demo',
    ],
    route: '/app',
    tip: 'Questions later? Tap ? anytime.',
  },
]

export function TutorialHelpButton({
  className = '',
  label = 'How to use — guided walkthrough',
}: {
  className?: string
  label?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className={`help-btn tap-target inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 text-sky-300 ${className}`}
        onClick={() => setOpen(true)}
        aria-label={label}
        title={label}
      >
        <CircleHelp className="h-6 w-6" strokeWidth={2.25} />
      </button>
      {open && <GuidedWalkthrough onClose={() => setOpen(false)} />}
    </>
  )
}

export function GuidedWalkthrough({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const titleId = useId()
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1
  const isFirst = step === 0

  /** Move the app under the coach when logged in */
  useEffect(() => {
    if (!session) return
    const route = current.route
    if (!route || route === '/') return
    navigate(route, { replace: false })
  }, [step, session, current.route, navigate])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && !isLast) setStep((s) => s + 1)
      if (e.key === 'ArrowLeft' && !isFirst) setStep((s) => s - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, isLast, isFirst])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const goNext = () => {
    if (isLast) onClose()
    else setStep((s) => s + 1)
  }

  const goBack = () => setStep((s) => Math.max(0, s - 1))

  const panel = (
    <div
      className="tutorial-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Dimmed app shows through top band when logged in — coach card is the main UI */}
      <div className="tutorial-scrim" aria-hidden="true" />

      <div className="tutorial-shell">
        <header className="tutorial-header">
          <div>
            <p className="tutorial-kicker">
              Guided walkthrough · {step + 1} of {STEPS.length}
            </p>
            <p className="tutorial-progress-label">{current.id === 'done' ? 'Finish' : 'In progress'}</p>
          </div>
          <button
            type="button"
            className="tutorial-icon-btn"
            onClick={onClose}
            aria-label="Close walkthrough"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="tutorial-progress" aria-hidden="true">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`tutorial-progress-seg ${i <= step ? 'is-on' : ''}`}
            />
          ))}
        </div>

        <div className="tutorial-body">
          <div className="tutorial-icon-wrap">
            <Icon className="h-8 w-8 text-sky-400" strokeWidth={2} />
          </div>

          <h2 id={titleId} className="tutorial-title">
            {current.title}
          </h2>
          <p className="tutorial-subtitle">{current.subtitle}</p>

          {!session && current.route && current.route !== '/' && (
            <p className="tutorial-banner">
              Pick a role after this tour to open the real screens. Steps still teach the flow.
            </p>
          )}

          {session && current.route && current.route !== '/' && (
            <p className="tutorial-banner tutorial-banner--ok">
              App navigated to this screen under the guide — follow the checklist, then tap Next.
            </p>
          )}

          <ol className="tutorial-list">
            {current.actions.map((line) => (
              <li key={line}>
                <CheckCircle2 className="tutorial-list-icon" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ol>

          {current.tip && (
            <p className="tutorial-tip">
              <span className="tutorial-tip-label">Tip</span>
              {current.tip}
            </p>
          )}
        </div>

        <footer className="tutorial-footer">
          <button
            type="button"
            className="btn-secondary flex-1"
            disabled={isFirst}
            onClick={goBack}
          >
            <ChevronLeft className="h-5 w-5" /> Back
          </button>
          <button type="button" className="btn-primary flex-1" onClick={goNext}>
            {isLast ? (
              'Start using the app'
            ) : (
              <>
                Next <ChevronRight className="h-5 w-5" />
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  )

  return createPortal(panel, document.body)
}
