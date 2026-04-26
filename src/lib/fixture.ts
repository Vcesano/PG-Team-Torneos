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

/**
 * Genera el fixture agrupando por modalidad + categoría de peso + género + bucket de edad + cinturón.
 * Dentro de cada grupo, empareja secuencialmente. Si queda uno sin par, va a "unmatched".
 */
export function generateFixture(
  items: FixtureInputItem[],
  eventDate: string,
  cats: WeightCategory[]
): FixtureGroup[] {
  const enriched = items.map((it) => {
    const age = ageAt(it.student.birth_date, eventDate)
    const bucket = ageBucket(age)
    const cat =
      it.registration.weight_category_id
        ? cats.find((c) => c.id === it.registration.weight_category_id) ?? null
        : findWeightCategory(cats, it.student.gender, age, it.registration.weight_kg)
    return { ...it, age, bucket, cat }
  })

  const groups = new Map<string, typeof enriched>()
  for (const e of enriched) {
    const key = [
      e.registration.modality_id,
      e.cat?.id ?? 'NOCAT',
      e.student.gender,
      e.bucket,
      e.registration.belt_id
    ].join('|')
    const arr = groups.get(key) ?? []
    arr.push(e)
    groups.set(key, arr)
  }

  const result: FixtureGroup[] = []
  for (const [key, list] of groups.entries()) {
    list.sort((a, b) => b.registration.fight_count - a.registration.fight_count)
    const fights: ProposedFight[] = []
    const unmatched: FixtureInputItem[] = []
    for (let i = 0; i < list.length; i += 2) {
      const red = list[i]
      const blue = list[i + 1]
      if (!blue) {
        unmatched.push(red)
        continue
      }
      fights.push({
        red,
        blue,
        modality_id: red.registration.modality_id,
        weight_category_id: red.cat?.id ?? null,
        groupKey: key
      })
    }
    const sample = list[0]
    const label = `${sample.cat?.name ?? 'Sin categoría'} · ${sample.student.gender} · ${sample.bucket}`
    result.push({ key, label, fights, unmatched })
  }
  return result
}

export function flattenFixture(groups: FixtureGroup[]): ProposedFight[] {
  return groups.flatMap((g) => g.fights)
}
