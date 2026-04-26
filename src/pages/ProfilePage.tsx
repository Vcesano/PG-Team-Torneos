import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'

export default function ProfilePage() {
  const { profile, session } = useAuth()
  const toast = useToast()
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwd.length < 6) return toast.error('Contraseña muy corta', 'Mínimo 6 caracteres')
    if (pwd !== pwd2) return toast.error('Las contraseñas no coinciden')
    setSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password: pwd })
    setSubmitting(false)
    if (error) toast.error('Error', error.message)
    else {
      toast.success('Contraseña actualizada')
      setPwd(''); setPwd2('')
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="heading-display text-3xl">Perfil</h1>
      <Card>
        <CardHeader><CardTitle>Datos</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><span className="text-muted-foreground">Nombre:</span> {profile?.full_name}</div>
          <div><span className="text-muted-foreground">Email:</span> {session?.user.email}</div>
          <div><span className="text-muted-foreground">Rol:</span> <span className="capitalize">{profile?.role}</span></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Cambiar contraseña</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onChangePassword} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nueva contraseña</Label>
              <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Repetir</Label>
              <Input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
            </div>
            <Button type="submit" disabled={submitting}>Actualizar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
