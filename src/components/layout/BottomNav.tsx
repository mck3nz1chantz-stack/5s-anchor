import { NavLink } from 'react-router-dom'
import { ClipboardCheck, Home, LayoutDashboard, ListTodo, Tag } from 'lucide-react'

const links = [
  { to: '/app', end: true, label: 'Home', icon: Home },
  { to: '/app/tags', end: false, label: 'Tags', icon: Tag },
  { to: '/app/audits', end: false, label: 'Audit', icon: ClipboardCheck },
  { to: '/app/actions', end: false, label: 'Actions', icon: ListTodo },
  { to: '/app/dashboard', end: false, label: 'Dash', icon: LayoutDashboard },
]

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-800 bg-slate-950/98 backdrop-blur"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {links.map(({ to, end, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `nav-item flex min-h-[4.25rem] min-w-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-semibold active:scale-95 active:bg-slate-900 active:text-sky-300 ${
                isActive ? 'text-sky-400' : 'text-slate-500'
              }`
            }
          >
            <Icon className="h-6 w-6" strokeWidth={2.25} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
