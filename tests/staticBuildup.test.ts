import { describe, expect, it } from 'vitest'
import { staticBuildupStrikes } from '../src/lib/utils'
import { calcStaticBuildupStrikeBase } from '../src/data/Perkbasedmg'

// Charge rules: 1 charge per proc-coefficient hit (max 20), spent only at ≥3.
// Strikes = floor(1 + (charge/20) × perkAmount), ×2 perk scaling at 20.
describe('staticBuildupStrikes', () => {
  it('deals 0 strikes below the 3-charge minimum', () => {
    expect(staticBuildupStrikes(0, 1)).toBe(0)
    expect(staticBuildupStrikes(2, 5)).toBe(0)
  })

  it('floors 1 + (charge/20 × perkAmount) between 3 and 19', () => {
    expect(staticBuildupStrikes(3, 1)).toBe(1)   // 1.15
    expect(staticBuildupStrikes(19, 4)).toBe(4)  // 4.8
  })

  it('doubles perk scaling at max charge 20', () => {
    expect(staticBuildupStrikes(20, 1)).toBe(3)
    expect(staticBuildupStrikes(20, 2)).toBe(5)
  })
})

// Strike base = (3 + inheritedRmb × 0.1538) × (1 + 0.1 × perkAmount)
describe('calcStaticBuildupStrikeBase', () => {
  it('flat part only without inherited RMB damage', () => {
    expect(calcStaticBuildupStrikeBase(1, 0)).toBeCloseTo(3.3, 6)
  })

  it('scales with inherited RMB damage and perk amount', () => {
    expect(calcStaticBuildupStrikeBase(1, 10)).toBeCloseTo((3 + 10 * 0.1538) * 1.1, 6)
  })
})
