import { describe, expect, it } from 'vitest'
import { calcInoculationHeal } from '../src/data/selfDamage'
import { INOCULATION_FLAT_HEAL_PER_STACK, INOCULATION_HEAL_FRACTION } from '../src/lib/constants/perks'

describe('Inoculation heal', () => {
  it('base = (30% of self-damage before defense + flat) × perkAmount', () => {
    expect(calcInoculationHeal(100, 1)).toBeCloseTo(INOCULATION_HEAL_FRACTION * 100 + INOCULATION_FLAT_HEAL_PER_STACK, 10)
    expect(calcInoculationHeal(100, 2)).toBeCloseTo((INOCULATION_HEAL_FRACTION * 100 + INOCULATION_FLAT_HEAL_PER_STACK) * 2, 10)
  })

  it('is boosted by outgoing-heal multipliers', () => {
    const base = calcInoculationHeal(100, 1)
    expect(calcInoculationHeal(100, 1, 1.5)).toBeCloseTo(base * 1.5, 10)
    expect(calcInoculationHeal(100, 2, 2)).toBeCloseTo(base * 2 * 2, 10)
  })

  it('yields zero without perk amounts or damage taken', () => {
    expect(calcInoculationHeal(0, 1)).toBe(0)
    expect(calcInoculationHeal(100, 0)).toBe(0)
  })
})
