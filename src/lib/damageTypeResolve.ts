import { round4 } from './engine/_utils'

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

/** Convert a fraction of Air damage to Magic damage (e.g. for Spirit Winds). */
export function applyAirToMagicConversion(
  types: Record<string, number>,
  conversionRate: number,
  darkMagicHex?: number,
): Record<string, number> {
  let result = { ...types }
  if (conversionRate > 0) {
    const airAmount = types.air ?? 0
    if (airAmount > 0) {
      const converted = round4(airAmount * conversionRate)
      if (converted > 0) {
        result.air = round4(airAmount - converted)
        result.magic = round4((result.magic ?? 0) + converted)
      }
    }
  }
  if (darkMagicHex && darkMagicHex > 0 && (types.magic ?? 0) > 0) {
    result.hex = round4((result.hex ?? 0) + darkMagicHex)
  }
  return result
}