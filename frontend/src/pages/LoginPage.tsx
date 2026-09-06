import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, LogIn, Zap } from 'lucide-react'
import { useAuth } from '../auth'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(username, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ambiflow-hero flex min-h-screen items-center justify-center p-4">
      <div className="dot-grid" />
      <div className="glow-orb h-72 w-72 animate-float bg-brand-cyan/25" style={{ top: '5%', left: '8%' }} />
      <div className="glow-orb h-72 w-72 animate-float bg-brand-teal/25" style={{ bottom: '8%', right: '10%', animationDelay: '-3s' }} />
      <div className="glow-orb h-52 w-52 animate-pulse-slow bg-purple-500/20" style={{ bottom: '20%', left: '30%' }} />

      <div className="relative z-10 w-full max-w-md">
        <div className="scroll-fade mb-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-cyan to-brand-teal text-navy-900 shadow-2xl shadow-brand-cyan/30">
            <Zap size={30} strokeWidth={2.5} />
          </span>
          <h1 className="mt-5 font-display text-3xl font-bold text-white">
            Ambifo <span className="gradient-text">CRM</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Cloud consulting · DevOps · AI — your pipeline, one dashboard.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="scroll-fade rounded-3xl border border-white/15 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-xl"
          style={{ animationDelay: '0.15s' }}
        >
          <label className="mb-4 block">
            <span className="mb-1.5 block font-display text-xs font-bold tracking-widest text-brand-cyan uppercase">
              Username
            </span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
              placeholder="admin"
              className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/25"
            />
          </label>
          <label className="mb-5 block">
            <span className="mb-1.5 block font-display text-xs font-bold tracking-widest text-brand-cyan uppercase">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/25"
            />
          </label>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-3 text-sm text-red-300 animate-fade-in">
              <span>⚠</span> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-cyan to-brand-teal px-5 py-3 font-display text-sm font-bold text-navy-900 shadow-lg shadow-brand-teal/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-teal/40 disabled:opacity-60 disabled:pointer-events-none"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="mt-5 text-center text-xs text-slate-500">
            Powered by React · Rust engine · FastAPI
          </p>
        </form>
      </div>
    </div>
  )
}