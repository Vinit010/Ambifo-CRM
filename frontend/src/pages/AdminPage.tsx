import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Plus, RefreshCcw, Shield, UserCog } from 'lucide-react'
import { adminApi } from '../api'
import type { User } from '../api/types'
import { useAuth } from '../auth'
import { Badge, Button, Field, inputCls, PageHead, Panel, Spinner } from '../components/ui'

export default function AdminPage() {
  return (
    <div>
      <PageHead title="Admin" subtitle="User management & roles" />
      <UsersTab />
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

