import { describe, it, expect } from 'vitest'
import { getWeaponConditionalBoost } from '../src/data/weaponConditionalBoosts'
import { roundMultiplier } from '../src/lib/utils'

function applyPiercerTrueConversion(types: Record<string, number>, piercerRank: number): Record<string, number> {
  if (piercerRank <= 0) return { ...types }
  return { true: roundMultiplier(1 + 0.1 * piercerRank) }
}

describe('getWeaponConditionalBoost — Piercer', () => {
  const perks = { Piercer: 5 }

  it('applies 20% per perk for 1-Handed Sword (doubled effect)', () => {
    const result = getWeaponConditionalBoost(perks, '1-Handed Sword', 'm1Finisher')
    expect(result.mult).toBe(roundMultiplier(1 + 0.20 * 5))
    expect(result.labels).toContain('Piercer')
  })

  it('applies 20% per perk for Spear', () => {
    const result = getWeaponConditionalBoost(perks, 'Spear', 'm1Finisher')
    expect(result.mult).toBe(roundMultiplier(1 + 0.20 * 5))
  })

  it('applies 20% per perk for Dagger', () => {
    const result = getWeaponConditionalBoost(perks, 'Dagger', 'm1Finisher')
    expect(result.mult).toBe(roundMultiplier(1 + 0.20 * 5))
  })

  it('applies 20% per perk for Fists', () => {
    const result = getWeaponConditionalBoost(perks, 'Fists', 'm1Finisher')
    expect(result.mult).toBe(roundMultiplier(1 + 0.20 * 5))
  })

  it('applies 20% per perk for Rapier', () => {
    const result = getWeaponConditionalBoost(perks, 'Rapier', 'm1Finisher')
    expect(result.mult).toBe(roundMultiplier(1 + 0.20 * 5))
  })

  it('applies 20% per perk for Rifle', () => {
    const result = getWeaponConditionalBoost(perks, 'Rifle', 'm1Finisher')
    expect(result.mult).toBe(roundMultiplier(1 + 0.20 * 5))
  })

  it('applies 10% per perk (base effect) for non-eligible weapons', () => {
    const result = getWeaponConditionalBoost(perks, 'Greatsword', 'm1Finisher')
    expect(result.mult).toBe(roundMultiplier(1 + 0.10 * 5))
    expect(result.labels).toContain('Piercer')
  })

  it('does NOT stack 20% + 10% for eligible weapons', () => {
    const result = getWeaponConditionalBoost(perks, '1-Handed Sword', 'm1Finisher')
    expect(result.labels.filter(l => l === 'Piercer')).toHaveLength(1)
  })

  it('applies 20% per perk on M2 for eligible weapons (M2 are finishers)', () => {
    const result = getWeaponConditionalBoost(perks, '1-Handed Sword', 'm2')
    expect(result.mult).toBe(roundMultiplier(1 + 0.20 * 5))
    expect(result.labels).toContain('Piercer')
  })

  it('applies 10% per perk on M2 for non-eligible weapons', () => {
    const result = getWeaponConditionalBoost(perks, 'Greatsword', 'm2')
    expect(result.mult).toBe(roundMultiplier(1 + 0.10 * 5))
    expect(result.labels).toContain('Piercer')
  })

  it('does NOT stack 20% + 10% on M2 for eligible weapons', () => {
    const result = getWeaponConditionalBoost(perks, '1-Handed Sword', 'm2')
    expect(result.labels.filter(l => l === 'Piercer')).toHaveLength(1)
  })

  it('does not apply to non-finisher hits', () => {
    const result = getWeaponConditionalBoost(perks, '1-Handed Sword', 'm1Finisher')
    expect(result.labels).toContain('Piercer')
  })

  it('returns mult 1 when Piercer is not equipped', () => {
    const result = getWeaponConditionalBoost({}, '1-Handed Sword', 'm1Finisher')
    expect(result.mult).toBe(1)
    expect(result.labels).not.toContain('Piercer')
  })

  it('scales correctly at rank 1', () => {
    const r1 = getWeaponConditionalBoost({ Piercer: 1 }, '1-Handed Sword', 'm1Finisher')
    expect(r1.mult).toBe(roundMultiplier(1 + 0.20 * 1))

    const r1base = getWeaponConditionalBoost({ Piercer: 1 }, 'Greatsword', 'm1Finisher')
    expect(r1base.mult).toBe(roundMultiplier(1 + 0.10 * 1))
  })
})

