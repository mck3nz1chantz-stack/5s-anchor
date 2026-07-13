import { scoreColorClass } from '../../lib/format'

export function ScorePill({ pct }: { pct: number | null | undefined }) {
  if (pct == null) {
    return (
      <span className="rounded-lg bg-slate-800 px-2 py-1 text-sm font-semibold text-slate-400">
        N/A
      </span>
    )
  }
  return (
    <span className={`rounded-lg bg-slate-900 px-2 py-1 text-sm font-bold tabular-nums ${scoreColorClass(pct)}`}>
      {pct}%
    </span>
  )
}
