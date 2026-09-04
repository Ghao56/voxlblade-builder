import type { ProcCoefficient, ProcScalingType } from './types'
import { canProc } from './types'
import { BLUB_BLUB_PROC_CHANCE } from './constants/perks'
import { ICHOR_SPARK_CHAIN_PROC_CHANCE, QUAKE_CHANCE_BASE } from './constants/perk-base-damage'
import { STORM_CALLER_PROC_CHANCE, LIGHT_BEARER_PROC_CHANCE } from './constants/perks'

/**
 * Data-driven registry of proc-capable effects.
 *
 * Every effect that reacts to a damage instance's Proc Coefficient is declared
 * here once, keyed by its damage tag (the same tag the engine pushes into
 * `ComputedType.tag` / `BADGE_CONFIG`). Adding or changing an effect's proc
 * behavior afterwards only requires a data change - no engine patching.
 *
 * Three chance-scaling behaviors are declared (see `ProcScalingType`):
 * - `normal`    : chance-based effect, gated by the hit's coefficient
 *                 (blocked on a `noProc` hit, otherwise active)
 * - `ignore`    : completely unaffected by the coefficient - stays active even
 *                 on a `noProc` hit (e.g. Carrying Winds)
 * - `positiveOnly` : never reduced below its base chance; stays active even on
 *                 a `noProc` hit, only positively boosted (Natural/Golden Crits,
 *                 King's Luck)
 *
 * `blockedOnNoProc` marks NON-chance, conditional effects (Blood Thirsty,
 * Luminescent, Phantom Pain, ...) that simply cannot activate on an instance
 * tagged `noProc`.
 *
 * NOTE: The damage engine is a deterministic/expected-value model, so a hit's
 * coefficient never reduces or increases an effect's AWARDED damage - an effect
 * is either active (scale 1) or blocked (scale 0). Base percentages and any
 * chance reduction math belong to the game's random rollout, not this sim.
 */
export interface ProcEffectDef {
  /** How the effect's proc chance reacts to the hit's coefficient. */
  chanceScaling?: ProcScalingType
  /** Base proc chance (0..1) for reference; not used for expected-value damage. */
  baseChance?: number
  /** Blocked-on-NoProc non-chance effect. */
  blockedOnNoProc?: boolean
}

export const PROC_EFFECT_DEFS: Readonly<Record<string, ProcEffectDef>> = {
  // Non-chance effects: can never activate on a NoProc instance.
  'Blood Thirsty': { blockedOnNoProc: true },
  'Venom Eater': { blockedOnNoProc: true },
  'Phantom Pain': { blockedOnNoProc: true },
  'Runic Blades': { blockedOnNoProc: true },
  'Luminescent': { blockedOnNoProc: true },
  'Cloudpush': { blockedOnNoProc: true },
  'Cinderpull': { blockedOnNoProc: true },
  'Star Struck': { blockedOnNoProc: true },
  'Dragon State': { blockedOnNoProc: true },
  'Last Croak': { blockedOnNoProc: true },
  'Woof Spirit': { blockedOnNoProc: true },
  'Deathmist Slash': { blockedOnNoProc: true },
  'Inspiration': { blockedOnNoProc: true },
  'Sandnado': { blockedOnNoProc: true },
  'Radiance': { blockedOnNoProc: true },
  'Light Bearer': { blockedOnNoProc: true, baseChance: LIGHT_BEARER_PROC_CHANCE },

  // Chance-based damage effects: blocked on NoProc, otherwise active.
  // baseChance mirrors the game's actual roll chances (reference only — the
  // expected-value engine awards damage when the effect is active).
  'Cauterize': { chanceScaling: 'normal' },
  'Echo Incineration': { chanceScaling: 'normal' },
  'Stormcaller': { chanceScaling: 'normal', baseChance: STORM_CALLER_PROC_CHANCE },
  'Bombardier': { chanceScaling: 'normal' },
  'Quake': { chanceScaling: 'normal', baseChance: QUAKE_CHANCE_BASE / 100 },
  'Chain': { chanceScaling: 'normal' }, // Lightning Cloak + Storm Rend chain lightning
  'Ichor Spark': { chanceScaling: 'normal', baseChance: ICHOR_SPARK_CHAIN_PROC_CHANCE },
  'Blub': { chanceScaling: 'normal', baseChance: BLUB_BLUB_PROC_CHANCE },
  'Explosive': { chanceScaling: 'normal' },
  'Glacial': { chanceScaling: 'normal' },
}

/**
 * Whether an effect can activate for a hit with the given coefficient.
 * Returns 0 (blocked) or 1 (active) per the model above.
 */
export function procChanceScale(tag: string, pc: ProcCoefficient | undefined): number {
  const def = PROC_EFFECT_DEFS[tag] ?? {}
  return procScaleForDefinition(def, tag, pc)
}

/** Behavior of a single effect definition (exposed for tests / future effect defs). */
export function procScaleForDefinition(def: ProcEffectDef, _tag: string, pc: ProcCoefficient | undefined): number {
  const scaling = def.chanceScaling ?? (def.blockedOnNoProc ? undefined : 'normal')
  // PositiveOnly/ignore-scaled effects (Carrying Winds, Golden Crits, ...) never drop
  // their chance, even on a no-proc hit. Everything else requires a proc-capable hit.
  if (scaling === 'ignore' || scaling === 'positiveOnly') return 1
  return canProc(pc) ? 1 : 0
}

/** Whether the effect can activate for a hit with the given -proc coefficient. */
export function canProcEffect(tag: string, pc: ProcCoefficient | undefined): boolean {
  return procChanceScale(tag, pc) > 0
}