import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  History,
  Info,
  Layers,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  StickyNote,
  Tag,
  UserCheck,
  UserPlus,
} from 'lucide-react'
import { customerApi } from '../api'
import type { History as HistoryEntry } from '../api/types'
import {
  Badge,
  Button,
  Field,
  inputCls,
  PageLoading,
  Panel,
  PanelTitle,
  selectCls,
  EmptyState,
} from '../components/ui'

type Tab = 'details' | 'history' | 'financials'

export default function CustomerDetailPage() {
  const { id } = useParams()
  const customerId = Number(id)
  const [tab, setTab] = useState<Tab>('details')

  const { data: customer, isLoading, isError } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customerApi.get(customerId),
  })
  const { data: lookups } = useQuery({ queryKey: ['lookups'], queryFn: customerApi.lookups })

  if (isLoading) return <PageLoading label="Loading customer" />
  if (isError || !customer)
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-600">Customer not found</div>

  const TABS: { key: Tab; label: string; icon: typeof Info }[] = [
    { key: 'details', label: 'Details', icon: Info },
    { key: 'history', label: 'History', icon: History },
    { key: 'financials', label: 'Financials', icon: Banknote },
  ]

  return (
    <div>
      <Link
        to="/customers"
        className="mb-3 inline-flex items-center gap-1.5 font-display text-xs font-semibold text-slate-500 transition-colors hover:text-brand-teal-dark"
      >
        <ArrowLeft size={14} /> Back to customers
      </Link>

      <div className="ambiflow-hero relative mb-6 overflow-hidden rounded-3xl p-7 text-white sm:p-9">
        <div className="dot-grid opacity-15" />
        <div className="glow-orb h-40 w-40 animate-float bg-brand-cyan/25" style={{ top: '-40px', right: '5%' }} />
        <div className="glow-orb h-40 w-40 animate-pulse-slow bg-brand-teal/20" style={{ bottom: '-50px', right: '30%' }} />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-display text-xs font-semibold tracking-widest text-brand-cyan uppercase">
              {customer.segment ?? 'Opportunity'}
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-white">{customer.customer_name}</h1>
            <p className="mt-2 text-sm text-slate-300">
              {customer.account_name && <span>{customer.account_name} · </span>}
              {customer.email}
              {customer.city && <span> · {customer.city}</span>}
              {customer.phone && <span> · {customer.phone}</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {customer.deal_status && (
              <span className="rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 font-display text-xs font-bold text-brand-cyan backdrop-blur-sm">
                {customer.deal_status}
              </span>
            )}
            {customer.cloud && (
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 font-display text-xs font-semibold text-white backdrop-blur-sm">
                {customer.cloud}
              </span>
            )}
            {(() => {
              const owner = lookups?.users.find((u) => u.id === customer.assign_to_user_id)
              return owner ? (
                <span className="rounded-full border border-brand-teal/40 bg-brand-teal/15 px-3 py-1 font-display text-xs font-semibold text-brand-teal backdrop-blur-sm">
                  {owner.username}
                </span>
              ) : null
            })()}
          </div>
        </div>
      </div>

      <div className="scroll-fade mb-4 flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-display text-sm font-bold transition-all duration-300 ${
              tab === t.key
                ? 'bg-navy-900 text-white shadow-md'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <t.icon size={15} className={tab === t.key ? 'text-brand-cyan' : ''} />
            {t.label}
          </button>
        ))}
      </div>

      <div key={tab} className="animate-fade-in">
        {tab === 'details' && <DetailsTab customerId={customerId} />}
        {tab === 'history' && <HistoryTab customerId={customerId} />}
        {tab === 'financials' && <FinancialsTab customerId={customerId} />}
      </div>
    </div>
  )
}

function Kv({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="mb-0.5 font-display text-[11px] font-bold tracking-widest text-slate-500 uppercase">
        {label}
      </div>
      <div className="text-sm text-slate-800">{value || '—'}</div>
    </div>
  )
}

