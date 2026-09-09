import { describe, it, expect } from 'vitest'
import { BUFF_DEFS, getItemBuffs, assembleActiveBuffs } from '../src/data/BuffData'
import { RUNE_DMG_DEFS } from '../src/data/Runebasedmg'
import { PLAN_BEE_DRONE_ARMOR_DURATION, PLAN_BEE_REGEN_POTENCY, PLAN_BEE_REGEN_DURATION, PLAN_BEE_HP_GATE } from '../src/lib/constants/buffs'
import { calcBaseMaxHP } from '../src/lib/constants/game'

const planBee = RUNE_DMG_DEFS.find((d) => d.runeName === 'Plan Bee Rune')

const baseBuild = {
  rune: 'Plan Bee Rune',
  ring: '',
  infusionRing: '',
  helmet: '',
  chestplate: '',
  leggings: '',
  weaponBlade: '',
  weaponHandle: '',
  monkGlove: '',
  selectedWeaponArt: '',
  level: 80,
}

describe('Plan Bee Rune', () => {
  it('is defined in RUNE_DMG_DEFS as a shield-only (no damage) rune', () => {
    expect(planBee).toBeDefined()
    expect(planBee!.isHealOnly).toBe(true)
    expect(planBee!.getBaseDamage({ potency: 0 })).toBe(0)
  })

  it('defines the Drone Armor buff with protection (shield) stat', () => {
    const def = BUFF_DEFS['Drone Armor']
    expect(def).toBeDefined()
    expect(def.statKey).toBe('protection')
  })

  it('grants Drone Armor and Regen buffs', () => {
    const buffs = getItemBuffs('Plan Bee Rune')
    const droneArmor = buffs.find((b) => b.buffName === 'Drone Armor')
    const regen = buffs.find((b) => b.buffName === 'Regen')
    expect(droneArmor).toBeDefined()
    expect(droneArmor!.duration).toBe(PLAN_BEE_DRONE_ARMOR_DURATION)
    expect(regen).toBeDefined()
    expect(regen!.potency).toBe(PLAN_BEE_REGEN_POTENCY)
    expect(regen!.duration).toBe(PLAN_BEE_REGEN_DURATION)
    expect(regen!.hpGate).toEqual({ hpThreshold: PLAN_BEE_HP_GATE, aboveThreshold: false })
  })

  it('sets Drone Armor potency = missing HP (maxHP − currentHP) and omits Regen above the HP gate', () => {
    const buffs = assembleActiveBuffs({ ...baseBuild, hpFill: 40 }, {})
    const droneArmor = buffs.find((b) => b.buffName === 'Drone Armor')
    const regen = buffs.find((b) => b.buffName === 'Regen')
    expect(droneArmor!.potency).toBe(Math.round(calcBaseMaxHP(80) * 0.6))
    expect(regen).toBeUndefined()
  })

  it('grants Regen only below 20% HP', () => {
    const buffs = assembleActiveBuffs({ ...baseBuild, hpFill: 10 }, {})
    const droneArmor = buffs.find((b) => b.buffName === 'Drone Armor')
    const regen = buffs.find((b) => b.buffName === 'Regen')
    expect(droneArmor!.potency).toBe(Math.round(calcBaseMaxHP(80) * 0.9))
    expect(regen).toBeDefined()
    expect(regen!.potency).toBe(PLAN_BEE_REGEN_POTENCY)
  })

  it('grants full max HP as shield at 0% HP', () => {
    const buffs = assembleActiveBuffs({ ...baseBuild, hpFill: 0 }, {})
    const droneArmor = buffs.find((b) => b.buffName === 'Drone Armor')
    expect(droneArmor!.potency).toBe(calcBaseMaxHP(80))
  })
})