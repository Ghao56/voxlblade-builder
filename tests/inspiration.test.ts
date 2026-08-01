import { describe, it, expect } from 'vitest'
import { getPerkBuffs, BUFF_DEFS, calcBuffEffect } from '../src/data/BuffData'
import { INSPIRED_POTENCY_PER_AMOUNT } from '../src/lib/constants/buffs'

describe('Inspiration perk', () => {
  it('grants Inspired buff from perk', () => {
    const buffs = getPerkBuffs({ Inspiration: 1 })
    const inspired = buffs.filter(b => b.buffName === 'Inspired')
    expect(inspired.length).toBe(1)
    expect(inspired[0].potency).toBe(INSPIRED_POTENCY_PER_AMOUNT * 1)
    expect(inspired[0].duration).toBe(15)
  })

  it('Inspired damage is 7.5% per 1 perk', () => {
    const buffs = getPerkBuffs({ Inspiration: 1 })
    const potency = buffs.find(b => b.buffName === 'Inspired')!.potency
    const mult = 1 + potency * 0.75
    expect(mult).toBe(1.075)
    const effect = calcBuffEffect('Inspired', potency)
    expect(effect.value).toBe(0.075)
  })

  it('Inspired buff def has expected metadata', () => {
    const def = BUFF_DEFS['Inspired']
    expect(def.color).toBe('#ffde0f')
    expect(def.description).toBe('Deal x% more damage.')
  })
})
