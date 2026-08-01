import { describe, it, expect } from 'vitest'
import { calcBuild } from '../src/lib/engine/build'
import { findPerkDmgDef } from '../src/data/Perkbasedmg'
import type { BuildState } from '../src/lib/types'

function baseState(): BuildState {
  return {
    race: 'None', guild: '', guildRank: 0, storedCorruptionAmount: 0,
    helmet: '', chestplate: 'Mines Captain', leggings: '', ring: '', rune: 'None',
    enchantments: {
      helmet: ['', '', ''],
      chestplate: ['', '', ''],
      leggings: ['', '', ''],
      ring: ['', '', ''],
      rune: ['', '', ''],
    } as BuildState['enchantments'],
    infusionHelmet: '', infusionChestplate: '', infusionLeggings: '', infusionRing: '',
    weaponBlade: '', weaponHandle: '', monkGlove: '', monkEssence: '',
    shrineActive: false,
    upgradeHelmet: 0, upgradeChestplate: 0, upgradeLeggings: 0, upgradeRing: 0, upgradeRune: 0,
    upgradeInfusionHelmet: 0, upgradeInfusionChestplate: 0, upgradeInfusionLeggings: 0, upgradeInfusionRing: 0,
    selectedWeaponArt: 'None', draconicColor: 'physical', draconicRuneInfusion: 'none',
    emotionalState: 'buffs', emotionalDisabled: false,
    propellingFunElement: 'air', propellingFunBuffMode: 'both',
    level: 1, hpFill: 100, enemyHpFill: 100, summonCount: 0, buffsConsumed: 0,
    sporelingsSummoned: 0, bastionBallistaArrows: 0, ichorSparkCharge: 0,
    divineCrashDistance: 0, inDarkness: false,
    cdrToggles: {},
    potion1: '', potion2: '',
    disabledBoosts: [], disabledEffects: [], disabledBuffKeys: [], disabledHealBoosts: [],
    rageDisabled: false, glyphConduitDisabled: false, extinguishDisabled: false,
    lightningCloakState: 'off', stormRendState: 'off',
  } as unknown as BuildState
}

describe('Inspiration heal from Mines Captain armor', () => {
  it('grants Inspiration perk (perkAmount 1)', () => {
    const result = calcBuild(baseState())
    expect(result.perks['Inspiration']).toBe(1)
  })

  it('computed heal base = 0.15 + 0.015 * perkAmount', () => {
    const result = calcBuild(baseState())
    const amt = result.perks['Inspiration'] ?? 0
    expect(0.15 + 0.015 * amt).toBeCloseTo(0.165, 10)
  })

  it('spirit hits that count as individual M1/M2 (e.g. Buni Spirit) flag each hit for Inspiration', () => {
    const buni = findPerkDmgDef('Buni Spirit')
    expect(buni?.note?.startsWith('Each hit counts as individual M1/M2')).toBe(true)
    expect(buni?.isM2).toBe(true)
  })
})
