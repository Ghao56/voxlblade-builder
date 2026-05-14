import type { StatMap, StatKey } from '../lib/types'

const OFFENSIVE_BOOSTS: StatKey[] = [
  'physicalBoost', 'magicBoost', 'fireBoost', 'waterBoost',
  'earthBoost', 'airBoost', 'hexBoost', 'holyBoost', 'dexterityBoost',
]

function r(v: number) {
  return Math.round((v + Number.EPSILON) * 100) / 100
}

export function applyStatBoostPerks(
  stats: StatMap,
  perks: Record<string, number>
): StatMap {
  const s: StatMap = { ...stats }

  // ── Quick Witted ───────────────────────────────────────────────────────
  const quickWitted = perks['Quick Witted'] ?? 0

  if (quickWitted > 0) {
    const speed = s['speedBoost'] ?? 0

    if (speed > 0) {
      const bonus = speed * quickWitted * 0.25
      s['dexterityBoost'] = (s['dexterityBoost'] ?? 0) + bonus
    }
  }

  // ── Whirl Foot ─────────────────────────────────────────────────────────
  const whirlFoot = perks['Whirl Foot'] ?? 0

  if (whirlFoot > 0) {
    const airBoost = s['airBoost'] ?? 0

    if (airBoost > 0) {
      const bonus = 0.05 * airBoost * whirlFoot
      s['speedBoost'] = (s['speedBoost'] ?? 0) + bonus
    }
  }

  // ── Carapace ───────────────────────────────────────────────────────────
  const carapace = perks['Carapace'] ?? 0

  if (carapace > 0) {
    const earth = s['earthBoost'] ?? 0

    if (earth > 0) {
      const bonus = 0.075 * earth * carapace
      s['protection'] = (s['protection'] ?? 0) + bonus
    }
  }

  // ── Extra Layers ──────────────────────────────────────────────────────
  const extraLayers = perks['Extra Layers'] ?? 0

  if (extraLayers > 0) {
    const protection = s['protection'] ?? 0
    const warding = s['warding'] ?? 0

    s['protection'] = protection * (1 + 0.2 * extraLayers)
    s['warding'] = warding * (1 + 0.2 * extraLayers)
  }

  // ── Frozen Heart ──────────────────────────────────────────────────────
  const frozenHeart = perks['Frozen Heart'] ?? 0

  if (frozenHeart > 0) {
    const cold = s['coldResistance'] ?? 0

    if (cold > 0) {
      const bonus = ((1 / 45) + (1 / 45) * frozenHeart) * cold

      s['warding'] = (s['warding'] ?? 0) + bonus
      s['physicalDefense'] = (s['physicalDefense'] ?? 0) + bonus
      s['magicDefense'] = (s['magicDefense'] ?? 0) + bonus
    }
  }

  // ── Immovable ─────────────────────────────────────────────────────────
  const immovable = perks['Immovable'] ?? 0

  if (immovable > 0) {
    const tenacity = s['tenacity'] ?? 0

    if (tenacity > 0) {
      const bonus = 30 * tenacity * immovable
      s['physicalDefense'] = (s['physicalDefense'] ?? 0) + bonus
    }
  }

  // ── Righted Wrongs ────────────────────────────────────────────────────
  const rightedWrongs = perks['Righted Wrongs'] ?? 0

  if (rightedWrongs > 0) {
    const neg = (v: number) => Math.abs(Math.min(v, 0))

    const warding = neg(s['warding'] ?? 0)
    const physicalDefense = neg(s['physicalDefense'] ?? 0)
    const magicDefense = neg(s['magicDefense'] ?? 0)

    const negativeElementalDefense =
      neg(s['fireDefense'] ?? 0) +
      neg(s['waterDefense'] ?? 0) +
      neg(s['earthDefense'] ?? 0) +
      neg(s['airDefense'] ?? 0) +
      neg(s['hexDefense'] ?? 0) +
      neg(s['holyDefense'] ?? 0)

    const negativeOtherStats =
      neg(s['physicalBoost'] ?? 0) +
      neg(s['dexterityBoost'] ?? 0) +
      neg(s['magicBoost'] ?? 0) +
      neg(s['fireBoost'] ?? 0) +
      neg(s['waterBoost'] ?? 0) +
      neg(s['earthBoost'] ?? 0) +
      neg(s['airBoost'] ?? 0) +
      neg(s['hexBoost'] ?? 0) +
      neg(s['holyBoost'] ?? 0) +
      neg(s['summonBoost'] ?? 0) +
      neg(s['speedBoost'] ?? 0) +
      neg(s['attackSpeed'] ?? 0)

    const negativeTenacity = neg(s['tenacity'] ?? 0)

    const d = negativeElementalDefense + warding
    const t = negativeTenacity
    const o = negativeOtherStats + physicalDefense + magicDefense

    const dexterityGained =
      rightedWrongs * (2 / 21) * (d + t * 0.4 + o * 2)

    s['dexterityBoost'] =
      (s['dexterityBoost'] ?? 0) + dexterityGained

    const speedGained = dexterityGained * 0.1

    s['speedBoost'] =
      (s['speedBoost'] ?? 0) + speedGained
  }

  // ── Rocky Body ────────────────────────────────────────────────────────
  const rockyBody = perks['Rocky Body'] ?? 0

  if (rockyBody > 0) {
    const earth = s['earthBoost'] ?? 0

    if (earth > 0) {
      const bonus = earth * 0.5 * rockyBody
      s['physicalDefense'] = (s['physicalDefense'] ?? 0) + bonus
    }
  }

  // ── Spellshield ───────────────────────────────────────────────────────
  const spellshield = perks['Spellshield'] ?? 0

  if (spellshield > 0) {
    const magicBoost = s['magicBoost'] ?? 0
    const magicDefense = s['magicDefense'] ?? 0

    const bonus =
      0.15 * (magicBoost + magicDefense) * spellshield

    s['protection'] = (s['protection'] ?? 0) + bonus
  }

  // ── Strong Tides ──────────────────────────────────────────────────────
  const strongTides = perks['Strong Tides'] ?? 0

  if (strongTides > 0) {
    const physicalBoost = s['physicalBoost'] ?? 0

    if (physicalBoost > 0) {
      const bonus = physicalBoost * 0.1 * strongTides
      s['waterBoost'] = (s['waterBoost'] ?? 0) + bonus
    }
  }

  // ── Swift Guard ───────────────────────────────────────────────────────
  const swiftGuard = perks['Swift Guard'] ?? 0

  if (swiftGuard > 0) {
    const dexterityBoost = s['dexterityBoost'] ?? 0

    if (dexterityBoost > 0) {
      const bonus = dexterityBoost * 0.1 * swiftGuard
      s['physicalDefense'] = (s['physicalDefense'] ?? 0) + bonus
    }
  }

  // ── True Balance ──────────────────────────────────────────────────────
  const trueBalance = perks['True Balance'] ?? 0

  if (trueBalance > 0) {
    const hexBoost = s['hexBoost'] ?? 0
    const holyBoost = s['holyBoost'] ?? 0

    const resultBoost =
      (hexBoost + holyBoost) * 0.83 * trueBalance

    s['hexBoost'] = resultBoost
    s['holyBoost'] = resultBoost
  }

  // ── Brawny ────────────────────────────────────────────────────────────
  const brawny = perks['Brawny'] ?? 0

  if (brawny > 0) {
    const convRate = Math.min(brawny * 0.20, 1.0)

    let gained = 0

    for (const key of OFFENSIVE_BOOSTS) {
      if (key === 'physicalBoost') continue

      const val = s[key] ?? 0

      if (val <= 0) continue

      const converted = val * convRate

      s[key] = val - converted
      gained += converted
    }

    s['physicalBoost'] =
      (s['physicalBoost'] ?? 0) + gained
  }

  // ── Weight Distribution ───────────────────────────────────────────────
  const weightDistribution = perks['Weight Distribution'] ?? 0

  if (weightDistribution > 0) {
    const dexterityBoost = s['dexterityBoost'] ?? 0
    const physicalBoost = s['physicalBoost'] ?? 0

    const total = dexterityBoost + physicalBoost
    const split = total * 0.5
    const multiplier = 1 + 0.1 * weightDistribution

    s['dexterityBoost'] = split * multiplier
    s['physicalBoost'] = split * multiplier
  }

  // ── Final Rounding ────────────────────────────────────────────────────
  const result: StatMap = {}

  for (const [k, v] of Object.entries(s)) {
    const rv = r(v as number)

    if (rv !== 0) {
      result[k as StatKey] = rv
    }
  }

  return result
}