import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, RotateCcw, ShieldCheck, ShieldOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import type { Profile, Role } from '@/lib/database.types'

export default function TeachersSection() {
  const toast = useToast()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'profesor' as Role })

  const { data: teachers = [] } = useQuery<Profile[]>({
    queryKey: ['teachers'], queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('full_name')
      if (error) throw error
      return data ?? []
    }
  })

  const create = useMutation({
    mutationFn: async () => {
      // Crea usuario en Auth + perfil. Requiere edge function o que el admin esté logueado con permisos
      // de service-role en su sesión. En entorno self-hosted alcanza con el cliente público + RLS,
      // pero la creación de usuarios desde el navegador necesita un endpoint Edge Function.
      const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { data: { full_name: form.full_name } }
      })
      if (signUpErr) throw signUpErr
      const userId = signUp.user?.id
      if (!userId) throw new Error('No se pudo crear el usuario')
      const { error: profErr } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: form.full_name.trim(),
        role: form.role,
        active: true
      })
      if (profErr) throw profErr
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teachers'] })
      toast.success('Profesor creado')
      setOpen(false)
      setForm({ full_name: '', email: '', password: '', role: 'profesor' })
    },
    onError: (e: Error) => toast.error('Error', e.message)
  })

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('profiles').update({ active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teachers'] }),
    onError: (e: Error) => toast.error('Error', e.message)
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Nuevo profesor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo profesor</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate() }} className="space-y-3">
              <div className="space-y-1.5">
                <Label required>Nombre completo</Label>
                <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label required>Email</Label>
                <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label required>Contraseña inicial</Label>
                <Input required type="text" minLength={6} value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label required>Rol</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profesor">Profesor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                <RotateCcw className="inline h-3 w-3 mr-1" />
                El profesor puede cambiar su contraseña desde Perfil luego de iniciar sesión.
              </p>
              <DialogFooter>
                <Button type="submit" disabled={create.isPending}>Crear</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40">
              <tr className="text-left">
                <th className="p-3">Nombre</th>
                <th className="p-3">Rol</th>
                <th className="p-3">Estado</th>
                <th className="p-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="p-3 font-medium">{t.full_name}</td>
                  <td className="p-3 capitalize">{t.role}</td>
                  <td className="p-3">
                    {t.active ? <Badge variant="success">Activo</Badge> : <Badge variant="secondary">Inactivo</Badge>}
                  </td>
                  <td className="p-3 text-right">
                    <Button size="icon" variant="ghost"
                      onClick={() => toggleActive.mutate({ id: t.id, active: !t.active })}>
                      {t.active ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
