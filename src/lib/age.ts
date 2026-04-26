/**
 * Edad cumplida a una fecha de referencia (típicamente la fecha del evento).
 * birthDate y refDate en formato ISO 'YYYY-MM-DD'.
 */
export function ageAt(birthDate: string, refDate: string): number {
  const b = new Date(birthDate)
  const r = new Date(refDate)
  let age = r.getFullYear() - b.getFullYear()
  const m = r.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && r.getDate() < b.getDate())) age--
  return age
}

export type AgeBucket = 'INFANTIL' | 'CADETE' | 'JUVENIL' | 'ADULTO' | 'MASTER'

export function ageBucket(age: number): AgeBucket {
  if (age < 13) return 'INFANTIL'
  if (age < 16) return 'CADETE'
  if (age < 18) return 'JUVENIL'
  if (age < 36) return 'ADULTO'
  return 'MASTER'
}
