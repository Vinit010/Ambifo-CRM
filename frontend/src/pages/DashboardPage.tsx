import { useQuery } from '@tanstack/react-query'
import {
  Users,
  Target,
  TrendingUp,
  DollarSign,
  Activity,
  PieChart,
  Layers,
} from 'lucide-react'
import { dashboardApi } from '../api'
import { Badge, PageHead, PageLoading, Panel, PanelTitle } from '../components/ui'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const KPI_BG: Record<string, string> = {
  teal: 'from-brand-teal to-brand-teal-dark',
  cyan: 'from-brand-cyan to-brand-teal',
  navy: 'from-navy-700 to-navy-900',
  green: 'from-green-500 to-emerald-600',
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
  })

  if (isLoading) return <PageLoading label="Loading dashboard" />
  if (isError || !data)
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-600">Failed to load dashboard</div>

  const { kpis, by_status, by_segment, by_assignee, recent_history, opportunities_by_month } = data
  const maxStatus = Math.max(...by_status.map((s) => s.count), 1)
  const maxMonth = Math.max(...opportunities_by_month.map((m) => m.count), 1)
  const maxAssignee = Math.max(...by_assignee.map((a) => a.count), 1)

  const kpisArr = [
    { label: 'Customers', value: String(kpis.total_customers), sub: `+${kpis.customers_added_30d} in 30 days`, icon: Users, bg: KPI_BG.teal },
    { label: 'Active Leads', value: String(kpis.total_leads), sub: 'pipeline', icon: Target, bg: KPI_BG.cyan },
    { label: 'Open Opportunities', value: String(kpis.open_opportunities), sub: 'in progress', icon: TrendingUp, bg: KPI_BG.navy },
    { label: 'Actual MRR', value: `$${kpis.total_mrr.toLocaleString()}`, sub: `$${kpis.total_arr.toLocaleString()} ARR`, icon: DollarSign, bg: KPI_BG.green },
  ]

  return (
    <div>
      <PageHead
        title="Dashboard"
        subtitle="Your cloud pipeline at a glance"
        actions={<Badge tone="teal">Live</Badge>}
      />

      <div className="stagger mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpisArr.map((k) => (
          <div
            key={k.label}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-navy-900/10"
          >
            <div
              className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${k.bg} opacity-[0.08] transition-transform duration-500 group-hover:scale-150`}
            />
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold tracking-widest text-slate-500 uppercase">
                {k.label}
              </span>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${k.bg} text-white shadow-md`}
              >
                <k.icon size={17} />
              </span>
            </div>
            <div className="mt-3 font-display text-3xl font-bold text-navy-900">{k.value}</div>
            <div className="mt-1 text-xs text-slate-500">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel className="scroll-fade">
          <PanelTitle><PieChart size={15} className="text-brand-teal" /> Deal status</PanelTitle>
          {by_status.length === 0 ? (
            <p className="text-sm text-slate-400">No data yet</p>
          ) : (
            <ul className="space-y-3">
              {[...by_status].sort((a, b) => b.count - a.count).map((s, i) => (
                <li key={s.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <Badge tone="neutral">
                      <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                      {s.name}
                    </Badge>
                    <span className="font-display font-bold text-navy-900">{s.count}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="bar-fill h-full rounded-full transition-all"
                      style={{ width: `${(s.count / maxStatus) * 100}%`, background: s.color, animationDelay: `${i * 0.08}s` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="scroll-fade" style={{ animationDelay: '0.1s' }}>
          <PanelTitle><Layers size={15} className="text-brand-teal" /> Segments</PanelTitle>
          {by_segment.length === 0 ? (
            <p className="text-sm text-slate-400">No data yet</p>
          ) : (
            <ul className="space-y-3">
              {[...by_segment].sort((a, b) => b.count - a.count).map((s, i) => (
                <li key={s.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <Badge tone="teal">{s.name}</Badge>
                    <span className="font-display font-bold text-navy-900">{s.count}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="bar-fill h-full rounded-full bg-gradient-to-r from-brand-cyan to-brand-teal"
                      style={{ width: `${(s.count / Math.max(...by_segment.map((x) => x.count), 1)) * 100}%`, animationDelay: `${i * 0.08}s` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel className="scroll-fade">
          <PanelTitle><TrendingUp size={15} className="text-brand-teal" /> Opportunities added</PanelTitle>
          {opportunities_by_month.length === 0 ? (
            <p className="text-sm text-slate-400">No data yet</p>
          ) : (
            <div className="flex h-48 items-end gap-3">
              {opportunities_by_month.map((m, i) => {
                const [, monthNum] = m.month.split('-')
                return (
                  <div key={m.month} className="group flex flex-1 flex-col items-center gap-2">
                    <span className="font-display text-xs font-bold text-navy-900 opacity-0 transition-opacity group-hover:opacity-100">
                      {m.count}
                    </span>
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="bar-col-fill w-full rounded-t-lg bg-gradient-to-t from-navy-800 to-brand-teal transition-all duration-300 group-hover:from-brand-teal group-hover:to-brand-cyan"
                        style={{ height: `${(m.count / maxMonth) * 100}%`, animationDelay: `${i * 0.07}s` }}
                      />
                    </div>
                    <span className="font-display text-[10px] font-semibold text-slate-500 uppercase">
                      {MONTHS[Number(monthNum) - 1]}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>

        <Panel className="scroll-fade" style={{ animationDelay: '0.1s' }}>
          <PanelTitle><Users size={15} className="text-brand-teal" /> Deals by owner</PanelTitle>
          {by_assignee.length === 0 ? (
            <p className="text-sm text-slate-400">No data yet</p>
          ) : (
            <ul className="space-y-3">
              {[...by_assignee].sort((a, b) => b.count - a.count).map((a, i) => (
                <li key={a.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <Badge tone="cyan">{a.name}</Badge>
                    <span className="font-display font-bold text-navy-900">{a.count}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="bar-fill h-full rounded-full bg-gradient-to-r from-brand-teal to-brand-cyan"
                      style={{ width: `${(a.count / maxAssignee) * 100}%`, animationDelay: `${i * 0.08}s` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Panel className="scroll-fade" style={{ animationDelay: '0.1s' }}>
          <PanelTitle><Activity size={15} className="text-brand-teal" /> Recent activity</PanelTitle>
          {recent_history.length === 0 ? (
            <p className="text-sm text-slate-400">No activity yet</p>
          ) : (
            <ul className="relative space-y-4 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
              {recent_history.map((h) => (
                <li key={h.id} className="relative pl-6">
                  <span className="absolute left-0 top-1 h-[11px] w-[11px] rounded-full border-2 border-white bg-brand-teal shadow-sm" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-sm font-bold text-navy-900">{h.action}</span>
                    {h.tag_name && <Badge tone="cyan">{h.tag_name}</Badge>}
                  </div>
                  <p className="text-sm text-slate-600">{h.changes_summary}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {h.changed_by || 'system'} · {new Date(h.created_at ?? '').toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}