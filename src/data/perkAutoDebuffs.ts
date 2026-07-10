import { PENANCE_HP_THRESHOLD, PENANCE_BLEED_POTENCY, PENANCE_BLEED_DURATION } from './Boost'
import type { GrantedBuff } from './BuffData'
import { canProc, type ProcCoefficient } from '../lib/types'

export interface AutoDebuffInput {
  existingBuffNames: string[]
  playerBuffNames: string[]
  perks: Record<string, number>
  hpFill: number
  level: number
  protection: number
  selectedWAProcCoefficient?: ProcCoefficient
}

export function calcActualHpFillPct(
  hpFill: number,
  level: number,
  protection: number
): number {
  if (protection >= 0) return hpFill
  const baseMaxHP = Math.round(120 * (1 + (level ?? 80) * 0.0125))
  const effMaxHP = Math.max(Math.round(baseMaxHP * 0.1), baseMaxHP + Math.round(protection))
  return Math.min(100, hpFill * effMaxHP / baseMaxHP)
}

export function getAutoDebuffs(input: AutoDebuffInput): GrantedBuff[] {
  const debuffs: GrantedBuff[] = []
  const { existingBuffNames, playerBuffNames, perks, hpFill, level, protection, selectedWAProcCoefficient } = input

  const hasExhaust = playerBuffNames.includes('Exhaust')
  const hasBurn = existingBuffNames.includes('Burn')
  const exhaustCanProc = canProc(selectedWAProcCoefficient)

  if (hasExhaust && !hasBurn && exhaustCanProc) {
    debuffs.push({
      buffName: 'Burn',
      potency: 0,
      duration: 5,
      condition: 'On hit during Exhaust',
      sourceName: 'Exhaust',
      sourceType: 'perk',
    })
  }

  const penanceAmt = perks['Penance'] ?? 0
  if (penanceAmt > 0) {
    const actualHpPct = calcActualHpFillPct(hpFill, level, protection)
    if (actualHpPct <= PENANCE_HP_THRESHOLD && !existingBuffNames.includes('Bleed')) {
      debuffs.push({
        buffName: 'Bleed',
        potency: PENANCE_BLEED_POTENCY,
        duration: PENANCE_BLEED_DURATION,
        condition: `50% chance per hit · only while HP ≤ ${PENANCE_HP_THRESHOLD}%`,
        sourceName: 'Penance',
        sourceType: 'perk',
      })
    }
  }

  const bellowingAmt = perks['Bellowing Ember'] ?? 0
  if (bellowingAmt > 0) {
    const actualHpPct = calcActualHpFillPct(hpFill, level, protection)
    const threshold = 40 + 5 * (bellowingAmt - 1)
    if (actualHpPct <= threshold && !existingBuffNames.includes('Burn')) {
      debuffs.push({
        buffName: 'Burn',
        potency: 0,
        duration: 5,
        condition: `35% chance per hit · only while HP ≤ ${threshold}%`,
        sourceName: 'Bellowing Ember',
        sourceType: 'perk',
      })
    }
  }

  return debuffs
}
