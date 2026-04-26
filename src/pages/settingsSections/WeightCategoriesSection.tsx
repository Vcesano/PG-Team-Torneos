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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import type { WeightCategory } from '@/lib/database.types'

interface FormState {
  id?: string
  name: string
  min_kg: string
  max_kg: string
  gender: 'M' | 'F' | 'ANY'
  age_min: string
  age_max: string
}

const EMPTY: FormState = { name: '', min_kg: '', max_kg: '', gender: 'ANY', age_min: '0', age_max: '99' }

export default function WeightCategoriesSection() {
  const toast = useToast()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)

  const { data: cats = [] } = useQuery<WeightCategory[]>({
    queryKey: ['weight_categories'], queryFn: async () => {
      const { data, error } = await supabase.from('weight_categories').select('*')
        .order('age_min').order('min_kg')
      if (error) throw error
      return data ?? []
    }
  })

  const upsert = useMutation({
    mutationFn: async (f: FormState) => {
      const payload = {
        name: f.name.trim(),
        min_kg: Number(f.min_kg),
        max_kg: Number(f.max_kg),
        gender: f.gender,
        age_min: Number(f.age_min),
        age_max: Number(f.age_max)
      }
      if (f.id) {
        const { error } = await supabase.from('weight_categories').update(payload).eq('id', f.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('weight_categories').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weight_categories'] })
      toast.success(form.id ? 'Actualizado' : 'Creado')
      setOpen(false); setForm(EMPTY)
    },
    onError: (e: Error) => toast.error('Error', e.message)
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('weight_categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weight_categories'] })
      toast.success('Eliminado')
    },
    onError: (e: Error) => toast.error('Error', e.message)
  })

  const startEdit = (c: WeightCategory) => {
    setForm({
      id: c.id, name: c.name,
      min_kg: String(c.min_kg), max_kg: String(c.max_kg),
      gender: c.gender, age_min: String(c.age_min), age_max: String(c.age_max)
    })
    setOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="heading-display text-xl">Categorías de peso</h2>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(EMPTY) }}>
          <DialogTrigger asChild>
            <Button onClick={() => setForm(EMPTY)}><Plus className="h-4 w-4" /> Nueva categoría</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); upsert.mutate(form) }} className="space-y-3">
              <div className="space-y-1.5">
                <Label required>Nombre (ej: -65 kg Adulto M)</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label required>Peso mínimo (kg)</Label>
                  <Input required type="number" step="0.1" value={form.min_kg}
                    onChange={(e) => setForm({ ...form, min_kg: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label required>Peso máximo (kg)</Label>
                  <Input required type="number" step="0.1" value={form.max_kg}
                    onChange={(e) => setForm({ ...form, max_kg: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label required>Género</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as 'M' | 'F' | 'ANY' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">Mixto</SelectItem>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Femenino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label required>Edad mínima</Label>
                  <Input required type="number" value={form.age_min}
                    onChange={(e) => setForm({ ...form, age_min: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label required>Edad máxima</Label>
                  <Input required type="number" value={form.age_max}
                    onChange={(e) => setForm({ ...form, age_max: e.target.value })} />
                </div>
              </div>
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
                <th className="p-3">Nombre</th>
                <th className="p-3">Rango peso</th>
                <th className="p-3">Género</th>
                <th className="p-3">Edad</th>
                <th className="p-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {cats.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3">{c.min_kg} – {c.max_kg} kg</td>
                  <td className="p-3">{c.gender === 'ANY' ? 'Mixto' : c.gender}</td>
                  <td className="p-3">{c.age_min} – {c.age_max}</td>
                  <td className="p-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm('¿Eliminar?')) remove.mutate(c.id) }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {cats.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Sin categorías cargadas.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
