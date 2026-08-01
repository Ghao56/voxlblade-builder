import { round4 } from './engine/_utils'
import { DMG_TYPE_PRIORITY } from './constants/damage-types'

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

export function getFinalWaDmgTypes(
  waDamageType: string | undefined,
  weaponDmgTypes: Record<string, number>,
  dmgTypeBonuses: Record<string, number>,
): Record<string, number> {
  const baseTypes = resolveWaDamageTypeKeys(waDamageType, weaponDmgTypes)
  return resolveDamageTypes(baseTypes, dmgTypeBonuses)
}

export interface EffectiveWaDmgTypesInput {
  waDamageType?: string
  weaponDmgTypes: Record<string, number>
  weaponDmgTypesBase: Record<string, number>
  waDmgTypeBonuses: Record<string, number>
  waOnlyBonuses: Record<string, number>
  airToMagicConversionRate: number
  darkMagicHexBonus: number
  echoIncinerateAmt: number
  wildBoltElement?: string | null
  weightySlamActive?: boolean
  heatDrillActive?: boolean
  essenceRayActive?: boolean
}

/**
 * Effective damage types dealt by the selected Weapon Art, including perk
 * damage-type bonuses, Spirit Winds/Dark Magic/Echo Incineration conversions
 * and WA-specific overrides (Wild Bolt, Weighty Slam, Heat Drill, Essence Ray).
 * Single source of truth shared by the damage engine and the BuffList panel so
 * auto-debuff checks (e.g. Toxin Caster magic-damage requirement) stay in sync.
 */
export function computeEffectiveWaDmgTypes(input: EffectiveWaDmgTypesInput): Record<string, number> {
  const apply = (types: Record<string, number>) =>
    applyAirToMagicConversion(types, input.airToMagicConversionRate, input.darkMagicHexBonus, input.echoIncinerateAmt)

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

/** Convert a fraction of Air damage to Magic damage (e.g. for Spirit Winds). */
export function applyAirToMagicConversion(
  types: Record<string, number>,
  conversionRate: number,
  darkMagicHex?: number,
  echoIncinerateAmt?: number,
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
  // Dark Magic only triggers on native magic, not magic converted from Air by Spirit Winds
  const nativeMagic = types.magic ?? 0
  if (darkMagicHex && darkMagicHex > 0 && nativeMagic > 0) {
    result.hex = round4((result.hex ?? 0) + darkMagicHex)
  }
  return result
}