import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import BulkStudentsImport from '@/components/BulkStudentsImport'
import { useAuth } from '@/lib/auth'
import { canEditStudent, isAdmin } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { ageAt } from '@/lib/age'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import type { Belt, Profile, Student } from '@/lib/database.types'

type StudentFormState = {
  id?: string
  full_name: string
  dni: string
  birth_date: string
  gender: 'M' | 'F'
  phone: string
  email: string
  current_belt_id: string
  profesor_id: string
}

const EMPTY: StudentFormState = {
  full_name: '', dni: '', birth_date: '', gender: 'M',
  phone: '', email: '', current_belt_id: '', profesor_id: ''
}

export default function StudentsPage() {
  const { profile } = useAuth()
  const admin = isAdmin(profile)
  const toast = useToast()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [filterTeacher, setFilterTeacher] = useState<string>('all')
  const [editing, setEditing] = useState<StudentFormState | null>(null)
  const [open, setOpen] = useState(false)

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*').eq('active', true).order('full_name')
      if (error) throw error
      return data ?? []
    }
  })

  const { data: teachers = [] } = useQuery<Profile[]>({
    queryKey: ['teachers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('active', true).order('full_name')
      if (error) throw error
      return data ?? []
    }
  })

  const { data: belts = [] } = useQuery<Belt[]>({
    queryKey: ['belts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('belts').select('*').order('order_index')
      if (error) throw error
      return data ?? []
    }
  })

  const teacherById = useMemo(() => Object.fromEntries(teachers.map((t) => [t.id, t])), [teachers])
  const beltById = useMemo(() => Object.fromEntries(belts.map((b) => [b.id, b])), [belts])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return students.filter((st) => {
      if (filterTeacher !== 'all' && st.profesor_id !== filterTeacher) return false
      if (!s) return true
      return st.full_name.toLowerCase().includes(s) || st.dni.includes(s)
    })
  }, [students, search, filterTeacher])

  const upsert = useMutation({
    mutationFn: async (form: StudentFormState) => {
      const payload = {
        full_name: form.full_name.trim(),
        dni: form.dni.trim(),
        birth_date: form.birth_date,
        gender: form.gender,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        current_belt_id: form.current_belt_id || null,
        profesor_id: form.profesor_id || profile!.id
      }
      if (form.id) {
        const { error } = await supabase.from('students').update(payload).eq('id', form.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('students').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
      toast.success(editing?.id ? 'Alumno actualizado' : 'Alumno creado')
      setOpen(false)
      setEditing(null)
    },
    onError: (e: Error) => toast.error('Error', e.message)
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('students').update({ active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
      toast.success('Alumno dado de baja')
    },
    onError: (e: Error) => toast.error('Error', e.message)
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    upsert.mutate(editing)
  }

  const startCreate = () => {
    setEditing({ ...EMPTY, profesor_id: profile?.id ?? '' })
    setOpen(true)
  }
  const startEdit = (s: Student) => {
    setEditing({
      id: s.id,
      full_name: s.full_name,
      dni: s.dni,
      birth_date: s.birth_date,
      gender: s.gender,
      phone: s.phone ?? '',
      email: s.email ?? '',
      current_belt_id: s.current_belt_id ?? '',
      profesor_id: s.profesor_id
    })
    setOpen(true)
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="heading-display text-3xl md:text-4xl">Alumnos</h1>
          <p className="text-sm text-muted-foreground">Catálogo persistente de competidores. Solo podés editar los tuyos.</p>
        </div>
        <div className="flex gap-2">
          <BulkStudentsImport teachers={teachers} />
          <Button onClick={startCreate}><Plus className="h-4 w-4" /> Nuevo alumno</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o DNI…"
            className="pl-9"
          />
        </div>
        <Select value={filterTeacher} onValueChange={setFilterTeacher}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los profesores</SelectItem>
            {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40">
                <tr className="text-left">
                  <th className="p-3">Nombre</th>
                  <th className="p-3">DNI</th>
                  <th className="p-3">Edad</th>
                  <th className="p-3">Género</th>
                  <th className="p-3">Cinturón</th>
                  <th className="p-3">Profesor</th>
                  <th className="p-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const editable = canEditStudent(profile, s)
                  const today = new Date().toISOString().slice(0, 10)
                  return (
                    <tr key={s.id} className="border-t border-border hover:bg-secondary/30">
                      <td className="p-3 font-medium">{s.full_name}</td>
                      <td className="p-3 text-muted-foreground">{s.dni}</td>
                      <td className="p-3">{ageAt(s.birth_date, today)}</td>
                      <td className="p-3">{s.gender}</td>
                      <td className="p-3">{s.current_belt_id ? beltById[s.current_belt_id]?.name ?? '—' : '—'}</td>
                      <td className="p-3">
                        {teacherById[s.profesor_id]?.full_name ?? <Badge variant="outline">desconocido</Badge>}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" disabled={!editable} onClick={() => startEdit(s)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon" variant="ghost" disabled={!editable}
                            onClick={() => {
                              if (confirm(`¿Dar de baja a ${s.full_name}?`)) remove.mutate(s.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Sin resultados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Editar alumno' : 'Nuevo alumno'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label required>Nombre completo</Label>
                  <Input required value={editing.full_name} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label required>DNI</Label>
                  <Input required value={editing.dni} onChange={(e) => setEditing({ ...editing, dni: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label required>Fecha de nacimiento</Label>
                  <Input required type="date" value={editing.birth_date} onChange={(e) => setEditing({ ...editing, birth_date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label required>Género</Label>
                  <Select value={editing.gender} onValueChange={(v) => setEditing({ ...editing, gender: v as 'M' | 'F' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Femenino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Cinturón actual</Label>
                  <Select value={editing.current_belt_id} onValueChange={(v) => setEditing({ ...editing, current_belt_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                    <SelectContent>
                      {belts.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Teléfono</Label>
                  <Input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
                </div>
                {admin && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Profesor a cargo</Label>
                    <Select value={editing.profesor_id} onValueChange={(v) => setEditing({ ...editing, profesor_id: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={upsert.isPending}>{editing.id ? 'Guardar' : 'Crear'}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
