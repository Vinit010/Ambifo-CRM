import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CheckSquare, ChevronLeft, ChevronRight, ExternalLink, Layers, Pencil, Plus, Search, Square, Trash2, TrendingUp, Trophy, Users, X } from 'lucide-react'
import { customerApi } from '../api'
import type { Customer, CustomerCreate, CustomerStats, Lookups } from '../api/types'
import { Badge, Button, EmptyState, Field, inputCls, PageHead, selectCls, Spinner } from '../components/ui'

const PAGE_SIZE = 20

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

const EMPTY_FORM: CustomerCreate = {
  account_name: '',
  customer_name: '',
  designation: '',
  email: '',
  phone: '',
  city: '',
  cloud: '',
  segment: '',
  deal_status: '',
  alternate_emails: null,
  main_page_address: null,
  billing: null,
  aws_id: null,
  aws_calculator_link: null,
  opportunity_id: null,
  comment: null,
  next_action_planned: null,
  assign_to_user_id: null,
}

function toForm(c: Customer): CustomerCreate {
  return {
    account_name: c.account_name,
    customer_name: c.customer_name,
    designation: c.designation,
    email: c.email,
    phone: c.phone,
    city: c.city,
    cloud: c.cloud,
    segment: c.segment,
    deal_status: c.deal_status,
    alternate_emails: c.alternate_emails,
    main_page_address: c.main_page_address,
    billing: c.billing,
    aws_id: c.aws_id,
    aws_calculator_link: c.aws_calculator_link,
    opportunity_id: c.opportunity_id,
    comment: c.comment,
    next_action_planned: c.next_action_planned,
    assign_to_user_id: c.assign_to_user_id,
  }
}

