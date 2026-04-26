import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'

type EnumTable = 'modalities' | 'belts' | 'payment_statuses'

interface Props {
  table: EnumTable
  title: string
  hasColor?: boolean
  hasOrder?: boolean
  hasIsPaid?: boolean
}

interface Row {
  id: string
  name: string
  color_hex?: string
  order_index?: number
  is_paid?: boolean
  active?: boolean
}

interface FormState {
  id?: string
  name: string
  color_hex: string
  order_index: string
  is_paid: boolean
}

const EMPTY: FormState = { name: '', color_hex: '#ffffff', order_index: '0', is_paid: false }

export default function EnumsSection({ table, title, hasColor, hasOrder, hasIsPaid }: Props) {
  const toast = useToast()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)

  const { data: rows = [] } = useQuery<Row[]>({
    queryKey: [table], queryFn: async () => {
      const { data, error } = await supabase.from(table).select('*').order(hasOrder ? 'order_index' : 'name')
      if (error) throw error
      return (data ?? []) as Row[]
    }
  })

  const upsert = useMutation({
    mutationFn: async (f: FormState) => {
      const payload: Record<string, unknown> = { name: f.name.trim() }
      if (hasColor) payload.color_hex = f.color_hex
      if (hasOrder) payload.order_index = Number(f.order_index) || 0
      if (hasIsPaid) payload.is_paid = f.is_paid
      if (f.id) {
        const { error } = await supabase.from(table).update(payload).eq('id', f.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from(table).insert(payload as never)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table] })
      toast.success(form.id ? 'Actualizado' : 'Creado')
      setOpen(false); setForm(EMPTY)
    },
    onError: (e: Error) => toast.error('Error', e.message)
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table] })
      toast.success('Eliminado')
    },
    onError: (e: Error) => toast.error('Error', e.message)
  })

  const startEdit = (r: Row) => {
    setForm({
      id: r.id,
      name: r.name,
      color_hex: r.color_hex ?? '#ffffff',
      order_index: String(r.order_index ?? 0),
      is_paid: r.is_paid ?? false
    })
    setOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="heading-display text-xl">{title}</h2>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(EMPTY) }}>
          <DialogTrigger asChild>
            <Button onClick={() => setForm(EMPTY)}><Plus className="h-4 w-4" /> Agregar</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? 'Editar' : 'Nuevo'}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); upsert.mutate(form) }} className="space-y-3">
              <div className="space-y-1.5">
                <Label required>Nombre</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              {hasColor && (
                <div className="space-y-1.5">
                  <Label>Color</Label>
                  <Input type="color" value={form.color_hex} onChange={(e) => setForm({ ...form, color_hex: e.target.value })} />
                </div>
              )}
              {hasOrder && (
                <div className="space-y-1.5">
                  <Label>Orden</Label>
                  <Input type="number" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: e.target.value })} />
                </div>
              )}
              {hasIsPaid && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.is_paid} onChange={(e) => setForm({ ...form, is_paid: e.target.checked })} />
                  Considerar este estado como "pagado"
                </label>
              )}
              <DialogFooter>
                <Button type="submit" disabled={upsert.isPending}>{form.id ? 'Guardar' : 'Crear'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40">
              <tr className="text-left">
                {hasColor && <th className="p-3 w-8"></th>}
                <th className="p-3">Nombre</th>
                {hasOrder && <th className="p-3 w-20">Orden</th>}
                {hasIsPaid && <th className="p-3 w-24">¿Pagado?</th>}
                <th className="p-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  {hasColor && (
                    <td className="p-3">
                      <div className="h-5 w-5 rounded-full border border-border" style={{ background: r.color_hex }} />
                    </td>
                  )}
                  <td className="p-3 font-medium">{r.name}</td>
                  {hasOrder && <td className="p-3">{r.order_index}</td>}
                  {hasIsPaid && <td className="p-3">{r.is_paid ? 'Sí' : 'No'}</td>}
                  <td className="p-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm('¿Eliminar?')) remove.mutate(r.id) }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
