// ── Defensive Perks ────────────────────────────────────────────────────────
// Defines damage-reduction sources from perks (Barbskin, Stoneskin, Adaptive Plate, etc.)
// Consumed by DamageAnalyzer via getActiveDefensivePerkSources().
// See also: src/data/defensivePerks.ts → calcDefensivePotencyMult for potency scaling.

import {
  BASTION_BLESS_MULT,
  BARBSKIN_DR_PER_STACK,
  STONESKIN_DR_PER_STACK,
  STONESKIN_MAX_DR,
  ADAPTIVE_PLATE_BASE_DR,
  ADAPTIVE_PLATE_TRIGGERED_DR,
  PROTECTOR_SPIRIT_DR_PER_STACK,
  PROTECTOR_SPIRIT_HP_THRESHOLD,
  PROTECTOR_SPIRIT_ALWAYS_ON_AT,
  AIR_PRESSURE_MAX_DR_PER_STACK,
  VALOR_SHIELD_DR_PER_STACK,
  VALOR_MAX_DR,
  VAMPIRE_DR_PER_STACK,
  FRENZY_DR_PER_STACK,
  FRENZY_FIXED_DR,
  STORED_CORRUPTION_DR_PER_STACK,
  MOUNTED_DEFENSE_DR_PER_STACK,
  CARAPACE_DR_PER_STACK,
  CURSED_BARK_DR_PER_DEBUFF,
} from '../lib/constants'
import { getDraconicInfusionPotMult } from './draconicBuffs'

// ── Context ────────────────────────────────────────────────────────────────
interface DefensivePerkSourceContext {
  hpFillPct: number
  adaptivePlateTriggered: boolean
  inDarkness: boolean
  rageActive: boolean
  isMounted: boolean
  hasProtection: boolean
  uniqueDebuffCount: number
}

// ── Def definitions ────────────────────────────────────────────────────────
interface DefensivePerkSource {
  perkName: string
  drPctPerStack?: number
  fixedDefPct?: number
  maxDrPct?: number
  isFlat?: boolean
  label: string
  conditionLabel: string
  hpBelowThreshold?: number
  minPerkForAlways?: number
  matchedOnly?: boolean
  dependsOn?: (ctx: DefensivePerkSourceContext) => boolean
  potencyCapped?: boolean
  grantsStunImmunity?: boolean
  drPctFn?: (amt: number, ctx: DefensivePerkSourceContext) => number
}

// ── Active sources ─────────────────────────────────────────────────────────
const DEFENSIVE_PERK_SOURCES: DefensivePerkSource[] = [
  {
    perkName: 'Barbskin',
    drPctPerStack: BARBSKIN_DR_PER_STACK,
    label: 'Barbskin',
    conditionLabel: 'Grants damage reduction while bleeding per 1 of this perk',
  },
  {
    perkName: 'Stoneskin',
    drPctPerStack: STONESKIN_DR_PER_STACK,
    maxDrPct: STONESKIN_MAX_DR,
    isFlat: true,
    label: 'Stoneskin',
    conditionLabel: 'Stoneskin lasts for the entirety of the Weapon Art animation and 50% of its cooldown after cooldown reduction effects',
  },
  {
    perkName: 'Adaptive Plate',
    drPctPerStack: ADAPTIVE_PLATE_BASE_DR,
    label: 'Adaptive Plate',
    conditionLabel: 'While bubble is active (vs all damage)',
  },
  {
    perkName: 'Adaptive Plate',
    drPctPerStack: ADAPTIVE_PLATE_TRIGGERED_DR,
    label: 'Adaptive Plate (Triggered types)',
    conditionLabel: 'Against the type(s) that triggered it — 10% all + 40% matched, additive',
    matchedOnly: true,
  },
  {
    perkName: 'Protector Spirit',
    drPctPerStack: PROTECTOR_SPIRIT_DR_PER_STACK,
    isFlat: true,
    label: 'Protector Spirit',
    conditionLabel: 'Below 50% HP (or always at 2+ perk) · 3s cooldown between activations',
    hpBelowThreshold: PROTECTOR_SPIRIT_HP_THRESHOLD,
    minPerkForAlways: PROTECTOR_SPIRIT_ALWAYS_ON_AT,
  },
  {
    perkName: 'Air Pressure',
    drPctPerStack: AIR_PRESSURE_MAX_DR_PER_STACK,
    label: 'Air Pressure (Max Potency)',
    conditionLabel: 'Air Pressure (Max Potency)',
    potencyCapped: true,
  },
  {
    perkName: 'Valor',
    drPctPerStack: VALOR_SHIELD_DR_PER_STACK,
    maxDrPct: VALOR_MAX_DR,
    label: 'Valor (Shield Block)',
    conditionLabel: 'While blocking with one-handed weapon or spear',
  },
  {
    perkName: 'Vampire',
    drPctPerStack: VAMPIRE_DR_PER_STACK,
    label: 'Vampire',
    conditionLabel: 'In darkness · removed in sunlight',
    dependsOn: ctx => ctx.inDarkness,
  },
  {
    perkName: 'Frenzy',
    drPctPerStack: FRENZY_DR_PER_STACK,
    fixedDefPct: FRENZY_FIXED_DR,
    label: 'Frenzy (Self)',
    conditionLabel: 'While Rage is active · flat, regardless of perk amount',
    dependsOn: ctx => ctx.rageActive,
    potencyCapped: true,
  },
  {
    perkName: 'Stored Corruption',
    drPctPerStack: STORED_CORRUPTION_DR_PER_STACK,
    label: 'Stored Corruption',
    conditionLabel: 'Increases damage taken by 5% per 1 of this perk',
  },
  {
    perkName: 'Mounted Defense',
    drPctPerStack: MOUNTED_DEFENSE_DR_PER_STACK,
    label: 'Mounted Defense',
    conditionLabel: 'While mounted on Glacial Snapper',
    dependsOn: ctx => ctx.isMounted,
  },
  {
    perkName: 'Carapace',
    drPctPerStack: CARAPACE_DR_PER_STACK,
    label: 'Carapace',
    conditionLabel: 'While you have Shield HP',
    dependsOn: ctx => ctx.hasProtection,
    grantsStunImmunity: true,
  },
  {
    perkName: 'Cursed Bark',
    label: 'Cursed Bark',
    conditionLabel: 'Per unique debuff on target',
    drPctFn: (amt, ctx) => CURSED_BARK_DR_PER_DEBUFF * ctx.uniqueDebuffCount * amt,
  },
]

