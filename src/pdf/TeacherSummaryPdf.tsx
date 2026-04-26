import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { formatDate, formatMoney } from '@/lib/utils'
import type {
  Belt, Event, Modality, PaymentStatus, Profile, Registration, Student
} from '@/lib/database.types'

interface Props {
  event: Event
  regs: Registration[]
  students: Student[]
  teachers: Profile[]
  modalities: Modality[]
  belts: Belt[]
  pays: PaymentStatus[]
}

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica', color: '#111' },
  header: { borderBottom: '2 solid #b91c1c', paddingBottom: 8, marginBottom: 14 },
  title: { fontSize: 20, fontWeight: 700, color: '#b91c1c' },
  subtitle: { fontSize: 11, color: '#444', marginTop: 2 },
  teacher: { marginTop: 14, marginBottom: 4, fontSize: 12, fontWeight: 700, color: '#111', borderBottom: '1 solid #b91c1c', paddingBottom: 2 },
  th: { flexDirection: 'row', backgroundColor: '#f3f4f6', paddingVertical: 4, paddingHorizontal: 4, fontWeight: 700, fontSize: 9 },
  tr: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 4, borderBottom: '1 solid #eee', fontSize: 9 },
  c1: { width: '32%' },
  c2: { width: '12%' },
  c3: { width: '20%' },
  c4: { width: '14%' },
  c5: { width: '12%' },
  c6: { width: '10%', textAlign: 'right' },
  totalLine: { marginTop: 4, fontSize: 9, color: '#444', textAlign: 'right' }
})

export default function TeacherSummaryPdf({ event, regs, students, teachers, modalities, belts, pays }: Props) {
  const sById = Object.fromEntries(students.map((x) => [x.id, x]))
  const mById = Object.fromEntries(modalities.map((x) => [x.id, x]))
  const bById = Object.fromEntries(belts.map((x) => [x.id, x]))
  const pById = Object.fromEntries(pays.map((x) => [x.id, x]))

  const grouped = new Map<string, Registration[]>()
  for (const r of regs) {
    const stu = sById[r.student_id]
    if (!stu) continue
    const list = grouped.get(stu.profesor_id) ?? []
    list.push(r)
    grouped.set(stu.profesor_id, list)
  }

  const teacherById = Object.fromEntries(teachers.map((t) => [t.id, t]))
  const orderedTeacherIds = Array.from(grouped.keys()).sort((a, b) =>
    (teacherById[a]?.full_name ?? '').localeCompare(teacherById[b]?.full_name ?? '')
  )

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>RESUMEN POR PROFESOR — {event.name.toUpperCase()}</Text>
          <Text style={s.subtitle}>
            {formatDate(event.event_date)}{event.location ? ` · ${event.location}` : ''} · Kick Boxing PG Team Tucumán
          </Text>
        </View>
        {orderedTeacherIds.length === 0 && <Text>No hay inscripciones cargadas.</Text>}
        {orderedTeacherIds.map((teacherId) => {
          const list = grouped.get(teacherId) ?? []
          const total = list.reduce((acc, r) => acc + (r.amount_paid || 0), 0)
          return (
            <View key={teacherId} wrap={false}>
              <Text style={s.teacher}>{teacherById[teacherId]?.full_name ?? 'Profesor'}  ·  {list.length} inscripto(s)</Text>
              <View style={s.th}>
                <Text style={s.c1}>Alumno</Text>
                <Text style={s.c2}>Peso</Text>
                <Text style={s.c3}>Modalidad</Text>
                <Text style={s.c4}>Cinturón</Text>
                <Text style={s.c5}>Pago</Text>
                <Text style={s.c6}>Monto</Text>
              </View>
              {list.map((r) => {
                const stu = sById[r.student_id]
                return (
                  <View key={r.id} style={s.tr}>
                    <Text style={s.c1}>{stu?.full_name ?? '—'}</Text>
                    <Text style={s.c2}>{r.weight_kg} kg</Text>
                    <Text style={s.c3}>{mById[r.modality_id]?.name ?? '—'}</Text>
                    <Text style={s.c4}>{bById[r.belt_id]?.name ?? '—'}</Text>
                    <Text style={s.c5}>{pById[r.payment_status_id]?.name ?? '—'}</Text>
                    <Text style={s.c6}>{r.amount_paid ? formatMoney(r.amount_paid) : '—'}</Text>
                  </View>
                )
              })}
              <Text style={s.totalLine}>Subtotal cobrado: {formatMoney(total)}</Text>
            </View>
          )
        })}
      </Page>
    </Document>
  )
}
