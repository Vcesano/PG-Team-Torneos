import { describe, expect, it } from 'vitest'
import { findWeightCategory, generateFixture, type FixtureInputItem } from '../fixture'
import type { Registration, Student, WeightCategory } from '../database.types'

const cats: WeightCategory[] = [
  { id: 'c-65m', name: '-65 kg M', min_kg: 60.01, max_kg: 65, gender: 'M', age_min: 18, age_max: 35 },
  { id: 'c-70m', name: '-70 kg M', min_kg: 65.01, max_kg: 70, gender: 'M', age_min: 18, age_max: 35 }
]

const mkStudent = (id: string, gender: 'M' | 'F', birth_date: string): Student => ({
  id, profesor_id: 'p1', full_name: `Atleta ${id}`, dni: id, birth_date, gender,
  phone: null, email: null, current_belt_id: null, active: true, created_at: ''
})

const mkReg = (id: string, student_id: string, weight_kg: number): Registration => ({
  id, event_id: 'e1', student_id, weight_kg, fight_count: 0,
  belt_id: 'b1', modality_id: 'mK1', weight_category_id: null,
  payment_status_id: 'pp', amount_paid: 0, notes: null, created_at: ''
})

describe('findWeightCategory', () => {
  it('selecciona la categoría más estrecha que aplica', () => {
    const cat = findWeightCategory(cats, 'M', 25, 64)
    expect(cat?.id).toBe('c-65m')
  })
  it('devuelve null si no hay categoría para ese peso', () => {
    expect(findWeightCategory(cats, 'M', 25, 90)).toBeNull()
  })
})

describe('generateFixture', () => {
  it('en pasada estricta empareja los del mismo grupo', () => {
    const items: FixtureInputItem[] = [
      { student: mkStudent('a', 'M', '2000-01-01'), registration: mkReg('r1', 'a', 64) },
      { student: mkStudent('b', 'M', '2001-01-01'), registration: mkReg('r2', 'b', 63) },
    ]
    const groups = generateFixture(items, '2026-04-25', cats)
    const totalFights = groups.reduce((acc, g) => acc + g.fights.length, 0)
    expect(totalFights).toBe(1)
  })

  it('en pasada relajada empareja entre categorías de peso si comparten modalidad y género', () => {
    const items: FixtureInputItem[] = [
      { student: mkStudent('a', 'M', '2000-01-01'), registration: mkReg('r1', 'a', 64) }, // -65
      { student: mkStudent('b', 'M', '2000-06-01'), registration: mkReg('r2', 'b', 68) }, // -70
    ]
    const groups = generateFixture(items, '2026-04-25', cats)
    const totalFights = groups.reduce((acc, g) => acc + g.fights.length, 0)
    expect(totalFights).toBe(1) // ahora siempre arma el par
  })

  it('1 hombre + 1 mujer queda sin par (género es obligatorio)', () => {
    const items: FixtureInputItem[] = [
      { student: mkStudent('a', 'M', '2000-01-01'), registration: mkReg('r1', 'a', 64) },
      { student: mkStudent('b', 'F', '2001-01-01'), registration: mkReg('r2', 'b', 63) },
    ]
    const groups = generateFixture(items, '2026-04-25', cats)
    const totalFights = groups.reduce((acc, g) => acc + g.fights.length, 0)
    const totalUnmatched = groups.reduce((acc, g) => acc + g.unmatched.length, 0)
    expect(totalFights).toBe(0)
    expect(totalUnmatched).toBe(2)
  })
})
