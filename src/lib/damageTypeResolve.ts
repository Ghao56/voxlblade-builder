import { round4 } from './engine/_utils'
import { DMG_TYPE_PRIORITY } from './constants/damage-types'
import { CRAGBLADE_NAME } from '../data/cragblade'

export function resolveDamageTypes(
  baseTypes: Record<string, number>,
  bonuses: Record<string, number>
): Record<string, number> {
  if (Object.keys(bonuses).length === 0) return baseTypes
  const out = { ...baseTypes }
  for (const [k, v] of Object.entries(bonuses)) {
    out[k] = round4((out[k] ?? 0) + v)
  }
  return out
}

/** Convert 50% of Fire↔Air damage (Echo Incineration). */
export function applyFireAirConversion(types: Record<string, number>): Record<string, number> {
  const fire = types.fire ?? 0
  const air = types.air ?? 0
  if (fire === 0 && air === 0) return types
  const result = { ...types }
  const fireToAir = round4(fire * 0.5)
  const airToFire = round4(air * 0.5)
  result.fire = round4(fire - fireToAir + airToFire)
  result.air = round4(air - airToFire + fireToAir)
  return result
}

export function resolveWaDamageTypeKeys(
  waDamageType: string | undefined,
  weaponDmgTypes: Record<string, number>,
): Record<string, number> {
  if (!waDamageType || waDamageType === 'Same as weapon') {
    return { ...weaponDmgTypes }
  }
  if (waDamageType.includes('Highest damage type')) {
    const entries = Object.entries(weaponDmgTypes)
    if (entries.length === 0) return { ...weaponDmgTypes }
    const priority = DMG_TYPE_PRIORITY as readonly string[]
    const [highestKey] = entries.reduce((a, b) => {
      if (b[1] > a[1]) return b
      if (b[1] === a[1]) {
        const ia = priority.indexOf(a[0])
        const ib = priority.indexOf(b[0])
        return (ib === -1 ? 999 : ib) < (ia === -1 ? 999 : ia) ? b : a
      }
      return a
    })
    return { [highestKey]: 1 }
  }
  const types: Record<string, number> = {}
  const re = /([\d.]+)\s*(Physical|Magic|Fire|Water|Earth|Air|Hex|Holy|True|Summon)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(waDamageType)) !== null) {
    types[m[2].toLowerCase()] = parseFloat(m[1])
  }
  if (Object.keys(types).length > 0) return types
  return { ...weaponDmgTypes }
}

/**
 * Single place that answers "does this attack count as Weapon Art damage?".
 *
 * Cragblade's buff makes the weapon's M1/M2 damage count as Weapon Art damage,
 * so every Weapon-Art-only rule (damage-type bonuses, auto-debuff flags, armor
 * penetration, Spell Piercer, Explosive) reads this one signal instead of
 * hardcoding its own copy of the Cragblade check. Callers that already track
 * live buff state (DamageAnalyzer) pass their own value; callers that only have
 * the build state (BuffList, engine) use this helper.
 */
export function weaponHitsCountAsWa(
  selectedWeaponArt: string | undefined,
  disabledBuffKeys: readonly string[] = [],
): boolean {
  if (selectedWeaponArt !== CRAGBLADE_NAME) return false
  return !disabledBuffKeys.some(k => k === CRAGBLADE_NAME || k.startsWith(`${CRAGBLADE_NAME}:`))
}

/** Folds the weapon's damage types into the Weapon Art's, keeping WA values. */
function foldWeaponTypesIntoWaTypes(
  types: Record<string, number>,
  weaponTypes: Record<string, number>,
): Record<string, number> {
  const merged: Record<string, number> = { ...types }
  for (const [key, mult] of Object.entries(weaponTypes)) {
    if (mult > 0 && (merged[key] ?? 0) === 0) merged[key] = mult
  }
  return merged
}

export function getFinalWaDmgTypes(
  waDamageType: string | undefined,
  weaponDmgTypes: Record<string, number>,
  dmgTypeBonuses: Record<string, number>,
  cragbladeActive = false,
): Record<string, number> {
  const baseTypes = resolveWaDamageTypeKeys(waDamageType, weaponDmgTypes)
  const types = resolveDamageTypes(baseTypes, dmgTypeBonuses)
  if (!cragbladeActive) return types
  return foldWeaponTypesIntoWaTypes(types, weaponDmgTypes)
}

export interface EffectiveWaDmgTypesInput {
  waDamageType?: string
  weaponDmgTypes: Record<string, number>
  weaponDmgTypesBase: Record<string, number>
  waDmgTypeBonuses: Record<string, number>
  waOnlyBonuses: Record<string, number>
  airToMagicConversionRate: number
  darkMagicHexRate: number
  trueMoonTrueRate?: number
  echoIncinerateAmt: number
  wildBoltElement?: string | null
  weightySlamActive?: boolean
  heatDrillActive?: boolean
  essenceRayActive?: boolean
  cragbladeActive?: boolean
}

/**
 * Effective damage types dealt by the selected Weapon Art, including perk
 * damage-type bonuses, Spirit Winds/Dark Magic/Echo Incineration conversions
 * and WA-specific overrides (Wild Bolt, Weighty Slam, Heat Drill, Essence Ray).
 * Single source of truth shared by the damage engine and the BuffList panel so
 * auto-debuff checks (e.g. Toxin Caster magic-damage requirement) stay in sync.
 */
