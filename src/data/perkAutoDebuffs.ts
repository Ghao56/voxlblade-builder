import { PENANCE_HP_THRESHOLD, PENANCE_BLEED_POTENCY, PENANCE_BLEED_DURATION } from './Boost'
import type { GrantedBuff } from './BuffData'
import { canProc, type ProcCoefficient } from '../lib/types'
import { calcBaseMaxHP } from '../lib/constants/game'

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
  const baseMaxHP = calcBaseMaxHP(level ?? 80)
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

  const meltingShredAmt = perks['Melting Shred'] ?? 0
  if (meltingShredAmt > 0) {
    const dotDebuffs = ['Bleed', 'Burn', 'Poison', 'Slowness']
    const hasDotActive = dotDebuffs.some(d => existingBuffNames.includes(d))
    if (hasDotActive && !existingBuffNames.includes('Anti Heal')) {
      debuffs.push({
        buffName: 'Anti Heal',
        potency: 0.5,
        duration: 0,
        condition: 'Active while target has your DoT',
        sourceName: 'Melting Shred',
        sourceType: 'perk',
      })
    }
  }

  const fpAmt = perks['Fungal Prototype'] ?? 0
  if (fpAmt > 0 && !existingBuffNames.includes('Poison')) {
    debuffs.push({
      buffName: 'Poison',
      potency: fpAmt,
      duration: 0,
      condition: 'Active while WA/Rune hit procced Fungal Prototype',
      sourceName: 'Fungal Prototype',
      sourceType: 'perk',
    })
  }

  const vsAmt = perks['Venom Spitter'] ?? 0
  if (vsAmt > 0 && !existingBuffNames.includes('Poison')) {
    debuffs.push({
      buffName: 'Poison',
      potency: vsAmt,
      duration: 0,
      condition: 'Venom Spitter finisher applies Poison',
      sourceName: 'Venom Spitter',
      sourceType: 'perk',
    })
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

  const frostbiteAmt = perks['Frostbite'] ?? 0
  if (frostbiteAmt > 0 && !existingBuffNames.includes('Slowness')) {
    debuffs.push({
      buffName: 'Slowness',
      potency: 0.5 * frostbiteAmt,
      duration: 0,
      condition: `${10 * frostbiteAmt}% chance per hit · Potency = 0.5 × ${frostbiteAmt}`,
      sourceName: 'Frostbite',
      sourceType: 'perk',
    })
  }

  const gelidLanceAmt = perks['Gelid Lance'] ?? 0
  if (gelidLanceAmt > 0) {
    const hasSlow = existingBuffNames.includes('Slowness') || debuffs.some(d => d.buffName === 'Slowness')
    const hasBleed = existingBuffNames.includes('Bleed') || debuffs.some(d => d.buffName === 'Bleed')
    if (hasSlow && !hasBleed) {
      debuffs.push({
        buffName: 'Bleed',
        potency: 0,
        duration: 5,
        condition: 'Applies Bleed when Slowness is applied',
        sourceName: 'Gelid Lance',
        sourceType: 'perk',
      })
    }
  }

  const weakeningAmt = perks['Weakening'] ?? 0
  if (weakeningAmt > 0 && !existingBuffNames.includes('Weakness')) {
    debuffs.push({
      buffName: 'Weakness',
      potency: 0.2 * weakeningAmt,
      duration: 5,
      condition: `${5 * weakeningAmt}% chance per hit · Potency = 0.2 × ${weakeningAmt}`,
      sourceName: 'Weakening',
      sourceType: 'perk',
    })
  }

  const sunburnAmt = perks['Sunburn'] ?? 0
  if (sunburnAmt > 0 && !existingBuffNames.includes('Burn')) {
    const burnChance = 24 + 6 * sunburnAmt
    debuffs.push({
      buffName: 'Burn',
      potency: 0,
      duration: 5,
      condition: `${burnChance}% chance on Holy attacks`,
      sourceName: 'Sunburn',
      sourceType: 'perk',
    })
  }

  return debuffs
}
