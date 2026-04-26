import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { canEditStudent, isAdmin } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { ageAt } from '@/lib/age'
import { findWeightCategory } from '@/lib/fixture'
import { formatMoney } from '@/lib/utils'
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
import type {
  Belt, Modality, PaymentStatus, Profile, Registration, Student, WeightCategory
} from '@/lib/database.types'

type FormState = {
  id?: string
  student_id: string
  weight_kg: string
  fight_count: string
  belt_id: string
  modality_id: string
  payment_status_id: string
  amount_paid: string
  notes: string
}

const EMPTY: FormState = {
  student_id: '', weight_kg: '', fight_count: '0',
  belt_id: '', modality_id: '', payment_status_id: '', amount_paid: '0', notes: ''
}

export default function RegistrationsTab({ eventId }: { eventId: string }) {
  const { profile } = useAuth()
  const admin = isAdmin(profile)
  const toast = useToast()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FormState | null>(null)

  const { data: regs = [] } = useQuery<Registration[]>({
    queryKey: ['registrations', eventId],
    queryFn: async () => {
      const { data, error } = await supabase.from('registrations').select('*').eq('event_id', eventId)
      if (error) throw error
      return data ?? []
    }
  })

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
      const { data, error } = await supabase.from('profiles').select('*')
      if (error) throw error
      return data ?? []
    }
  })

  const { data: belts = [] } = useQuery<Belt[]>({
    queryKey: ['belts'], queryFn: async () => {
      const { data, error } = await supabase.from('belts').select('*').order('order_index')
      if (error) throw error
      return data ?? []
    }
  })
  const { data: modalities = [] } = useQuery<Modality[]>({
    queryKey: ['modalities'], queryFn: async () => {
      const { data, error } = await supabase.from('modalities').select('*').eq('active', true)
      if (error) throw error
      return data ?? []
    }
  })
  const { data: payStatuses = [] } = useQuery<PaymentStatus[]>({
    queryKey: ['payment_statuses'], queryFn: async () => {
      const { data, error } = await supabase.from('payment_statuses').select('*').order('order_index')
      if (error) throw error
      return data ?? []
    }
  })
  const { data: weightCats = [] } = useQuery<WeightCategory[]>({
    queryKey: ['weight_categories'], queryFn: async () => {
      const { data, error } = await supabase.from('weight_categories').select('*')
      if (error) throw error
      return data ?? []
    }
  })

  const { data: event } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select('event_date').eq('id', eventId).single()
      if (error) throw error
      return data
    }
  })

  const studentById = useMemo(() => Object.fromEntries(students.map((s) => [s.id, s])), [students])
  const teacherById = useMemo(() => Object.fromEntries(teachers.map((t) => [t.id, t])), [teachers])
  const beltById = useMemo(() => Object.fromEntries(belts.map((b) => [b.id, b])), [belts])
  const modalityById = useMemo(() => Object.fromEntries(modalities.map((m) => [m.id, m])), [modalities])
  const paymentById = useMemo(() => Object.fromEntries(payStatuses.map((p) => [p.id, p])), [payStatuses])

  const eligibleStudents = useMemo(() => {
    const usedIds = new Set(regs.map((r) => r.student_id))
    return students.filter((s) => {
      if (editing?.id && s.id === editing.student_id) return true
      if (usedIds.has(s.id)) return false
      if (admin) return true
      return s.profesor_id === profile?.id
    })
  }, [students, regs, admin, profile, editing])

  const upsert = useMutation({
    mutationFn: async (form: FormState) => {
      const missing: string[] = []
      if (!form.student_id) missing.push('Alumno')
      if (!form.belt_id) missing.push('Cinturón')
      if (!form.modality_id) missing.push('Modalidad')
      if (!form.payment_status_id) missing.push('Estado de pago')
      if (!form.weight_kg || Number(form.weight_kg) <= 0) missing.push('Peso')
      if (missing.length > 0) {
        throw new Error(`Falta(n) completar: ${missing.join(', ')}`)
      }
      const student = studentById[form.student_id]
      if (!student) throw new Error('El alumno seleccionado no existe')
      if (!event) throw new Error('No se pudo cargar el evento')
      const age = ageAt(student.birth_date, event.event_date)
      const weight = Number(form.weight_kg)
      const cat = findWeightCategory(weightCats, student.gender, age, weight)
      const payload = {
        event_id: eventId,
        student_id: form.student_id,
        weight_kg: weight,
        fight_count: Number(form.fight_count) || 0,
        belt_id: form.belt_id,
        modality_id: form.modality_id,
        weight_category_id: cat?.id ?? null,
        payment_status_id: form.payment_status_id,
        amount_paid: Number(form.amount_paid) || 0,
        notes: form.notes.trim() || null
      }
      if (form.id) {
        const { error } = await supabase.from('registrations').update(payload).eq('id', form.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('registrations').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registrations', eventId] })
      toast.success(editing?.id ? 'Inscripción actualizada' : 'Inscripción creada')
      setOpen(false); setEditing(null)
    },
    onError: (e: Error) => toast.error('Error', e.message)
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('registrations').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registrations', eventId] })
      toast.success('Inscripción eliminada')
    },
    onError: (e: Error) => toast.error('Error', e.message)
  })

  const startCreate = () => {
    setEditing({ ...EMPTY })
    setOpen(true)
  }
  const startEdit = (r: Registration) => {
    setEditing({
      id: r.id,
      student_id: r.student_id,
      weight_kg: String(r.weight_kg),
      fight_count: String(r.fight_count),
      belt_id: r.belt_id,
      modality_id: r.modality_id,
      payment_status_id: r.payment_status_id,
      amount_paid: String(r.amount_paid),
      notes: r.notes ?? ''
    })
    setOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null) }}>
          <DialogTrigger asChild>
            <Button onClick={startCreate}><Plus className="h-4 w-4" /> Inscribir alumno</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing?.id ? 'Editar inscripción' : 'Nueva inscripción'}</DialogTitle>
            </DialogHeader>
            {editing && (
              <form onSubmit={(e) => { e.preventDefault(); upsert.mutate(editing) }} className="space-y-3">
                <div className="space-y-1.5">
                  <Label required>Alumno</Label>
                  {eligibleStudents.length === 0 ? (
                    <div className="text-xs text-amber-400 border border-amber-500/40 bg-amber-500/10 rounded-md p-3">
                      No hay alumnos disponibles para inscribir. Primero creá los alumnos desde la sección
                      <span className="font-semibold"> Alumnos </span> del menú principal, o todos tus alumnos
                      ya están inscriptos a este evento.
                    </div>
                  ) : (
                    <Select value={editing.student_id} onValueChange={(v) => setEditing({ ...editing, student_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar alumno" /></SelectTrigger>
                      <SelectContent>
                        {eligibleStudents.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.full_name} · {s.gender} · DNI {s.dni}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label required>Peso (kg)</Label>
                    <Input type="number" step="0.1" min="0" required value={editing.weight_kg}
                      onChange={(e) => setEditing({ ...editing, weight_kg: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cantidad de peleas previas</Label>
                    <Input type="number" min="0" value={editing.fight_count}
                      onChange={(e) => setEditing({ ...editing, fight_count: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label required>Cinturón</Label>
                    <Select value={editing.belt_id} onValueChange={(v) => setEditing({ ...editing, belt_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {belts.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label required>Modalidad</Label>
                    <Select value={editing.modality_id} onValueChange={(v) => setEditing({ ...editing, modality_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {modalities.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label required>Estado de pago</Label>
                    <Select value={editing.payment_status_id} onValueChange={(v) => setEditing({ ...editing, payment_status_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {payStatuses.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Monto pagado</Label>
                    <Input type="number" min="0" value={editing.amount_paid}
                      onChange={(e) => setEditing({ ...editing, amount_paid: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Notas</Label>
                  <Input value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={upsert.isPending}>{editing.id ? 'Guardar' : 'Inscribir'}</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40">
                <tr className="text-left">
                  <th className="p-3">Competidor</th>
                  <th className="p-3">Profesor</th>
                  <th className="p-3">Peso</th>
                  <th className="p-3">Modalidad</th>
                  <th className="p-3">Cinturón</th>
                  <th className="p-3">Pago</th>
                  <th className="p-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {regs.map((r) => {
                  const st = studentById[r.student_id]
                  const editable = st ? canEditStudent(profile, st) : admin
                  const ps = paymentById[r.payment_status_id]
                  return (
                    <tr key={r.id} className="border-t border-border hover:bg-secondary/30">
                      <td className="p-3 font-medium">{st?.full_name ?? '—'}</td>
                      <td className="p-3 text-muted-foreground">{st ? teacherById[st.profesor_id]?.full_name : '—'}</td>
                      <td className="p-3">{r.weight_kg} kg</td>
                      <td className="p-3">{modalityById[r.modality_id]?.name ?? '—'}</td>
                      <td className="p-3">{beltById[r.belt_id]?.name ?? '—'}</td>
                      <td className="p-3">
                        <Badge variant={ps?.is_paid ? 'success' : 'warning'}>{ps?.name ?? '—'}</Badge>
                        {r.amount_paid > 0 && <span className="ml-2 text-xs text-muted-foreground">{formatMoney(r.amount_paid)}</span>}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" disabled={!editable} onClick={() => startEdit(r)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" disabled={!editable}
                            onClick={() => { if (confirm('¿Eliminar inscripción?')) remove.mutate(r.id) }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {regs.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Aún no hay inscripciones.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