function computeBaseWaDmgTypes(input: EffectiveWaDmgTypesInput): Record<string, number> {
  const apply = (types: Record<string, number>) =>
    applyAirToMagicConversion(types, input.airToMagicConversionRate, input.darkMagicHexRate, input.echoIncinerateAmt, input.trueMoonTrueRate)

  if (input.wildBoltElement) {
    return apply(resolveDamageTypes({ [input.wildBoltElement]: 1 }, input.waDmgTypeBonuses))
  }
  if (input.weightySlamActive) {
    return apply(resolveDamageTypes({ physical: 1 }, input.waDmgTypeBonuses))
  }
  if (input.heatDrillActive) {
    const entries = Object.entries(input.weaponDmgTypesBase)
    const highestKey = entries.length > 0
      ? entries.reduce((a, b) => b[1] > a[1] ? b : a)[0]
      : Object.keys(input.weaponDmgTypes)[0] ?? 'physical'
    return apply(resolveDamageTypes({ [highestKey]: 1 }, input.waDmgTypeBonuses))
  }
  if (input.essenceRayActive) {
    return apply(resolveDamageTypes({ true: 1 }, input.waDmgTypeBonuses))
  }

  const dt = input.waDamageType
  if (!dt || dt === 'Same as weapon') {
    return apply(resolveDamageTypes(input.weaponDmgTypes, input.waOnlyBonuses))
  }

  if (dt.includes('Highest damage type')) {
    const entries = Object.entries(input.weaponDmgTypesBase)
    if (entries.length === 0) {
      return apply(resolveDamageTypes(input.weaponDmgTypes, input.waOnlyBonuses))
    }
    const [highestKey] = entries.reduce((a, b) => {
      if (b[1] > a[1]) return b
      if (b[1] === a[1]) {
        const ia = (DMG_TYPE_PRIORITY as readonly string[]).indexOf(a[0])
        const ib = (DMG_TYPE_PRIORITY as readonly string[]).indexOf(b[0])
        return (ib === -1 ? 999 : ib) < (ia === -1 ? 999 : ia) ? b : a
      }
      return a
    })
    return apply(resolveDamageTypes({ [highestKey]: 1 }, input.waDmgTypeBonuses))
  }

  const types: Record<string, number> = {}
  const re = /([\d.]+)\s*(Physical|Magic|Fire|Water|Earth|Air|Hex|Holy|True|Summon)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(dt)) !== null) {
    types[m[2].toLowerCase()] = parseFloat(m[1])
  }
  if (Object.keys(types).length > 0) {
    return apply(resolveDamageTypes(types, input.waDmgTypeBonuses))
  }
  return apply(resolveDamageTypes(input.weaponDmgTypes, input.waOnlyBonuses))
}

/**
 * Same as computeBaseWaDmgTypes, plus the Cragblade fold: when cragbladeActive
 * is true the weapon's own damage types are included, because M1/M2 damage
 * counts as Weapon Art damage. Callers only pass that on the debuff-flag
 * mirror, so the debuff graph stays cycle-free and actual Weapon Art damage is
 * never inflated.
 */
export function computeEffectiveWaDmgTypes(input: EffectiveWaDmgTypesInput): Record<string, number> {
  const types = computeBaseWaDmgTypes(input)
  if (!input.cragbladeActive) return types
  return foldWeaponTypesIntoWaTypes(types, input.weaponDmgTypes)
}

/** Amount of a weapon's native magic claimed by a capped conversion rate. */
function nativeMagicConversionAmount(nativeMagic: number, rate: number | undefined): number {
  if (!rate || rate <= 0 || nativeMagic <= 0) return 0
  return round4(nativeMagic * Math.min(1, rate))
}

/** Convert a fraction of Air damage to Magic damage (e.g. for Spirit Winds). */
export function applyAirToMagicConversion(
  types: Record<string, number>,
  conversionRate: number,
  darkMagicHexRate?: number,
  echoIncinerateAmt?: number,
  trueMoonTrueRate?: number,
): Record<string, number> {
  let result = { ...types }
  // Spirit Winds first: convert Air → Magic BEFORE Echo Incineration
  // so that converted Air from Fire↔Air is NOT re-converted
  if (conversionRate > 0) {
    const airAmount = result.air ?? 0
    if (airAmount > 0) {
      const converted = round4(airAmount * conversionRate)
      if (converted > 0) {
        result.air = round4(airAmount - converted)
        result.magic = round4((result.magic ?? 0) + converted)
      }
    }
  }
  if (echoIncinerateAmt && echoIncinerateAmt > 0) {
    result = applyFireAirConversion(result)
  }
  // Dark Magic converts a fraction of the weapon's NATIVE magic (not magic converted
  // from Air by Spirit Winds) into Hex. The rate is capped at 100% so the magic side can
  // never go negative at 4+ stacks.
  const nativeMagic = types.magic ?? 0
  const hexConverted = nativeMagicConversionAmount(nativeMagic, darkMagicHexRate)
  if (hexConverted > 0) {
    result.magic = round4((result.magic ?? 0) - hexConverted)
    result.hex = round4((result.hex ?? 0) + hexConverted)
  }
  // True Moon behaves identically but targets True Damage Type. Only native magic
  // that Dark Magic did not already claim is left to convert.
  const remainingMagic = Math.max(0, round4(nativeMagic - hexConverted))
  const trueConverted = nativeMagicConversionAmount(remainingMagic, trueMoonTrueRate)
  if (trueConverted > 0) {
    result.magic = round4((result.magic ?? 0) - trueConverted)
    result.true = round4((result.true ?? 0) + trueConverted)
  }
  return result
}