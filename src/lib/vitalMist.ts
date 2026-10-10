// Vital Mist charge is a manual build control (the Potency slider); everything
// derives from it directly. Conversion eligibility uses the single source of
// truth — VITAL_MIST_CONVERTIBLE_TAGS — instead of a second hand-maintained list.
const VITAL_MIST_CONSUMPTION_BASE_PER_TICK = 2
const VITAL_MIST_CONSUMPTION_PER_POTENCY = 0.5
const VITAL_MIST_CONSUMPTION_THRESHOLD = 50
const VITAL_MIST_TAILWIND_POTENCY_BASE = 0.1
const VITAL_MIST_TAILWIND_POTENCY_PER_AMOUNT = 0.1
export const VITAL_MIST_TAILWIND_DURATION = 4
const VITAL_MIST_MAX_POTENCY_BASE = 50
const VITAL_MIST_MAX_POTENCY_PER_AMOUNT = 50

const VITAL_MIST_CONVERTIBLE_TAGS = new Set([
  'Lifesteal',
  'Blood Thirsty',
  'Beastial Rage',
  'Curse Rip',
  'Dark Harvest',
  'Life Drinker',
  'Ichor Spark',
  'Venom Eater',
  'Vampire',
  'Snarled',
  'Honey Gather',
  'Woof Spirit',
])

export function vitalMistMaxPotency(perkAmount: number): number {
  return VITAL_MIST_MAX_POTENCY_BASE + VITAL_MIST_MAX_POTENCY_PER_AMOUNT * Math.max(0, perkAmount)
}

export function vitalMistConsumption(perkAmount: number, potency: number, blocking: boolean): number {
  let consumption = VITAL_MIST_CONSUMPTION_BASE_PER_TICK + VITAL_MIST_CONSUMPTION_PER_POTENCY * Math.max(0, perkAmount)
  if (potency > VITAL_MIST_CONSUMPTION_THRESHOLD) consumption *= 2
  if (blocking) consumption *= 2
  return consumption
}

export function vitalMistHealPerTick(consumed: number): number {
  return consumed / 5
}

export function vitalMistTailwindPotency(perkAmount: number): number {
  return VITAL_MIST_TAILWIND_POTENCY_BASE + VITAL_MIST_TAILWIND_POTENCY_PER_AMOUNT * Math.max(0, perkAmount)
}

export function isVitalMistConvertibleTag(tag: string | undefined): boolean {
  if (!tag) return false
  return VITAL_MIST_CONVERTIBLE_TAGS.has(tag)
}