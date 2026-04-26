import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, RefreshCw, Trash2, Wand2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { generateFixture, type FixtureGroup } from '@/lib/fixture'
import { ageAt } from '@/lib/age'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import type {
  Fight, Modality, Registration, Student, WeightCategory
} from '@/lib/database.types'

interface Props { eventId: string; eventDate: string }

type FightRow = Fight & {
  red_student?: Student
  blue_student?: Student
  modality_name?: string
  weight_category_name?: string
}

function SortableFightRow({ fight, onRemove, canEdit }: {
  fight: FightRow
  onRemove: (id: string) => void
  canEdit: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: fight.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }
  return (
    <div ref={setNodeRef} style={style}
      className="grid grid-cols-[auto_2.5rem_1fr_auto_1fr_auto] items-center gap-3 px-3 py-3 border-b border-border last:border-b-0">
      {canEdit ? (
        <button {...attributes} {...listeners} className="text-muted-foreground hover:text-foreground touch-none">
          <GripVertical className="h-4 w-4" />
        </button>
      ) : <span />}
      <div className="font-mono text-muted-foreground">#{fight.fight_number}</div>
      <div className="text-right">
        <div className="font-semibold">{fight.red_student?.full_name ?? '—'}</div>
        <div className="text-xs text-muted-foreground">Esquina <span className="text-red-500">ROJA</span></div>
      </div>
      <div className="text-xs text-muted-foreground heading-display">VS</div>
      <div>
        <div className="font-semibold">{fight.blue_student?.full_name ?? '—'}</div>
        <div className="text-xs text-muted-foreground">Esquina <span className="text-blue-400">AZUL</span></div>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden md:flex flex-col items-end gap-1">
          {fight.modality_name && <Badge variant="outline">{fight.modality_name}</Badge>}
          {fight.weight_category_name && <Badge variant="secondary">{fight.weight_category_name}</Badge>}
        </div>
        {canEdit && (
          <Button size="icon" variant="ghost" onClick={() => onRemove(fight.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

export default function FixtureTab({ eventId, eventDate }: Props) {
  const { profile } = useAuth()
  const admin = isAdmin(profile)
  const toast = useToast()
  const qc = useQueryClient()

  const { data: fights = [] } = useQuery<Fight[]>({
    queryKey: ['fights', eventId], queryFn: async () => {
      const { data, error } = await supabase.from('fights').select('*').eq('event_id', eventId)
        .order('fight_number')
      if (error) throw error
      return data ?? []
    }
  })
  const { data: regs = [] } = useQuery<Registration[]>({
    queryKey: ['registrations', eventId], queryFn: async () => {
      const { data, error } = await supabase.from('registrations').select('*').eq('event_id', eventId)
      if (error) throw error
      return data ?? []
    }
  })
  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['students'], queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*')
      if (error) throw error
      return data ?? []
    }
  })
  const { data: modalities = [] } = useQuery<Modality[]>({
    queryKey: ['modalities'], queryFn: async () => {
      const { data, error } = await supabase.from('modalities').select('*')
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

  const studentByReg = useMemo(() => {
    const sById = Object.fromEntries(students.map((s) => [s.id, s]))
    return Object.fromEntries(
      regs.map((r) => [r.id, sById[r.student_id]] as const)
    )
  }, [students, regs])

  const enrichedFights: FightRow[] = useMemo(() => {
    const modById = Object.fromEntries(modalities.map((m) => [m.id, m]))
    const catById = Object.fromEntries(weightCats.map((c) => [c.id, c]))
    return fights.map((f) => ({
      ...f,
      red_student: studentByReg[f.red_registration_id],
      blue_student: studentByReg[f.blue_registration_id],
      modality_name: modById[f.modality_id]?.name,
      weight_category_name: f.weight_category_id ? catById[f.weight_category_id]?.name : undefined
    }))
  }, [fights, modalities, weightCats, studentByReg])

  const [orderedIds, setOrderedIds] = useState<string[] | null>(null)
  const orderedFights = useMemo(() => {
    if (!orderedIds) return enrichedFights
    const map = Object.fromEntries(enrichedFights.map((f) => [f.id, f]))
    return orderedIds.map((id) => map[id]).filter(Boolean)
  }, [enrichedFights, orderedIds])

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  const generateMut = useMutation({
    mutationFn: async () => {
      const items = regs
        .map((r) => ({ registration: r, student: studentByReg[r.id] }))
        .filter((x): x is { registration: Registration; student: Student } => Boolean(x.student))
      const groups = generateFixture(items, eventDate, weightCats)
      // Reemplazar fixture: borrar pendientes y reinsertar.
      const { error: delErr } = await supabase.from('fights').delete()
        .eq('event_id', eventId).eq('status', 'pending')
      if (delErr) throw delErr
      let n = (fights.filter((f) => f.status !== 'pending').length || 0) + 1
      const inserts = groups.flatMap((g: FixtureGroup) => g.fights.map((pf) => ({
        event_id: eventId,
        fight_number: n++,
        red_registration_id: pf.red.registration.id,
        blue_registration_id: pf.blue.registration.id,
        modality_id: pf.modality_id,
        weight_category_id: pf.weight_category_id,
        status: 'pending' as const
      })))
      if (inserts.length === 0) return { groups }
      const { error } = await supabase.from('fights').insert(inserts)
      if (error) throw error
      return { groups }
    },
    onSuccess: ({ groups }) => {
      qc.invalidateQueries({ queryKey: ['fights', eventId] })
      const totalFights = groups.reduce((acc, g) => acc + g.fights.length, 0)
      const unmatched = groups.reduce((acc, g) => acc + g.unmatched.length, 0)
      toast.success(`Fixture generado: ${totalFights} peleas`,
        unmatched ? `${unmatched} competidor(es) sin oponente.` : undefined)
    },
    onError: (e: Error) => toast.error('Error', e.message)
  })

  const reorderMut = useMutation({
    mutationFn: async (ids: string[]) => {
      // Actualiza fight_number según el nuevo orden
      const updates = ids.map((id, idx) => supabase.from('fights')
        .update({ fight_number: idx + 1 }).eq('id', id))
      const results = await Promise.all(updates)
      const err = results.find((r) => r.error)?.error
      if (err) throw err
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fights', eventId] })
      setOrderedIds(null)
      toast.success('Orden guardado')
    },
    onError: (e: Error) => toast.error('Error', e.message)
  })

  const removeFight = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fights').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fights', eventId] })
  })

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const current = (orderedIds ?? enrichedFights.map((f) => f.id))
    const oldIndex = current.indexOf(String(active.id))
    const newIndex = current.indexOf(String(over.id))
    setOrderedIds(arrayMove(current, oldIndex, newIndex))
  }

  // Competidores sin pelea asignada
  const assignedRegIds = new Set(fights.flatMap((f) => [f.red_registration_id, f.blue_registration_id]))
  const unmatched = regs.filter((r) => !assignedRegIds.has(r.id))
    .map((r) => ({ reg: r, student: studentByReg[r.id] }))
    .filter((x): x is { reg: Registration; student: Student } => Boolean(x.student))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="heading-display text-2xl">Fixture</h2>
          <p className="text-sm text-muted-foreground">
            {regs.length} inscriptos · {fights.length} peleas armadas
          </p>
        </div>
        <div className="flex gap-2">
          {admin && (
            <>
              <Button variant="outline" onClick={() => generateMut.mutate()} disabled={generateMut.isPending || regs.length < 2}>
                <Wand2 className="h-4 w-4" /> {fights.length ? 'Regenerar' : 'Generar fixture'}
              </Button>
              {orderedIds && (
                <Button onClick={() => reorderMut.mutate(orderedIds)} disabled={reorderMut.isPending}>
                  <RefreshCw className="h-4 w-4" /> Guardar orden
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {orderedFights.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Aún no hay fixture. {admin ? 'Generalo cuando estén las inscripciones cargadas.' : 'El admin todavía no lo generó.'}
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={orderedFights.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                {orderedFights.map((f) => (
                  <SortableFightRow key={f.id} fight={f}
                    onRemove={(id) => { if (confirm('¿Eliminar pelea?')) removeFight.mutate(id) }}
                    canEdit={admin} />
                ))}
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      )}

      {unmatched.length > 0 && (
        <Card>
          <CardContent>
            <h3 className="heading-display text-lg mb-2">Sin oponente</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Estos competidores no tienen pareja en el fixture actual. Resolvé manualmente o regenerá.
            </p>
            <div className="flex flex-wrap gap-2">
              {unmatched.map(({ reg, student }) => (
                <Badge key={reg.id} variant="warning">
                  {student.full_name} · {reg.weight_kg}kg · {ageAt(student.birth_date, eventDate)} años
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