export default function CustomersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search)
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState<CustomerCreate>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkSegment, setBulkSegment] = useState('')
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkAssignee, setBulkAssignee] = useState('')
  const [bulkAllFilter, setBulkAllFilter] = useState(false)
  const [bulkResult, setBulkResult] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null)
  const [confirmRemoveAll, setConfirmRemoveAll] = useState(false)
  const [sortKey, setSortKey] = useState<'name' | 'status' | 'updated'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const lookups = useQuery({ queryKey: ['lookups'], queryFn: customerApi.lookups })
  const { data: customers, isLoading, isError } = useQuery({
    queryKey: ['customers', debouncedSearch, page],
    queryFn: () => customerApi.list({ search: debouncedSearch || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  })
  const { data: stats } = useQuery<CustomerStats>({
    queryKey: ['customer-stats', debouncedSearch],
    queryFn: () => customerApi.stats(debouncedSearch || undefined),
  })

  const createMutation = useMutation({
    mutationFn: (payload: CustomerCreate) =>
      editing ? customerApi.update(editing.id, payload) : customerApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer-stats'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setShowForm(false)
      setEditing(null)
      setForm(EMPTY_FORM)
    },
    onError: (e) => setFormError(e instanceof Error ? e.message : 'Save failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customerApi.remove(id),
    onSuccess: (_data, deletedId) => {
      setDeleteError(null)
      setConfirmDelete(null)
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer-stats'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(deletedId)
        return next
      })
    },
    onError: (e) => {
      setConfirmDelete(null)
      setDeleteError(e instanceof Error ? e.message : 'Delete failed')
    },
  })

  const removeAllMutation = useMutation({
    mutationFn: () => customerApi.removeAll(),
    onSuccess: (data) => {
      setConfirmRemoveAll(false)
      setDeleteError(null)
      setSearch('')
      setPage(1)
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer-stats'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setBulkResult(`Removed ${data.deleted} customer(s)`)
    },
    onError: (e) => {
      setConfirmRemoveAll(false)
      setDeleteError(e instanceof Error ? e.message : 'Remove-all failed')
    },
  })

  const bulkMutation = useMutation({
    mutationFn: () =>
      customerApi.bulkUpdate({
        customer_ids: bulkAllFilter ? [] : [...selectedIds],
        filter_search: bulkAllFilter ? (debouncedSearch || null) : undefined,
        deal_status: bulkStatus || null,
        segment: bulkSegment || null,
        assign_to_user_id: bulkAssignee ? Number(bulkAssignee) : null,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer-stats'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setBulkResult(bulkAllFilter
        ? `Updated ${data.updated} customer(s) matching the current filter`
        : `Updated ${data.updated} selected customer(s)`)
      setBulkAllFilter(false)
      setSelectedIds(new Set())
      setBulkSegment('')
      setBulkStatus('')
      setBulkAssignee('')
    },
    onError: (e) => setBulkResult(e instanceof Error ? e.message : 'Bulk update failed'),
  })

  function set<K extends keyof CustomerCreate>(key: K, value: CustomerCreate[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowForm((v) => !v)
  }

  function startEdit(c: Customer) {
    setEditing(c)
    setForm(toForm(c))
    setFormError(null)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleDelete(c: Customer) {
    setDeleteError(null)
    setConfirmDelete(c)
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const lk = lookups.data as Lookups | undefined
  const statusColor = new Map((lk?.statuses ?? []).map((s) => [s.name, s.color]))
  const total = stats?.total ?? customers?.length ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pageCustomers = customers ? [...customers].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'name') cmp = (a.customer_name ?? '').localeCompare(b.customer_name ?? '')
    else if (sortKey === 'status') cmp = (a.deal_status ?? '').localeCompare(b.deal_status ?? '')
    else if (sortKey === 'updated') cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
    return sortDir === 'asc' ? cmp : -cmp
  }) : []
  const allSelected = !!pageCustomers.length && pageCustomers.every((c) => selectedIds.has(c.id))

  function toggleSort(key: 'name' | 'status' | 'updated') {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }
  const sortArrow = (key: 'name' | 'status' | 'updated') =>
    sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''

  function formatRelative(iso: string) {
    const then = new Date(iso).getTime()
    const diff = Date.now() - then
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 30) return `${days}d ago`
    return new Date(iso).toLocaleDateString()
  }

  const kpiStrip = [
    { label: 'Customers', value: total, sub: totalPages > 1 ? `page ${page} of ${totalPages}` : 'total', icon: Users, bg: 'from-brand-teal to-brand-teal-dark' },
    { label: 'Open deals', value: stats?.open ?? 0, sub: 'in progress', icon: TrendingUp, bg: 'from-brand-cyan to-brand-teal' },
    { label: 'Completed', value: stats?.won ?? 0, sub: `${stats?.lost ?? 0} lost`, icon: Trophy, bg: 'from-green-500 to-emerald-600' },
    { label: 'Segments', value: stats?.segments ?? 0, sub: `${stats?.clouds ?? 0} cloud types`, icon: Layers, bg: 'from-navy-700 to-navy-900' },
  ]

  return (
    <div>
      <PageHead
        title="Customers"
        subtitle={`${total.toLocaleString()} opportunities across your pipeline`}
        actions={
          <Button icon={<Plus size={16} />} onClick={openCreate}>
            {showForm ? 'Close' : 'Add customer'}
          </Button>
        }
      />

      <div className="stagger mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiStrip.map((k) => (
          <div
            key={k.label}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-navy-900/10"
          >
            <div
              className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${k.bg} opacity-[0.08] transition-transform duration-500 group-hover:scale-150`}
            />
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold tracking-widest text-slate-500 uppercase">{k.label}</span>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${k.bg} text-white shadow-md`}>
                <k.icon size={17} />
              </span>
            </div>
            <div className="mt-3 font-display text-3xl font-bold text-navy-900">{k.value}</div>
            <div className="mt-1 text-xs text-slate-500">{k.sub}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <form
          className="scroll-fade brand-card mb-6 rounded-2xl border border-brand-teal/30 bg-white p-6 shadow-lg shadow-brand-teal/5"
          onSubmit={(e) => {
            e.preventDefault()
            setFormError(null)
            createMutation.mutate(form)
          }}
        >
          <div className="mb-5 flex items-center gap-2">
            <Users size={16} className="text-brand-teal" />
            <h2 className="font-display text-sm font-bold tracking-wide text-navy-900 uppercase">
              {editing ? `Edit · ${editing.customer_name}` : 'New customer'}
            </h2>
            <button
              type="button"
              className="ml-auto text-slate-400 hover:text-slate-600"
              onClick={() => {
                setShowForm(false)
                setEditing(null)
              }}
            >
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Customer name *">
              <input className={inputCls} required value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} placeholder="Acme Corp" />
            </Field>
            <Field label="Designation">
              <input className={inputCls} value={form.designation ?? ''} onChange={(e) => set('designation', e.target.value)} placeholder="CTO / IT Manager" />
            </Field>
            <Field label="Company name">
              <input className={inputCls} value={form.account_name ?? ''} onChange={(e) => set('account_name', e.target.value)} placeholder="Acme Inc." />
            </Field>
            <Field label="Email *">
              <input type="email" className={inputCls} required value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="name@company.com" />
            </Field>
            <Field label="Phone">
              <input className={inputCls} value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="City">
              <input className={inputCls} value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} />
            </Field>
            <Field label="Cloud operator">
              <input className={inputCls} value={form.cloud ?? ''} onChange={(e) => set('cloud', e.target.value)} list="cloud-ops" />
              <datalist id="cloud-ops">
                {lk?.cloud_operators.map((c) => <option key={c.id} value={c.name} />)}
              </datalist>
            </Field>
            <Field label="Segment">
              <select className={selectCls} value={form.segment ?? ''} onChange={(e) => set('segment', e.target.value)}>
                <option value="">—</option>
                {lk?.segments.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Deal status">
              <select className={selectCls} value={form.deal_status ?? ''} onChange={(e) => set('deal_status', e.target.value)}>
                <option value="">—</option>
                {lk?.statuses.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Assigned to">
              <select className={selectCls} value={form.assign_to_user_id ?? ''} onChange={(e) => set('assign_to_user_id', e.target.value ? Number(e.target.value) : null)}>
                <option value="">Unassigned</option>
                {lk?.users.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
              </select>
            </Field>
            <Field label="AWS ID">
              <input className={inputCls} value={form.aws_id ?? ''} onChange={(e) => set('aws_id', e.target.value)} placeholder="acc-12345" />
            </Field>
            <Field label="AWS calculator link">
              <div className="flex gap-1.5">
                <input className={inputCls} value={form.aws_calculator_link ?? ''} onChange={(e) => set('aws_calculator_link', e.target.value)} placeholder="https://calculator.aws/…" />
                <a
                  href="https://calculator.aws"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open AWS Pricing Calculator"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand-teal/30 bg-brand-teal/10 text-brand-teal-dark transition-colors hover:bg-brand-teal hover:text-white"
                >
                  <ExternalLink size={15} />
                </a>
              </div>
            </Field>
            <Field label="Opportunity ID">
              <input className={inputCls} value={form.opportunity_id ?? ''} onChange={(e) => set('opportunity_id', e.target.value)} placeholder="OPP-2026-001" />
            </Field>
            <Field label="Alternate emails">
              <input className={inputCls} value={form.alternate_emails ?? ''} onChange={(e) => set('alternate_emails', e.target.value)} placeholder="first@x.com, second@x.com" />
            </Field>
            <Field label="Website URL">
              <input className={inputCls} value={form.main_page_address ?? ''} onChange={(e) => set('main_page_address', e.target.value)} placeholder="https://www.acme.com" />
            </Field>
            <Field label="Billing">
              <input className={inputCls} value={form.billing ?? ''} onChange={(e) => set('billing', e.target.value)} placeholder="Invoice / PO details" />
            </Field>
            <Field label="Next action planned">
              <input className={inputCls} value={form.next_action_planned ?? ''} onChange={(e) => set('next_action_planned', e.target.value)} placeholder="Follow-up call on…" />
            </Field>
          </div>
          <Field label="Comment">
            <textarea
              className={`${inputCls} min-h-[80px] resize-y`}
              value={form.comment ?? ''}
              onChange={(e) => set('comment', e.target.value)}
              placeholder="Internal notes about this opportunity"
            />
          </Field>
          {formError && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{formError}</div>}
          <div className="mt-5 flex gap-2">
            <Button disabled={createMutation.isPending} type="submit">
              {createMutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Save customer'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowForm(false)
                setEditing(null)
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="stagger mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className={`${inputCls} pl-9`}
            placeholder="Search name, email, city, opp ID…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        {search && customers && customers.length > 0 && (
          <Button
            variant="ghost"
            icon={<CheckSquare size={15} />}
            onClick={() => {
              setBulkAllFilter(true)
              setBulkResult(null)
              window.scrollTo({ top: window.scrollY, behavior: 'smooth' })
            }}
          >
            Bulk-edit all matching
          </Button>
        )}
        {(total > 0) && (
          <Button
            variant="ghost"
            className="ml-auto text-red-500 hover:bg-red-50 hover:text-red-600"
            icon={<Trash2 size={15} />}
            onClick={() => setConfirmRemoveAll(true)}
          >
            Remove all
          </Button>
        )}
      </div>

      {(selectedIds.size > 0 || bulkAllFilter) && (
        <div className="scroll-fade brand-card mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-teal/40 bg-brand-teal/5 p-4 shadow-lg shadow-brand-teal/5">
          <span className="font-display text-xs font-bold tracking-widest text-brand-teal-dark uppercase">
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Bulk apply'}
          </span>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-navy-700">
            <input
              type="checkbox"
              checked={bulkAllFilter}
              onChange={(e) => {
                setBulkAllFilter(e.target.checked)
                setBulkResult(null)
              }}
              className="h-4 w-4 accent-brand-teal"
            />
            Apply to all matching current filter
            {search ? (
              <span className="text-brand-teal-dark">("{search}")</span>
            ) : (
              <span className="text-slate-400">(all customers)</span>
            )}
          </label>
          <select className={`${selectCls} w-auto`} value={bulkSegment} onChange={(e) => setBulkSegment(e.target.value)}>
            <option value="">Set segment…</option>
            {lk?.segments.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <select className={`${selectCls} w-auto`} value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
            <option value="">Set status…</option>
            {lk?.statuses.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <select className={`${selectCls} w-auto`} value={bulkAssignee} onChange={(e) => setBulkAssignee(e.target.value)}>
            <option value="">Assign to…</option>
            {lk?.users.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
          </select>
          <Button
            onClick={() => bulkMutation.mutate()}
            disabled={bulkMutation.isPending || (!bulkSegment && !bulkStatus && !bulkAssignee)}
          >
            {bulkMutation.isPending ? 'Applying…' : 'Apply'}
          </Button>
          <Button variant="ghost" onClick={() => {
            setSelectedIds(new Set())
            setBulkAllFilter(false)
            setBulkSegment('')
            setBulkStatus('')
            setBulkAssignee('')
            setBulkResult(null)
          }}>
            Clear
          </Button>
        </div>
      )}

      {bulkResult && (
        <div className="mb-4 rounded-2xl border border-brand-teal/30 bg-brand-teal/5 px-4 py-3 text-sm text-brand-teal-dark">
          {bulkResult}
        </div>
      )}

      {deleteError && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <span>{deleteError}</span>
          <button type="button" className="font-semibold text-red-500 hover:text-red-700" onClick={() => setDeleteError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-600">
          Failed to load customers. Please try again.
        </div>
      ) : isLoading ? (
        <Spinner label="Loading customers" />
      ) : (
        <div className="scroll-fade brand-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-brand-teal/5 via-white to-white px-5 py-3">
            <span className="font-display text-xs font-bold tracking-widest text-slate-500 uppercase">
              Opportunity list
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-teal/10 px-2.5 py-1 text-xs font-bold text-brand-teal-dark">
              {customers?.length ?? 0} shown
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 font-display text-[11px] font-bold tracking-widest text-slate-500 uppercase">
                  <th className="px-5 py-3.5 w-10">
                    <button
                      type="button"
                      className="text-brand-teal hover:text-brand-teal-dark"
                      onClick={() => {
                        setSelectedIds(allSelected ? new Set() : new Set(pageCustomers.map((c) => c.id)))
                      }}
                      title={allSelected ? 'Clear selection' : 'Select all'}
                    >
                      {allSelected ? <CheckSquare size={17} /> : <Square size={17} />}
                    </button>
                  </th>
                  <th className="px-5 py-3.5">
                    <button type="button" className="hover:text-brand-teal-dark" onClick={() => toggleSort('name')}>Name{sortArrow('name')}</button>
                  </th>
                  <th className="px-5 py-3.5">Company</th>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5">Segment</th>
                  <th className="px-5 py-3.5">
                    <button type="button" className="hover:text-brand-teal-dark" onClick={() => toggleSort('status')}>Status{sortArrow('status')}</button>
                  </th>
                  <th className="px-5 py-3.5">Owner</th>
                  <th className="px-5 py-3.5">City</th>
                  <th className="px-5 py-3.5 text-right">
                    <button type="button" className="hover:text-brand-teal-dark" onClick={() => toggleSort('updated')}>Updated{sortArrow('updated')}</button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageCustomers.map((c) => {
                  const owner = lk?.users.find((u) => u.id === c.assign_to_user_id)
                  const initial = (c.customer_name.trim()[0] ?? '?').toUpperCase()
                  return (
                    <tr key={c.id} className="group border-b border-slate-50 transition-colors last:border-0 hover:bg-brand-teal/[0.04]">
                      <td className="px-5 py-3.5">
                        <button type="button" className="text-slate-300 transition-colors hover:text-brand-teal" onClick={() => toggleSelect(c.id)}>
                          {selectedIds.has(c.id) ? <CheckSquare size={17} /> : <Square size={17} />}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 max-w-[220px]">
                        <Link to={`/customers/${c.id}`} className="group flex items-center gap-2.5">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-teal to-brand-teal-dark font-display text-sm font-bold text-white shadow-sm transition-transform duration-300 group-hover:scale-105">
                            {initial}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-navy-900 transition-colors group-hover:text-brand-teal-dark">
                              {c.customer_name}
                            </span>
                            {c.designation && (
                              <span className="block truncate text-xs text-slate-400">{c.designation}</span>
                            )}
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{c.account_name ?? '—'}</td>
                      <td className="px-5 py-3.5 text-slate-600">{c.email}</td>
                      <td className="px-5 py-3.5">{c.segment ? <Badge tone="teal">{c.segment}</Badge> : <span className="text-slate-400">—</span>}</td>
                      <td className="px-5 py-3.5">
                        {c.deal_status ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: statusColor.get(c.deal_status) ?? '#94a3b8' }} />
                            <Badge tone={c.deal_status === 'Won' ? 'green' : c.deal_status === 'Lost' ? 'coral' : 'navy'}>
                              {c.deal_status}
                            </Badge>
                          </span>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {owner ? <Badge tone="cyan">{owner.username}</Badge> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{c.city ?? '—'}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-xs text-slate-400" title={new Date(c.updated_at).toLocaleString()}>{formatRelative(c.updated_at)}</span>
                          <button
                            type="button"
                            className="ml-1 rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-brand-teal/10 hover:text-brand-teal-dark"
                            title="Edit"
                            onClick={() => startEdit(c)}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-600"
                            title="Delete"
                            onClick={() => handleDelete(c)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {pageCustomers.length === 0 && <EmptyState message="No customers found" />}
        </div>
      )}

      {totalPages > 1 && pageCustomers.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <span className="text-sm text-slate-500">
            Showing <span className="font-semibold text-navy-900">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</span> of{' '}
            <span className="font-semibold text-navy-900">{total.toLocaleString()}</span>
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" icon={<ChevronLeft size={16} />} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </Button>
            <span className="min-w-[80px] text-center font-display text-xs font-bold tracking-widest text-slate-500 uppercase">
              Page {page} / {totalPages}
            </span>
            <Button variant="ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Next <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div
            className="brand-card w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-label="Confirm delete"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 size={22} />
            </div>
            <h3 className="font-display text-lg font-bold text-navy-900">Delete customer?</h3>
            <p className="mt-2 text-sm text-slate-500">
              <span className="font-semibold text-navy-800">{confirmDelete.customer_name}</span> ({confirmDelete.email}) will be permanently removed. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-display text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-red-700 disabled:opacity-60"
                onClick={() => deleteMutation.mutate(confirmDelete.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 size={15} />
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmRemoveAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4 backdrop-blur-sm" onClick={() => setConfirmRemoveAll(false)}>
          <div
            className="brand-card w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-label="Remove all customers"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 size={22} />
            </div>
            <h3 className="font-display text-lg font-bold text-navy-900">Remove all customers?</h3>
            <p className="mt-2 text-sm text-slate-500">
              This will permanently delete all <span className="font-semibold text-red-600">{total.toLocaleString()}</span> customers
              and their related documents, SOWs, diagrams, and history. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmRemoveAll(false)}>Cancel</Button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-display text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-red-700 disabled:opacity-60"
                onClick={() => removeAllMutation.mutate()}
                disabled={removeAllMutation.isPending}
              >
                <Trash2 size={15} />
                {removeAllMutation.isPending ? 'Removing…' : 'Remove all'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}