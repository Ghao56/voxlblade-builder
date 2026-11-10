import { describe, expect, it } from 'vitest'
import { applyEnchantmentsToSlot } from '../src/lib/engine/enchant'

describe('frozen negative stats on keepNegativeStats armors', () => {
  // Steel Legion-like base: negatives -5/-20, positives 10/18/20
  const base = { speedBoost: -5, attackSpeed: -5, airBoost: -20, physicalBoost: 10, physicalDefense: 18, warding: 20 }

  it('without enchant: negatives stay frozen, positives scale ×1.5 at upgrade 5', () => {
    const r = applyEnchantmentsToSlot(base as never, {}, [], 5, true)
    expect(r.stats.speedBoost).toBe(-5)
    expect(r.stats.airBoost).toBe(-20)
    expect(r.stats.physicalBoost).toBeCloseTo(15) // 10 × 1.5
    expect(r.stats.physicalDefense).toBeCloseTo(27) // 18 × 1.5
  })

  it('Corrupt flips negatives positive; flipped values do NOT scale with upgrade', () => {
    const r = applyEnchantmentsToSlot(base as never, {}, ['Corrupt'], 5, true)
    expect(r.stats.speedBoost).toBe(10) // -5 × -2, frozen
    expect(r.stats.airBoost).toBe(40) // -20 × -2, frozen
    expect(r.stats.physicalBoost).toBeUndefined() // ×0, dropped
  })

  it('Restored (×-1) flipped values do NOT scale with upgrade either', () => {
    const r = applyEnchantmentsToSlot(base as never, {}, ['Restored'], 5, true)
    expect(r.stats.speedBoost).toBe(5) // -5 flipped, frozen
    expect(r.stats.physicalBoost).toBeCloseTo(15) // normal positive scales
  })

  it('normal armor without keepNegativeStats: flipped negatives scale normally', () => {
    const r = applyEnchantmentsToSlot(base as never, {}, ['Restored'], 5, false)
    expect(r.stats.speedBoost).toBeCloseTo(7.5) // 5 × 1.5
  })
})
