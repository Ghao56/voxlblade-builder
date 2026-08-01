import { describe, it, expect } from 'vitest'
import { calcWeapon } from '../src/lib/engine/weapon'
import { resolveStanceOverlay } from '../src/data/stanceOverlays'
import { getAutoDebuffs } from '../src/data/perkAutoDebuffs'
import { WEAPON_BASE_DMG } from '../src/data/weapon base dmg'

describe('Mine temp debug', () => {
  it('calcWeapon for Frozen Pickaxe Head returns Mine perk', () => {
    const r = calcWeapon('Frozen Pickaxe Head', 'Some Handle', false)
    expect(r?.perks['Mine']).toBe(1)
  })

  it('resolveStanceOverlay returns Mine', () => {
    const overlay = resolveStanceOverlay({
      isFists: false,
      hasWeaponType: true,
      blasterCount: 0,
      hasLockedAndLoaded: false,
      weaponPerks: { Mine: 1 },
    })
    expect(overlay?.type).toBe('Mine')
  })

  it('Mine overrides Locked And Loaded', () => {
    const overlay = resolveStanceOverlay({
      isFists: false,
      hasWeaponType: true,
      blasterCount: 0,
      hasLockedAndLoaded: true,
      weaponPerks: { Mine: 1 },
    })
    expect(overlay?.type).toBe('Mine')
  })

  it('Mine overrides Blaster Ring', () => {
    const overlay = resolveStanceOverlay({
      isFists: false,
      hasWeaponType: true,
      blasterCount: 2,
      hasLockedAndLoaded: false,
      weaponPerks: { Mine: 1 },
    })
    expect(overlay?.type).toBe('Mine')
  })

  it('Mine applies Shatter debuff (0.1x, 10s)', () => {
    const debuffs = getAutoDebuffs({
      existingBuffNames: [],
      playerBuffNames: [],
      perks: { Mine: 2 },
      hpFill: 100,
      level: 80,
      protection: 0,
      enemyHpFillPct: 100,
      hasMagicDmg: false,
      hasMagicOrPhysicalDmg: true,
    })
    const shatter = debuffs.find(d => d.buffName === 'Shatter')
    expect(shatter?.potency).toBeCloseTo(0.2, 10)
    expect(shatter?.duration).toBe(10)
    expect(shatter?.sourceName).toBe('Mine')
  })

  it('WEAPON_BASE_DMG Mine row has m1 null, m2 [5,10,15], noM1', () => {
    const mine = WEAPON_BASE_DMG.find(w => w.type === 'Mine')
    expect(mine?.m1).toBeNull()
    expect(mine?.m2).toEqual([5, 10, 15])
    expect(mine?.noM1).toBe(true)
  })
})
