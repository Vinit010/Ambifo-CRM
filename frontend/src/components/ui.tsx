import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'teal' | 'cyan' | 'green' | 'coral' | 'navy'
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    teal: 'bg-brand-teal/12 text-brand-teal-dark border-brand-teal/25',
    cyan: 'bg-brand-cyan/12 text-cyan-700 border-brand-cyan/25',
    green: 'bg-green-100 text-green-700 border-green-200',
    coral: 'bg-red-50 text-red-600 border-red-200',
    navy: 'bg-navy-900/8 text-navy-800 border-navy-900/10',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

export function PageHead({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="scroll-fade mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy-900">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-slate-500">{subtitle}</div>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Panel({
  children,
  className = '',
  ...rest
}: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <section
      {...rest}
      className={`brand-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
    >
      {children}
    </section>
  )
}

export function PanelTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold tracking-wide text-navy-900 uppercase">
      {children}
    </h2>
  )
}

export function Button({
  children,
  variant = 'primary',
  icon,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  icon?: ReactNode
}) {
  const variants: Record<string, string> = {
    primary:
      'bg-gradient-to-r from-brand-teal to-brand-teal-dark text-white shadow-lg shadow-brand-teal/25 hover:shadow-brand-teal/40 hover:-translate-y-0.5',
    secondary:
      'bg-gradient-to-r from-brand-cyan to-brand-teal text-navy-900 shadow-lg shadow-brand-cyan/20 hover:-translate-y-0.5',
    outline:
      'border-2 border-brand-teal text-brand-teal-dark hover:bg-brand-teal hover:text-white',
    ghost: 'border border-slate-200 text-slate-600 hover:bg-slate-100',
  }
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-display text-sm font-bold transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none ${
        variants[variant]
      } ${props.className ?? ''}`}
    >
      {icon}
      {children}
    </button>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
      <Loader2 size={20} className="animate-spin text-brand-teal" />
      <span className="font-display text-sm font-semibold">{label ?? 'Loading…'}</span>
    </div>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-display text-xs font-bold tracking-wide text-slate-600 uppercase">
        {label}
      </span>
      {children}
    </label>
  )
}

export const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition-all duration-200 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20'

export const selectCls = inputCls

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center text-slate-400">
      <span className="text-3xl">✦</span>
      <p className="font-display text-sm font-semibold">{message}</p>
    </div>
  )
}

export function PageLoading({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-teal/20 border-t-brand-teal" />
        <span className="font-display text-sm font-semibold text-slate-500">
          {label ?? 'Loading'}
        </span>
      </div>
    </div>
  )
}