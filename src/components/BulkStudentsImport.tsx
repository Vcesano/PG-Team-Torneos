import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, Upload, FileSpreadsheet, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import type { Profile } from '@/lib/database.types'

interface ParsedStudent {
  full_name: string
  dni: string
  birth_date: string
  gender: 'M' | 'F'
  phone?: string | null
  email?: string | null
  errors: string[]
}

interface Props { teachers: Profile[] }

const REQUIRED_HEADERS = ['nombre', 'dni', 'fecha_nacimiento', 'genero']

function normalizeHeader(s: string): string {
  return String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

function parseDate(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const s = String(value).trim()
  // formatos: 2010-05-15 o 15/05/2010
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (m) {
    const d = m[1].padStart(2, '0')
    const mo = m[2].padStart(2, '0')
    let y = m[3]
    if (y.length === 2) y = (Number(y) > 50 ? '19' : '20') + y
    return `${y}-${mo}-${d}`
  }
  return null
}

function parseGender(value: unknown): 'M' | 'F' | null {
  const s = String(value ?? '').trim().toUpperCase()
  if (s === 'M' || s === 'MASCULINO' || s === 'VARON' || s === 'VARÓN' || s === 'H') return 'M'
  if (s === 'F' || s === 'FEMENINO' || s === 'MUJER') return 'F'
  return null
}

export default function BulkStudentsImport({ teachers }: Props) {
  const { profile } = useAuth()
  const admin = isAdmin(profile)
  const toast = useToast()
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [parsed, setParsed] = useState<ParsedStudent[]>([])
  const [filename, setFilename] = useState<string | null>(null)
  const [assignTo, setAssignTo] = useState<string>(profile?.id ?? '')

  const downloadTemplate = () => {
    const headers = ['nombre', 'dni', 'fecha_nacimiento', 'genero', 'telefono', 'email']
    const example = [
      ['Juan Pérez', '40123456', '2005-03-12', 'M', '3815551234', 'juan@example.com'],
      ['María García', '41987654', '15/06/2008', 'F', '', '']
    ]
    const ws = XLSX.utils.aoa_to_sheet([headers, ...example])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Alumnos')
    XLSX.writeFile(wb, 'plantilla-alumnos.xlsx')
  }

  const onFile = async (file: File) => {
    setFilename(file.name)
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { cellDates: true })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

    if (rows.length === 0) {
      toast.error('Excel vacío', 'La primera hoja no tiene filas.')
      return
    }

    // Normalizamos headers
    const sample = rows[0]
    const headerMap: Record<string, string> = {}
    for (const k of Object.keys(sample)) headerMap[normalizeHeader(k)] = k

    const missing = REQUIRED_HEADERS.filter((h) => !headerMap[h])
    if (missing.length > 0) {
      toast.error('Faltan columnas obligatorias', `El Excel debe tener: ${REQUIRED_HEADERS.join(', ')}. Faltan: ${missing.join(', ')}`)
      return
    }

    const out: ParsedStudent[] = rows.map((row) => {
      const errors: string[] = []
      const get = (key: string) => row[headerMap[key]]
      const full_name = String(get('nombre') ?? '').trim()
      const dni = String(get('dni') ?? '').trim()
      const birth_date = parseDate(get('fecha_nacimiento'))
      const gender = parseGender(get('genero'))
      const phone = String(get('telefono') ?? '').trim() || null
      const email = String(get('email') ?? '').trim() || null

      if (!full_name) errors.push('nombre vacío')
      if (!dni) errors.push('DNI vacío')
      if (!birth_date) errors.push('fecha inválida')
      if (!gender) errors.push('género inválido (usar M/F)')

      return {
        full_name, dni,
        birth_date: birth_date ?? '',
        gender: gender ?? 'M',
        phone, email, errors
      }
    })
    setParsed(out)
  }

  const importMut = useMutation({
    mutationFn: async () => {
      const valid = parsed.filter((p) => p.errors.length === 0)
      if (valid.length === 0) throw new Error('No hay filas válidas para importar')
      if (!assignTo) throw new Error('Elegí a qué profesor asignar los alumnos')

      const payload = valid.map((p) => ({
        full_name: p.full_name,
        dni: p.dni,
        birth_date: p.birth_date,
        gender: p.gender,
        phone: p.phone,
        email: p.email,
        profesor_id: assignTo,
        active: true
      }))

      const { error } = await supabase.from('students').insert(payload)
      if (error) throw error
      return valid.length
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ['students'] })
      toast.success(`${n} alumno(s) importado(s)`)
      setOpen(false)
      setParsed([])
      setFilename(null)
    },
    onError: (e: Error) => toast.error('Error en importación', e.message)
  })

  const validCount = parsed.filter((p) => p.errors.length === 0).length
  const errorCount = parsed.length - validCount

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setParsed([]); setFilename(null) } }}>
      <DialogTrigger asChild>
        <Button variant="outline"><FileSpreadsheet className="h-4 w-4" /> Importar Excel</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar alumnos desde Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="card-surface p-4 text-sm space-y-2">
            <p className="text-muted-foreground">
              El Excel tiene que tener estas columnas (en la primera fila, sin importar mayúsculas/acentos):
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge>nombre *</Badge>
              <Badge>dni *</Badge>
              <Badge>fecha_nacimiento *</Badge>
              <Badge>genero *</Badge>
              <Badge variant="outline">telefono</Badge>
              <Badge variant="outline">email</Badge>
            </div>
            <Button variant="ghost" size="sm" className="mt-1" onClick={downloadTemplate}>
              <Download className="h-4 w-4" /> Descargar plantilla de ejemplo
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label required>Profesor a cargo de los alumnos importados</Label>
            <Select value={assignTo} onValueChange={setAssignTo}>
              <SelectTrigger><SelectValue placeholder="Elegir profesor" /></SelectTrigger>
              <SelectContent>
                {(admin ? teachers : teachers.filter((t) => t.id === profile?.id)).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
            />
            <Button onClick={() => fileInputRef.current?.click()} variant="outline">
              <Upload className="h-4 w-4" /> Seleccionar archivo
            </Button>
            {filename && (
              <span className="ml-3 text-sm text-muted-foreground">
                {filename}
                <Button size="icon" variant="ghost" className="ml-1 h-6 w-6" onClick={() => { setParsed([]); setFilename(null) }}>
                  <X className="h-3 w-3" />
                </Button>
              </span>
            )}
          </div>

          {parsed.length > 0 && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Badge variant="success">{validCount} válidos</Badge>
                {errorCount > 0 && <Badge variant="danger">{errorCount} con errores</Badge>}
              </div>
              <div className="card-surface max-h-[300px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/40 sticky top-0">
                    <tr className="text-left">
                      <th className="p-2">Nombre</th>
                      <th className="p-2">DNI</th>
                      <th className="p-2">Nac.</th>
                      <th className="p-2">G</th>
                      <th className="p-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((p, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-2">{p.full_name || '—'}</td>
                        <td className="p-2">{p.dni || '—'}</td>
                        <td className="p-2">{p.birth_date || '—'}</td>
                        <td className="p-2">{p.gender}</td>
                        <td className="p-2">
                          {p.errors.length === 0
                            ? <Badge variant="success">OK</Badge>
                            : <span className="text-destructive">{p.errors.join(', ')}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={() => importMut.mutate()}
            disabled={validCount === 0 || importMut.isPending || !assignTo}
          >
            Importar {validCount > 0 ? `(${validCount})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
