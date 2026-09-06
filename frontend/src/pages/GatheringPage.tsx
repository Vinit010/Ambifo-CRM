import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Copy, FolderLock, KeyRound, Lock, Plus, RefreshCcw, Server, Trash2, Unlock, X } from 'lucide-react'
import { gatheringApi } from '../api'
import type { GatheringDetail, GatheringRequestRow } from '../api/types'
import { Badge, Button, EmptyState, Field, inputCls, PageHead, Panel, PanelTitle, Spinner } from '../components/ui'
import { CustomersSelect } from './MeetingsPage'

const ORIGIN = window.location.origin
const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString() : '—')
const statusTone = (s: string) =>
  s === 'submitted' ? 'green' : s === 'expired' ? 'coral' : s === 'sent' ? 'teal' : 'navy'

async function copy(text: string) {
  await navigator.clipboard.writeText(text)
  window.alert('Link copied to clipboard')
}

export default function GatheringPage() {
  const queryClient = useQueryClient()
  const list = useQuery({ queryKey: ['gathering-requests'], queryFn: () => gatheringApi.list() })
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [detail, setDetail] = useState<GatheringDetail | null>(null)
  const [form, setForm] = useState({ customer_id: '', note: '', access_key: '', expires_days: '14', send_email: true })

  const create = useMutation({
    mutationFn: () =>
      gatheringApi.create({
        customer_id: Number(form.customer_id),
        note: form.note || null,
        access_key: form.access_key || null,
        expires_days: Number(form.expires_days) || 14,
        send_email: form.send_email,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gathering-requests'] })
      queryClient.invalidateQueries({ queryKey: ['email-logs'] })
      setShowForm(false)
      setError(null)
      setForm({ customer_id: '', note: '', access_key: '', expires_days: '14', send_email: true })
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Create failed'),
  })

  const openDetail = async (id: number) => {
    setExpanded(expanded === id ? null : id)
    setDetail(null)
    if (expanded !== id) {
      const d = await gatheringApi.get(id)
      setDetail(d)
    }
  }

  const action = useMutation<GatheringRequestRow | void, Error, { id: number; kind: 'lock' | 'unlock' | 'renew' | 'delete' | 'clear' }>({
    mutationFn: ({ id, kind }: { id: number; kind: 'lock' | 'unlock' | 'renew' | 'delete' | 'clear' }) => {
      switch (kind) {
        case 'lock':
          return gatheringApi.lock(id)
        case 'unlock':
          return gatheringApi.unlock(id)
        case 'renew':
          return gatheringApi.renew(id)
        case 'clear':
          return gatheringApi.clearDetails(id)
        default:
          return gatheringApi.remove(id)
      }
    },
    onSuccess: (res, vars) => {
      if (vars.kind === 'delete') setExpanded(null)
      else if (vars.kind === 'renew') copy(`${ORIGIN}/public/gathering/${(res as GatheringRequestRow).token}`)
      queryClient.invalidateQueries({ queryKey: ['gathering-requests'] })
    },
    onError: (e) => window.alert(e instanceof Error ? e.message : 'Action failed'),
  })

  return (
    <div>
      <PageHead title="Gathering" subtitle="Infrastructure information gathering requests" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {showForm && (
          <Panel className="scroll-fade h-fit lg:col-span-1">
            <div className="flex items-center justify-between">
              <PanelTitle>
                <Server size={15} className="text-brand-teal" /> New gathering request
              </PanelTitle>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <Field label="Customer">
                <CustomersSelect value={form.customer_id} onChange={(v) => setForm({ ...form, customer_id: v })} />
              </Field>
              <Field label="Note to customer (optional)">
                <textarea
                  className={inputCls}
                  rows={3}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="What infrastructure info do we need?"
                />
              </Field>
              <Field label="Access key (optional)">
                <input
                  className={inputCls}
                  type="password"
                  placeholder="Secret key the contact enters on the page"
                  value={form.access_key}
                  onChange={(e) => setForm({ ...form, access_key: e.target.value })}
                />
              </Field>
              <Field label="Expires in (days)">
                <input
                  className={inputCls}
                  type="number"
                  min={1}
                  value={form.expires_days}
                  onChange={(e) => setForm({ ...form, expires_days: e.target.value })}
                />
              </Field>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.send_email}
                  onChange={(e) => setForm({ ...form, send_email: e.target.checked })}
                  className="h-4 w-4 accent-brand-teal"
                />
                Email the link to the customer
              </label>
              {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
              <Button
                className="w-full"
                icon={<Plus size={16} />}
                disabled={!form.customer_id || create.isPending}
                onClick={() => create.mutate()}
              >
                Create request
              </Button>
            </div>
          </Panel>
        )}

        <div className={`${showForm ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
          {!showForm && (
            <div className="flex justify-end">
              <Button variant="outline" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>
                New request
              </Button>
            </div>
          )}
          <Panel className="scroll-fade">
            <PanelTitle>
              <Server size={15} className="text-brand-teal" /> Requests
            </PanelTitle>
            {list.isLoading ? (
              <Spinner label="Loading requests" />
            ) : !list.data?.length ? (
              <EmptyState message="No gathering requests yet" />
            ) : (
              <div className="space-y-3">
                {list.data.map((r: GatheringRequestRow) => (
                  <div key={r.id} className="rounded-xl border border-slate-200 transition-colors hover:border-brand-teal/30">
                    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <button
                        onClick={() => openDetail(r.id)}
                        className="flex flex-1 items-center gap-2 text-left"
                      >
                        {expanded === r.id ? (
                          <ChevronDown size={16} className="shrink-0 text-brand-teal" />
                        ) : (
                          <ChevronRight size={16} className="shrink-0 text-slate-400" />
                        )}
                        <span className="font-display font-semibold text-navy-900">
                          {r.customer_name ?? `#${r.customer_id}`}
                        </span>
                        <span className="text-xs text-slate-400">
                          · servers {r.server_count} / block {r.block_count} / NAS {r.file_count}
                        </span>
                      </button>
                      <Badge tone={statusTone(r.status) as never}>{r.status}</Badge>
                      {r.is_locked && (
                        <Badge tone="navy">
                          <Lock size={11} /> locked
                        </Badge>
                      )}
                      {r.access_key_hint && (
                        <Badge tone="cyan">
                          <KeyRound size={11} /> key …{r.access_key_hint}
                        </Badge>
                      )}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copy(`${ORIGIN}/public/gathering/${r.token}`)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition-colors hover:border-brand-teal hover:text-brand-teal-dark"
                          title="Copy public link"
                        >
                          <Copy size={13} /> Copy
                        </button>
                        {r.is_locked ? (
                          <button
                            onClick={() => action.mutate({ id: r.id, kind: 'unlock' })}
                            className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:border-brand-cyan hover:text-brand-teal-dark"
                            title="Unlock"
                          >
                            <Unlock size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => action.mutate({ id: r.id, kind: 'lock' })}
                            className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:border-brand-teal hover:text-brand-teal-dark"
                            title="Lock"
                          >
                            <FolderLock size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (window.confirm('Generate a new public link (resets submissions) and notify again?'))
                              action.mutate({ id: r.id, kind: 'renew' })
                          }}
                          className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:border-brand-cyan hover:text-brand-teal-dark"
                          title="Renew link"
                        >
                          <RefreshCcw size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Delete this gathering request and its submissions?')) action.mutate({ id: r.id, kind: 'delete' })
                          }}
                          className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:border-red-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {expanded === r.id && (
                      <div className="animate-fade-in border-t border-slate-100 px-4 py-4">
                        {detail ? <GatheringDetailView detail={detail} onClear={() => action.mutate({ id: r.id, kind: 'clear' })} /> : <Spinner label="Loading detail" />}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}

function GatheringDetailView({ detail, onClear }: { detail: GatheringDetail; onClear: () => void }) {
  const summary: [string, string][] = [
    ['Note', detail.note || '—'],
    ['Company website', detail.company_website || '—'],
    ['Current tools', detail.current_tools || '—'],
    ['Pain points', detail.pain_points || '—'],
    ['Access verified', fmt(detail.access_verified_at)],
    ['Submitted', fmt(detail.submitted_at)],
    ['Expires', fmt(detail.expires_at)],
  ]
  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {summary.map(([k, v]) => (
          <div key={k} className="rounded-lg bg-slate-50 px-3 py-2">
            <div className="font-display text-[11px] font-bold tracking-wide text-slate-500 uppercase">{k}</div>
            <div className="mt-0.5 break-words text-sm text-slate-700">{v}</div>
          </div>
        ))}
      </div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-xs font-bold tracking-wide text-navy-900 uppercase">Servers ({detail.server_count})</h3>
        {detail.server_count > 0 && (
          <button
            onClick={() => {
              if (window.confirm('Delete all submitted server/block/NAS rows?')) onClear()
            }}
            className="text-xs font-semibold text-red-500 hover:underline"
          >
            Clear submissions
          </button>
        )}
      </div>
      <MiniTable
        head={['Server', 'Spec', 'Storage', 'OS', 'Env', 'App', 'Peak CPU/MEM', 'Annual $', 'Storage type']}
        rows={detail.servers.map((s) => [
          s.server_name,
          `${s.cpu_cores ?? '?'}c / ${Math.round((s.memory_mb ?? 0) / 1024)}GB`,
          fmtGb(s.provisioned_storage_gb),
          s.operating_system || '—',
          s.environment || '—',
          s.application || '—',
          `${s.cpu_utilization_peak ?? '—'}% / ${s.memory_utilization_peak ?? '—'}%`,
          s.annual_cost_usd != null ? `$${Number(s.annual_cost_usd).toLocaleString()}` : '—',
          s.storage_type || '—',
        ])}
      />
      <h3 className="mb-2 mt-4 font-display text-xs font-bold tracking-wide text-navy-900 uppercase">
        Block storage ({detail.block_count})
      </h3>
      <MiniTable
        head={['Volume', 'Used', 'Provisioned', 'Peak IOPS/TP(MBps)', 'Avg IOPS/TP(MBps)', 'Array', 'Latency ms', 'App']}
        rows={detail.block_storage.map((b) => [
          b.volume_name,
          fmtGb(b.total_used_capacity_gb),
          fmtGb(b.total_provisioned_capacity_gb),
          `${b.peak_iops ?? '—'} / ${b.peak_throughput_mbps ?? '—'}`,
          `${b.average_iops ?? '—'} / ${b.average_throughput_mbps ?? '—'}`,
          b.array_name || '—',
          b.average_latency_ms ?? '—',
          b.application || '—',
        ])}
      />
      <h3 className="mb-2 mt-4 font-display text-xs font-bold tracking-wide text-navy-900 uppercase">File / NAS ({detail.file_count})</h3>
      <MiniTable
        head={['Share', 'Used', 'Proto', 'Provisioned', 'Pool', 'Array/Vendor', 'Latency ms', 'App']}
        rows={detail.file_nas.map((f) => [
          f.file_server_share_name,
          fmtGb(f.total_used_capacity_gb),
          f.access_protocol || '—',
          fmtGb(f.total_provisioned_capacity_gb),
          f.storage_pool_name || '—',
          [f.array_name, f.array_vendor].filter(Boolean).join(' / ') || '—',
          f.average_latency_ms ?? '—',
          f.application || '—',
        ])}
      />
    </div>
  )
}

const fmtGb = (v?: number | null) => (v != null ? `${Number(v).toLocaleString()} GB` : '—')

function MiniTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  if (!rows.length)
    return <p className="py-3 text-sm text-slate-400">Nothing submitted yet.</p>
  return (
    <div className="-mx-2 overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-200 text-left font-display font-bold tracking-wide text-slate-500 uppercase">
            {head.map((h) => (
              <th key={h} className="px-3 py-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-brand-teal/5">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 text-slate-700">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}