import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { pdf } from '@react-pdf/renderer'
import { Download, FileText, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import FixturePdf from '@/pdf/FixturePdf'
import TeacherSummaryPdf from '@/pdf/TeacherSummaryPdf'
import type {
  Belt, Event, Fight, Modality, PaymentStatus, Profile, Registration, Student, WeightCategory
} from '@/lib/database.types'

export default function ReportsTab({ eventId }: { eventId: string }) {
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)

  const { data: event } = useQuery<Event>({
    queryKey: ['event', eventId], queryFn: async () => {
      const { data, error } = await supabase.from('events').select('*').eq('id', eventId).single()
      if (error) throw error
      return data
    }
  })

  const fetchAll = async () => {
    const [fights, regs, students, teachers, modalities, weightCats, belts, pays] = await Promise.all([
      supabase.from('fights').select('*').eq('event_id', eventId).order('fight_number').then((r) => r.data as Fight[] ?? []),
      supabase.from('registrations').select('*').eq('event_id', eventId).then((r) => r.data as Registration[] ?? []),
      supabase.from('students').select('*').then((r) => r.data as Student[] ?? []),
      supabase.from('profiles').select('*').then((r) => r.data as Profile[] ?? []),
      supabase.from('modalities').select('*').then((r) => r.data as Modality[] ?? []),
      supabase.from('weight_categories').select('*').then((r) => r.data as WeightCategory[] ?? []),
      supabase.from('belts').select('*').then((r) => r.data as Belt[] ?? []),
      supabase.from('payment_statuses').select('*').then((r) => r.data as PaymentStatus[] ?? [])
    ])
    return { fights, regs, students, teachers, modalities, weightCats, belts, pays }
  }

  const downloadPdf = async (filename: string, blob: Blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const generateFixturePdf = async () => {
    if (!event) return
    setBusy('fixture')
    try {
      const data = await fetchAll()
      const blob = await pdf(<FixturePdf event={event} {...data} />).toBlob()
      await downloadPdf(`fixture-${event.name.replace(/\s+/g, '_')}.pdf`, blob)
    } catch (e) {
      toast.error('Error generando PDF', (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const generateTeacherSummary = async () => {
    if (!event) return
    setBusy('teacher')
    try {
      const data = await fetchAll()
      const blob = await pdf(<TeacherSummaryPdf event={event} {...data} />).toBlob()
      await downloadPdf(`resumen-profesores-${event.name.replace(/\s+/g, '_')}.pdf`, blob)
    } catch (e) {
      toast.error('Error generando PDF', (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 max-w-3xl">
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="heading-display text-lg">Cartelera (PDF)</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Listado ordenado de peleas con esquina roja/azul, peso y modalidad. Para imprimir el día del evento.
          </p>
          <Button onClick={generateFixturePdf} disabled={busy === 'fixture'}>
            <Download className="h-4 w-4" /> Descargar
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="heading-display text-lg">Resumen por profesor</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Listado de inscriptos agrupados por profesor con datos de pelea y estado de pago.
          </p>
          <Button onClick={generateTeacherSummary} disabled={busy === 'teacher'}>
            <Download className="h-4 w-4" /> Descargar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
