import type { HpGate } from './Perkbasedmg'
import { isHpGateActive } from './Perkbasedmg'

export interface RaceConditionalEffect {
  raceName: string
  hpGate: HpGate
  dmgBoostMultiplier?: number
  flatDrPct?: number
  label: string
  condition: string
}

const RACE_CONDITIONAL_EFFECTS: RaceConditionalEffect[] = [
  {
    raceName: 'HUMAN',
    hpGate: { hpThreshold: 50, aboveThreshold: false },
    dmgBoostMultiplier: 1.2,
    flatDrPct: 20,
    label: 'Human (Below 50% HP)',
    condition: 'Race passive · active below 50% HP · flat, non-diminishing DR',
  },
]

export function getActiveRaceEffect(raceName: string, hpFillPct: number): RaceConditionalEffect | undefined {
  return RACE_CONDITIONAL_EFFECTS.find(e => e.raceName === raceName && isHpGateActive(e.hpGate, hpFillPct, 0))
}

export const ORK_TENACITY_PER_BUFF = 0.1

export function getOrkTenacityBuffs<T extends { buffName: string; isSelfDebuff?: boolean }>(
  buffs: T[],
  buffDefs: Record<string, { isDebuff?: boolean; isNeutral?: boolean } | undefined>,
): T[] {
  return buffs.filter(b => {
    const def = buffDefs[b.buffName]
    return !def?.isDebuff && !b.isSelfDebuff && !def?.isNeutral
  })
}

export function calcOrkTenacityBonus<T extends { buffName: string; isSelfDebuff?: boolean }>(
  buffs: T[],
  buffDefs: Record<string, { isDebuff?: boolean; isNeutral?: boolean } | undefined>,
): number {
  return ORK_TENACITY_PER_BUFF * getOrkTenacityBuffs(buffs, buffDefs).length
}