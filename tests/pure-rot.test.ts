import { describe, it, expect } from 'vitest'
import {
  PURE_ROT_ROTTED_POTENCY_PER_AMOUNT,
  PURE_ROT_ROTTED_DURATION,
  PURE_ROT_POISON_DURATION,
} from '../src/lib/constants/buffs'
import { BUFF_DEFS, getPerkBuffs } from '../src/data/BuffData'
import { getAutoDebuffs } from '../src/data/perkAutoDebuffs'
import type { ProcCoefficient } from '../src/lib/types'

const PERK = 'Pure Rot'

const rotted = (perkAmount: number) =>
  getPerkBuffs({ [PERK]: perkAmount }).find(b => b.buffName === 'Rotted')

const rottedPoison = (procCoefficient: ProcCoefficient, playerBuffNames = ['Rotted']) =>
  getAutoDebuffs({
    existingBuffNames: [],
    playerBuffNames,
    perks: { [PERK]: 1 },
    hpFill: 100,
    level: 80,
    protection: 0,
    selectedWAProcCoefficient: procCoefficient,
    enemyHpFillPct: 100,
  }).find(d => d.buffName === 'Poison' && d.sourceName === 'Rotted')

describe('Pure Rot — cleansing grants Rotted instead of removing debuffs', () => {
  it('grants Rotted at 0.1 potency per amount for 20s', () => {
    expect(rotted(1)?.potency).toBe(PURE_ROT_ROTTED_POTENCY_PER_AMOUNT)
    expect(rotted(3)?.potency).toBe(PURE_ROT_ROTTED_POTENCY_PER_AMOUNT * 3)
    expect(rotted(1)?.duration).toBe(PURE_ROT_ROTTED_DURATION)
  })

  it('grants nothing without the perk', () => {
    expect(rotted(0)).toBeUndefined()
    expect(getPerkBuffs({})).toEqual([])
  })

  it('models Rotted as a self Buff, not a debuff on the enemy', () => {
    expect(BUFF_DEFS.Rotted.isDebuff).toBeUndefined()
    expect(BUFF_DEFS.Rotted.isSelfDebuff).toBeUndefined()
  })
})

describe('Rotted — all attacks with a Proc Coefficient apply the applier\'s Poison', () => {
  it('applies Poison from any proc-coefficient hit', () => {
    const poison = rottedPoison({ type: 'percent', value: 1 })
    expect(poison).toBeDefined()
    expect(poison?.duration).toBe(PURE_ROT_POISON_DURATION)
  })

  it('does not apply without a Proc Coefficient', () => {
    expect(rottedPoison({ type: 'noProc' })).toBeUndefined()
  })

  it('leaves applied Poison potency at 0 so it scales off Poison Potency, not Rotted potency', () => {
    expect(rottedPoison({ type: 'percent', value: 1 })?.potency).toBe(0)
  })

  it('needs Rotted on the attacker', () => {
    expect(rottedPoison({ type: 'percent', value: 1 }, [])).toBeUndefined()
  })

  it('yields to another Poison already on the enemy', () => {
    const debuffs = getAutoDebuffs({
      existingBuffNames: ['Poison'],
      playerBuffNames: ['Rotted'],
      perks: { [PERK]: 1 },
      hpFill: 100,
      level: 80,
      protection: 0,
      selectedWAProcCoefficient: { type: 'percent', value: 1 },
      enemyHpFillPct: 100,
    })
    expect(debuffs.find(d => d.sourceName === 'Rotted')).toBeUndefined()
  })
})