describe('applyPiercerTrueConversion', () => {
  it('returns original types when piercerRank is 0', () => {
    const types = { physical: 1.0 }
    expect(applyPiercerTrueConversion(types, 0)).toEqual({ physical: 1.0 })
  })

  it('converts to { true: 1.1 } at rank 1', () => {
    expect(applyPiercerTrueConversion({ physical: 1.0 }, 1)).toEqual({ true: roundMultiplier(1.1) })
  })

  it('converts to { true: 1.5 } at rank 5', () => {
    expect(applyPiercerTrueConversion({ physical: 1.0 }, 5)).toEqual({ true: roundMultiplier(1.5) })
  })

  it('converts to { true: 2.0 } at rank 10', () => {
    expect(applyPiercerTrueConversion({ physical: 1.0 }, 10)).toEqual({ true: roundMultiplier(2.0) })
  })

  it('works with multi-type weapons — still converts everything to true', () => {
    const result = applyPiercerTrueConversion({ physical: 0.9, true: 0.3 }, 5)
    expect(result).toEqual({ true: roundMultiplier(1.5) })
  })

  it('preserves original types for boostDmgTypes (tested externally)', () => {
    const originalTypes = { physical: 1.0 }
    const boostDmgTypes = { ...originalTypes }
    const result = applyPiercerTrueConversion(originalTypes, 5)
    expect(result).toEqual({ true: roundMultiplier(1.5) })
    expect(boostDmgTypes).toEqual({ physical: 1.0 })
  })
})

describe('boostDmgTypes cross-type leak prevention', () => {
  function getBoostsFromTypes(
    dmgTypes: Record<string, number>,
    boostDmgTypes: Record<string, number> | undefined,
    allBoostTypes: Record<string, string[]>
  ): Record<string, string[]> {
    const result: Record<string, string[]> = {}
    for (const k of Object.keys(dmgTypes)) {
      if (boostDmgTypes) {
        if (k in boostDmgTypes) {
          result[k] = allBoostTypes[k] ?? []
        } else {
          const seen = new Set<string>()
          const boosts: string[] = []
          for (const bk of Object.keys(boostDmgTypes)) {
            for (const b of allBoostTypes[bk] ?? []) {
              if (!seen.has(b)) { seen.add(b); boosts.push(b) }
            }
          }
          result[k] = boosts
        }
      } else {
        result[k] = allBoostTypes[k] ?? []
      }
    }
    return result
  }

  const rageAffectedTypes = { physical: ['Rage'], magic: ['Rage (Mage Rage)'], true: [] }
  const allBoostTypes: Record<string, string[]> = { physical: ['Rage'], magic: ['Rage (Mage Rage)'], true: [] }

  it('non-Piercer hit: physical gets Rage, true gets nothing', () => {
    const dmgTypes = { physical: 0.5, true: 0.5 }
    const boosts = getBoostsFromTypes(dmgTypes, undefined, allBoostTypes)
    expect(boosts.physical).toEqual(['Rage'])
    expect(boosts.true).toEqual([])
  })

  it('Piercer rank 5 on pure physical weapon: both entries get Rage via union', () => {
    const dmgTypes = { physical: 0.5, true: 0.5 }
    const boostDmgTypes = { physical: 1.0 }
    const boosts = getBoostsFromTypes(dmgTypes, boostDmgTypes, allBoostTypes)
    expect(boosts.physical).toEqual(['Rage'])
    expect(boosts.true).toEqual(['Rage'])
  })

  it('Piercer rank 10 on pure physical weapon: true entry gets Rage', () => {
    const dmgTypes = { true: roundMultiplier(2.0) }
    const boostDmgTypes = { physical: 1.0 }
    const boosts = getBoostsFromTypes(dmgTypes, boostDmgTypes, allBoostTypes)
    expect(boosts.true).toEqual(['Rage'])
  })

  it('Piercer on multi-type weapon: key-matched entries use own type, unmatched use union', () => {
    const dmgTypes = { physical: 0.35, magic: 0.15, true: 0.5 }
    const boostDmgTypes = { physical: 0.7, magic: 0.3 }
    const boosts = getBoostsFromTypes(dmgTypes, boostDmgTypes, allBoostTypes)
    expect(boosts.physical).toEqual(['Rage'])
    expect(boosts.magic).toEqual(['Rage (Mage Rage)'])
    expect(boosts.true).toEqual(['Rage', 'Rage (Mage Rage)'])
  })
})
