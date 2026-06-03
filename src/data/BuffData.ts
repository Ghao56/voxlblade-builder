export interface BuffDefinition {
  name: string
  color: string
  description: string
  effectPerTenthPotency: number
  effectUnit: '%' | 'flat'
  statKey?: string
  isDebuff?: boolean
}
function formatDamageTypes(types: string[]) {
  if (types.length === 1)
    return types[0]

  if (types.length === 2)
    return `${types[0]} and ${types[1]}`

  return `${types.slice(0,-1).join(', ')} and ${types.at(-1)}`
}
// Cập nhật thêm thuộc tính vào Interface để lưu vết chỉ số gốc
export interface GrantedBuff {
  buffName: string
  potency: number
  basePotency?: number;    // <-- Thêm dòng này để lưu chỉ số gốc
  bonusPotency?: number;   // <-- Thêm dòng này để lưu chỉ số được cộng thêm
  duration: number
  condition?: string
  sourceName: string
  sourceType: 'rune' | 'ring' | 'armor' | 'weapon' | 'perk' | 'guild'
}

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
    
    const finalPotency = Math.round((buff.potency + bonus) * 1000) / 1000
    return { 
      ...buff, 
      potency: finalPotency,
      basePotency: buff.potency,
      bonusPotency: Math.round(bonus * 1000) / 1000
    }
  })
}

export function getBuffDescription(
  buffName: string,
  perks: Record<string, number>
): string {
  const buff = BUFF_DEFS[buffName]
  if (!buff) return ''

  if (buffName !== 'Rage')
    return buff.description

  const damageTypes = ['physical']
  
  if ((perks['Oceans Rage'] ?? 0) > 0)
    damageTypes.push('water')

  if ((perks['Mage Rage'] ?? 0) > 0)
    damageTypes.push('magic')

  let desc = `Deal x% more ${formatDamageTypes(damageTypes)} damage.`
  
  const oceansRageStacks = perks['Oceans Rage'] ?? 0
  if (oceansRageStacks > 0)
    desc += ` Heal ${oceansRageStacks * 10}% more.`

  const mageRageStacks = perks['Mage Rage'] ?? 0
  if (mageRageStacks > 0)
    desc += ` Gain ${mageRageStacks * 10}% Rune CDR.`

  return desc
}

export const BUFF_DEFS: Record<string, BuffDefinition> = {
  Rage: {
    name: 'Rage',
    color: '#f70201',
    description: 'Deal x% more physical damage.',
    effectPerTenthPotency: 0.1,
    effectUnit: 'flat',
    statKey: 'physicalBoost',
  },
  Bounce: {
    name: 'Bounce',
    color: '#f438d7',
    description: "Jump x% higher.",
    effectPerTenthPotency: 0.1, 
    effectUnit: 'flat',
  },
  Regen: {
    name: 'Regen',
    color: '#18ff0d',
    description: 'Regenerate health over time.',
    effectPerTenthPotency: 0.1,
    effectUnit: 'flat',
    statKey: 'healing',
  },
  Reinforce: {
    name: 'Reinforce',
    color: '#fbed0a',
    description: 'Take x% less damage.',
    effectPerTenthPotency: 0.1,
    effectUnit: 'flat',
    statKey: 'physicalDefense',
  },
  Tailwind: {
    name: 'Tailwind',
    color: '#ffffff',
    description: 'Move x% faster.',
    effectPerTenthPotency: 0.1,
    effectUnit: 'flat',
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

type PerkBuffFactory = (amount: number) => GrantedBuff[]

const PERK_BUFFS: Record<string, PerkBuffFactory> = {
  'Wrathful Crits': (amount) => [{ buffName: 'Rage', potency: 0.1 * amount, duration: 5 + 2 * amount, condition: 'On critical hit', sourceName: 'Wrathful Crits', sourceType: 'perk',
  }],

  'Blessing': (amount) => {
    const condition = `${7.5 * amount}% chance on heal`
    return [
      { buffName: 'Bounce',    potency: 0.2, duration: 15, condition, sourceName: 'Blessing', sourceType: 'perk' },
      { buffName: 'Regen',     potency: 1.0, duration: 5,  condition, sourceName: 'Blessing', sourceType: 'perk' },
      { buffName: 'Reinforce', potency: 0.5, duration: 15, condition, sourceName: 'Blessing', sourceType: 'perk' },
      { buffName: 'Rage',      potency: 0.5, duration: 15, condition, sourceName: 'Blessing', sourceType: 'perk' },
      { buffName: 'Tailwind',  potency: 0.2, duration: 15, condition, sourceName: 'Blessing', sourceType: 'perk' },
    ]
  },

  'Beastial Rage': (amount) => [{ buffName: 'Rage', potency: 0.3 * amount, duration: 15, condition: 'On kill or Poisebreak', sourceName: 'Beastial Rage', sourceType: 'perk' }],
}

export function getPerkBuffs(
  perks: Record<string, number>
): GrantedBuff[] {
  const buffs: GrantedBuff[] = []

  for (const [perkName, amount] of Object.entries(perks)) {
    if (amount <= 0) continue
    const factory = PERK_BUFFS[perkName]
    if (!factory) continue
    buffs.push(...factory(amount))
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
  { buffName: 'Rage', potencyPerStack: 0.1, label: 'Gladiatorial Rage' },
  { buffName: 'Rage', potencyPerStack: 0.1, label: 'Mage Rage' },
  { buffName: 'Rage', potencyPerStack: 0.1, label: 'Oceans Rage' },
]


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