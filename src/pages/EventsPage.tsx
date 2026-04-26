import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CalendarPlus, MapPin, Plus } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import type { Event, EventStatus } from '@/lib/database.types'

const STATUS_LABEL: Record<EventStatus, string> = {
  draft: 'Borrador',
  open: 'Abierto',
  closed: 'Cerrado'
}
const STATUS_VARIANT: Record<EventStatus, 'secondary' | 'success' | 'outline'> = {
  draft: 'outline',
  open: 'success',
  closed: 'secondary'
}

export default function EventsPage() {
  const { profile } = useAuth()
  const admin = isAdmin(profile)
  const toast = useToast()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false })
      if (error) throw error
      return data ?? []
    }
  })

  const createEvent = useMutation({
    mutationFn: async (payload: { name: string; event_date: string; location: string }) => {
      const { error } = await supabase.from('events').insert({
        name: payload.name,
        event_date: payload.event_date,
        location: payload.location || null,
        status: 'open',
        created_by: profile?.id ?? null
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] })
      toast.success('Evento creado')
      setOpen(false)
    },
    onError: (e: Error) => toast.error('Error', e.message)
  })

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    createEvent.mutate({
      name: String(fd.get('name') ?? '').trim(),
      event_date: String(fd.get('event_date') ?? ''),
      location: String(fd.get('location') ?? '').trim()
    })
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-display text-3xl md:text-4xl">Eventos</h1>
          <p className="text-sm text-muted-foreground">Seleccioná un torneo para gestionar inscripciones y fixture.</p>
        </div>
        {admin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> Nuevo evento</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo evento</DialogTitle>
              </DialogHeader>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" required>Nombre</Label>
                  <Input id="name" name="name" required placeholder="Copa PG Team — Otoño" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="event_date" required>Fecha</Label>
                  <Input id="event_date" name="event_date" type="date" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location">Lugar</Label>
                  <Input id="location" name="location" placeholder="Club / dirección" />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createEvent.isPending}>Crear</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Cargando eventos…</div>
      ) : !events?.length ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center justify-center text-center gap-3">
            <CalendarPlus className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No hay eventos todavía.</p>
            {admin && <p className="text-xs text-muted-foreground">Creá el primero con el botón de arriba.</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((ev) => (
            <Link key={ev.id} to={`/eventos/${ev.id}`}>
              <Card className="hover:border-primary/60 hover:shadow-red-950/40 transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="heading-display text-xl leading-tight">{ev.name}</h3>
                    <Badge variant={STATUS_VARIANT[ev.status]}>{STATUS_LABEL[ev.status]}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <CalendarPlus className="h-3.5 w-3.5" /> {formatDate(ev.event_date)}
                  </div>
                  {ev.location && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <MapPin className="h-3.5 w-3.5" /> {ev.location}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
