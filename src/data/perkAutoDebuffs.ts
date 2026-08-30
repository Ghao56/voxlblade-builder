// ── Perk Auto-Debuffs ──────────────────────────────────────────────────────
// Perks that automatically apply debuffs (Bleed, Poison, Burn, Sticky, etc.)
// calcAutoDebuffs() returns all debuffs a perk set would apply, used by DamageAnalyzer for display.
// Each entry checks perk presence, existing debuffs, and optional proc coefficient gates.

import { PENANCE_HP_THRESHOLD, PENANCE_BLEED_POTENCY, PENANCE_BLEED_DURATION } from './Boost'
import { HYPNOTIST_POTENCY_PER_PERK, HYPNOTIST_DURATION_BASE, HYPNOTIST_DURATION_PER_PERK, FIERY_PURSUIT_BURN_DURATION, SUNBURN_BURN_BASE_CHANCE, SUNBURN_BURN_CHANCE_PER_STACK, FROSTBITE_SLOW_POTENCY_PER_STACK, FROSTBITE_CHANCE_PER_STACK, CRYO_ENGINE_PROC_CHANCE_PER_AMOUNT, IGNITION_BURN_DURATION_BASE, IGNITION_BURN_DURATION_PER_AMOUNT, IGNITION_PROC_CHANCE_PER_AMOUNT } from '../lib/constants/perks'
import type { GrantedBuff } from './BuffData'
import { canProc, type ProcCoefficient } from '../lib/types'
import { calcBaseMaxHP } from '../lib/constants/game'
import { BASIC_DEBUFF_DURATION, EXPLOSIVE_HONEY_STICKY_POTENCY, EXPLOSIVE_HONEY_STICKY_DURATION } from '../lib/constants/buffs'
import { BELLOWING_EMBER_HP_GATE_THRESHOLD, BELLOWING_EMBER_HP_GATE_PER_STACK, PYRE_BLOOM_BURN_DURATION, RUNIC_BLADES_DEBUFF_DURATION_PER_STACK, CACI_SPIRIT_BLEED_DURATION, ICE_BURST_BLEED_DURATION, WOOF_SPIRIT_WEAKNESS_POTENCY, WOOF_SPIRIT_WEAKNESS_DURATION, WINTER_WOOF_SPIRIT_SHATTER_POTENCY, WINTER_WOOF_SPIRIT_SHATTER_DURATION, WINTER_WOOF_SPIRIT_BLEED_DURATION } from '../lib/constants/perk-base-damage'
import { getActiveEnemyHpDebuffs } from './enemyHpEffects'

export interface AutoDebuffInput {
  existingBuffNames: string[]
  playerBuffNames: string[]
  perks: Record<string, number>
  hpFill: number
  level: number
  protection: number
  selectedWAProcCoefficient?: ProcCoefficient
  enemyHpFillPct: number
  hasMagicDmg?: boolean
  hasMagicOrPhysicalDmg?: boolean
}

// ── HP fill helper ──────────────────────────────────────────────────────────
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

