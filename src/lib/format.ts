export function formatShortDate(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function scoreColorClass(pct: number | null | undefined): string {
  if (pct == null) return 'text-slate-400'
  if (pct >= 85) return 'text-emerald-400'
  if (pct >= 70) return 'text-amber-400'
  return 'text-red-400'
}

export function heatmapBg(pct: number | null | undefined): string {
  if (pct == null) return 'bg-slate-800'
  if (pct >= 85) return 'bg-emerald-900/80 border-emerald-600'
  if (pct >= 70) return 'bg-amber-900/70 border-amber-600'
  return 'bg-red-900/70 border-red-600'
}
