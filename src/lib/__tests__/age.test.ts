import { describe, expect, it } from 'vitest'
import { ageAt, ageBucket } from '../age'

describe('ageAt', () => {
  it('todavía no cumplió en el año del evento', () => {
    expect(ageAt('2010-06-15', '2026-04-25')).toBe(15)
  })
  it('ya cumplió en el año del evento', () => {
    expect(ageAt('2010-01-15', '2026-04-25')).toBe(16)
  })
  it('cumple exactamente el día del evento', () => {
    expect(ageAt('2010-04-25', '2026-04-25')).toBe(16)
  })
})

describe('ageBucket', () => {
  it('asigna buckets', () => {
    expect(ageBucket(8)).toBe('INFANTIL')
    expect(ageBucket(14)).toBe('CADETE')
    expect(ageBucket(17)).toBe('JUVENIL')
    expect(ageBucket(25)).toBe('ADULTO')
    expect(ageBucket(40)).toBe('MASTER')
  })
})
