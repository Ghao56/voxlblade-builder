import { type StatMap, type StatKey, PERCENT_STATS } from '../lib/types'
import {
  WEIGHT_DISTRIBUTION_SPLIT_RATIO,
  WEIGHT_DISTRIBUTION_MULTIPLIER,
  QUICK_WITTED_CONVERSION,
  WHIRL_FOOT_CONVERSION,
  CARAPACE_CONVERSION,
  EXTRA_LAYERS_MULT,
  FROZEN_HEART_CONVERSION,
  IMMOVABLE_MULT,
  RIGHTED_WRONGS_BASE_COEFF,
  RIGHTED_WRONGS_TENACITY_WEIGHT,
  RIGHTED_WRONGS_OFFENSE_WEIGHT,
  RIGHTED_WRONGS_SPEED_FRACTION,
  ROCKY_BODY_CONVERSION,
  SPELLSHIELD_CONVERSION,
  STRONG_TIDES_CONVERSION,
  SWIFT_GUARD_CONVERSION,
  TRUE_BALANCE_STAT_MULT,
  RAWNY_CONVERSION,
  RAWNY_MAX_CAP,
  ROARING_HEADINGS_WARDING_SUB,
  LUCKY_WARDING_SUB,
  LUCKY_PROTECTION_SUB,
  LUCKY_TENACITY_SUB,
} from '../lib/constants/stat-conversions'

export const OFFENSIVE_BOOSTS: StatKey[] = [
  'physicalBoost', 'magicBoost', 'fireBoost', 'waterBoost',
  'earthBoost', 'airBoost', 'hexBoost', 'holyBoost', 'dexterityBoost',
]

const ELEMENTAL_DEFENSES: StatKey[] = [
  'fireDefense', 'waterDefense', 'earthDefense', 'airDefense', 'hexDefense', 'holyDefense',
]

const OTHER_OFFENSIVE_STATS: StatKey[] = [
  'physicalBoost', 'dexterityBoost', 'magicBoost', 'fireBoost', 'waterBoost',
  'earthBoost', 'airBoost', 'hexBoost', 'holyBoost', 'summonBoost',
  'speedBoost', 'attackSpeed',
]

function r(v: number) {
  return Math.round((v + Number.EPSILON) * 100) / 100
}

function get(s: StatMap, key: StatKey): number {
  return s[key] ?? 0
}

function add(s: StatMap, key: StatKey, amount: number): void {
  s[key] = get(s, key) + amount
}

function sub(s: StatMap, key: StatKey, amount: number): void {
  s[key] = get(s, key) - amount
}

function negMagnitude(v: number): number {
  return Math.abs(Math.min(v, 0))
}

function negSum(s: StatMap, keys: StatKey[]): number {
  return keys.reduce((acc, k) => acc + negMagnitude(get(s, k)), 0)
}

type PerkHandler = (s: StatMap, Amount: number) => void;

