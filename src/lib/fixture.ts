import type { Registration, Student, WeightCategory } from './database.types'
import { ageAt, ageBucket } from './age'

export interface FixtureInputItem {
  registration: Registration
  student: Student
}

export interface ProposedFight {
  red: FixtureInputItem
  blue: FixtureInputItem
  modality_id: string
  weight_category_id: string | null
  groupKey: string
}

export interface FixtureGroup {
  key: string
  label: string
  fights: ProposedFight[]
  unmatched: FixtureInputItem[]
}

export function findWeightCategory(
  cats: WeightCategory[],
  gender: 'M' | 'F',
  age: number,
  weightKg: number
): WeightCategory | null {
  const candidates = cats.filter(
    (c) =>
      (c.gender === 'ANY' || c.gender === gender) &&
      age >= c.age_min &&
      age <= c.age_max &&
      weightKg >= c.min_kg &&
      weightKg <= c.max_kg
  )
  if (candidates.length === 0) return null
  return candidates.sort((a, b) => a.max_kg - a.min_kg - (b.max_kg - b.min_kg))[0]
}

type Enriched = FixtureInputItem & {
  age: number
  bucket: ReturnType<typeof ageBucket>
  cat: WeightCategory | null
}

function enrich(items: FixtureInputItem[], eventDate: string, cats: WeightCategory[]): Enriched[] {
  return items.map((it) => {
    const age = ageAt(it.student.birth_date, eventDate)
    const bucket = ageBucket(age)
    const cat =
      it.registration.weight_category_id
        ? cats.find((c) => c.id === it.registration.weight_category_id) ?? null
        : findWeightCategory(cats, it.student.gender, age, it.registration.weight_kg)
    return { ...it, age, bucket, cat }
  })
}

function pairUp(list: Enriched[], keyLabel: string): { fights: ProposedFight[]; leftover: Enriched[] } {
  // Ordena por experiencia (fight_count) para que pelee con alguien similar.
  // Después por peso para minimizar diferencia.
  const sorted = [...list].sort((a, b) => {
    const fc = b.registration.fight_count - a.registration.fight_count
    if (fc !== 0) return fc
    return a.registration.weight_kg - b.registration.weight_kg
  })
  const fights: ProposedFight[] = []
  const leftover: Enriched[] = []
  for (let i = 0; i < sorted.length; i += 2) {
    const red = sorted[i]
    const blue = sorted[i + 1]
    if (!blue) {
      leftover.push(red)
      continue
    }
    fights.push({
      red,
      blue,
      modality_id: red.registration.modality_id,
      weight_category_id: red.cat?.id ?? null,
      groupKey: keyLabel
    })
  }
  return { fights, leftover }
}

/**
 * Algoritmo de fixture en 3 pasadas con criterios cada vez más relajados.
 * Esto garantiza que SIEMPRE devuelva pares aunque los datos sean dispares.
 *
 *   Pasada 1: estricta — modalidad + cat. peso + género + edad + cinturón.
 *   Pasada 2: relajada — solo modalidad + género (mantiene OBLIGATORIOS).
 *   Pasada 3: solo género (último recurso, marca el grupo como "INTER-MODALIDAD").
 */
export function generateFixture(
  items: FixtureInputItem[],
  eventDate: string,
  cats: WeightCategory[]
): FixtureGroup[] {
  const enriched = enrich(items, eventDate, cats)
  const result: FixtureGroup[] = []
  let remaining: Enriched[] = enriched

  // ---- PASADA 1: estricta ----
  const strictGroups = new Map<string, Enriched[]>()
  for (const e of remaining) {
    const key = [
      'strict',
      e.registration.modality_id,
      e.cat?.id ?? 'NOCAT',
      e.student.gender,
      e.bucket,
      e.registration.belt_id
    ].join('|')
    const arr = strictGroups.get(key) ?? []
    arr.push(e)
    strictGroups.set(key, arr)
  }

  const stillRemaining: Enriched[] = []
  for (const [, list] of strictGroups.entries()) {
    const sample = list[0]
    const label = `${sample.cat?.name ?? 'Sin categoría'} · ${sample.student.gender} · ${sample.bucket}`
    const { fights, leftover } = pairUp(list, label)
    if (fights.length > 0) {
      result.push({ key: `strict|${label}`, label, fights, unmatched: [] })
    }
    stillRemaining.push(...leftover)
  }
  remaining = stillRemaining

  // ---- PASADA 2: relajada (modalidad + género) ----
  if (remaining.length >= 2) {
    const relaxedGroups = new Map<string, Enriched[]>()
    for (const e of remaining) {
      const key = ['relaxed', e.registration.modality_id, e.student.gender].join('|')
      const arr = relaxedGroups.get(key) ?? []
      arr.push(e)
      relaxedGroups.set(key, arr)
    }
    const stillRemaining2: Enriched[] = []
    for (const [, list] of relaxedGroups.entries()) {
      if (list.length < 2) {
        stillRemaining2.push(...list)
        continue
      }
      const sample = list[0]
      const label = `${sample.student.gender} · Modalidad común (categorías mixtas)`
      const { fights, leftover } = pairUp(list, label)
      if (fights.length > 0) {
        result.push({ key: `relaxed|${label}`, label, fights, unmatched: [] })
      }
      stillRemaining2.push(...leftover)
    }
    remaining = stillRemaining2
  }

  // ---- PASADA 3: último recurso (solo género) ----
  if (remaining.length >= 2) {
    const byGender = new Map<string, Enriched[]>()
    for (const e of remaining) {
      const arr = byGender.get(e.student.gender) ?? []
      arr.push(e)
      byGender.set(e.student.gender, arr)
    }
    for (const [gender, list] of byGender.entries()) {
      if (list.length < 2) continue
      const label = `${gender} · INTER-MODALIDAD (revisar manualmente)`
      const { fights, leftover } = pairUp(list, label)
      if (fights.length > 0) {
        result.push({ key: `inter|${gender}`, label, fights, unmatched: leftover })
      }
    }
    // Lo que sigue solo si hay género únicos (1 hombre o 1 mujer suelto)
    const totallyUnmatched = Array.from(byGender.values())
      .filter((list) => list.length === 1)
      .flat()
    if (totallyUnmatched.length > 0) {
      result.push({
        key: 'unmatched',
        label: 'Sin oponente posible',
        fights: [],
        unmatched: totallyUnmatched
      })
    }
  } else if (remaining.length === 1) {
    result.push({
      key: 'unmatched',
      label: 'Sin oponente posible',
      fights: [],
      unmatched: remaining
    })
  }

  return result
}

export function flattenFixture(groups: FixtureGroup[]): ProposedFight[] {
  return groups.flatMap((g) => g.fights)
}
