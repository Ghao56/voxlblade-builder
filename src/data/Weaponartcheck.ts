import type { WeaponArt, WeaponArtRequirement } from '../data/weaponArts'

const WEAPON_TYPE_EQUIVALENTS: Record<string, string[]> = {
  'Dual Kamas': ['Dagger'],
}

function weaponTypeMatches(required: string, actual: string): boolean {
  if (required === actual) return true
  return (WEAPON_TYPE_EQUIVALENTS[actual] ?? []).includes(required)
}

const SCALE_MAP: Record<string, string> = {
  physicalScaling: 'physical', magicScaling: 'magic',
  fireScaling: 'fire', waterScaling: 'water', earthScaling: 'earth',
  airScaling: 'air', hexScaling: 'hex', holyScaling: 'holy',
  dexterityScaling: 'dexterity', summonScaling: 'summon',
}

const SCALE_MAP_LABELS: Array<[string, string, string]> = [
  ['physicalScaling', 'physical', 'Physical'],
  ['magicScaling', 'magic', 'Magic'],
  ['fireScaling', 'fire', 'Fire'],
  ['waterScaling', 'water', 'Water'],
  ['earthScaling', 'earth', 'Earth'],
  ['airScaling', 'air', 'Air'],
  ['hexScaling', 'hex', 'Hex'],
  ['holyScaling', 'holy', 'Holy'],
  ['dexterityScaling', 'dexterity', 'Dexterity'],
  ['summonScaling', 'summon', 'Summon'],
]

const STAT_CHECKS: Array<[keyof WeaponArtRequirement, keyof Record<string, number>, string]> = [
  ['physicalDefense', 'physicalDefense', 'Physical Defense ≥ +%s%'],
  ['magicBoost', 'magicBoost', 'Magic Boost ≥ +%s%'],
  ['holyBoost', 'holyBoost', 'Holy Boost ≥ +%s%'],
  ['summonBoost', 'summonBoost', 'Summon Boost ≥ +%s%'],
  ['heatResistance', 'heatResistance', 'Heat Resistance ≥ %s%'],
  ['tenacity', 'tenacity', 'Tenacity ≥ %s'],
]

function passesAtLeastOneScaling(
  req: WeaponArtRequirement,
  scalings: Record<string, number>,
): boolean {
  if (!req.atLeastOneScaling) return true
  return Object.entries(req.atLeastOneScaling).some(([reqKey, minVal]) => {
    const scalingKey = SCALE_MAP[reqKey]
    return scalingKey != null && (scalings[scalingKey] ?? 0) >= (minVal ?? 0)
  })
}

function meetsScalingReqs(req: WeaponArtRequirement, scalings: Record<string, number>): boolean {
  for (const [reqKey, scalingKey] of Object.entries(SCALE_MAP)) {
    const needed = (req as any)[reqKey]
    if (needed != null && (scalings[scalingKey] ?? 0) < needed) return false
  }
  return true
}

function meetsStatReqs(req: WeaponArtRequirement, stats: Record<string, number>): boolean {
  for (const [reqKey, statKey] of STAT_CHECKS) {
    const needed = (req as any)[reqKey]
    if (needed != null && (stats[statKey] ?? 0) < needed) return false
  }
  return true
}

function buildUnmetStatReqs(req: WeaponArtRequirement, stats: Record<string, number>): string[] {
  const result: string[] = []
  for (const [reqKey, statKey, fmt] of STAT_CHECKS) {
    const needed = (req as any)[reqKey]
    if (needed != null && (stats[statKey] ?? 0) < needed) result.push(fmt.replace('%s', String(needed)))
  }
  return result
}

function buildUnmetScalingReqs(req: WeaponArtRequirement, scalings: Record<string, number>): string[] {
  const result: string[] = []
  for (const [reqKey, scalingKey, label] of SCALE_MAP_LABELS) {
    const needed = (req as any)[reqKey]
    if (needed != null && (scalings[scalingKey] ?? 0) < needed)
      result.push(`${label} Scaling ≥ ${needed}`)
  }
  if (req.atLeastOneScaling) {
    const passes = Object.entries(req.atLeastOneScaling).some(([reqKey, minVal]) => {
      const entry = SCALE_MAP_LABELS.find(([rk]) => rk === reqKey)
      return entry != null && (scalings[entry[1]] ?? 0) >= (minVal ?? 0)
    })
    if (!passes) {
      const parts = Object.entries(req.atLeastOneScaling).map(([reqKey, minVal]) => {
        const entry = SCALE_MAP_LABELS.find(([rk]) => rk === reqKey)
        return `${entry?.[2] ?? reqKey} Scaling ≥ ${minVal}`
      })
      result.push(`At least one of: ${parts.join(' / ')}`)
    }
  }
  return result
}

export function checkWA(
  wa: WeaponArt,
  scalings: Record<string, number>,
  stats: Record<string, number>,
  finalWeaponType: string,
  isMonk: boolean,
  bladeName: string,
  handleName: string,
): boolean {
  if (wa.isMonk && !isMonk) return false

  const req: WeaponArtRequirement = wa.requirements ?? {}

  if (req.guild === 'Monk' && !isMonk) return false
  if (req.bothParts && !req.bothParts.every(p => p === bladeName || p === handleName)) return false
  if (!passesAtLeastOneScaling(req, scalings)) return false

  const isScalingExempt = req.scalingExemptWeaponTypes?.some(t => weaponTypeMatches(t, finalWeaponType)) ?? false
  if (!isScalingExempt && !meetsScalingReqs(req, scalings)) return false
  if (!meetsStatReqs(req, stats)) return false
  if (req.weaponType?.length && !req.weaponType.some(t => weaponTypeMatches(t, finalWeaponType))) return false

  return true
}

export function getUnmetReqs(
  wa: WeaponArt,
  scalings: Record<string, number>,
  stats: Record<string, number>,
  finalWeaponType: string,
  isMonk: boolean,
  bladeName: string,
  handleName: string,
): string[] {
  const req: WeaponArtRequirement = wa.requirements ?? {}
  if (Object.keys(req).length === 0) return []

  const unmet: string[] = []

  if (req.guild && !isMonk) unmet.push(`Guild: ${req.guild}`)
  if (req.weaponType?.length && !req.weaponType.some(t => weaponTypeMatches(t, finalWeaponType)))
    unmet.push(`Weapon: ${req.weaponType.join(' / ')}`)
  if (req.bothParts && !req.bothParts.every(p => p === bladeName || p === handleName))
    unmet.push(`Cần cả: ${req.bothParts.join(' + ')}`)

  const isScalingExempt = req.scalingExemptWeaponTypes?.some(t => weaponTypeMatches(t, finalWeaponType)) ?? false
  if (!isScalingExempt) {
    unmet.push(...buildUnmetScalingReqs(req, scalings))
  }

  unmet.push(...buildUnmetStatReqs(req, stats))

  return unmet
}