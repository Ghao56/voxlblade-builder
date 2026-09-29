import { describe, it, expect } from 'vitest'
import { calcSpringblastBaseDamage } from '../src/data/Perkbasedmg'
import { PERK_DMG_DEFS } from '../src/data/Perkbasedmg'

const PERK = 'Springblast'

describe('Springblast base damage', () => {
  it('matches (7 + 0.7·perk + (0.25 + 0.15·perk)·proccingBase) / (0.5 + min(hits,5)/2)', () => {
    // 1 perk, proccing hit base 20, single-hit finisher
    expect(calcSpringblastBaseDamage(1, 20, 1)).toBeCloseTo((7 + 0.7 + (0.25 + 0.15) * 20) / 1, 6)
    // 3 perks, proccing hit base 15.5, 2-hit finisher
    expect(calcSpringblastBaseDamage(3, 15.5, 2)).toBeCloseTo((7 + 2.1 + (0.25 + 0.45) * 15.5) / 1.5, 6)
  })

  it('scales the flat part and the proccing share with perk amount', () => {
    expect(calcSpringblastBaseDamage(0, 0, 1)).toBeCloseTo(7, 6)
    expect(calcSpringblastBaseDamage(2, 0, 1)).toBeCloseTo(8.4, 6)
    expect(calcSpringblastBaseDamage(0, 10, 1)).toBeCloseTo(9.5, 6)
    expect(calcSpringblastBaseDamage(2, 10, 1)).toBeCloseTo(8.4 + 0.55 * 10, 6)
  })

  it('lowers per-proc damage as the finisher has more hits', () => {
    let prev = Infinity
    for (const hits of [1, 2, 3, 4, 5]) {
      const v = calcSpringblastBaseDamage(1, 30, hits)
      expect(v).toBeLessThan(prev)
      prev = v
    }
  })

  it('caps the falloff at 5 finisher hits', () => {
    expect(calcSpringblastBaseDamage(1, 30, 6)).toBe(calcSpringblastBaseDamage(1, 30, 5))
    expect(calcSpringblastBaseDamage(1, 30, 12)).toBe(calcSpringblastBaseDamage(1, 30, 5))
  })

  it('keeps total damage rising with more finisher hits', () => {
    let prev = -Infinity
    for (const hits of [1, 2, 3, 4, 5, 6]) {
      const total = calcSpringblastBaseDamage(1, 30, hits) * hits
      expect(total).toBeGreaterThan(prev)
      prev = total
    }
  })

  it('is wired to the perk def with per-finisher-hit resolution', () => {
    const def = PERK_DMG_DEFS.find(d => d.perkName === PERK)!
    expect(def.dmgTypes).toEqual({ physical: 1.0 })
    expect(def.scalings).toEqual({ physical: 1.0 })
    expect(def.guardbreak).toBe(true)
    expect(def.getFinisherHitBaseDmg!({ baseDmg: 0, hitIndex: 0, perkAmount: 2, proccingBase: 40, finisherHitCount: 3 }))
      .toBeCloseTo(calcSpringblastBaseDamage(2, 40, 3), 6)
  })
})
