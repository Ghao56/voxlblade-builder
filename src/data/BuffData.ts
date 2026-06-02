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
  Bounce: {
    name: 'Bounce',
    color: '#38bdf8',
    description: 'Attacks bounce to nearby enemies.',
    effectPerTenthPotency: 0.1, 
    effectUnit: 'flat',
  },
  Regen: {
    name: 'Regen',
    color: '#4ade80',
    description: 'Regenerate health over time.',
    effectPerTenthPotency: 0.1,
    effectUnit: 'flat',
    statKey: 'healing',
  },
  Reinforce: {
    name: 'Reinforce',
    color: '#fbbf24',
    description: 'Gain increased defense.',
    effectPerTenthPotency: 10,
    effectUnit: '%',
    statKey: 'physicalDefense',
  },
  Tailwind: {
    name: 'Tailwind',
    color: '#a78bfa',
    description: 'Move and attack faster.',
    effectPerTenthPotency: 10,
    effectUnit: '%',
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

// Factory giờ trả về mảng để hỗ trợ perk có nhiều buff (như Blessing)
type PerkBuffFactory = (amount: number) => GrantedBuff[]

const PERK_BUFFS: Record<string, PerkBuffFactory> = {
  'Wrathful Crits': (amount) => [{
    buffName: 'Rage',
    potency: 0.1 * amount,
    duration: 5 + 2 * amount,
    condition: 'On critical hit',
    sourceName: 'Desert Champion',
    sourceType: 'armor',
  }],

  'Blessing': (amount) => {
    const condition = `${7.5 * amount}% chance on heal (no proc coeff)`
    return [
      { buffName: 'Bounce',    potency: 0.2, duration: 15, condition, sourceName: 'Blessing', sourceType: 'perk' },
      { buffName: 'Regen',     potency: 1.0, duration: 5,  condition, sourceName: 'Blessing', sourceType: 'perk' },
      { buffName: 'Reinforce', potency: 0.5, duration: 15, condition, sourceName: 'Blessing', sourceType: 'perk' },
      { buffName: 'Rage',      potency: 0.5, duration: 15, condition, sourceName: 'Blessing', sourceType: 'perk' },
      { buffName: 'Tailwind',  potency: 0.2, duration: 15, condition, sourceName: 'Blessing', sourceType: 'perk' },
    ]
  },
}

export function getPerkBuffs(
  perks: Record<string, number>
): GrantedBuff[] {
  const buffs: GrantedBuff[] = []

  for (const [perkName, amount] of Object.entries(perks)) {
    if (amount <= 0) continue
    const factory = PERK_BUFFS[perkName]
    if (!factory) continue
    buffs.push(...factory(amount))   // spread thay vì push single
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

interface BuffPotencyModifier {
  buffName: string
  potencyPerStack: number
  label: string
}

const BUFF_POTENCY_MODIFIERS: BuffPotencyModifier[] = [
  {
    buffName: 'Rage',
    potencyPerStack: 0.1,
    label: 'Gladiatorial Rage',
  },
]

export function applyBuffPerkModifiers(
  buffs: GrantedBuff[],
  perks: Record<string, number>
): GrantedBuff[] {
  if (buffs.length === 0) return buffs

  return buffs.map(buff => {
    let bonus = 0
    for (const mod of BUFF_POTENCY_MODIFIERS) {
      if (mod.buffName !== buff.buffName) continue
      const stacks = perks[mod.label] ?? 0
      if (stacks > 0) bonus += mod.potencyPerStack * stacks
    }
    if (bonus === 0) return buff
    return { ...buff, potency: Math.round((buff.potency + bonus) * 1000) / 1000 }
  })
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
    return { value: 0, unit: '%', label: '?' }
  }

  const value = Math.round(def.effectPerTenthPotency * potency * 10 * 100) / 100
  const sign = def.isDebuff ? '' : '+'
  const label =
    def.effectUnit === '%'
      ? `${sign}${value}% ${def.description.split(' ').slice(0, 3).join(' ')}…`
      : `${sign}${value} ${def.statKey ?? ''}`

  return { value, unit: def.effectUnit, label }
}