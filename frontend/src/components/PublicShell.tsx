import type { ReactNode } from 'react'
import { Zap } from 'lucide-react'

export default function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="ambiflow-hero relative overflow-hidden">
        <div className="dot-grid z-10" />
        <div
          className="glow-orb h-48 w-48 bg-brand-cyan/30 animate-float"
          style={{ top: '-60px', right: '-40px' }}
        />
        <div
          className="glow-orb h-48 w-48 bg-brand-teal/30 animate-pulse-slow"
          style={{ bottom: '-80px', left: '10%' }}
        />
        <div className="relative z-10 flex items-center gap-3 p-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-cyan to-brand-teal text-navy-900 shadow-lg shadow-brand-cyan/20">
            <Zap size={20} strokeWidth={2.5} />
          </span>
          <div className="leading-tight">
            <div className="font-display text-lg font-bold text-white">Ambifo</div>
            <div className="font-display text-[11px] font-semibold tracking-widest text-brand-cyan uppercase">
              Cloud CRM
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">{children}</main>
      <footer className="pb-8 text-center text-xs text-slate-400">
        Ambifo Cloud CRM — {new Date().getFullYear()}
      </footer>
    </div>
  )
}

export function PublicError({ message }: { message: string }) {
  return (
    <div className="brand-card rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <div className="mb-3 text-4xl">✦</div>
      <h1 className="font-display text-xl font-bold text-navy-900">Could not open this link</h1>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
    </div>
  )
}

export function PublicThanks({ title, message }: { title: string; message?: string }) {
  return (
    <div className="brand-card rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <div className="mb-3 text-4xl">✓</div>
      <h1 className="font-display text-xl font-bold text-navy-900">{title}</h1>
      {message && <p className="mt-2 text-sm text-slate-500">{message}</p>}
    </div>
  )
}