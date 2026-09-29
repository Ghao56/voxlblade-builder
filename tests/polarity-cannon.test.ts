import { describe, it, expect } from 'vitest'
import { WEAPON_ARTS, waChargeBase, waChargeMult } from '../src/data/weaponArts'
import { checkWA, getUnmetReqs } from '../src/data/Weaponartcheck'

const polarity = () => WEAPON_ARTS.find(wa => wa.name === 'Polarity Cannon')!
const scalings = (over: Record<string, number> = {}) => ({ physical: 0, magic: 0, ...over })
const noWeaponTypes: string[] = []

describe('Polarity Cannon — data entry', () => {
  it('has the documented stat block', () => {
    const wa = polarity()
    expect(wa.cooldown).toBe(25)
    expect(wa.baseDamage).toBe('50 – 100')
    expect(wa.baseHealing).toBe(5)
    expect(wa.damageType).toBe('0.5 Holy + 0.5 Hex')
    expect(wa.scaling).toBe('Same as weapon')
  })

  it('splits damage 50/50 between Holy and Hex', () => {
    const types = /([\d.]+)\s*(Physical|Magic|Fire|Water|Earth|Air|Hex|Holy|True|Summon)/gi
      .exec(polarity().damageType!)!
    expect(types.slice(1)).toEqual(['0.5', 'Holy'])
  })

  it('requires 0.5 Holy and 0.5 Hex scaling', () => {
    expect(polarity().requirements.holyScaling).toBe(0.5)
    expect(polarity().requirements.hexScaling).toBe(0.5)
  })

  it('charges for 5s at 20%/s and backfires past 6s', () => {
    const charge = polarity().charge!
    expect(charge.maxSeconds).toBe(5)
    expect(charge.pctPerSecond).toBe(0.2)
    expect(charge.pctPerSecond * charge.maxSeconds).toBe(1)
    expect(charge.backfireSeconds).toBe(6)
  })

  it('backfires for 27.5 Holy and 27.5 Hex self damage', () => {
    expect(polarity().charge!.backfireSelfDamage).toEqual({ holy: 27.5, hex: 27.5 })
  })
})

describe('Polarity Cannon — requirement gating', () => {
  const isAvailable = (s: Record<string, number>) =>
    checkWA(polarity(), scalings(s), {}, noWeaponTypes, false, '', '')

  it('is available at 0.5 Holy + 0.5 Hex scaling', () => {
    expect(isAvailable({ holy: 0.5, hex: 0.5 })).toBe(true)
  })

  it('is unavailable when either scaling is below the requirement', () => {
    expect(isAvailable({ holy: 0.5, hex: 0.49 })).toBe(false)
    expect(isAvailable({ holy: 0.49, hex: 0.5 })).toBe(false)
    expect(isAvailable({ holy: 0.5 })).toBe(false)
  })

  it('reports the unmet scaling requirements', () => {
    expect(getUnmetReqs(polarity(), scalings({ holy: 0.2 }), {}, noWeaponTypes, false, '', '')).toEqual([
      'Hex Scaling ≥ 0.5',
      'Holy Scaling ≥ 0.5',
    ])
  })
})

describe('waChargeBase / waChargeMult', () => {
  it('interpolates the Polarity Cannon damage range across the charge slider', () => {
    expect(waChargeBase(50, 100, 0)).toBe(50)
    expect(waChargeBase(50, 100, 25)).toBe(62.5)
    expect(waChargeBase(50, 100, 50)).toBe(75)
    expect(waChargeBase(50, 100, 75)).toBe(87.5)
    expect(waChargeBase(50, 100, 100)).toBe(100)
  })

  it('doubles quantities that ride the charge curve (max +100%)', () => {
    expect(waChargeMult(50, 100, 0)).toBe(1)
    expect(waChargeMult(50, 100, 100)).toBe(2)
  })

  it('scales Polarity Cannon healing on the same curve as its damage', () => {
    const heal = (pct: number) => polarity().baseHealing! * waChargeMult(50, 100, pct)
    expect(heal(0)).toBe(5)
    expect(heal(50)).toBe(7.5)
    expect(heal(100)).toBe(10)
  })

  it('matches the Retaliate charge curve it replaced', () => {
    expect(waChargeBase(15, 175, 0)).toBe(15)
    expect(waChargeBase(15, 175, 50)).toBe(95)
    expect(waChargeBase(15, 175, 100)).toBe(175)
  })

  it('is inert when the uncharged minimum is zero', () => {
    expect(waChargeMult(0, 100, 100)).toBe(1)
    expect(waChargeBase(0, 100, 100)).toBe(0)
  })
})
