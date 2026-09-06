import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { KeyRound, Plus, Server, Trash2 } from 'lucide-react'
import { publicGatheringApi } from '../api'
import type { GatheringBlockRow, GatheringFileNasRow, GatheringServerRow } from '../api/types'
import PublicShell, { PublicError, PublicThanks } from '../components/PublicShell'
import { Button, Field, inputCls, Spinner } from '../components/ui'

const num = (v: string) => (v === '' ? null : Number(v))

function errorMessage(e: unknown): string {
  if (e instanceof Error) {
    if (e.message.includes('expired')) return 'This gathering link has expired.'
    if (e.message.includes('locked')) return 'This gathering request has been locked.'
    if (e.message.includes('key')) return 'The access key is incorrect. Please try again.'
    return e.message
  }
  return 'Something went wrong.'
}

function emptyServer(): GatheringServerRow {
  return {
    server_name: '', cpu_cores: null, memory_mb: null, provisioned_storage_gb: null,
    operating_system: '', is_virtual: false, hypervisor_name: '', cpu_string: '',
    environment: '', sql_edition: '', application: '', cpu_utilization_peak: null,
    memory_utilization_peak: null, time_in_use: null, annual_cost_usd: null, storage_type: '',
  }
}

function emptyBlock(): GatheringBlockRow {
  return {
    volume_name: '', total_used_capacity_gb: null, total_provisioned_capacity_gb: null,
    peak_iops: null, peak_throughput_mbps: null, average_iops: null,
    average_throughput_mbps: null, array_name: '', average_latency_ms: null, application: '',
  }
}

function emptyNas(): GatheringFileNasRow {
  return {
    file_server_share_name: '', total_used_capacity_gb: null, access_protocol: '',
    total_provisioned_capacity_gb: null, storage_efficiency_ratio: null, peak_iops: null,
    peak_throughput_mbps: null, average_iops: null, average_throughput_mbps: null,
    storage_pool_name: '', array_name: '', array_vendor: '', average_latency_ms: null, application: '',
  }
}

export default function PublicGatheringPage() {
  const { token = '' } = useParams()
  const info = useQuery({
    queryKey: ['pub-gathering', token],
    queryFn: () => publicGatheringApi.info(token),
    retry: false,
  })
  const [verified, setVerified] = useState<null | boolean>(null)
  const [key, setKey] = useState('')
  const [keyError, setKeyError] = useState<string | null>(null)
  const [verifyPending, setVerifyPending] = useState(false)
  const [editing, setEditing] = useState(false)

  if (info.isLoading)
    return (
      <PublicShell>
        <Spinner label="Loading" />
      </PublicShell>
    )
  if (info.error)
    return (
      <PublicShell>
        <PublicError message={errorMessage(info.error)} />
      </PublicShell>
    )

  const g = info.data
  const needsKey = Boolean(g && g.access_key_hint) && !(g && g.access_verified_at) && verified !== true

  if (!g)
    return (
      <PublicShell>
        <Spinner label="Loading" />
      </PublicShell>
    )

  if (needsKey)
    return (
      <PublicShell>
        <h1 className="mb-1 font-display text-2xl font-bold text-navy-900">Verify access</h1>
        <p className="mb-6 text-sm text-slate-500">
          Key ends in <b>{g.access_key_hint}</b>
        </p>
        <div className="brand-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Field label="Access key">
            <input
              className={inputCls}
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Enter your access key"
            />
          </Field>
          {keyError && <p className="mt-2 text-xs font-semibold text-red-600">{keyError}</p>}
          <div className="mt-4">
            <Button
              icon={<KeyRound size={16} />}
              disabled={!key || verifyPending}
              onClick={() => {
                setVerifyPending(true)
                setKeyError(null)
                publicGatheringApi
                  .verify(token, key)
                  .then(() => setVerified(true))
                  .catch((e) => setKeyError(errorMessage(e)))
                  .finally(() => setVerifyPending(false))
              }}
            >
              Verify & continue
            </Button>
          </div>
        </div>
      </PublicShell>
    )

  if (g.status === 'submitted' && !editing)
    return (
      <PublicShell>
        <PublicThanks
          title="We've received your infrastructure details."
          message="Thank you — our team will review it and get back to you."
        />
        <div className="mt-4 text-center">
          <button onClick={() => setEditing(true)} className="text-sm text-slate-400 hover:text-slate-600">
            Edit my submission
          </button>
        </div>
      </PublicShell>
    )

  return <GatheringForm token={token} />
}

