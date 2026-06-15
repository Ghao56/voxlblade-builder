export interface BuffDefinition {
  name: string
  color: string
  description: string
  dynamicDescription?: (perks: Record<string, number>) => string
  effectPerTenthPotency: number
  effectUnit: '%' | 'flat'
  statKey?: string
  isDebuff?: boolean
  isSelfDebuff?: boolean
  isNeutral?: boolean
}

function formatDamageTypes(types: string[]) {
  if (types.length === 1) return types[0]
  if (types.length === 2) return `${types[0]} and ${types[1]}`
  return `${types.slice(0, -1).join(', ')} and ${types.at(-1)}`
}

export interface GrantedBuff {
  buffName: string
  potency: number
  basePotency?: number
  bonusPotency?: number
  duration: number
  condition?: string
  sourceName: string
  sourceType: 'perk' | 'weaponArt'| 'rune'
  isSelfDebuff?: boolean
}


export const BUFF_DEFS: Record<string, BuffDefinition> = {
  //buffs
  Rage: {
    name: 'Rage',
    color: '#f70201',
    description: 'Deal x% more physical damage.',
    dynamicDescription: (perks) => {
      const damageTypes = ['physical']
      if ((perks['Oceans Rage'] ?? 0) > 0) damageTypes.push('water')
      if ((perks['Mage Rage'] ?? 0) > 0) damageTypes.push('magic')

      let desc = `Deal x% more ${formatDamageTypes(damageTypes)} damage.`
      const oceansRageStacks = perks['Oceans Rage'] ?? 0
      if (oceansRageStacks > 0) desc += ` Heal ${oceansRageStacks * 10}% more.`

      const mageRageStacks = perks['Mage Rage'] ?? 0
      if (mageRageStacks > 0) desc += ` Gain ${mageRageStacks * 10}% Rune CDR.`

      return desc
    },
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
  'Critical Boost': {
    name: 'Critical Boost',
    color: '#ede714',
    description: 'Next attack will crit.',
    effectPerTenthPotency: 0.1,
    effectUnit: 'flat',
  },
  Hexigen: {
    name: 'Hexigen',
    color: '#fc0279',
    description: 'Rage increases hex based on your rage boost.',
    effectPerTenthPotency: 0.1,
    effectUnit: 'flat',
  },
  Inspired: {
    name: 'Inspired',
    color: '#818cf8',
    description: 'Gain x% inspiration.',
    effectPerTenthPotency: 0.1,
    effectUnit: 'flat',
  },

  //Debuffs
  Slowness: {
    name: 'Slowness',
    color: '#7eb4ad',
    description: 'Move x% slower.',
    effectPerTenthPotency: 0.1,
    effectUnit: 'flat',
    isDebuff: true,
  },
  Despair: {
    name: 'Despair',
    color: '#54405d',
    description: 'Inflict despair.',
    effectPerTenthPotency: 0.1,
    effectUnit: 'flat',
    isDebuff: true,
  },
  Weakness: {
    name: 'Weakness',
    color: '#8b11e9',
    description: 'Reduce enemy damage output.',
    effectPerTenthPotency: 0.1,
    effectUnit: 'flat',
    isDebuff: true,
  },
  Bleed: {
    name: 'Bleed',
    color: '#ff0004',
    description: 'Enemy bleeds over time.',
    effectPerTenthPotency: 0.1,
    effectUnit: 'flat',
    isDebuff: true,
  },
  Burn: {
    name: 'Burn',
    color: '#fd5d00',
    description: 'Enemy burns over time.',
    effectPerTenthPotency: 0.1,
    effectUnit: 'flat',
    isDebuff: true,
  },
  Poison: {
    name: 'Poison',
    color: '#d900ff',
    description: 'Enemy is poisoned over time.',
    effectPerTenthPotency: 0.1,
    effectUnit: 'flat',
    isDebuff: true,
  },
  Frostbite: {
    name: 'Frostbite',
    color: '#54a4ec',
    description: 'Inflict frostbite on enemy.',
    effectPerTenthPotency: 0.1,
    effectUnit: 'flat',
    isDebuff: true,
  },
  Sticky: {
    name: 'Sticky',
    color: '#ff9349',
    description: 'Enemy is stuck.',
    effectPerTenthPotency: 0.1,
    effectUnit: 'flat',
    isDebuff: true,
  },
  Shatter: {
    name: 'Shatter',
    color: '#ff8183',
    description: 'Shatter enemy armor.',
    effectPerTenthPotency: 0.1,
    effectUnit: 'flat',
    isDebuff: true,
  },
  'Electrical Rend': {
    name: 'Electrical Rend',
    color: '#fff47a',
    description: 'Rend enemy with electricity.',
    effectPerTenthPotency: 0.1,
    effectUnit: 'flat',
    isDebuff: true,
  },
  Hypnotized: {
    name: 'Hypnotized',
    color: '#8b4aab',
    description: 'Hypnotize the enemy.',
    effectPerTenthPotency: 0.1,
    effectUnit: 'flat',
    isDebuff: true,
  },
  Taunt: {
    name: 'Taunt',
    color: '#e50604',
    description: 'Enemies with this debuff will only target whoever applied it.',
    effectPerTenthPotency: 0.1,
    effectUnit: 'flat',
    isDebuff: true,
  },

  //Neutral
  'Last Croak': {
    name: 'Last Croak',
    color: '#94ff88',
    description: 'Neutral status. Consume on RMB hit to trigger an explosion and gain Rage. Rage potency = 0.1 + 0.01 × Potency × PerkAmount.',
    effectPerTenthPotency: 0.1,
    effectUnit: 'flat',
    isNeutral: true,
  },
  'Tongue Shot': {
    name: 'Tongue Shot',
    color: '#39d9c4',
    description: 'Next finisher will shoot out a tongue that roots the nearest enemy.',
    effectPerTenthPotency: 0.1,
    effectUnit: 'flat',
    isNeutral: true,
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
  {
    buffName: 'Rage',
    potency: 0.2,
    duration: 10,
    sourceName: 'Toad Slam Rune',
    sourceType: 'rune',
  },
  {
    buffName: 'Bounce',
    potency: 0.3,
    duration: 10,
    sourceName: 'Bounce Rune',
    sourceType: 'rune',
  },
]

type PerkBuffFactory = (amount: number, allPerks: Record<string, number>) => GrantedBuff[]

const PERK_BUFFS: Record<string, PerkBuffFactory> = {

  'Bounce Momentum': (amount) => [
    {
      buffName: 'Tongue Shot',
      potency: 1.0,
      duration: 3 * amount,
      condition: 'On jump while Bounce is active',
      sourceName: 'Bounce Momentum',
      sourceType: 'perk',
    },
  ],

  'Toadzerker Spirit': () => {
    return [
      {
        buffName: 'Bounce',
        potency: 0.2,
        duration: 10,
        sourceName: 'Toadzerker',
        sourceType: 'perk',
      },
      {
        buffName: 'Rage',
        potency: 0.2,
        duration: 10,
        sourceName: 'Toadzerker',
        sourceType: 'perk',
      },
    ]
  },

  'Iron Bounce': (amount) => {
    const bounceDuration = 8 + 2 * amount
    return [
      {
        buffName: 'Bounce',
        potency: 0.1 * amount,
        duration: bounceDuration,
        condition: '10% chance on M1/M2',
        sourceName: 'Iron Bounce',
        sourceType: 'perk',
      },
      {
        buffName: 'Reinforce',
        potency: 0.25 * amount,
        duration: bounceDuration,
        condition: 'When gaining Bounce from any source (duration matches source)',
        sourceName: 'Iron Bounce',
        sourceType: 'perk',
      },
    ]
  },

  'Springblast': (amount) => [
      {
        buffName: 'Bounce',
        potency: 0.1 * amount,
        duration: 8 + 2 * amount,
        condition: '25% chance when blocking hits (?)',
        sourceName: 'Springblast',
        sourceType: 'perk',
      },
    ],

  'Spring Step': (amount) => [
    {
      buffName: 'Bounce',
      potency: 0.2 * amount,
      duration: 5 + 5 * amount,
      condition: 'On weapon art activation',
      sourceName: 'Spring Step',
      sourceType: 'perk',
    },
  ],

  'Spring Powered': (amount) => [
    {
      buffName: 'Bounce',
      potency: 0.1* amount,
      duration: 1 + 1 * amount,
      condition: 'On roll',
      sourceName: 'Spring Powered',
      sourceType: 'perk',
    },
  ],

  'Wrathful Crits': (amount) => [{ 
    buffName: 'Rage', potency: 0.1 * amount, duration: 5 + 2 * amount, condition: 'On critical hit', sourceName: 'Wrathful Crits', sourceType: 'perk' 
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
  'Cursed Experiment': (amount) => [
    { buffName: 'Rage',           potency: 0.3 + 0.1 * amount, duration: 5 + 2 * amount, condition: 'Rune used below 50% HP', sourceName: 'Cursed Experiment', sourceType: 'perk' },
    { buffName: 'Critical Boost', potency: 1.0,                 duration: 5 + 2 * amount, condition: 'Rune used below 50% HP', sourceName: 'Cursed Experiment', sourceType: 'perk' },
    { buffName: 'Hexigen',        potency: 1.0,                 duration: 7 + 2 * amount, condition: 'Rune used below 50% HP', sourceName: 'Cursed Experiment', sourceType: 'perk' },
    { buffName: 'Regen',          potency: 1.0,                 duration: 5 + 2 * amount, condition: 'Rune used below 50% HP', sourceName: 'Cursed Experiment', sourceType: 'perk' },
    { buffName: 'Slowness',       potency: 1.0,                 duration: 10,             condition: 'After buff expires',     sourceName: 'Cursed Experiment', sourceType: 'perk',
    isSelfDebuff: true },
  ],

  'Beastial Rage': (amount) => [{ 
    buffName: 'Rage', potency: 0.3 * amount, duration: 15, condition: 'On kill or Poisebreak', sourceName: 'Beastial Rage', sourceType: 'perk' 
  }],
  'Vassals Croak': (amount, allPerks) => {
    const swarm = allPerks['Swarm'] ?? 0
    const maxStacks = Math.floor(15 + swarm)
    const minRage = Math.round((0.1 + 0.01 * 1 * amount) * 1000) / 1000
    const maxRage = Math.round((0.1 + 0.01 * maxStacks * amount) * 1000) / 1000
    return [
      {
        buffName: 'Last Croak',
        potency: maxStacks,
        duration: 0,
        condition: `Per minion death · max ${maxStacks} stacks`,
        sourceName: 'Vassals Croak',
        sourceType: 'perk',
      },
      {
        buffName: 'Rage',
        potency: maxRage,
        duration: 10,
        condition: `On RMB consume · ${minRage}–${maxRage} potency (1–${maxStacks} stacks)`,
        sourceName: 'Vassals Croak',
        sourceType: 'perk',
      },
    ]
  },
  'Iron Slayer Spirit': (amount) => [
    {
      buffName: 'Weakness',
      potency: 0.2 * amount,
      duration: 10,
      condition: 'Enemies within range on roar',
      sourceName: 'Iron Slayer Spirit',
      sourceType: 'perk',
    },
  ],


}

export const WEAPON_ART_BUFF_MAP: Record<string, GrantedBuff[]> = {
  'Warrior Stomp': [
    { buffName: 'Rage', potency: 0.3, duration: 10, sourceName: 'Warrior Stomp', sourceType: 'weaponArt' },
    { buffName: 'Taunt', potency: 1.0, duration: 15, sourceName: 'Warrior Stomp', sourceType: 'weaponArt' },
  ],
  'Javelin': [
    { buffName: 'Slowness', potency: 0, duration: 6, sourceName: 'Javelin', sourceType: 'weaponArt' },
  ],
  'Cursed Ground': [
    { 
      buffName: 'Weakness', 
      potency: 1.0, 
      duration: 15, 
      condition: 'On cast (All nearby opponents)',
      sourceName: 'Cursed Ground', 
      sourceType: 'weaponArt' 
    },
    { 
      buffName: 'Bleed',
      potency: 0, 
      duration: 5, 
      condition: '50% chance from pool',
      sourceName: 'Cursed Ground', 
      sourceType: 'weaponArt' 
    },
    { 
      buffName: 'Burn', 
      potency: 0, 
      duration: 5, 
      condition: '50% chance from pool',
      sourceName: 'Cursed Ground', 
      sourceType: 'weaponArt' 
    },
    { 
      buffName: 'Poison', 
      potency: 0, 
      duration: 5, 
      condition: '50% chance from pool',
      sourceName: 'Cursed Ground', 
      sourceType: 'weaponArt' 
    },
    { 
      buffName: 'Shatter', 
      potency: 0.2, 
      duration: 5, 
      condition: '50% chance from pool',
      sourceName: 'Cursed Ground', 
      sourceType: 'weaponArt' 
    },
    { 
      buffName: 'Slowness', 
      potency: 0.2, 
      duration: 5, 
      condition: '50% chance from pool',
      sourceName: 'Cursed Ground', 
      sourceType: 'weaponArt' 
    },
    { 
      buffName: 'Weakness', 
      potency: 0.5, 
      duration: 5, 
      condition: '50% chance from pool',
      sourceName: 'Cursed Ground', 
      sourceType: 'weaponArt' 
    },
  ],
}

export function getWeaponArtBuffs(weaponArtName: string): GrantedBuff[] {
  return WEAPON_ART_BUFF_MAP[weaponArtName] ?? []
}

export const TRUE_BALANCE_DEBUFF_MAP: Record<string, {
  buffName: string
  getPotency: (perkAmount: number) => number
  getDuration: (perkAmount: number) => number
}> = {
  'Bleed':           { buffName: 'Regen',     getPotency: a => 0.1 * a,       getDuration: a => 1 + a },
  'Burn':            { buffName: 'Regen',     getPotency: a => 0.1 * a,       getDuration: a => 1 + a },
  'Poison':          { buffName: 'Regen',     getPotency: a => 0.1 * a,       getDuration: a => 1 + a },

  'Frostbite':       { buffName: 'Tailwind',  getPotency: a => 0.1 * a,       getDuration: a => 3 + a },
  'Slowness':        { buffName: 'Tailwind',  getPotency: a => 0.1 * a,       getDuration: a => 3 + a },
  'Sticky':          { buffName: 'Tailwind',  getPotency: a => 0.1 * a,       getDuration: a => 3 + a },

  'Shatter':         { buffName: 'Reinforce', getPotency: a => 0.1 + 0.1 * a, getDuration: a => 5 + a },
  'Electrical Rend': { buffName: 'Reinforce', getPotency: a => 0.1 + 0.1 * a, getDuration: a => 5 + a },
  'Hypnotized':      { buffName: 'Reinforce', getPotency: a => 0.1 + 0.1 * a, getDuration: a => 5 + a },

  'Weakness':        { buffName: 'Rage',      getPotency: a => 0.1 * a,       getDuration: a => 3 + a },

  'Despair':         { buffName: 'Inspired',  getPotency: a => 0.1 * a,       getDuration: a => 4 + a },
}

export function getTrueBalanceBuffs(
  perkAmount: number,
  activeDebuffs: GrantedBuff[]
): GrantedBuff[] {
  if (perkAmount <= 0 || activeDebuffs.length === 0) return []

  const eligibleDebuffs = activeDebuffs.filter(b => {
    const mapping = TRUE_BALANCE_DEBUFF_MAP[b.buffName]
    if (!mapping) return false
    if (b.isSelfDebuff) return b.buffName === 'Despair'

    const def = BUFF_DEFS[b.buffName]
    if (def?.isSelfDebuff) {
      return b.buffName === 'Despair'
    }
    return true
  })

  if (eligibleDebuffs.length === 0) return []

  const grouped = new Map<string, { sources: string[], maxPotency: number, maxDuration: number }>()

  for (const debuff of eligibleDebuffs) {
    const mapping = TRUE_BALANCE_DEBUFF_MAP[debuff.buffName]
    const targetBuffName = mapping.buffName

    const currentPotency = mapping.getPotency(perkAmount)
    const currentDuration = mapping.getDuration(perkAmount)

    const existing = grouped.get(targetBuffName) ?? { sources: [], maxPotency: 0, maxDuration: 0 }
    
    if (!existing.sources.includes(debuff.buffName)) {
      existing.sources.push(debuff.buffName)
    }
    
    existing.maxPotency = Math.max(existing.maxPotency, currentPotency)
    existing.maxDuration = Math.max(existing.maxDuration, currentDuration)

    grouped.set(targetBuffName, existing)
  }

  return [...grouped.entries()].map(([buffName, data]) => ({
    buffName,
    potency: Math.round(data.maxPotency * 1000) / 1000,
    duration: data.maxDuration,
    condition: `True Balance · on ${data.sources.join(' / ')}`,
    sourceName: 'True Balance',
    sourceType: 'perk' as const,
  }))
}

interface BuffPotencyModifier {
  buffName: string
  potencyPerStack: number
  label: string
  runeFilter?: string
  durationMultiplierPerStack?: number
  durationMultiplierFormula?: (stacks: number) => number
}

const BUFF_POTENCY_MODIFIERS: BuffPotencyModifier[] = [
  { buffName: 'Bounce', potencyPerStack: 0, label: 'Bounce Momentum', durationMultiplierFormula: stacks => 1.3 + 0.3 * stacks },

  { buffName: 'Rage', potencyPerStack: 0.1, label: 'Gladiatorial Rage' },
  { buffName: 'Rage', potencyPerStack: 0.1, label: 'Mage Rage' },
  { buffName: 'Rage', potencyPerStack: 0.1, label: 'Oceans Rage' },
  { buffName: 'Rage', potencyPerStack: 0.2, label: 'Slayer Rage', runeFilter: 'Rage Rune' },
  { buffName: 'Weakness', potencyPerStack: 0.1, label: 'Slayer Rage', runeFilter: 'Weakening Roar Rune' },
  { buffName: 'Rage', potencyPerStack: 0.2, label: 'Iron Slayer Spirit', durationMultiplierPerStack: 2 },
  { buffName: 'Rage', potencyPerStack: 0,   label: 'Fury', durationMultiplierPerStack: 1.5 },
]

const MODIFIERS_BY_BUFF = BUFF_POTENCY_MODIFIERS.reduce((acc, mod) => {
  (acc[mod.buffName] ??= []).push(mod)
  return acc
}, {} as Record<string, BuffPotencyModifier[]>)

const BUFFS_BY_ITEM_SOURCE = ITEM_BUFF_MAP.reduce((acc, buff) => {
  (acc[buff.sourceName] ??= []).push(buff)
  return acc
}, {} as Record<string, GrantedBuff[]>)


export function applyBuffPerkModifiers(
  buffs: GrantedBuff[],
  perks: Record<string, number>,
  activeRune?: string
): GrantedBuff[] {
  if (buffs.length === 0) return buffs
  return buffs.map(buff => {
    const modifiers = MODIFIERS_BY_BUFF[buff.buffName]
    if (!modifiers) return buff

    let bonus = 0
    let durationMult = 1
    for (const mod of modifiers) {
      if (mod.runeFilter && mod.runeFilter !== buff.sourceName) continue
      const stacks = perks[mod.label] ?? 0
      if (stacks <= 0) continue
      bonus += mod.potencyPerStack * stacks
      if (mod.durationMultiplierFormula) {
        durationMult *= mod.durationMultiplierFormula(stacks)
      } else if (mod.durationMultiplierPerStack) {
        durationMult *= 1 + (mod.durationMultiplierPerStack - 1) * stacks
      }
    }
    if (bonus === 0 && durationMult === 1) return buff
    return {
      ...buff,
      duration: Math.round(buff.duration * durationMult),
      potency: Math.round((buff.potency + bonus) * 1000) / 1000,
      basePotency: buff.potency,
      bonusPotency: bonus > 0 ? Math.round(bonus * 1000) / 1000 : undefined,
    }
  })
}

export function getBuffDescription(
  buffName: string,
  perks: Record<string, number>
): string {
  const buff = BUFF_DEFS[buffName]
  if (!buff) return ''

  return buff.dynamicDescription
    ? buff.dynamicDescription(perks)
    : buff.description
}

export function getPerkBuffs(perks: Record<string, number>): GrantedBuff[] {
  const buffs: GrantedBuff[] = []

  for (const [perkName, amount] of Object.entries(perks)) {
    if (amount <= 0) continue
    const factory = PERK_BUFFS[perkName]
    if (!factory) continue
    for (const b of factory(amount, perks)) {
      buffs.push({ ...b, duration: Math.round(b.duration * 100) / 100 })
    }
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
  const buffs: GrantedBuff[] = []
  
  const slots = [
    build.rune, build.ring, build.infusionRing,
    build.helmet, build.chestplate, build.leggings,
    build.weaponBlade, build.weaponHandle, build.monkGlove
  ]

  for (const itemName of slots) {
    if (itemName && BUFFS_BY_ITEM_SOURCE[itemName]) {
      buffs.push(...BUFFS_BY_ITEM_SOURCE[itemName])
    }
  }

  return buffs
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

  const value = Math.round(def.effectPerTenthPotency * potency * 10 * 1000) / 1000
  const sign = def.isDebuff ? '' : '+'
  const label =
    def.effectUnit === '%'
      ? `${sign}${value}% ${def.description.split(' ').slice(0, 3).join(' ')}…`
      : `${sign}${value} ${def.statKey ?? ''}`

  return { value, unit: def.effectUnit, label }
}