import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import RegistrationsTab from './eventTabs/RegistrationsTab'
import FixtureTab from './eventTabs/FixtureTab'
import ResultsTab from './eventTabs/ResultsTab'
import ReportsTab from './eventTabs/ReportsTab'
import type { Event } from '@/lib/database.types'

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()

  const { data: event, isLoading } = useQuery<Event | null>({
    queryKey: ['event', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select('*').eq('id', eventId!).single()
      if (error) throw error
      return data
    }
  })

  if (isLoading) return <div className="text-muted-foreground">Cargando evento…</div>
  if (!event) return <div className="text-muted-foreground">Evento no encontrado.</div>

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/eventos" className="text-xs text-muted-foreground inline-flex items-center gap-1 mb-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Volver a eventos
          </Link>
          <h1 className="heading-display text-3xl md:text-4xl flex items-center gap-3">
            {event.name}
            <Badge variant={event.status === 'open' ? 'success' : 'secondary'}>
              {event.status === 'open' ? 'Abierto' : event.status === 'draft' ? 'Borrador' : 'Cerrado'}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(event.event_date)}{event.location ? ` · ${event.location}` : ''}
          </p>
        </div>
      </div>

      <Tabs defaultValue="inscripciones">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList>
            <TabsTrigger value="inscripciones">Inscripciones</TabsTrigger>
            <TabsTrigger value="fixture">Fixture</TabsTrigger>
            <TabsTrigger value="resultados">Resultados</TabsTrigger>
            <TabsTrigger value="reportes">Reportes</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="inscripciones"><RegistrationsTab eventId={event.id} /></TabsContent>
        <TabsContent value="fixture"><FixtureTab eventId={event.id} eventDate={event.event_date} /></TabsContent>
        <TabsContent value="resultados"><ResultsTab eventId={event.id} /></TabsContent>
        <TabsContent value="reportes"><ReportsTab eventId={event.id} /></TabsContent>
      </Tabs>
    </div>
  )
}