function GatheringForm({ token }: { token: string }) {
  const [website, setWebsite] = useState('')
  const [tools, setTools] = useState('')
  const [pains, setPains] = useState('')
  const [servers, setServers] = useState<GatheringServerRow[]>([])
  const [blocks, setBlocks] = useState<GatheringBlockRow[]>([])
  const [nas, setNas] = useState<GatheringFileNasRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = useMutation({
    mutationFn: () =>
      publicGatheringApi.submit(token, {
        company_website: website || null,
        current_tools: tools || null,
        pain_points: pains || null,
        servers,
        block_storage: blocks,
        file_nas: nas,
      }),
    onSuccess: () => setDone(true),
    onError: (e) => setError(errorMessage(e)),
  })

  return (
    <PublicShell>
      {done ? (
        <PublicThanks
          title="Your infrastructure details were submitted."
          message="Thank you — our team will review it and get back to you."
        />
      ) : (
        <>
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-navy-900">Infrastructure details</h1>
            <p className="mt-1 text-sm text-slate-500">
              Tell us about your servers, block storage and file/NAS shares. Add at least one server.
            </p>
          </div>
          <div className="space-y-5">
            <section className="brand-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-3 font-display text-sm font-bold tracking-wide text-navy-900 uppercase">
                Company context
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <TextField label="Company website" v={website} onChange={setWebsite} placeholder="https://…" />
                <TextField label="Current tools / platforms" v={tools} onChange={setTools} placeholder="VMware, NetApp…" />
                <TextField label="Main pain points" v={pains} onChange={setPains} placeholder="Costs, capacity, ops…" />
              </div>
            </section>

            <CollectionSection
              title="Servers"
              count={servers.length}
              onAdd={() => setServers([...servers, emptyServer()])}
            >
              {servers.map((s, i) => (
                <ServerRow
                  key={i}
                  row={s}
                  index={i}
                  onChange={(patch) => setServers(servers.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))}
                  onRemove={() => setServers(servers.filter((_, idx) => idx !== i))}
                />
              ))}
            </CollectionSection>

            <CollectionSection
              title="Block storage"
              count={blocks.length}
              onAdd={() => setBlocks([...blocks, emptyBlock()])}
            >
              {blocks.map((b, i) => (
                <BlockRow
                  key={i}
                  row={b}
                  index={i}
                  onChange={(patch) => setBlocks(blocks.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))}
                  onRemove={() => setBlocks(blocks.filter((_, idx) => idx !== i))}
                />
              ))}
            </CollectionSection>

            <CollectionSection title="File / NAS" count={nas.length} onAdd={() => setNas([...nas, emptyNas()])}>
              {nas.map((f, i) => (
                <NasRow
                  key={i}
                  row={f}
                  index={i}
                  onChange={(patch) => setNas(nas.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))}
                  onRemove={() => setNas(nas.filter((_, idx) => idx !== i))}
                />
              ))}
            </CollectionSection>

            {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
            <Button className="w-full" disabled={submit.isPending || !servers.length} onClick={() => submit.mutate()}>
              Submit infrastructure details
            </Button>
            {!servers.length && <p className="text-center text-xs text-slate-400">Add at least one server row.</p>}
          </div>
        </>
      )}
    </PublicShell>
  )
}

