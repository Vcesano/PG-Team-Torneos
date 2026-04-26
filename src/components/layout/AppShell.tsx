import { NavLink, useNavigate } from 'react-router-dom'
import { Calendar, LogOut, Settings, Users, UserCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface NavItem { to: string; label: string; icon: React.ElementType; adminOnly?: boolean }

const NAV: NavItem[] = [
  { to: '/eventos', label: 'Eventos', icon: Calendar },
  { to: '/alumnos', label: 'Alumnos', icon: Users },
  { to: '/configuracion', label: 'Configuración', icon: Settings, adminOnly: true },
  { to: '/perfil', label: 'Perfil', icon: UserCircle }
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const visible = NAV.filter((n) => !n.adminOnly || isAdmin(profile))

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col border-r border-border bg-card/60 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
          <img src="/logo.png" alt="PG Team Tucumán" className="h-12 w-12 rounded-full ring-2 ring-primary" />
          <div>
            <div className="heading-display text-lg leading-tight">PG TEAM</div>
            <div className="text-xs text-muted-foreground">Tucumán · Torneos</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {visible.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:bg-secondary'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-border">
          <div className="text-xs text-muted-foreground mb-1">Sesión</div>
          <div className="text-sm font-medium truncate">{profile?.full_name ?? 'Usuario'}</div>
          <div className="text-xs text-muted-foreground capitalize">{profile?.role}</div>
          <Button variant="outline" size="sm" className="w-full mt-3" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Salir
          </Button>
        </div>
      </aside>

      {/* Topbar mobile */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="PG" className="h-9 w-9 rounded-full ring-1 ring-primary" />
          <div className="heading-display text-lg">PG TEAM</div>
        </div>
        <Button size="sm" variant="ghost" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      {/* Contenido */}
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8 pb-24 md:pb-8">{children}</main>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur border-t border-border">
        <div className="grid grid-cols-4">
          {visible.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 py-2 text-[11px]',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
