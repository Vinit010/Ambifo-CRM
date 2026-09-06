import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Check, Copy, ExternalLink, Mail, Plus, X } from 'lucide-react'
import { customerApi, meetingApi } from '../api'
import type { MeetingAvailability, MeetingInvite } from '../api/types'
import { Badge, Button, EmptyState, Field, inputCls, PageHead, Panel, PanelTitle, selectCls, Spinner } from '../components/ui'

const ORIGIN = window.location.origin

const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString() : '—')
const toISO = (local: string) => (local ? new Date(local).toISOString() : '')
const statusTone = (s: string) =>
  s === 'selected' || s === 'submitted-form' ? 'green' : s === 'expired' ? 'coral' : s === 'sent' ? 'teal' : 'navy'

async function copy(text: string) {
  await navigator.clipboard.writeText(text)
  window.alert('Link copied to clipboard')
}

export default function MeetingsPage() {
  const [tab, setTab] = useState<'invites' | 'availability'>('invites')
  const TABS = [
    { key: 'invites', label: 'Invites', icon: Mail },
    { key: 'availability', label: 'Availability', icon: CalendarClock },
  ] as const

  return (
    <div>
      <PageHead title="Meetings" subtitle="Meeting invites & schedule-availability requests" />
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
        {tab === 'invites' ? <InvitesTab /> : <AvailabilityTab />}
      </div>
    </div>
  )
}

export function CustomersSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const customers = useQuery({ queryKey: ['customers'], queryFn: () => customerApi.list({ limit: 500 }) })
  return (
    <select className={selectCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select customer…</option>
      {customers.data?.map((c) => (
        <option key={c.id} value={c.id}>
          {c.customer_name || c.account_name} (id {c.id}) · {c.email}
        </option>
      ))}
    </select>
  )
}