// ── Auto-debuff entries ────────────────────────────────────────────────────
export function getAutoDebuffs(input: AutoDebuffInput): GrantedBuff[] {
  const debuffs: GrantedBuff[] = []
  const { existingBuffNames, playerBuffNames, perks, hpFill, level, protection, selectedWAProcCoefficient, enemyHpFillPct } = input

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

  // Explosive Honey: applies Sticky on finisher hit (not gated by proc coeff — finisher-only debuffs don't need it)
  const explosiveHoneyAmt = perks['Explosive Honey'] ?? 0
  if (explosiveHoneyAmt > 0 && !existingBuffNames.includes('Sticky')) {
    debuffs.push({
      buffName: 'Sticky',
      potency: EXPLOSIVE_HONEY_STICKY_POTENCY * explosiveHoneyAmt,
      duration: EXPLOSIVE_HONEY_STICKY_DURATION,
      condition: `First finisher hit · Potency = ${EXPLOSIVE_HONEY_STICKY_POTENCY} × ${explosiveHoneyAmt}`,
      sourceName: 'Explosive Honey',
      sourceType: 'perk',
    })
  }

  const toxinCasterAmt = perks['Toxin Caster'] ?? 0
  if (toxinCasterAmt > 0 && input.hasMagicDmg && !existingBuffNames.includes('Poison')) {
    debuffs.push({
      buffName: 'Poison',
      potency: 0,
      duration: BASIC_DEBUFF_DURATION,
      condition: 'Magic damage from WA or Rune applies Poison',
      sourceName: 'Toxin Caster',
      sourceType: 'perk',
    })
  }

  const ghastlyRotAmt = perks['Ghastly Rot'] ?? 0
  if (ghastlyRotAmt > 0 && !existingBuffNames.includes('Ghastly Rot')) {
    debuffs.push({
      buffName: 'Ghastly Rot',
      potency: 0,
      duration: BASIC_DEBUFF_DURATION,
      condition: 'High chance on hit',
      sourceName: 'Ghastly Rot',
      sourceType: 'perk',
    })
  }
  if (ghastlyRotAmt > 0 && !existingBuffNames.includes('Poison')) {
    debuffs.push({
      buffName: 'Poison',
      potency: 0,
      duration: BASIC_DEBUFF_DURATION,
      condition: 'High chance when the target is hit with Ghastly Rot active',
      sourceName: 'Ghastly Rot',
      sourceType: 'perk',
    })
  }

  const gorecastAmt = perks['Gorecast'] ?? 0
  if (gorecastAmt > 0 && input.hasMagicOrPhysicalDmg && !existingBuffNames.includes('Bleed')) {
    debuffs.push({
      buffName: 'Bleed',
      potency: 0,
      duration: 5,
      condition: 'On Weapon Art hit (deals Magic or Physical damage)',
      sourceName: 'Gorecast',
      sourceType: 'perk',
    })
  }

  const splinterAmt = perks['Splinter'] ?? 0
  if (splinterAmt > 0 && !existingBuffNames.includes('Bleed')) {
    debuffs.push({
      buffName: 'Bleed',
      potency: 0,
      duration: 5,
      condition: 'Crits inflict brief Bleed',
      sourceName: 'Splinter',
      sourceType: 'perk',
    })
  }

  const viciousEdgeAmt = perks['Vicious Edge'] ?? 0
  if (viciousEdgeAmt > 0 && !existingBuffNames.includes('Bleed')) {
    debuffs.push({
      buffName: 'Bleed',
      potency: 0,
      duration: 5,
      condition: `${Math.round(33 * viciousEdgeAmt)}% chance on M1/M2 · Bleed lasts 5s`,
      sourceName: 'Vicious Edge',
      sourceType: 'perk',
    })
  }

  const caciSpiritAmt = perks['Caci Spirit'] ?? 0
  if (caciSpiritAmt > 0 && !existingBuffNames.includes('Bleed')) {
    debuffs.push({
      buffName: 'Bleed',
      potency: 0,
      duration: CACI_SPIRIT_BLEED_DURATION,
      condition: 'Every hit of Caci Spirit inflicts Bleed',
      sourceName: 'Caci Spirit',
      sourceType: 'perk',
    })
  }

  const woofSpiritAmt = perks['Woof Spirit'] ?? 0
  if (woofSpiritAmt > 0 && !existingBuffNames.includes('Weakness')) {
    debuffs.push({
      buffName: 'Weakness',
      potency: WOOF_SPIRIT_WEAKNESS_POTENCY,
      duration: WOOF_SPIRIT_WEAKNESS_DURATION,
      condition: 'On RMB howl hit (Woof Spirit)',
      sourceName: 'Woof Spirit',
      sourceType: 'perk',
    })
  }

  const winterWoofSpiritAmt = perks['Winter Woof Spirit'] ?? 0
  if (winterWoofSpiritAmt > 0 && !existingBuffNames.includes('Shatter')) {
    debuffs.push({
      buffName: 'Shatter',
      potency: WINTER_WOOF_SPIRIT_SHATTER_POTENCY,
      duration: WINTER_WOOF_SPIRIT_SHATTER_DURATION,
      condition: 'On RMB howl hit (Winter Woof Spirit)',
      sourceName: 'Winter Woof Spirit',
      sourceType: 'perk',
    })
  }
  if (winterWoofSpiritAmt > 0 && !existingBuffNames.includes('Bleed')) {
    debuffs.push({
      buffName: 'Bleed',
      potency: 0,
      duration: WINTER_WOOF_SPIRIT_BLEED_DURATION,
      condition: 'On each woof bite · applies once per M1/M2 (Winter Woof Spirit)',
      sourceName: 'Winter Woof Spirit',
      sourceType: 'perk',
    })
  }

  const gravEnforcerAmt = perks['Gravitational Enforcer'] ?? 0
  if (gravEnforcerAmt > 0 && !existingBuffNames.includes('Shatter')) {
    debuffs.push({
      buffName: 'Shatter',
      potency: 0.1 * gravEnforcerAmt,
      duration: BASIC_DEBUFF_DURATION,
      condition: 'On RMB activation · Potency = 0.1 × ' + +gravEnforcerAmt.toFixed(2),
      sourceName: 'Gravitational Enforcer',
      sourceType: 'perk',
    })
  }

  const mineAmt = perks['Mine'] ?? 0
  if (mineAmt > 0 && !existingBuffNames.includes('Shatter')) {
    debuffs.push({
      buffName: 'Shatter',
      potency: 0.1 * mineAmt,
      duration: 10,
      condition: 'Final hit of Mine M2 applies Shatter · Potency = 0.1 × ' + +mineAmt.toFixed(2),
      sourceName: 'Mine',
      sourceType: 'perk',
    })
  }

  const iceBurstAmt = perks['Ice Burst'] ?? 0
  const hasShatter = existingBuffNames.includes('Shatter') || debuffs.some(d => d.buffName === 'Shatter')
  const hasBleed = existingBuffNames.includes('Bleed') || debuffs.some(d => d.buffName === 'Bleed')
  if (iceBurstAmt > 0 && hasShatter && !hasBleed) {
    debuffs.push({
      buffName: 'Bleed',
      potency: 0,
      duration: ICE_BURST_BLEED_DURATION,
      condition: 'Inflicting Shatter creates an icicle burst that inflicts brief Bleed',
      sourceName: 'Ice Burst',
      sourceType: 'perk',
    })
  }

  const bellowingAmt = perks['Bellowing Ember'] ?? 0
  if (bellowingAmt > 0) {
    const actualHpPct = calcActualHpFillPct(hpFill, level, protection)
    const threshold = BELLOWING_EMBER_HP_GATE_THRESHOLD + BELLOWING_EMBER_HP_GATE_PER_STACK * (bellowingAmt - 1)
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
      potency: FROSTBITE_SLOW_POTENCY_PER_STACK * frostbiteAmt,
      duration: 0,
      condition: `${Math.round(FROSTBITE_CHANCE_PER_STACK * 100 * frostbiteAmt * 100) / 100}% chance per hit · Potency = ${FROSTBITE_SLOW_POTENCY_PER_STACK} × ${frostbiteAmt}`,
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
      condition: `${Math.round(5 * weakeningAmt)}% chance per hit · Potency = 0.2 × ${+weakeningAmt.toFixed(2)}`,
      sourceName: 'Weakening',
      sourceType: 'perk',
    })
  }

  const sunburnAmt = perks['Sunburn'] ?? 0
  if (sunburnAmt > 0 && !existingBuffNames.includes('Burn')) {
    const burnChance = (SUNBURN_BURN_BASE_CHANCE + SUNBURN_BURN_CHANCE_PER_STACK * sunburnAmt) * 100
    debuffs.push({
      buffName: 'Burn',
      potency: 0,
      duration: 5,
      condition: `${Math.round(burnChance * 100) / 100}% chance on Holy attacks`,
      sourceName: 'Sunburn',
      sourceType: 'perk',
    })
  }

  const fieryPursuitAmt = perks['Fiery Pursuit'] ?? 0
  if (fieryPursuitAmt > 0 && exhaustCanProc && !existingBuffNames.includes('Burn')) {
    debuffs.push({
      buffName: 'Burn',
      potency: 0,
      duration: FIERY_PURSUIT_BURN_DURATION,
      condition: 'On dash before Weapon Art',
      sourceName: 'Fiery Pursuit',
      sourceType: 'perk',
    })
  }

  const pyreBloomAmt = perks['Pyre Bloom'] ?? 0
  if (pyreBloomAmt > 0 && !existingBuffNames.includes('Burn')) {
    debuffs.push({
      buffName: 'Burn',
      potency: 0,
      duration: PYRE_BLOOM_BURN_DURATION,
      condition: 'Pyre Bloom fireballs apply Burn',
      sourceName: 'Pyre Bloom',
      sourceType: 'perk',
    })
  }

  const runicBladesAmt = perks['Runic Blades'] ?? 0
  if (runicBladesAmt > 0 && exhaustCanProc && !existingBuffNames.includes('Runic Blades')) {
    debuffs.push({
      buffName: 'Runic Blades',
      potency: 0,
      duration: RUNIC_BLADES_DEBUFF_DURATION_PER_STACK * runicBladesAmt,
      condition: `On Weapon Art or Rune hit · Duration = ${RUNIC_BLADES_DEBUFF_DURATION_PER_STACK}s × ${runicBladesAmt.toFixed(1)}`,
      sourceName: 'Runic Blades',
      sourceType: 'perk',
    })
  }

  const hypnotistAmt = perks['Hypnotist'] ?? 0
  if (hypnotistAmt > 0 && exhaustCanProc && !existingBuffNames.includes('Hypnotized')) {
    debuffs.push({
      buffName: 'Hypnotized',
      potency: HYPNOTIST_POTENCY_PER_PERK * hypnotistAmt,
      duration: HYPNOTIST_DURATION_BASE + HYPNOTIST_DURATION_PER_PERK * hypnotistAmt,
      condition: 'On WA or Rune hit · Potency = 0.1 × ' + +hypnotistAmt.toFixed(2),
      sourceName: 'Hypnotist',
      sourceType: 'perk',
    })
  }

  const voidContractAmt = perks['Void Contract'] ?? 0
  if (voidContractAmt > 0 && !existingBuffNames.includes('Void Contract')) {
    debuffs.push({
      buffName: 'Void Contract',
      potency: voidContractAmt,
      duration: 5,
      condition: `5% chance per second per 1 of this perk · marks a random nearby enemy · +${voidContractAmt * 30}% Damage Taken for the next ${1 + Math.floor(voidContractAmt)} hit(s)`,
      sourceName: 'Void Contract',
      sourceType: 'perk',
    })
  }

  const enemyHpDebuffs = getActiveEnemyHpDebuffs(perks, enemyHpFillPct, existingBuffNames)
  for (const d of enemyHpDebuffs) {
    if (existingBuffNames.includes(d.buffName)) continue
    debuffs.push({
      buffName: d.buffName,
      potency: d.potency,
      duration: d.duration,
      condition: d.condition,
      sourceName: d.sourceName,
      sourceType: 'perk',
    })
  }

  const cryoEngineAmt = perks['Cryo Engine'] ?? 0
  if (cryoEngineAmt > 0) {
    for (let i = 0; i < debuffs.length; i++) {
      if (debuffs[i].buffName === 'Slowness') {
        debuffs[i] = { ...debuffs[i], buffName: 'Frostbite' }
      }
    }
    const hasFrostbite = existingBuffNames.includes('Frostbite') || debuffs.some(d => d.buffName === 'Frostbite')
    if (!hasFrostbite) {
      debuffs.push({
        buffName: 'Frostbite',
        potency: 0,
        duration: 0,
        condition: `${Math.round(CRYO_ENGINE_PROC_CHANCE_PER_AMOUNT * 100 * cryoEngineAmt * 100) / 100}% chance per hit`,
        sourceName: 'Cryo Engine',
        sourceType: 'perk',
      })
    }
  }

  // Ignition: on-hit chance to inflict Burn for 5 + 0.5×perk seconds.
  const ignitionAmt = perks['Ignition'] ?? 0
  if (ignitionAmt > 0 && !existingBuffNames.includes('Burn')) {
    const ignDuration = IGNITION_BURN_DURATION_BASE + IGNITION_BURN_DURATION_PER_AMOUNT * ignitionAmt
    const ignChance = (IGNITION_PROC_CHANCE_PER_AMOUNT * ignitionAmt) * 100
    debuffs.push({
      buffName: 'Burn',
      potency: 0,
      duration: ignDuration,
      condition: `${Math.round(ignChance * 100) / 100}% chance on hit`,
      sourceName: 'Ignition',
      sourceType: 'perk',
    })
  }

  return debuffs
}
