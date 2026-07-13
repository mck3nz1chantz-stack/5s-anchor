import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Download } from 'lucide-react'
import { localRepository } from '../api/localRepository'
import { useAuthStore } from '../store/authStore'
import type { DashboardData } from '../types/domain'
import { heatmapBg, formatDay } from '../lib/format'
import { ScorePill } from '../components/ui/ScorePill'

export function DashboardPage() {
  const session = useAuthStore((s) => s.session)!
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    localRepository.getDashboard(session.plantId).then(setData)
  }, [session.plantId])

  const exportCsv = async () => {
    const csv = await localRepository.exportScoresCsv(session.plantId)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `5s-scores-${session.plantId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!data) {
    return <p className="text-slate-400">Loading dashboard…</p>
  }

  const chartData = data.trends.map((t) => ({
    ...t,
    label: formatDay(t.date + 'T12:00:00.000Z'),
  }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-white">Dashboard</h2>
        <button type="button" className="btn-secondary text-sm" onClick={exportCsv}>
          <Download className="h-4 w-4" /> CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Kpi label="Open red tags" value={data.openRedTags} />
        <Kpi label="Open actions" value={data.openActions} />
        <Kpi label="Overdue" value={data.overdueActions} warn={data.overdueActions > 0} />
        <Kpi
          label="7d completion"
          value={`${Math.round(data.completionRate7d * 100)}%`}
        />
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Area heatmap
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {data.heatmap.map((h) => (
            <div
              key={h.areaId}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 ${heatmapBg(h.scorePct)}`}
            >
              <span className="font-semibold text-white">{h.areaName}</span>
              <ScorePill pct={h.scorePct} />
            </div>
          ))}
        </div>
      </section>

      <section className="card p-3">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Score trend
        </h3>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Submit audits to populate trends.
          </p>
        ) : (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} width={32} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Line
                  type="monotone"
                  dataKey="avgScorePct"
                  name="Avg %"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#38bdf8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Top issues
        </h3>
        <div className="space-y-2">
          {data.topIssues.length === 0 && (
            <p className="text-sm text-slate-500">No findings yet.</p>
          )}
          {data.topIssues.map((i) => (
            <div key={i.label} className="card flex justify-between px-3 py-2 text-sm">
              <span className="text-slate-200">{i.label}</span>
              <span className="font-bold text-slate-400">{i.count}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Kpi({
  label,
  value,
  warn,
}: {
  label: string
  value: string | number
  warn?: boolean
}) {
  return (
    <div className="card p-3">
      <div className={`text-2xl font-bold tabular-nums ${warn ? 'text-red-400' : 'text-white'}`}>
        {value}
      </div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  )
}