function DetailsTab({ customerId }: { customerId: number }) {
  const { data: customer } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customerApi.get(customerId),
  })
  const { data: lookups } = useQuery({ queryKey: ['lookups'], queryFn: customerApi.lookups })
  if (!customer) return null

  const assignee = lookups?.users.find((u) => u.id === customer.assign_to_user_id)

  const fields: [string, string | null | undefined][] = [
    ['Customer name', customer.customer_name],
    ['Company name', customer.account_name],
    ['Designation', customer.designation],
    ['Email', customer.email],
    ['Alternate emails', customer.alternate_emails],
    ['Phone', customer.phone],
    ['Cloud', customer.cloud],
    ['Segment', customer.segment],
    ['Deal status', customer.deal_status],
    ['Assigned to', assignee?.username ?? null],
    ['City', customer.city],
    ['AWS ID', customer.aws_id],
    ['AWS calculator link', customer.aws_calculator_link],
    ['Opportunity ID', customer.opportunity_id],
    ['Website URL', customer.main_page_address],
    ['Billing', customer.billing],
    ['Next action planned', customer.next_action_planned],
    ['Created', new Date(customer.created_at).toLocaleString()],
    ['Updated', new Date(customer.updated_at).toLocaleString()],
  ]

  return (
    <Panel>
      <div className="stagger grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map(([label, value]) => (
          <Kv key={label} label={label} value={value} />
        ))}
      </div>
      {customer.comment && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-1 font-display text-[11px] font-bold tracking-widest text-slate-500 uppercase">Comment</div>
          <p className="text-sm text-slate-700">{customer.comment}</p>
        </div>
      )}
    </Panel>
  )
}

