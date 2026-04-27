import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, RotateCcw, ShieldCheck, ShieldOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
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

type CreateForm = { full_name: string; email: string; password: string; role: Role }
type EditForm = { id: string; full_name: string; role: Role; active: boolean }

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_PROJECT_DASHBOARD = SUPABASE_URL
  ? `https://supabase.com/dashboard/project/${SUPABASE_URL.split('//')[1]?.split('.')[0]}/auth/users`
  : 'https://supabase.com/dashboard'

export default function TeachersSection() {
  const { profile: me } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateForm>({
    full_name: '', email: '', password: '', role: 'profesor'
  })
  const [editForm, setEditForm] = useState<EditForm | null>(null)

  const { data: teachers = [] } = useQuery<Profile[]>({
    queryKey: ['teachers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('full_name')
      if (error) throw error
      return data ?? []
    }
  })

  // ----- Crear -----
  const create = useMutation({
    mutationFn: async () => {
      const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
        email: createForm.email.trim(),
        password: createForm.password,
        options: { data: { full_name: createForm.full_name } }
      })
      if (signUpErr) throw signUpErr
      const userId = signUp.user?.id
      if (!userId) throw new Error('No se pudo crear el usuario')
      const { error: profErr } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: createForm.full_name.trim(),
        role: createForm.role,
        active: true
      })
      if (profErr) throw profErr
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teachers'] })
      toast.success('Profesor creado',
        'Importante: signUp puede haber cerrado tu sesión de admin. Si es así, volvé a iniciar sesión.')
      setCreateOpen(false)
      setCreateForm({ full_name: '', email: '', password: '', role: 'profesor' })
    },
    onError: (e: Error) => toast.error('Error al crear', e.message)
  })

  // ----- Editar (nombre / rol / activo) -----
  const update = useMutation({
    mutationFn: async (form: EditForm) => {
      const { error } = await supabase.from('profiles').update({
        full_name: form.full_name.trim(),
        role: form.role,
        active: form.active
      }).eq('id', form.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teachers'] })
      toast.success('Profesor actualizado')
      setEditOpen(false)
      setEditForm(null)
    },
    onError: (e: Error) => toast.error('Error al actualizar', e.message)
  })

  // ----- Toggle activo (acción rápida) -----
  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('profiles').update({ active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teachers'] }),
    onError: (e: Error) => toast.error('Error', e.message)
  })

  const startEdit = (t: Profile) => {
    setEditForm({ id: t.id, full_name: t.full_name, role: t.role, active: t.active })
    setEditOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="heading-display text-xl">Profesores</h2>
          <p className="text-xs text-muted-foreground">
            Gestión de cuentas. Para resetear contraseñas o cambiar emails, usá el panel de Supabase Auth.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Nuevo profesor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo profesor</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate() }} className="space-y-3">
              <div className="space-y-1.5">
                <Label required>Nombre completo</Label>
                <Input required value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label required>Email</Label>
                <Input required type="email" value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label required>Contraseña inicial</Label>
                <Input required type="text" minLength={6} value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label required>Rol</Label>
                <Select value={createForm.role}
                  onValueChange={(v) => setCreateForm({ ...createForm, role: v as Role })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profesor">Profesor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                <RotateCcw className="inline h-3 w-3 mr-1" />
                El profesor cambia su contraseña desde Perfil al primer ingreso.
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40">
                <tr className="text-left">
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Rol</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 w-32 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => {
                  const isMe = t.id === me?.id
                  return (
                    <tr key={t.id} className="border-t border-border hover:bg-secondary/30">
                      <td className="p-3">
                        <div className="font-medium">{t.full_name}</div>
                        {isMe && <div className="text-xs text-primary">— vos</div>}
                      </td>
                      <td className="p-3">
                        <Badge variant={t.role === 'admin' ? 'default' : 'secondary'}>
                          {t.role === 'admin' ? 'Admin' : 'Profesor'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {t.active ? <Badge variant="success">Activo</Badge> : <Badge variant="secondary">Inactivo</Badge>}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => startEdit(t)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon" variant="ghost"
                            onClick={() => toggleActive.mutate({ id: t.id, active: !t.active })}
                            disabled={isMe}
                            title={t.active ? 'Dar de baja' : 'Reactivar'}
                          >
                            {t.active ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground space-y-2">
          <div className="flex items-start gap-2">
            <RotateCcw className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
            <div>
              <p className="text-foreground font-medium">¿Cómo cambio email o reseteo contraseña de un profesor?</p>
              <p className="mt-1">
                Andá al{' '}
                <a href={SUPABASE_PROJECT_DASHBOARD} target="_blank" rel="noopener" className="text-primary underline">
                  panel de Supabase → Authentication → Users
                </a>. Ahí buscás al usuario, hacés clic en los 3 puntos al final de la fila y elegís
                "Send password recovery", "Reset password" o "Change email".
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de edición */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditForm(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar profesor</DialogTitle></DialogHeader>
          {editForm && (
            <form onSubmit={(e) => { e.preventDefault(); update.mutate(editForm) }} className="space-y-3">
              <div className="space-y-1.5">
                <Label required>Nombre completo</Label>
                <Input required value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label required>Rol</Label>
                <Select value={editForm.role}
                  onValueChange={(v) => setEditForm({ ...editForm, role: v as Role })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profesor">Profesor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editForm.active}
                  onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })} />
                Activo (puede iniciar sesión y operar)
              </label>
              <p className="text-xs text-muted-foreground">
                El email y la contraseña se gestionan desde el panel de Supabase Auth.
              </p>
              <DialogFooter>
                <Button type="submit" disabled={update.isPending}>Guardar</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
