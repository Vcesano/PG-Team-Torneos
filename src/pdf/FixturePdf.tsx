import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { formatDate } from '@/lib/utils'
import type {
  Event, Fight, Modality, Registration, Student, WeightCategory
} from '@/lib/database.types'

interface Props {
  event: Event
  fights: Fight[]
  regs: Registration[]
  students: Student[]
  modalities: Modality[]
  weightCats: WeightCategory[]
}

const LOGO_URL = `${typeof window !== 'undefined' ? window.location.origin : ''}/logo.png`

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica', color: '#111' },
  header: { flexDirection: 'row', alignItems: 'center', borderBottom: '2 solid #b91c1c', paddingBottom: 10, marginBottom: 14, gap: 12 },
  logo: { width: 56, height: 56 },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontWeight: 700, color: '#b91c1c' },
  subtitle: { fontSize: 11, color: '#444', marginTop: 2 },
  schoolName: { fontSize: 9, color: '#666', marginTop: 2, letterSpacing: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, borderBottom: '1 solid #ddd'
  },
  num: { width: 28, fontWeight: 700 },
  side: { flex: 1, fontSize: 11 },
  vs: { width: 26, textAlign: 'center', color: '#b91c1c', fontWeight: 700 },
  meta: { width: 130, fontSize: 9, color: '#555', textAlign: 'right' },
  redLabel: { color: '#b91c1c', fontSize: 8, marginTop: 1 },
  blueLabel: { color: '#1d4ed8', fontSize: 8, marginTop: 1 }
})

export default function FixturePdf({ event, fights, regs, students, modalities, weightCats }: Props) {
  const sById = Object.fromEntries(students.map((x) => [x.id, x]))
  const rById = Object.fromEntries(regs.map((x) => [x.id, x]))
  const mById = Object.fromEntries(modalities.map((x) => [x.id, x]))
  const cById = Object.fromEntries(weightCats.map((x) => [x.id, x]))

  const studentOf = (regId: string) => sById[rById[regId]?.student_id ?? '']

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Image src={LOGO_URL} style={s.logo} />
          <View style={s.headerText}>
            <Text style={s.title}>{event.name.toUpperCase()}</Text>
            <Text style={s.subtitle}>
              {formatDate(event.event_date)}{event.location ? ` · ${event.location}` : ''}
            </Text>
            <Text style={s.schoolName}>KICK BOXING PG TEAM TUCUMÁN</Text>
          </View>
        </View>
        {fights.length === 0 && <Text>No hay peleas cargadas.</Text>}
        {fights.map((f) => {
          const red = studentOf(f.red_registration_id)
          const blue = studentOf(f.blue_registration_id)
          const mod = mById[f.modality_id]?.name
          const cat = f.weight_category_id ? cById[f.weight_category_id]?.name : undefined
          return (
            <View key={f.id} style={s.row}>
              <Text style={s.num}>#{f.fight_number}</Text>
              <View style={[s.side, { textAlign: 'right' }]}>
                <Text>{red?.full_name ?? '—'}</Text>
                <Text style={s.redLabel}>ROJA</Text>
              </View>
              <Text style={s.vs}>VS</Text>
              <View style={s.side}>
                <Text>{blue?.full_name ?? '—'}</Text>
                <Text style={s.blueLabel}>AZUL</Text>
              </View>
              <Text style={s.meta}>{[mod, cat].filter(Boolean).join(' · ')}</Text>
            </View>
          )
        })}
      </Page>
    </Document>
  )
}