function CollectionSection({
  title,
  count,
  onAdd,
  children,
}: {
  title: string
  count: number
  onAdd: () => void
  children: React.ReactNode
}) {
  return (
    <section className="brand-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-sm font-bold tracking-wide text-navy-900 uppercase">
          <Server size={15} /> {title} ({count})
        </h2>
        <Button variant="outline" icon={<Plus size={15} />} onClick={onAdd}>
          Add row
        </Button>
      </div>
      {count ? <div className="space-y-4">{children}</div> : <p className="py-4 text-sm text-slate-400">No rows yet.</p>}
    </section>
  )
}

function RowFrame({ label, onRemove, children, required }: { label: string; onRemove: () => void; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <div className="flex items-center justify-between">
        <span className={`font-display text-xs font-bold tracking-wide uppercase ${required ? 'text-navy-900' : 'text-slate-500'}`}>
          {label} {required && <span className="text-brand-coral">*</span>}
        </span>
        <button
          onClick={onRemove}
          className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition-colors hover:border-red-300 hover:text-red-500"
          title="Remove row"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {children}
    </div>
  )
}

function ServerRow({
  row,
  index,
  onChange,
  onRemove,
}: {
  row: GatheringServerRow
  index: number
  onChange: (patch: Partial<GatheringServerRow>) => void
  onRemove: () => void
}) {
  return (
    <RowFrame label={`Server ${index + 1}`} required={!row.server_name} onRemove={onRemove}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TextField label="Server name" v={row.server_name} onChange={(x) => onChange({ server_name: x })} />
        <NumField label="CPU cores" v={row.cpu_cores} onChange={(x) => onChange({ cpu_cores: num(x) })} />
        <NumField label="Memory (MB)" v={row.memory_mb} onChange={(x) => onChange({ memory_mb: num(x) })} />
        <NumField label="Provisioned storage (GB)" v={row.provisioned_storage_gb} onChange={(x) => onChange({ provisioned_storage_gb: num(x) })} />
        <TextField label="Operating system" v={row.operating_system} onChange={(x) => onChange({ operating_system: x })} />
        <label className="flex items-center gap-2 pt-5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={Boolean(row.is_virtual)}
            onChange={(e) => onChange({ is_virtual: e.target.checked })}
            className="h-4 w-4 accent-brand-teal"
          />
          Virtual machine
        </label>
        <TextField label="Hypervisor" v={row.hypervisor_name} onChange={(x) => onChange({ hypervisor_name: x })} />
        <TextField label="CPU model" v={row.cpu_string} onChange={(x) => onChange({ cpu_string: x })} />
        <TextField label="Environment" v={row.environment} onChange={(x) => onChange({ environment: x })} />
        <TextField label="SQL edition" v={row.sql_edition} onChange={(x) => onChange({ sql_edition: x })} />
        <TextField label="Key application" v={row.application} onChange={(x) => onChange({ application: x })} />
        <TextField label="Storage type" v={row.storage_type} onChange={(x) => onChange({ storage_type: x })} />
        <NumField label="Peak CPU util (%)" v={row.cpu_utilization_peak} onChange={(x) => onChange({ cpu_utilization_peak: num(x) })} />
        <NumField label="Peak MEM util (%)" v={row.memory_utilization_peak} onChange={(x) => onChange({ memory_utilization_peak: num(x) })} />
        <NumField label="Hours in use" v={row.time_in_use} onChange={(x) => onChange({ time_in_use: num(x) })} />
        <NumField label="Annual cost (USD)" v={row.annual_cost_usd} onChange={(x) => onChange({ annual_cost_usd: num(x) })} />
      </div>
    </RowFrame>
  )
}

