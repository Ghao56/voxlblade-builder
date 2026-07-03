import { type StatMap, type StatKey, PERCENT_STATS } from '../lib/types'

const WEIGHT_DISTRIBUTION_SPLIT_RATIO = 0.5
const WEIGHT_DISTRIBUTION_MULTIPLIER = 0.1

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
    sub(s, 'warding', 50 * Amount)
  },

  'Lucky': (s, Amount) => {
    sub(s, 'warding', 25 * Amount)
    sub(s, 'protection', 6 * Amount)
    sub(s, 'tenacity', 0.1 * Amount)
  },

  'Quick Witted': (s, Amount) => {
    const speed = get(s, 'speedBoost')
    if (speed > 0) {
      add(s, 'dexterityBoost', speed * Amount * 0.25)
    }
  },

  'Whirl Foot': (s, Amount) => {
    const airBoost = get(s, 'airBoost')
    if (airBoost > 0) {
      add(s, 'speedBoost', 0.05 * airBoost * Amount)
    }
  },

  'Carapace': (s, Amount) => {
    const earth = get(s, 'earthBoost')
    if (earth > 0) {
      add(s, 'protection', 0.075 * earth * Amount)
    }
  },

  'Extra Layers': (s, Amount) => {
    const multiplier = 1 + 0.2 * Amount
    s['protection'] = get(s, 'protection') * multiplier
    s['warding'] = get(s, 'warding') * multiplier
  },

  'Frozen Heart': (s, Amount) => {
    const cold = get(s, 'coldResistance')
    if (cold > 0) {
      const bonus = ((1 / 45) + (1 / 45) * Amount) * cold
      add(s, 'warding', bonus)
      add(s, 'physicalDefense', bonus)
      add(s, 'magicDefense', bonus)
    }
  },

  'Immovable': (s, Amount) => {
    const tenacity = get(s, 'tenacity')
    if (tenacity > 0) {
      add(s, 'physicalDefense', 30 * tenacity * Amount)
    }
  },

  'Righted Wrongs': (s, Amount) => {
    const d = negSum(s, ELEMENTAL_DEFENSES) + negMagnitude(get(s, 'warding'))
    const t = negMagnitude(get(s, 'tenacity'))
    const o = negSum(s, OTHER_OFFENSIVE_STATS) + negMagnitude(get(s, 'physicalDefense')) + negMagnitude(get(s, 'magicDefense'))

    const dexterityGained = Amount * (2 / 21) * (d + t * 0.4 + o * 2)
    add(s, 'dexterityBoost', dexterityGained)

    const speedGained = dexterityGained * 0.1
    add(s, 'speedBoost', speedGained)
  },

  'Rocky Body': (s, Amount) => {
    const earth = get(s, 'earthBoost')
    if (earth > 0) {
      add(s, 'physicalDefense', earth * 0.5 * Amount)
    }
  },

  'Spellshield': (s, Amount) => {
    const magicBoost = get(s, 'magicBoost')
    const magicDefense = get(s, 'magicDefense')
    add(s, 'protection', 0.15 * (magicBoost + magicDefense) * Amount)
  },

  'Strong Tides': (s, Amount) => {
    const physicalBoost = get(s, 'physicalBoost')
    if (physicalBoost > 0) {
      add(s, 'waterBoost', physicalBoost * 0.1 * Amount)
    }
  },

  'Swift Guard': (s, Amount) => {
    const dexterityBoost = get(s, 'dexterityBoost')
    if (dexterityBoost > 0) {
      add(s, 'physicalDefense', dexterityBoost * 0.1 * Amount)
    }
  },

  'True Balance': (s, Amount) => {
    const resultBoost = (get(s, 'hexBoost') + get(s, 'holyBoost')) * 0.75
    s['hexBoost'] = resultBoost
    s['holyBoost'] = resultBoost
  },

  'Brawny': (s, Amount) => {
    const convRate = Math.min(Amount * 0.20, 1.0)
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