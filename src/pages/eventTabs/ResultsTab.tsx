import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import type { Fight, FightMethod, Registration, Student } from '@/lib/database.types'

const METHODS: FightMethod[] = ['KO', 'TKO', 'DECISION', 'DQ']

export default function ResultsTab({ eventId }: { eventId: string }) {
  const { profile } = useAuth()
  const admin = isAdmin(profile)
  const toast = useToast()
  const qc = useQueryClient()

  const { data: fights = [] } = useQuery<Fight[]>({
    queryKey: ['fights', eventId], queryFn: async () => {
      const { data, error } = await supabase.from('fights').select('*').eq('event_id', eventId).order('fight_number')
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

  const studentByReg = useMemo(() => {
    const sById = Object.fromEntries(students.map((s) => [s.id, s]))
    return Object.fromEntries(regs.map((r) => [r.id, sById[r.student_id]]))
  }, [students, regs])

  const update = useMutation({
    mutationFn: async (payload: Partial<Fight> & { id: string }) => {
      const { id, ...rest } = payload
      const { error } = await supabase.from('fights').update(rest).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fights', eventId] }),
    onError: (e: Error) => toast.error('Error', e.message)
  })

  if (!admin) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Solo los administradores pueden registrar resultados.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {fights.length === 0 && (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          No hay peleas cargadas todavía.
        </CardContent></Card>
      )}
      {fights.map((f) => {
        const red = studentByReg[f.red_registration_id]
        const blue = studentByReg[f.blue_registration_id]
        const completed = f.status === 'completed'
        return (
          <Card key={f.id}>
            <CardContent className="p-4 grid gap-3 md:grid-cols-[6rem_1fr_auto] items-center">
              <div className="font-mono text-muted-foreground">#{f.fight_number}</div>
              <div className="flex items-center gap-3">
                <div className="flex-1 text-right">
                  <div className="font-semibold">{red?.full_name ?? '—'}</div>
                  <div className="text-xs text-red-500">ROJA</div>
                </div>
                <div className="heading-display text-sm">VS</div>
                <div className="flex-1">
                  <div className="font-semibold">{blue?.full_name ?? '—'}</div>
                  <div className="text-xs text-blue-400">AZUL</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 justify-end">
                <Select
                  value={f.winner_registration_id ?? ''}
                  onValueChange={(v) => update.mutate({ id: f.id, winner_registration_id: v || null, status: v ? 'completed' : 'pending' })}
                >
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Ganador" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={f.red_registration_id}>Roja: {red?.full_name ?? '—'}</SelectItem>
                    <SelectItem value={f.blue_registration_id}>Azul: {blue?.full_name ?? '—'}</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={f.method ?? ''}
                  onValueChange={(v) => update.mutate({ id: f.id, method: v as FightMethod })}
                >
                  <SelectTrigger className="w-[120px]"><SelectValue placeholder="Método" /></SelectTrigger>
                  <SelectContent>
                    {METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input className="w-20" type="number" placeholder="Round"
                  defaultValue={f.round ?? ''}
                  onBlur={(e) => {
                    const v = e.target.value ? Number(e.target.value) : null
                    if (v !== f.round) update.mutate({ id: f.id, round: v })
                  }}
                />
                {completed && <Badge variant="success">Cerrada</Badge>}
                {f.status === 'pending' && (
                  <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: f.id, status: 'cancelled' })}>
                    Cancelar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
