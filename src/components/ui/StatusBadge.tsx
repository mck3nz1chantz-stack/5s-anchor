const MAP: Record<string, string> = {
  draft: 'bg-slate-700 text-slate-200',
  open: 'bg-sky-900 text-sky-200 border border-sky-600',
  in_review: 'bg-violet-900 text-violet-200 border border-violet-600',
  dispositioned: 'bg-emerald-900 text-emerald-200 border border-emerald-600',
  closed: 'bg-emerald-950 text-emerald-300 border border-emerald-700',
  void: 'bg-slate-800 text-slate-500',
  in_progress: 'bg-amber-900 text-amber-100 border border-amber-600',
  blocked: 'bg-red-900 text-red-100 border border-red-600',
  done: 'bg-emerald-900 text-emerald-200 border border-emerald-600',
  submitted: 'bg-sky-900 text-sky-200 border border-sky-600',
  reviewed: 'bg-emerald-900 text-emerald-200',
  scheduled: 'bg-slate-700 text-slate-200',
  red: 'bg-red-700 text-white',
  yellow: 'bg-amber-500 text-slate-950',
  green: 'bg-emerald-600 text-white',
}

export function StatusBadge({ value, label }: { value: string; label?: string }) {
  const cls = MAP[value] ?? 'bg-slate-700 text-slate-200'
  return (
    <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${cls}`}>
      {label ?? value.replace(/_/g, ' ')}
    </span>
  )
}