// ------------------------------------------------------------------ invites
function InvitesTab() {
  const queryClient = useQueryClient()
  const invites = useQuery({ queryKey: ['meeting-invites'], queryFn: () => meetingApi.invites() })
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    customer_id: '',
    recipient_email: '',
    subject: '',
    meeting_link: '',
    agenda: '',
    required_data: '',
    scheduled_at: '',
  })

  const create = useMutation({
    mutationFn: () =>
      meetingApi.createInvite({
        customer_id: Number(form.customer_id),
        recipient_email: form.recipient_email || null,
        subject: form.subject || null,
        meeting_link: form.meeting_link,
        agenda: form.agenda || null,
        required_data: form.required_data || null,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-invites'] })
      queryClient.invalidateQueries({ queryKey: ['email-logs'] })
      setShowForm(false)
      setError(null)
      setForm({ customer_id: '', recipient_email: '', subject: '', meeting_link: '', agenda: '', required_data: '', scheduled_at: '' })
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Create failed'),
  })

  const remove = useMutation({
    mutationFn: (id: number) => meetingApi.deleteInvite(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meeting-invites'] }),
  })

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {showForm && (
        <Panel className="scroll-fade h-fit lg:col-span-1">
          <div className="flex items-center justify-between">
            <PanelTitle>
              <Mail size={15} className="text-brand-teal" /> New invite
            </PanelTitle>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3">
            <Field label="Customer">
              <CustomersSelect
                value={form.customer_id}
                onChange={(v) => setForm({ ...form, customer_id: v })}
              />
            </Field>
            <Field label="Meeting link">
              <input
                className={inputCls}
                placeholder="https://teams.google.com/…"
                value={form.meeting_link}
                onChange={(e) => setForm({ ...form, meeting_link: e.target.value })}
              />
            </Field>
            <Field label="Recipient (defaults to customer email)">
              <input
                className={inputCls}
                type="email"
                placeholder="someone@company.com"
                value={form.recipient_email}
                onChange={(e) => setForm({ ...form, recipient_email: e.target.value })}
              />
            </Field>
            <Field label="Subject">
              <input
                className={inputCls}
                placeholder="Meeting with Ambifo"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </Field>
            <Field label="Scheduled at">
              <input
                className={inputCls}
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
              />
            </Field>
            <Field label="Agenda">
              <textarea
                className={inputCls}
                rows={3}
                value={form.agenda}
                onChange={(e) => setForm({ ...form, agenda: e.target.value })}
              />
            </Field>
            <Field label="Required data / materials">
              <textarea
                className={inputCls}
                rows={3}
                value={form.required_data}
                onChange={(e) => setForm({ ...form, required_data: e.target.value })}
              />
            </Field>
            {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
            <Button
              className="w-full"
              icon={<Plus size={16} />}
              disabled={!form.customer_id || !form.meeting_link || create.isPending}
              onClick={() => create.mutate()}
            >
              Create & send invite
            </Button>
          </div>
        </Panel>
      )}
      <div className={`${showForm ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
        <Panel className="scroll-fade">
          <div className="flex items-center justify-between">
            <PanelTitle>
              <Mail size={15} className="text-brand-teal" /> Invites
            </PanelTitle>
            {!showForm && (
              <Button variant="outline" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>
                New invite
              </Button>
            )}
          </div>
          {invites.isLoading ? (
            <Spinner label="Loading invites" />
          ) : !invites.data?.length ? (
            <EmptyState message="No meeting invites yet" />
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left font-display text-xs font-bold tracking-wide text-slate-500 uppercase">
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Recipient</th>
                    <th className="px-3 py-2">Meeting</th>
                    <th className="px-3 py-2">Created</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.data.map((i: MeetingInvite) => (
                    <tr key={i.id} className="border-b border-slate-100 last:border-0 hover:bg-brand-teal/5">
                      <td className="px-3 py-3 font-display font-semibold text-navy-900">
                        {i.customer_name ?? `#${i.customer_id}`}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{i.recipient_email}</td>
                      <td className="px-3 py-3">
                        <a
                          href={i.meeting_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-brand-teal-dark hover:underline"
                        >
                          {i.agenda || i.subject} <ExternalLink size={12} />
                        </a>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-400">{fmt(i.created_at)}</td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => remove.mutate(i.id)}
                          className="text-slate-400 transition-colors hover:text-red-600"
                          title="Delete invite"
                        >
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ availability
function AvailabilityTab() {
  const queryClient = useQueryClient()
  const list = useQuery({ queryKey: ['meeting-availability'], queryFn: () => meetingApi.availabilityList() })
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ customer_id: '', option_1_at: '', option_2_at: '', option_3_at: '', recipient_email: '', expires_days: '7' })

  const create = useMutation({
    mutationFn: () =>
      meetingApi.createAvailability({
        customer_id: Number(form.customer_id),
        option_1_at: toISO(form.option_1_at),
        option_2_at: toISO(form.option_2_at),
        option_3_at: toISO(form.option_3_at),
        recipient_email: form.recipient_email || null,
        expires_days: Number(form.expires_days) || 7,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-availability'] })
      queryClient.invalidateQueries({ queryKey: ['email-logs'] })
      setShowForm(false)
      setError(null)
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Create failed'),
  })

  const optionsValid = form.option_1_at && form.option_2_at && form.option_3_at

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {showForm && (
        <Panel className="scroll-fade h-fit lg:col-span-1">
          <div className="flex items-center justify-between">
            <PanelTitle>
              <CalendarClock size={15} className="text-brand-teal" /> New availability request
            </PanelTitle>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3">
            <Field label="Customer">
              <CustomersSelect value={form.customer_id} onChange={(v) => setForm({ ...form, customer_id: v })} />
            </Field>
            {[1, 2, 3].map((n) => (
              <Field key={n} label={`Option ${n} — suggested time`}>
                <input
                  className={inputCls}
                  type="datetime-local"
                  value={form[`option_${n}_at` as keyof typeof form] as string}
                  onChange={(e) => setForm({ ...form, [`option_${n}_at`]: e.target.value } as typeof form)}
                />
              </Field>
            ))}
            <Field label="Recipient (defaults to customer email)">
              <input
                className={inputCls}
                type="email"
                placeholder="someone@company.com"
                value={form.recipient_email}
                onChange={(e) => setForm({ ...form, recipient_email: e.target.value })}
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
            {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
            <Button
              className="w-full"
              icon={<Plus size={16} />}
              disabled={!form.customer_id || !optionsValid || create.isPending}
              onClick={() => create.mutate()}
            >
              Create & email the link
            </Button>
          </div>
        </Panel>
      )}
      <div className={`${showForm ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
        <Panel className="scroll-fade">
          <div className="flex items-center justify-between">
            <PanelTitle>
              <CalendarClock size={15} className="text-brand-teal" /> Availability requests
            </PanelTitle>
            {!showForm && (
              <Button variant="outline" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>
                New request
              </Button>
            )}
          </div>
          {list.isLoading ? (
            <Spinner label="Loading requests" />
          ) : !list.data?.length ? (
            <EmptyState message="No availability requests yet" />
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left font-display text-xs font-bold tracking-wide text-slate-500 uppercase">
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Options</th>
                    <th className="px-3 py-2">Response</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Public link</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.map((a: MeetingAvailability) => (
                    <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-brand-teal/5">
                      <td className="px-3 py-3 font-display font-semibold text-navy-900">
                        {a.customer_name ?? `#${a.customer_id}`}
                      </td>
                      <td className="px-3 py-3">
                        <div className="space-y-0.5 text-xs text-slate-600">
                          {[a.option_1_at, a.option_2_at, a.option_3_at].map((o, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              {idx + 1}. {fmt(o)}
                              {a.selected_option === idx + 1 && <Check size={13} className="text-brand-teal" />}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600">
                        {a.selected_option
                          ? `Selected option ${a.selected_option} (${fmt([a.option_1_at, a.option_2_at, a.option_3_at][a.selected_option - 1])})`
                          : a.status === 'submitted-form'
                            ? 'Custom slots'
                            : a.status === 'selected'
                              ? 'Selected'
                              : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={statusTone(a.status) as never}>{a.status}</Badge>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => copy(`${ORIGIN}/public/meetings/${a.token}`)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:border-brand-teal hover:text-brand-teal-dark"
                          title="Copy public link"
                        >
                          <Copy size={13} /> Copy
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}