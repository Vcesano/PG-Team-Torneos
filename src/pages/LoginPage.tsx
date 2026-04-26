import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const { session, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (session) return <Navigate to="/eventos" replace />

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await signIn(email.trim(), password)
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    navigate('/eventos', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" alt="PG Team Tucumán" className="h-24 w-24 rounded-full ring-2 ring-primary shadow-xl shadow-red-900/30" />
          <h1 className="heading-display text-3xl mt-4">PG TEAM TUCUMÁN</h1>
          <p className="text-xs text-muted-foreground tracking-widest uppercase">Torneos · Kick Boxing</p>
        </div>
        <form onSubmit={onSubmit} className="card-surface p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" required>Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="profesor@ejemplo.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" required>Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && <div className="text-sm text-destructive">{error}</div>}
          <Button type="submit" disabled={submitting} className="w-full" size="lg">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Ingresar
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground mt-6">
          ¿No tenés cuenta? Contactá al administrador.
        </p>
      </div>
    </div>
  )
}
