import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Bot,
  CalendarClock,
  FileText,
  LayoutDashboard,
  Mail,
  Server,
  Shapes,
  ShieldCheck,
  Target,
  Users,
  Settings,
  LogOut,
  Zap,
} from 'lucide-react'
import { useAuth } from '../auth'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/leads', label: 'Leads', icon: Target },
  { to: '/email', label: 'Email', icon: Mail },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/diagrams', label: 'Diagrams', icon: Shapes },
  { to: '/ai', label: 'AI Assistant', icon: Bot },
  { to: '/meetings', label: 'Meetings', icon: CalendarClock },
  { to: '/gathering', label: 'Gathering', icon: Server },
  { to: '/configuration', label: 'Configuration', icon: Settings, adminOnly: true },
  { to: '/admin', label: 'Admin', icon: ShieldCheck, adminOnly: true },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const visibleNav = NAV.filter((item) => !item.adminOnly || user?.is_admin)

  return (
    <div className="flex h-full">
      <aside className="ambiflow-hero hidden w-64 shrink-0 flex-col md:flex">
        <div className="dot-grid z-10" />
        <div className="glow-orb h-40 w-40 bg-brand-cyan/30 animate-float" style={{ top: '-30px', right: '-40px' }} />
        <div className="glow-orb h-40 w-40 bg-brand-teal/30 animate-pulse-slow" style={{ bottom: '10%', left: '-50px' }} />

        <div className="relative z-10 flex flex-col p-6">
          <div className="mb-10 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-cyan to-brand-teal text-navy-900 shadow-lg shadow-brand-cyan/20">
              <Zap size={22} strokeWidth={2.5} />
            </span>
            <div className="leading-tight">
              <div className="font-display text-lg font-bold text-white">Ambifo</div>
              <div className="font-display text-[11px] font-semibold tracking-widest text-brand-cyan uppercase">
                Cloud CRM
              </div>
            </div>
          </div>

          <nav className="flex flex-col gap-1.5">
            {visibleNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-4 py-3 font-display text-sm font-semibold transition-all duration-300 ${
                    isActive
                      ? 'bg-white/12 text-white shadow-lg shadow-black/10 border border-white/15'
                      : 'text-navy-500 hover:bg-white/8 hover:text-white border border-transparent'
                  }`
                }
              >
                <item.icon
                  size={18}
                  className="transition-transform duration-300 group-hover:scale-110"
                />
                {item.label}
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-cyan opacity-0 transition-opacity group-hover:opacity-100" />
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="relative z-10 mt-auto p-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-teal to-brand-cyan font-display text-sm font-bold text-white">
                {user?.username.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 leading-tight">
                <div className="truncate font-display text-sm font-semibold text-white">
                  {user?.full_name || user?.username}
                </div>
                <div className="truncate text-xs text-slate-400">{user?.email}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 font-display text-xs font-semibold text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10 hover:text-white"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        {/* mobile header */}
        <header className="ambiflow-hero flex items-center justify-between p-4 md:hidden">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-brand-cyan" />
            <span className="font-display font-bold text-white">Ambifo CRM</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-white">{user?.username}</span>
            <button onClick={handleLogout} className="text-brand-cyan">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <nav className="flex gap-1 border-b border-slate-200 bg-white/80 p-2 backdrop-blur md:hidden">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 font-display text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-navy-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <item.icon size={14} /> {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}