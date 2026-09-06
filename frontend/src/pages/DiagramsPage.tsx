import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Cloud, Edit3, Eye, GitBranch, Trash2 } from 'lucide-react'
import { customerApi, diagramApi } from '../api'
import type { Diagram } from '../api/types'
import { Badge, Button, EmptyState, Field, inputCls, PageHead, Panel, selectCls, Spinner } from '../components/ui'
import { DrawioEditorModal } from '../components/DrawioEditorModal'

function formatRelative(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return d.toLocaleDateString()
}

function xmlToLightboxUrl(xml: string): string {
  const enc = btoa(unescape(encodeURIComponent(xml)))
  return `https://view.diagrams.net/?lightbox=1&highlight=0000ff&edit=_blank&layers=1&nav=1#R${enc}`
}

type EditorState = { mode: 'create' } | { mode: 'edit'; diagram: Diagram }

export default function DiagramsPage() {
  const queryClient = useQueryClient()
  const customers = useQuery({ queryKey: ['customers'], queryFn: () => customerApi.list({ limit: 200 }) })
  const diagrams = useQuery({ queryKey: ['diagrams'], queryFn: () => diagramApi.list() })

  const [form, setForm] = useState({ customer_id: '', diagram_name: '' })
  const [error, setError] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState | null>(null)

  const customerName = useMemo(() => {
    const map = new Map<number, string>()
    customers.data?.forEach((c) => map.set(c.id, c.customer_name))
    return (id: number) => map.get(id) ?? `Customer #${id}`
  }, [customers.data])

  const createMutation = useMutation({
    mutationFn: (xml: string) =>
      diagramApi.save({
        customer_id: Number(form.customer_id),
        diagram_name: form.diagram_name || 'AWS Architecture',
        diagram_content: xml,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagrams'] })
      setEditor(null)
      setForm({ customer_id: '', diagram_name: '' })
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Save failed'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, xml }: { id: number; xml: string }) => diagramApi.update(id, { diagram_content: xml }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagrams'] })
      setEditor(null)
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Save failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => diagramApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['diagrams'] }),
  })

  function openEditor() {
    setError(null)
    if (!form.customer_id) {
      setError('Select a customer first')
      return
    }
    setEditor({ mode: 'create' })
  }

  function handleEditorSave(xml: string) {
    if (editor?.mode === 'create') {
      if (!form.customer_id) return
      createMutation.mutate(xml)
    } else if (editor && editor.mode === 'edit') {
      updateMutation.mutate({ id: editor.diagram.id, xml })
    }
  }

  return (
    <div>
      <PageHead title="Diagrams" subtitle="Design AWS cloud architecture visually with the free draw.io editor" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel className="scroll-fade h-fit lg:col-span-1">
          <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold tracking-wide text-navy-900 uppercase">
            <Cloud size={15} className="text-brand-teal" /> New diagram
          </h2>
          <div className="flex flex-col gap-4">
            <Field label="Customer *">
              <select className={selectCls} value={form.customer_id} onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value }))}>
                <option value="">— select —</option>
                {customers.data?.map((c) => (
                  <option key={c.id} value={c.id}>{c.customer_name}</option>
                ))}
              </select>
            </Field>
            <Field label="Diagram name">
              <input className={inputCls} value={form.diagram_name} onChange={(e) => setForm((f) => ({ ...f, diagram_name: e.target.value }))} placeholder="AWS Architecture" />
            </Field>
            <Button icon={<GitBranch size={15} />} onClick={openEditor}>
              Open draw.io editor
            </Button>
            <p className="text-xs text-slate-400">
              The draw.io editor opens inline — drag AWS services from the left shape library onto the canvas, then click <b>Save &amp; close</b>.
            </p>
            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">⚠ {error}</div>}
          </div>
        </Panel>

        <Panel className="scroll-fade lg:col-span-2" style={{ animationDelay: '0.1s' }}>
          <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold tracking-wide text-navy-900 uppercase">
            <GitBranch size={15} className="text-brand-teal" /> Saved diagrams
          </h2>
          {diagrams.isLoading ? (
            <Spinner label="Loading diagrams" />
          ) : diagrams.data?.length === 0 ? (
            <EmptyState message="No diagrams yet — create one with the draw.io editor" />
          ) : (
            <div className="space-y-4">
              {diagrams.data?.map((d) => (
                <div key={d.id} className="brand-card overflow-hidden rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-cyan to-brand-teal text-white">
                        <GitBranch size={15} />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-display text-sm font-bold text-navy-900">{d.diagram_name}</div>
                        <div className="text-xs text-slate-400">
                          {customerName(d.customer_id)} · {formatRelative(d.updated_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone="cyan">{d.macro_key}</Badge>
                      <button className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-brand-teal/10 hover:text-brand-teal-dark" title="View" onClick={() => setEditor({ mode: 'edit', diagram: d })}>
                        <Eye size={14} />
                      </button>
                      <button className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy-900" title="Edit" onClick={() => setEditor({ mode: 'edit', diagram: d })}>
                        <Edit3 size={14} />
                      </button>
                      <button className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600" title="Delete" onClick={() => { if (confirm('Delete this diagram?')) deleteMutation.mutate(d.id) }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto bg-[#0b1023]/95 p-4">
                    {d.diagram_content && d.diagram_content.includes('<mxfile') ? (
                      <iframe
                        title={d.diagram_name}
                        src={xmlToLightboxUrl(d.diagram_content)}
                        className="h-96 w-full rounded-xl border border-white/10 bg-white"
                      />
                    ) : (
                      <pre className="overflow-x-auto font-mono text-xs text-cyan-200">{d.diagram_content}</pre>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-2.5">
                    <Button variant="outline" className="!px-3 !py-1.5 text-xs" icon={<Edit3 size={13} />} onClick={() => setEditor({ mode: 'edit', diagram: d })}>
                      Edit in draw.io
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <DrawioEditorModal
        open={editor !== null}
        title={editor?.mode === 'edit' ? editor.diagram.diagram_name : form.diagram_name || 'AWS Architecture'}
        initialXml={editor?.mode === 'edit' ? editor.diagram.diagram_content : ''}
        saving={createMutation.isPending || updateMutation.isPending}
        onSave={handleEditorSave}
        onClose={() => setEditor(null)}
      />
    </div>
  )
}