function BlockRow({
  row,
  index,
  onChange,
  onRemove,
}: {
  row: GatheringBlockRow
  index: number
  onChange: (patch: Partial<GatheringBlockRow>) => void
  onRemove: () => void
}) {
  return (
    <RowFrame label={`Volume ${index + 1}`} required={!row.volume_name} onRemove={onRemove}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TextField label="Volume name" v={row.volume_name} onChange={(x) => onChange({ volume_name: x })} />
        <NumField label="Used (GB)" v={row.total_used_capacity_gb} onChange={(x) => onChange({ total_used_capacity_gb: num(x) })} />
        <NumField label="Provisioned (GB)" v={row.total_provisioned_capacity_gb} onChange={(x) => onChange({ total_provisioned_capacity_gb: num(x) })} />
        <NumField label="Peak IOPS" v={row.peak_iops} onChange={(x) => onChange({ peak_iops: num(x) })} />
        <NumField label="Peak throughput (MB/s)" v={row.peak_throughput_mbps} onChange={(x) => onChange({ peak_throughput_mbps: num(x) })} />
        <NumField label="Avg IOPS" v={row.average_iops} onChange={(x) => onChange({ average_iops: num(x) })} />
        <NumField label="Avg throughput (MB/s)" v={row.average_throughput_mbps} onChange={(x) => onChange({ average_throughput_mbps: num(x) })} />
        <TextField label="Array name" v={row.array_name} onChange={(x) => onChange({ array_name: x })} />
        <NumField label="Avg latency (ms)" v={row.average_latency_ms} onChange={(x) => onChange({ average_latency_ms: num(x) })} />
        <TextField label="Application" v={row.application} onChange={(x) => onChange({ application: x })} />
      </div>
    </RowFrame>
  )
}

function NasRow({
  row,
  index,
  onChange,
  onRemove,
}: {
  row: GatheringFileNasRow
  index: number
  onChange: (patch: Partial<GatheringFileNasRow>) => void
  onRemove: () => void
}) {
  return (
    <RowFrame label={`Share ${index + 1}`} required={!row.file_server_share_name} onRemove={onRemove}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TextField label="Share name" v={row.file_server_share_name} onChange={(x) => onChange({ file_server_share_name: x })} />
        <NumField label="Used (GB)" v={row.total_used_capacity_gb} onChange={(x) => onChange({ total_used_capacity_gb: num(x) })} />
        <TextField label="Protocol (SMB/NFS…)" v={row.access_protocol} onChange={(x) => onChange({ access_protocol: x })} />
        <NumField label="Provisioned (GB)" v={row.total_provisioned_capacity_gb} onChange={(x) => onChange({ total_provisioned_capacity_gb: num(x) })} />
        <NumField label="Efficiency ratio" v={row.storage_efficiency_ratio} onChange={(x) => onChange({ storage_efficiency_ratio: num(x) })} />
        <NumField label="Peak IOPS" v={row.peak_iops} onChange={(x) => onChange({ peak_iops: num(x) })} />
        <NumField label="Peak throughput (MB/s)" v={row.peak_throughput_mbps} onChange={(x) => onChange({ peak_throughput_mbps: num(x) })} />
        <NumField label="Avg IOPS" v={row.average_iops} onChange={(x) => onChange({ average_iops: num(x) })} />
        <NumField label="Avg throughput (MB/s)" v={row.average_throughput_mbps} onChange={(x) => onChange({ average_throughput_mbps: num(x) })} />
        <TextField label="Storage pool" v={row.storage_pool_name} onChange={(x) => onChange({ storage_pool_name: x })} />
        <TextField label="Array name" v={row.array_name} onChange={(x) => onChange({ array_name: x })} />
        <TextField label="Array vendor" v={row.array_vendor} onChange={(x) => onChange({ array_vendor: x })} />
        <NumField label="Avg latency (ms)" v={row.average_latency_ms} onChange={(x) => onChange({ average_latency_ms: num(x) })} />
        <TextField label="Application" v={row.application} onChange={(x) => onChange({ application: x })} />
      </div>
    </RowFrame>
  )
}

function TextField({
  label,
  v,
  onChange,
  placeholder,
}: {
  label: string
  v?: string | null
  onChange: (x: string) => void
  placeholder?: string
}) {
  return (
    <Field label={label}>
      <input className={inputCls} value={v ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Field>
  )
}

function NumField({
  label,
  v,
  onChange,
}: {
  label: string
  v?: number | string | null
  onChange: (x: string) => void
}) {
  return (
    <Field label={label}>
      <input
        className={inputCls}
        type="number"
        step="any"
        value={v ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}