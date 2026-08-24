import { canProc, type ProcCoefficient } from '../lib/types'
import { roundMultiplier } from '../lib/utils'
import {
  RADIANCE_BASE,
  RADIANCE_EXCLUDED_SOURCE_PATTERNS,
  RADIANCE_HEAL_RATIO,
  RADIANCE_HOLY_TYPE_MULT,
  RADIANCE_LABEL,
  RADIANCE_NOTE,
} from '../lib/constants/perk-base-damage'

/**
 * Structural subset of a BDCHit that Radiance evaluation needs.
 * A source is any hit in the BDC pipeline that carries healing — either a
 * pure heal (`isHeal`) or a mixed damage hit with a heal component
 * (`dmgTypeIsHeal.heal` + `dmgTypes.heal` fraction of `base`).
 */
export interface RadianceHealSource {
  base: number
  count?: number
  scalingMult?: number
  combatMult?: number
  isHeal?: boolean
  isRadianceProc?: boolean
  label?: string
  dmgTypes: Record<string, number>
  dmgTypeIsHeal?: Record<string, boolean>
  dmgTypeCombatMults?: Record<string, number>
  procCoefficient?: ProcCoefficient
}

/**
 * The actual healing output of a source hit — base × scaling × outgoing-heal
 * multiplier (the heal fraction of it for mixed damage/heal hits). This is
 * the "healing" figure the Radiance formula keys off, so source scaling and
 * healing-dealt modifiers (Emotional, Heal Boost, …) flow in exactly once.
 */
export function radianceSourceHealing(src: RadianceHealSource): number | null {
  if (src.isRadianceProc) return null
  const scale = src.scalingMult ?? 1
  if (src.isHeal) return src.base * scale * (src.combatMult ?? 1)
  if (src.dmgTypeIsHeal?.heal === true) {
    const healFraction = src.dmgTypes.heal ?? 0
    if (healFraction > 0) {
      return src.base * healFraction * scale * (src.dmgTypeCombatMults?.heal ?? src.combatMult ?? 1)
    }
  }
  return null
}

/**
 * Radiance only triggers on heals that can themselves proc effects:
 * noProc heal instances (e.g. DoT-style or explicitly gated heals) and
 * game-design-excluded sources (Lifesteal, Regen, Dark Harvest, …) never do.
 */
export function isRadianceEligible(src: RadianceHealSource): boolean {
  const healing = radianceSourceHealing(src)
  if (healing == null || healing <= 0) return false
  if (!canProc(src.procCoefficient)) return false
  const label = src.label ?? ''
  if (RADIANCE_EXCLUDED_SOURCE_PATTERNS.some(rx => rx.test(label))) return false
  return true
}

export interface RadianceProcOptions {
  amt: number
  scalingMult: number
  group: string
  index: number
}

export interface RadianceProcResult {
  sourceId: string
  sourceType: string
  sourceName: string
  healing: number
  baseDamage: number
  hit: {
    group: string
    index: number
    count: number
    base: number
    scalingMult: number
    combatMult: number
    isFinisher: false
    dmgTypes: Record<string, number>
    label: string
    procCoefficient: ProcCoefficient
    isRadianceProc: true
    note: string
  }
}

/**
 * Builds one Radiance burst for ONE healing source. Healing is never
 * aggregated across sources — call this once per eligible source so each
 * burst scales off that source's own healing only.
 *
 * Formula: base = 1 + healing × (4 / 45) × perkAmount, where `healing` is the
 * source's actual heal output. Holy Boost applies afterwards through the
 * 10.0 Holy scaling (`opts.scalingMult`); outgoing-healing modifiers already
 * sit inside `healing`, so the burst carries NO extra heal combat multiplier.
 */
export function buildRadianceProcHit(
  src: RadianceHealSource,
  opts: RadianceProcOptions,
): RadianceProcResult {
  const healing = radianceSourceHealing(src) ?? 0
  const baseDamage = roundMultiplier(RADIANCE_BASE + RADIANCE_HEAL_RATIO * opts.amt * healing)
  const sourceName = src.label ?? opts.group
  return {
    sourceId: `${sourceName}@${opts.index}`,
    sourceType: opts.group,
    sourceName,
    healing,
    baseDamage,
    hit: {
      group: opts.group,
      index: opts.index,
      count: src.count ?? 1,
      base: baseDamage,
      scalingMult: opts.scalingMult,
      combatMult: 1,
      isFinisher: false,
      dmgTypes: { holy: RADIANCE_HOLY_TYPE_MULT },
      label: RADIANCE_LABEL,
      // The burst itself can never proc other effects.
      procCoefficient: { type: 'noProc' },
      isRadianceProc: true,
      note: RADIANCE_NOTE,
    },
  }
}