// ── Exports ────────────────────────────────────────────────────────────────
export function getActiveDefensivePerkSources(
  perks: Record<string, number>,
  hpFillPct: number = 100,
  adaptivePlateTriggered: boolean = false,
  inDarkness: boolean = true,
  rageActive: boolean = false,
  isMounted: boolean = false,
  hasProtection: boolean = false,
  uniqueDebuffCount: number = 0,
): Array<{ name: string; defPct: number; isFlat?: boolean; condition: string; potencyCapped?: boolean; grantsStunImmunity?: boolean }> {
  const out: Array<{ name: string; defPct: number; isFlat?: boolean; condition: string; potencyCapped?: boolean; grantsStunImmunity?: boolean }> = []
  const ctx: DefensivePerkSourceContext = { hpFillPct, adaptivePlateTriggered, inDarkness, rageActive, isMounted, hasProtection, uniqueDebuffCount }

  for (const def of DEFENSIVE_PERK_SOURCES) {
    const amt = perks[def.perkName] ?? 0
    if (amt <= 0) continue
    if (def.hpBelowThreshold != null) {
      const bypassByPerk = def.minPerkForAlways != null && amt >= def.minPerkForAlways
      if (!bypassByPerk && hpFillPct >= def.hpBelowThreshold) continue
    }
    if (def.perkName === 'Adaptive Plate') {
      if (def.matchedOnly && !adaptivePlateTriggered) continue
      if (!def.matchedOnly && adaptivePlateTriggered) continue
    }
    if (def.dependsOn && !def.dependsOn(ctx)) continue

    let defPct = def.fixedDefPct ?? (def.drPctFn ? def.drPctFn(amt, ctx) : (def.drPctPerStack ?? 0) * amt)
    if (def.maxDrPct != null) defPct = Math.min(defPct, def.maxDrPct)
    defPct = Math.round(defPct * 100) / 100

    out.push({ 
      name: def.label, 
      defPct, 
      isFlat: def.isFlat, 
      condition: def.conditionLabel,
      potencyCapped: def.potencyCapped,
      grantsStunImmunity: def.grantsStunImmunity,
    })
  }
  return out
}

export function calcDefensivePotencyMult(
  perks: Record<string, number>,
  draconicRuneInfusion: string,
  draconicColor: string,
): number {
  let potMult = 1

  const bastionStacks = perks['Bastion Bless'] ?? 0
  if (bastionStacks > 0) {
    potMult += BASTION_BLESS_MULT * bastionStacks
  }

  if (draconicRuneInfusion === 'infusion' && draconicColor === 'holy') {
    const infPerkAmt = perks['Draconic Blood'] ?? 0
    potMult *= getDraconicInfusionPotMult(infPerkAmt)
  }

  return potMult
}