const PERK_REGISTRY: Record<string, PerkHandler> = {
  'Roaring Heads': (s, Amount) => {
    sub(s, 'warding', ROARING_HEADINGS_WARDING_SUB * Amount)
  },

  'Lucky': (s, Amount) => {
    sub(s, 'warding', LUCKY_WARDING_SUB * Amount)
    sub(s, 'protection', LUCKY_PROTECTION_SUB * Amount)
    sub(s, 'tenacity', LUCKY_TENACITY_SUB * Amount)
  },

  'Quick Witted': (s, Amount) => {
    const speed = get(s, 'speedBoost')
    if (speed > 0) {
      add(s, 'dexterityBoost', speed * Amount * QUICK_WITTED_CONVERSION)
    }
  },

  'Whirl Foot': (s, Amount) => {
    const airBoost = get(s, 'airBoost')
    if (airBoost > 0) {
      add(s, 'speedBoost', WHIRL_FOOT_CONVERSION * airBoost * Amount)
    }
  },

  'Carapace': (s, Amount) => {
    const earth = get(s, 'earthBoost')
    if (earth > 0) {
      add(s, 'protection', CARAPACE_CONVERSION * earth * Amount)
    }
  },

  'Extra Layers': (s, Amount) => {
    const multiplier = 1 + EXTRA_LAYERS_MULT * Amount
    s['protection'] = get(s, 'protection') * multiplier
    s['warding'] = get(s, 'warding') * multiplier
  },

  'Frozen Heart': (s, Amount) => {
    const cold = get(s, 'coldResistance')
    if (cold > 0) {
      const bonus = (FROZEN_HEART_CONVERSION + FROZEN_HEART_CONVERSION * Amount) * cold
      add(s, 'warding', bonus)
      add(s, 'physicalDefense', bonus)
      add(s, 'magicDefense', bonus)
    }
  },

  'Immovable': (s, Amount) => {
    const tenacity = get(s, 'tenacity')
    if (tenacity > 0) {
      add(s, 'physicalDefense', IMMOVABLE_MULT * tenacity * Amount)
    }
  },

  'Righted Wrongs': (s, Amount) => {
    const d = negSum(s, ELEMENTAL_DEFENSES) + negMagnitude(get(s, 'warding'))
    const t = negMagnitude(get(s, 'tenacity'))
    const o = negSum(s, OTHER_OFFENSIVE_STATS) + negMagnitude(get(s, 'physicalDefense')) + negMagnitude(get(s, 'magicDefense'))

    const dexterityGained = Amount * RIGHTED_WRONGS_BASE_COEFF * (d + t * RIGHTED_WRONGS_TENACITY_WEIGHT + o * RIGHTED_WRONGS_OFFENSE_WEIGHT)
    add(s, 'dexterityBoost', dexterityGained)

    const speedGained = dexterityGained * RIGHTED_WRONGS_SPEED_FRACTION
    add(s, 'speedBoost', speedGained)
  },

  'Rocky Body': (s, Amount) => {
    const earth = get(s, 'earthBoost')
    if (earth > 0) {
      add(s, 'physicalDefense', earth * ROCKY_BODY_CONVERSION * Amount)
    }
  },

  'Spellshield': (s, Amount) => {
    const magicBoost = get(s, 'magicBoost')
    const magicDefense = get(s, 'magicDefense')
    add(s, 'protection', SPELLSHIELD_CONVERSION * (magicBoost + magicDefense) * Amount)
  },

  'Strong Tides': (s, Amount) => {
    const physicalBoost = get(s, 'physicalBoost')
    if (physicalBoost > 0) {
      add(s, 'waterBoost', physicalBoost * STRONG_TIDES_CONVERSION * Amount)
    }
  },

  'Swift Guard': (s, Amount) => {
    const dexterityBoost = get(s, 'dexterityBoost')
    if (dexterityBoost > 0) {
      add(s, 'physicalDefense', dexterityBoost * SWIFT_GUARD_CONVERSION * Amount)
    }
  },

  'True Balance': (s, Amount) => {
    const resultBoost = (get(s, 'hexBoost') + get(s, 'holyBoost')) * TRUE_BALANCE_STAT_MULT
    s['hexBoost'] = resultBoost
    s['holyBoost'] = resultBoost
  },

  'Brawny': (s, Amount) => {
    const convRate = Math.min(Amount * RAWNY_CONVERSION, RAWNY_MAX_CAP)
    let gained = 0

    for (const key of OFFENSIVE_BOOSTS) {
      if (key === 'physicalBoost') continue
      const val = get(s, key)
      if (val <= 0) continue

      const converted = val * convRate
      s[key] = val - converted
      gained += converted
    }
    add(s, 'physicalBoost', gained)
  },

  'Weight Distribution': (s, Amount) => {
    const total = get(s, 'dexterityBoost') + get(s, 'physicalBoost')
    const split = total * WEIGHT_DISTRIBUTION_SPLIT_RATIO
    const multiplier = 1 + WEIGHT_DISTRIBUTION_MULTIPLIER * Amount

    s['dexterityBoost'] = split * multiplier
    s['physicalBoost'] = split * multiplier
  }
};

const PERK_EXECUTION_ORDER: string[] = [
  'Roaring Heads',
  'Lucky',
  'Quick Witted',
  'Whirl Foot',
  'Carapace',
  'Extra Layers',
  'Frozen Heart',
  'Immovable',
  'Righted Wrongs',
  'Rocky Body',
  'Spellshield',
  'Strong Tides',
  'Swift Guard',
  'True Balance',
  'Brawny',
  'Weight Distribution'
];

function finalizeRounding(s: StatMap): StatMap {
  const result: StatMap = {}
  for (const [k, v] of Object.entries(s)) {
    const rv = PERCENT_STATS.has(k as any) ? r(v as number) : (v as number)
    if (rv !== 0) {
      result[k as StatKey] = rv
    }
  }
  return result
}

export function applyStatBoostPerks(
  stats: StatMap,
  perks: Record<string, number>
): StatMap {
  const s: StatMap = { ...stats }

  for (const perkName of PERK_EXECUTION_ORDER) {
    const perkAmount = perks[perkName] ?? 0
    
    if (perkAmount > 0) {
      const handler = PERK_REGISTRY[perkName]
      if (handler) {
        handler(s, perkAmount)
      }
    }
  }

  return finalizeRounding(s)
}