import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Mail, Plus, RefreshCcw, Shield, UserCog, Users2 } from 'lucide-react'
import { adminApi, customerApi, emailApi } from '../api'
import type { BulkEmailMode, EmailBulkResult, User } from '../api/types'
import { useAuth } from '../auth'
import { Badge, Button, EmptyState, Field, inputCls, PageHead, Panel, selectCls, Spinner } from '../components/ui'

export default function AdminPage() {
  const [tab, setTab] = useState<'users' | 'bulk'>('users')

  const TABS = [
    { key: 'users', label: 'Users & Roles', icon: Users2 },
    { key: 'bulk', label: 'Bulk Email', icon: Mail },
  ] as const

  return (
    <div>
      <PageHead title="Admin" subtitle="User management & bulk operations" />

      <div className="scroll-fade mb-5 flex w-fit gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-display text-sm font-bold transition-all duration-300 ${
              tab === t.key ? 'bg-navy-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      <div key={tab} className="animate-fade-in">
        {tab === 'users' ? <UsersTab /> : <BulkEmailTab />}
      </div>
    </div>
  )
}

function UsersTab() {
  const queryClient = useQueryClient()
  const { user: me } = useAuth()
  const users = useQuery({ queryKey: ['admin-users'], queryFn: () => adminApi.users() })

  const [showCreate, setShowCreate] = useState(false)
  const [edit, setEdit] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    is_admin: false,
  })
  const [editForm, setEditForm] = useState({ full_name: '', email: '', is_admin: false, new_password: '' })
  const [resetAllPassword, setResetAllPassword] = useState('')

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createUser({
        username: form.username,
        email: form.email,
        password: form.password,
        full_name: form.full_name || null,
        is_admin: form.is_admin,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setShowCreate(false)
      setForm({ username: '', email: '', password: '', full_name: '', is_admin: false })
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Create failed'),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number } & Parameters<typeof adminApi.updateUser>[1]) =>
      adminApi.updateUser(payload.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setEdit(null)
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Update failed'),
  })

  const resetAllMutation = useMutation({
    mutationFn: () => adminApi.resetAllPasswords(resetAllPassword),
    onSuccess: (res) => {
      setResetAllPassword('')
      setError(null)
      window.alert(`Password reset for ${res.updated} active user(s)`)
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Reset failed'),
  })

  function toggleActive(u: User, active: boolean) {
    setError(null)
    updateMutation.mutate({ id: u.id, is_active: active })
  }

  function deleteUser(u: User) {
    if (!window.confirm(`Deactivate user '${u.username}'? This cannot be done to your own account.`)) return
    setError(null)
    updateMutation.mutate({ id: u.id, is_active: false })
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Panel className="scroll-fade h-fit lg:col-span-1">
        <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold tracking-wide text-navy-900 uppercase">
          <UserCog size={15} className="text-brand-teal" /> Users
        </h2>
        {users.isLoading ? (
          <Spinner label="Loading users" />
        ) : (
          <div className="space-y-2">
            {users.data?.map((u) => (
              <div key={u.id} className="group rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:border-brand-teal/30">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold text-white ${u.is_admin ? 'bg-gradient-to-br from-brand-teal to-brand-cyan' : 'bg-slate-400'}`}>
                      {u.username.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-display text-sm font-bold text-navy-900">{u.username}</span>
                        {u.id === me?.id && <Badge tone="neutral">you</Badge>}
                      </div>
                      <div className="truncate text-xs text-slate-400">{u.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge tone={u.is_admin ? 'teal' : 'neutral'}>{u.is_admin ? 'admin' : 'user'}</Badge>
                    <Badge tone={u.is_active ? 'green' : 'coral'}>{u.is_active ? 'active' : 'off'}</Badge>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:border-brand-teal/40 hover:text-brand-teal-dark"
                    onClick={() => {
                      setEdit(u)
                      setEditForm({ full_name: u.full_name ?? '', email: u.email, is_admin: u.is_admin, new_password: '' })
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:border-brand-teal/40 hover:text-brand-teal-dark"
                    onClick={() => u.is_active ? deleteUser(u) : toggleActive(u, true)}
                  >
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel className="scroll-fade lg:col-span-2" style={{ animationDelay: '0.1s' }}>
        <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold tracking-wide text-navy-900 uppercase">
          <Shield size={15} className="text-brand-teal" /> Administrator actions
        </h2>

        {showCreate ? (
          <form
            className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-brand-teal/20 bg-brand-teal/5 p-5 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              setError(null)
              createMutation.mutate()
            }}
          >
            <Field label="Username *">
              <input className={inputCls} required value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
            </Field>
            <Field label="Email *">
              <input className={inputCls} required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </Field>
            <Field label="Full name">
              <input className={inputCls} value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            </Field>
            <Field label="Password *">
              <input className={inputCls} required minLength={6} type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={form.is_admin} onChange={(e) => setForm((f) => ({ ...f, is_admin: e.target.checked }))} className="h-4 w-4 accent-brand-teal" />
              Grant admin (role) rights
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating…' : 'Create user'}</Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </form>
        ) : (
          <Button icon={<Plus size={15} />} onClick={() => setShowCreate(true)} className="mb-6">
            Add user
          </Button>
        )}

        {edit && (
          <form
            className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-brand-teal/20 bg-brand-teal/5 p-5 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              setError(null)
              const payload: Parameters<typeof adminApi.updateUser>[1] = {
                full_name: editForm.full_name || null,
                email: editForm.email,
                is_admin: editForm.is_admin,
              }
              if (editForm.new_password) payload.new_password = editForm.new_password
              updateMutation.mutate({ id: edit.id, ...payload })
            }}
          >
            <Field label="Username">
              <input className={`${inputCls} bg-slate-100`} value={edit.username} disabled readOnly />
            </Field>
            <Field label="Email *">
              <input className={inputCls} required type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
            </Field>
            <Field label="Full name">
              <input className={inputCls} value={editForm.full_name} onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))} />
            </Field>
            <Field label="New password (leave blank to keep)">
              <input className={inputCls} minLength={6} type="password" value={editForm.new_password} onChange={(e) => setEditForm((f) => ({ ...f, new_password: e.target.value }))} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={editForm.is_admin} onChange={(e) => setEditForm((f) => ({ ...f, is_admin: e.target.checked }))} className="h-4 w-4 accent-brand-teal" />
              Grant admin (role) rights
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Saving…' : 'Save changes'}</Button>
              <Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
            </div>
          </form>
        )}

        <div className="rounded-2xl border border-slate-200 p-5">
          <div className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-navy-900">
            <KeyRound size={15} className="text-brand-teal" /> Reset every active user's password
          </div>
          <p className="mb-3 text-xs text-slate-400">
            Sets a single shared password for all active accounts — use only to recover from an outage.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className={`${inputCls} sm:max-w-60`}
              type="password"
              minLength={6}
              value={resetAllPassword}
              onChange={(e) => setResetAllPassword(e.target.value)}
              placeholder="New shared password…"
            />
            <Button
              variant="secondary"
              disabled={resetAllMutation.isPending || resetAllPassword.length < 6}
              onClick={() => resetAllMutation.mutate()}
            >
              <RefreshCcw size={15} /> Reset all
            </Button>
          </div>
        </div>

        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">⚠ {error}</div>}
      </Panel>
    </div>
  )
}

function BulkEmailTab() {
  const queryClient = useQueryClient()
  const lookups = useQuery({ queryKey: ['lookups'], queryFn: () => customerApi.lookups() })
  const customers = useQuery({ queryKey: ['customers'], queryFn: () => customerApi.list({ limit: 500 }) })
  const templates = useQuery({ queryKey: ['email-templates'], queryFn: () => emailApi.templates() })
  const logs = useQuery({ queryKey: ['email-logs'], queryFn: () => emailApi.logs() })

  const [mode, setMode] = useState<BulkEmailMode>('all_customers')
  const [templateId, setTemplateId] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [filterValue, setFilterValue] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [manual, setManual] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<EmailBulkResult | null>(null)

  const sendMutation = useMutation({
    mutationFn: () =>
      emailApi.bulk({
        mode,
        template_id: templateId ? Number(templateId) : null,
        subject: subject || null,
        body: body || null,
        filter_value: filterValue || null,
        customer_ids: mode === 'select_customers' ? selectedIds : undefined,
        manual_emails: manual.split(/[\n,\s]+/).map((m) => m.trim()).filter(Boolean),
      }),
    onSuccess: (res) => {
      setResult(res)
      queryClient.invalidateQueries({ queryKey: ['email-logs'] })
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Bulk send failed'),
  })

  const retryMutation = useMutation({
    mutationFn: () => emailApi.retryFailed(),
    onSuccess: (res) => {
      setResult(res)
      queryClient.invalidateQueries({ queryKey: ['email-logs'] })
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Retry failed'),
  })

  const recipientCount = mode === 'all_customers'
    ? (customers.data?.filter((c) => c.email).length ?? 0)
    : mode === 'customers_by_status' || mode === 'customers_by_segment'
      ? (customers.data?.filter((c) => (mode === 'customers_by_status' ? c.deal_status === filterValue : c.segment === filterValue) && c.email).length ?? 0)
      : mode === 'select_customers'
        ? selectedIds.length
        : mode === 'manual_emails'
          ? manual.split(/[\n,\s]+/).filter(Boolean).length
          : '? (leads)'

  const failedCount = logs.data?.items?.filter((l) => l.status === 'failed').length ?? 0

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Panel className="scroll-fade lg:col-span-2">
        <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold tracking-wide text-navy-900 uppercase">
          <Mail size={15} className="text-brand-teal" /> Send bulk email
        </h2>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            setResult(null)
            sendMutation.mutate()
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Recipients">
              <select className={selectCls} value={mode} onChange={(e) => setMode(e.target.value as BulkEmailMode)}>
                <option value="all_customers">All customers</option>
                <option value="all_leads">All active leads</option>
                <option value="customers_by_status">Customers by deal status</option>
                <option value="customers_by_segment">Customers by segment</option>
                <option value="select_customers">Select specific customers</option>
                <option value="manual_emails">Manual email list</option>
              </select>
            </Field>
            <Field label="Template (optional)">
              <select className={selectCls} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                <option value="">— raw subject/body —</option>
                {templates.data?.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </Field>
            {(mode === 'customers_by_status' || mode === 'customers_by_segment') && (
              <Field label={mode === 'customers_by_status' ? 'Deal status' : 'Segment'}>
                <select className={selectCls} value={filterValue} onChange={(e) => setFilterValue(e.target.value)}>
                  <option value="">— select —</option>
                  {(mode === 'customers_by_status' ? lookups.data?.statuses : lookups.data?.segments)?.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </Field>
            )}
            {mode === 'manual_emails' && (
              <Field label="Emails (comma or line separated)">
                <textarea className={`${inputCls} min-h-[70px] font-mono text-xs`} value={manual} onChange={(e) => setManual(e.target.value)} placeholder="a@x.com, b@y.com" />
              </Field>
            )}
            {mode === 'select_customers' && (
              <Field label="Select customers">
                <div className="max-h-[200px] space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                  {customers.data?.filter(c => c.email).map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-xs text-slate-600 hover:bg-slate-50 rounded-lg px-2 py-1">
                      <input type="checkbox" className="h-3.5 w-3.5 accent-brand-teal" checked={selectedIds.includes(c.id)} onChange={(e) => {
                        setSelectedIds((ids) => e.target.checked ? [...ids, c.id] : ids.filter((id) => id !== c.id))
                      }} />
                      <span className="truncate">{c.customer_name}</span>
                      <span className="ml-auto text-slate-400">{c.email}</span>
                    </label>
                  ))}
                </div>
              </Field>
            )}
            <Field label="Subject">
              <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Supports {{customer_name}}" />
            </Field>
            <Field label="Body">
              <textarea className={`${inputCls} min-h-[140px]`} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Hi {{customer_name}},…" />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button icon={<Mail size={15} />} disabled={sendMutation.isPending}>
              {sendMutation.isPending ? 'Sending…' : 'Send to all'}
            </Button>
            <Button variant="ghost" disabled>
              <RefreshCcw size={14} /> will target {recipientCount} recipient(s)
            </Button>
          </div>
        </form>

        <div className="mt-6 rounded-2xl border border-slate-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-display text-sm font-bold text-navy-900">
              <RefreshCcw size={15} className="text-brand-teal" /> Failed emails
              <Badge tone={failedCount > 0 ? 'coral' : 'green'}>{failedCount}</Badge>
            </div>
            <Button variant="secondary" className="!px-3 !py-1.5 text-xs" disabled={retryMutation.isPending || failedCount === 0} onClick={() => { setError(null); setResult(null); retryMutation.mutate() }}>
              {retryMutation.isPending ? 'Re-queuing…' : 'Retry all failed'}
            </Button>
          </div>
        </div>
      </Panel>

      <Panel className="scroll-fade h-fit lg:col-span-1" style={{ animationDelay: '0.1s' }}>
        <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold tracking-wide text-navy-900 uppercase">
          <Mail size={15} className="text-brand-teal" /> Result
        </h2>
        {sendMutation.isPending || retryMutation.isPending ? (
          <Spinner label="Working…" />
        ) : result ? (
          <div className={result.failed > 0 ? 'rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700' : 'rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700'}>
            <div className="font-display font-bold">
              {result.queued} queued · {result.failed} failed · {result.attempted} attempted
            </div>
            <div className="mt-1 text-xs">mode: {result.mode}</div>
            {result.errors.length > 0 && (
              <ul className="mt-2 max-h-40 list-inside list-disc space-y-0.5 overflow-y-auto text-xs">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        ) : (
          <EmptyState message="Run a bulk send to see the outcome" />
        )}
        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">⚠ {error}</div>}
      </Panel>
    </div>
  )
}