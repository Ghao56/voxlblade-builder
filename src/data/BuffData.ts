export interface BuffDefinition {
  name: string
  color: string
  description: string
  effectPerTenthPotency: number
  effectUnit: '%' | 'flat'
  statKey?: string
  isDebuff?: boolean
}

export interface GrantedBuff {
  buffName: string
  potency: number
  duration: number
  condition?: string
  sourceName: string
  sourceType: 'rune' | 'ring' | 'armor' | 'weapon' | 'perk' | 'guild'
}

export const BUFF_DEFS: Record<string, BuffDefinition> = {
  Rage: {
    name: 'Rage',
    color: '#fb923c',
    description: 'Deal more physical damage.',
    effectPerTenthPotency: 10,
    effectUnit: '%',
    statKey: 'physicalBoost',
  },
}

export const ITEM_BUFF_MAP: GrantedBuff[] = [
  {
    buffName: 'Rage',
    potency: 0.3,
    duration: 10,
    sourceName: 'Rage Rune',
    sourceType: 'rune',
  },
]

type PerkBuffFactory = (amount: number) => GrantedBuff

const PERK_BUFFS: Record<string, PerkBuffFactory> = {
  'Wrathful Crits': (amount) => ({
    buffName: 'Rage',
    potency: 0.1 * amount,
    duration: 5 + 2 * amount,
    condition: 'On critical hit',
    sourceName: 'Desert Champion',
    sourceType: 'armor',
  }),
}

export function getPerkBuffs(
  perks: Record<string, number>
): GrantedBuff[] {
  const buffs: GrantedBuff[] = []

  for (const [perkName, amount] of Object.entries(perks)) {
    if (amount <= 0) continue

    const factory = PERK_BUFFS[perkName]
    if (!factory) continue

    buffs.push(factory(amount))
  }

  return buffs
}

export function getActiveBuildBuffs(build: {
  rune: string
  ring: string
  infusionRing: string
  helmet: string
  chestplate: string
  leggings: string
  weaponBlade: string
  weaponHandle: string
  monkGlove: string
}): GrantedBuff[] {
  const equippedItems = new Set(
    [
      build.rune,
      build.ring,
      build.infusionRing,
      build.helmet,
      build.chestplate,
      build.leggings,
      build.weaponBlade,
      build.weaponHandle,
      build.monkGlove,
    ].filter(Boolean)
  )

  return ITEM_BUFF_MAP.filter((buff) =>
    equippedItems.has(buff.sourceName)
  )
}

export function calcBuffEffect(
  buffName: string,
  potency: number
): {
  value: number
  unit: '%' | 'flat'
  label: string
} {
  const def = BUFF_DEFS[buffName]

  if (!def) {
    return {
      value: 0,
      unit: '%',
      label: '?',
    }
  }

  const value = Math.round(def.effectPerTenthPotency * potency * 10 * 100) / 100

  const sign = def.isDebuff ? '' : '+'

  const label =
    def.effectUnit === '%'
      ? `${sign}${value}% ${def.description.split(' ').slice(0, 3).join(' ')}…`
      : `${sign}${value} ${def.statKey ?? ''}`

  return {
    value,
    unit: def.effectUnit,
    label,
  }
}