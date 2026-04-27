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

const WINNER_METHODS: FightMethod[] = ['KO', 'TKO', 'DECISION', 'DQ']

const METHOD_LABEL: Record<FightMethod, string> = {
  KO: 'KO',
  TKO: 'TKO',
  DECISION: 'Decisión',
  DQ: 'Descalificación',
  DRAW: 'Empate'
}

type Outcome = '' | 'red' | 'blue' | 'draw'

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
        const isDraw = f.method === 'DRAW'
        const currentOutcome: Outcome =
          isDraw ? 'draw' :
          f.winner_registration_id === f.red_registration_id ? 'red' :
          f.winner_registration_id === f.blue_registration_id ? 'blue' : ''

        const setOutcome = (outcome: Outcome) => {
          if (outcome === '') {
            update.mutate({ id: f.id, winner_registration_id: null, method: null, status: 'pending' })
          } else if (outcome === 'draw') {
            update.mutate({ id: f.id, winner_registration_id: null, method: 'DRAW', status: 'completed' })
          } else if (outcome === 'red') {
            update.mutate({
              id: f.id,
              winner_registration_id: f.red_registration_id,
              method: f.method && f.method !== 'DRAW' ? f.method : 'DECISION',
              status: 'completed'
            })
          } else {
            update.mutate({
              id: f.id,
              winner_registration_id: f.blue_registration_id,
              method: f.method && f.method !== 'DRAW' ? f.method : 'DECISION',
              status: 'completed'
            })
          }
        }

        const showWinnerMethod = currentOutcome === 'red' || currentOutcome === 'blue'

        return (
          <Card key={f.id}>
            <CardContent className="p-4 space-y-3">
              <div className="grid gap-3 md:grid-cols-[5rem_1fr] items-center">
                <div className="font-mono text-muted-foreground">#{f.fight_number}</div>
                <div className="flex items-center gap-3">
                  <div className={`flex-1 text-right ${currentOutcome === 'red' ? 'text-red-500 font-bold' : ''}`}>
                    <div className="font-semibold">{red?.full_name ?? '—'}</div>
                    <div className="text-xs text-red-500">ROJA</div>
                  </div>
                  <div className="heading-display text-sm">VS</div>
                  <div className={`flex-1 ${currentOutcome === 'blue' ? 'text-blue-400 font-bold' : ''}`}>
                    <div className="font-semibold">{blue?.full_name ?? '—'}</div>
                    <div className="text-xs text-blue-400">AZUL</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-end pt-2 border-t border-border">
                <Select value={currentOutcome} onValueChange={(v) => setOutcome(v as Outcome)}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Resultado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="red">🔴 Gana Roja</SelectItem>
                    <SelectItem value="blue">🔵 Gana Azul</SelectItem>
                    <SelectItem value="draw">🤝 Empate</SelectItem>
                  </SelectContent>
                </Select>
                {showWinnerMethod && (
                  <>
                    <Select
                      value={f.method && f.method !== 'DRAW' ? f.method : ''}
                      onValueChange={(v) => update.mutate({ id: f.id, method: v as FightMethod })}
                    >
                      <SelectTrigger className="w-[150px]"><SelectValue placeholder="Método" /></SelectTrigger>
                      <SelectContent>
                        {WINNER_METHODS.map((m) => <SelectItem key={m} value={m}>{METHOD_LABEL[m]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input className="w-24" type="number" placeholder="Round"
                      defaultValue={f.round ?? ''}
                      onBlur={(e) => {
                        const v = e.target.value ? Number(e.target.value) : null
                        if (v !== f.round) update.mutate({ id: f.id, round: v })
                      }}
                    />
                  </>
                )}
                {isDraw && <Badge variant="warning">EMPATE</Badge>}
                {completed && !isDraw && <Badge variant="success">Cerrada</Badge>}
                {f.status === 'pending' && currentOutcome === '' && (
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