function HistoryTab({ customerId }: { customerId: number }) {
  const queryClient = useQueryClient()
  const { data: history } = useQuery({
    queryKey: ['history', customerId],
    queryFn: () => customerApi.history(customerId),
  })
  const lookups = useQuery({ queryKey: ['lookups'], queryFn: customerApi.lookups })
  const [action, setAction] = useState('note')
  const [tag, setTag] = useState('')
  const [summary, setSummary] = useState('')
  const [remark, setRemark] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [query, setQuery] = useState('')

  const addMutation = useMutation({
    mutationFn: () =>
      customerApi.addHistory(customerId, {
        action,
        tag_name: tag || null,
        changes_summary: summary,
        remark: remark || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history', customerId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setSummary('')
      setRemark('')
      setAction('note')
      setTag('')
    },
  })

  const ACTION_META: Record<
    string,
    { icon: typeof Info; tone?: 'neutral' | 'teal' | 'cyan' | 'green' | 'coral' | 'navy' }
  > = {
    note: { icon: StickyNote, tone: 'neutral' },
    call: { icon: Phone, tone: 'cyan' },
    meeting: { icon: CalendarDays, tone: 'teal' },
    email: { icon: Mail, tone: 'navy' },
    created: { icon: UserPlus, tone: 'green' },
    updated: { icon: Pencil, tone: 'navy' },
    update: { icon: Pencil, tone: 'navy' },
    bulk_status: { icon: Layers, tone: 'coral' },
    bulk_segment: { icon: Tag, tone: 'teal' },
    bulk_assign: { icon: UserCheck, tone: 'cyan' },
  }

  function dayKey(iso: string) {
    return new Date(iso).toDateString()
  }

  function dayLabel(iso: string) {
    const d = new Date(iso)
    const today = new Date()
    const yesterday = new Date(Date.now() - 864e5)
    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
    })
  }

  function timeAgo(iso: string) {
    const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    const m = Math.floor(secs / 60)
    const h = Math.floor(m / 60)
    const d = Math.floor(h / 24)
    if (d >= 30) return new Date(iso).toLocaleDateString()
    if (d >= 7) return `${Math.floor(d / 7)}w ago`
    if (d >= 1) return `${d}d ago`
    if (h >= 1) return `${h}h ago`
    if (m >= 1) return `${m}m ago`
    return 'just now'
  }

  const filtered = (history ?? []).filter((h) => {
    if (actionFilter && h.action !== actionFilter) return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [h.changes_summary, h.remark, h.tag_name, h.changed_by, h.action]
      .some((x) => x != null && x.toLowerCase().includes(q))
  })

  const groups: { label: string; key: string; entries: HistoryEntry[] }[] = []
  for (const h of filtered) {
    const key = dayKey(h.created_at)
    const existing = groups.find((g) => g.key === key)
    if (existing) existing.entries.push(h)
    else groups.push({ key, label: dayLabel(h.created_at), entries: [h] })
  }

  const filterOptions = [
    { value: 'note', label: 'Notes' },
    { value: 'call', label: 'Calls' },
    { value: 'meeting', label: 'Meetings' },
    { value: 'email', label: 'Emails' },
    { value: 'update', label: 'Updates' },
    { value: 'created', label: 'Created' },
    { value: 'bulk_status', label: 'Status' },
  ]

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Panel className="scroll-fade h-fit lg:col-span-1">
        <PanelTitle><Plus size={15} className="text-brand-teal" /> Add entry</PanelTitle>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (summary.trim()) addMutation.mutate()
          }}
        >
          <Field label="Action">
            <select className={selectCls} value={action} onChange={(e) => setAction(e.target.value)}>
              {['note', 'call', 'meeting', 'email', 'update'].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </Field>
          <Field label="Tag">
            <select className={selectCls} value={tag} onChange={(e) => setTag(e.target.value)}>
              <option value="">No tag</option>
              {lookups.data?.update_tags.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Summary *">
            <input
              className={inputCls}
              placeholder="Demo scheduled"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
            />
          </Field>
          <Field label="Remark">
            <input
              className={inputCls}
              placeholder="Optional note"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </Field>
          <Button disabled={addMutation.isPending || !summary.trim()} type="submit">
            {addMutation.isPending ? 'Adding…' : 'Add entry'}
          </Button>
        </form>
      </Panel>

      <Panel className="scroll-fade lg:col-span-2">
        <PanelTitle><History size={15} className="text-brand-teal" /> Timeline</PanelTitle>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputCls} pl-8`}
              placeholder="Search history…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActionFilter('')}
              className={`rounded-full px-3 py-1 font-display text-xs font-bold transition-colors ${
                actionFilter === '' ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            {filterOptions.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setActionFilter(actionFilter === f.value ? '' : f.value)}
                className={`rounded-full px-3 py-1 font-display text-xs font-bold transition-colors ${
                  actionFilter === f.value ? 'bg-brand-teal text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState message="No history entries match" />
        ) : (
          <div className="relative space-y-6 before:absolute before:left-[7px] before:top-1 before:bottom-1 before:w-px before:bg-slate-200">
            {groups.map((g) => (
              <section key={g.key}>
                <div className="mb-2 pl-7 font-display text-[11px] font-bold tracking-widest text-slate-400 uppercase">
                  {g.label}
                </div>
                <ul className="relative space-y-4 pl-0">
                  {g.entries.map((h) => {
                    const meta = ACTION_META[h.action] ?? { icon: StickyNote, tone: 'neutral' as const }
                    const Icon = meta.icon
                    const isSystem = !h.changed_by
                    return (
                      <li key={h.id} className="relative flex gap-3">
                        <span
                          className={`mt-0.5 grid h-[15px] w-[15px] shrink-0 place-items-center rounded-full border-2 border-white shadow ${
                            meta.tone === 'coral'
                              ? 'bg-red-500'
                              : meta.tone === 'teal'
                                ? 'bg-brand-teal'
                                : meta.tone === 'cyan'
                                  ? 'bg-brand-cyan'
                                  : meta.tone === 'green'
                                    ? 'bg-green-500'
                                    : meta.tone === 'navy'
                                      ? 'bg-navy-800'
                                      : 'bg-slate-400'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="grid h-6 w-6 place-items-center rounded-lg bg-slate-100 text-slate-500">
                              <Icon size={12} />
                            </span>
                            <Badge tone={meta.tone}>{h.action}</Badge>
                            {h.tag_name && <Badge tone="teal">{h.tag_name}</Badge>}
                            {isSystem && <Badge tone="navy">system</Badge>}
                            <span className="ml-auto whitespace-nowrap text-xs text-slate-400" title={new Date(h.created_at).toLocaleString()}>
                              {timeAgo(h.created_at)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-700">{h.changes_summary}</p>
                          {h.remark && <p className="mt-0.5 text-xs text-slate-500">{h.remark}</p>}
                          {!isSystem && (
                            <p className="mt-0.5 text-[11px] text-slate-400">{h.changed_by}</p>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}

function FinancialsTab({ customerId }: { customerId: number }) {
  const queryClient = useQueryClient()
  const { data: fin } = useQuery({
    queryKey: ['financials', customerId],
    queryFn: () => customerApi.financials(customerId),
  })
  const [form, setForm] = useState({
    expected_mrr: '',
    expected_arr: '',
    credits_requested: '',
    credits_gets: '',
    phases_to_distribute: '',
  })

  useEffect(() => {
    if (fin) {
      setForm({
        expected_mrr: fin.expected_mrr != null ? String(fin.expected_mrr) : '',
        expected_arr: fin.expected_arr != null ? String(fin.expected_arr) : '',
        credits_requested: fin.credits_requested != null ? String(fin.credits_requested) : '',
        credits_gets: fin.credits_gets != null ? String(fin.credits_gets) : '',
        phases_to_distribute: fin.phases_to_distribute != null ? String(fin.phases_to_distribute) : '',
      })
    }
  }, [fin])

  const saveMutation = useMutation({
    mutationFn: () =>
      customerApi.updateFinancials(customerId, {
        expected_mrr: form.expected_mrr === '' ? null : Number(form.expected_mrr),
        expected_arr: form.expected_arr === '' ? null : Number(form.expected_arr),
        credits_requested: form.credits_requested === '' ? null : Number(form.credits_requested),
        credits_gets: form.credits_gets === '' ? null : Number(form.credits_gets),
        phases_to_distribute: form.phases_to_distribute === '' ? null : Number(form.phases_to_distribute),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials', customerId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const cards = [
    { label: 'Expected MRR', value: fin?.expected_mrr, bg: 'from-brand-cyan to-brand-teal', sign: true },
    { label: 'Expected ARR', value: fin?.expected_arr, bg: 'from-brand-teal to-brand-teal-dark', sign: true },
    { label: 'Credits requested', value: fin?.credits_requested, bg: 'from-amber-400 to-orange-500', sign: true },
    { label: 'Credits gets', value: fin?.credits_gets, bg: 'from-violet-500 to-purple-600', sign: true },
    { label: 'Phases to distribute', value: fin?.phases_to_distribute, bg: 'from-sky-500 to-cyan-600', sign: false },
  ]

  function field(key: keyof typeof form, fallback: string) {
    return {
      placeholder: fallback,
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Panel className="scroll-fade">
        <PanelTitle><Banknote size={15} className="text-brand-teal" /> Financial snapshot</PanelTitle>
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2">
          {cards.map((c) => (
            <div key={c.label} className="relative overflow-hidden rounded-2xl border border-slate-200 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
              <div className={`absolute -right-5 -top-5 h-20 w-20 rounded-full bg-gradient-to-br ${c.bg} opacity-10`} />
              <div className="font-display text-[11px] font-bold tracking-widest text-slate-500 uppercase">{c.label}</div>
              <div className={`mt-1 font-display text-2xl font-bold ${c.sign ? 'text-navy-900' : 'text-navy-900'}`}>
                {c.value != null ? `$${Number(c.value).toLocaleString()}` : '—'}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="scroll-fade" style={{ animationDelay: '0.1s' }}>
        <PanelTitle><Banknote size={15} className="text-brand-teal" /> Update figures</PanelTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Expected MRR ($)">
            <input type="number" step="0.01" className={inputCls} {...field('expected_mrr', fin?.expected_mrr != null ? String(fin.expected_mrr) : '')} />
          </Field>
          <Field label="Expected ARR ($)">
            <input type="number" step="0.01" className={inputCls} {...field('expected_arr', fin?.expected_arr != null ? String(fin.expected_arr) : '')} />
          </Field>
          <Field label="Credits requested ($)">
            <input type="number" step="0.01" className={inputCls} {...field('credits_requested', fin?.credits_requested != null ? String(fin.credits_requested) : '')} />
          </Field>
          <Field label="Credits gets ($)">
            <input type="number" step="0.01" className={inputCls} {...field('credits_gets', fin?.credits_gets != null ? String(fin.credits_gets) : '')} />
          </Field>
          <Field label="Phases to distribute">
            <input type="number" min="1" step="1" className={inputCls} {...field('phases_to_distribute', fin?.phases_to_distribute != null ? String(fin.phases_to_distribute) : '')} />
          </Field>
        </div>
        <div className="mt-5">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : 'Save financials'}
          </Button>
        </div>
      </Panel>
    </div>
  )
}