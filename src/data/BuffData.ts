import { roundMultiplier } from '../lib/utils'
import { BASTION_BLESS_MULT } from '../lib/constants'
import {
  BUFF_EFFECT_PER_TENTH, WHIRLWIND_EFFECT_PER_TENTH, GLYPH_CONDUIT_EFFECT_PER_TENTH,
  DESPAIR_EFFECT_PER_TENTH, LUMINESCENT_PCT_PER_POTENCY,
  RAGE_RUNE_BUFF_POTENCY, RAGE_RUNE_BUFF_DURATION, TOAD_SLAM_RAGE_POTENCY, TOAD_SLAM_RAGE_DURATION,
  BOUNCE_RUNE_POTENCY, BOUNCE_RUNE_DURATION, BEENADE_RUNE_POTENCY,
  ANCIENT_CLERIC_SHIELD_POTENCY, ANCIENT_CLERIC_SHIELD_DURATION,
  BOOSTSHROOM_POISON_DURATION, SPORELING_POISON_DURATION,
  THUNDEROUS_CLOAK_POTENCY, THUNDEROUS_CLOAK_DURATION,
  WINTER_WOOF_SHATTER_POTENCY, WINTER_WOOF_SHATTER_DURATION,
  GLACIAL_SNAPPER_SLOWNESS_POTENCY, GLACIAL_SNAPPER_SLOWNESS_DURATION,
  GLACIAL_SNAPPER_BLEED_DURATION, CACITROPS_BLEED_DURATION,
  BRAINBLAST_BURN_DURATION, BRAINBLAST_STICKY_POTENCY, BRAINBLAST_STICKY_DURATION,
  HEX_WEB_STICKY_POTENCY, HEX_WEB_STICKY_DURATION,
  BASIC_DEBUFF_POTENCY, BASIC_DEBUFF_DURATION, BASIC_SHATTER_POTENCY,
  BASIC_SLOWNESS_POTENCY, BASIC_WEAKNESS_POTENCY,
  WARRIOR_STOMP_RAGE_POTENCY, WARRIOR_STOMP_RAGE_DURATION,
  WARRIOR_STOMP_TAUNT_POTENCY, WARRIOR_STOMP_TAUNT_DURATION,
  JAVELIN_SLOWNESS_DURATION, LIGHTNING_CLOAK_DURATION_WA,
  CURSED_GROUND_WEAKNESS_POTENCY, CURSED_GROUND_WEAKNESS_DURATION,
  TRUE_BALANCE_POTENCY_COEFF, TRUE_BALANCE_REGEN_DURATION_BASE,
  TRUE_BALANCE_TAILWIND_DURATION_BASE, TRUE_BALANCE_REINFORCE_POTENCY_BASE,
  TRUE_BALANCE_RAGE_DURATION_BASE, TRUE_BALANCE_INSPIRED_DURATION_BASE,
  PERFECTION_POTENCY_PER_AMOUNT,
  BOUNCE_MOMENTUM_BUFF_POTENCY, BOUNCE_MOMENTUM_DURATION_PER_AMOUNT,
  TOADZERKER_BUFF_POTENCY, TOADZERKER_BUFF_DURATION,
  IRON_BOUNCE_DURATION_BASE, IRON_BOUNCE_DURATION_PER_AMOUNT,
  SPRINGBLAST_BUFF_POTENCY_PER_AMOUNT, SPRINGBLAST_BUFF_DURATION_BASE, SPRINGBLAST_BUFF_DURATION_PER_AMOUNT,
  WRATHFUL_CRITS_POTENCY_PER_AMOUNT, WRATHFUL_CRITS_DURATION_BASE, WRATHFUL_CRITS_DURATION_PER_AMOUNT,
  BLOOD_LUST_POTENCY_PER_AMOUNT, BLOOD_LUST_DURATION_PER_AMOUNT,
  LUMINESCENT_BUFF_POTENCY_PER_AMOUNT, LUMINESCENT_BUFF_DURATION,
  BEASTIAL_RAGE_POTENCY_PER_AMOUNT, BEASTIAL_RAGE_DURATION,
  VASSALS_CROAK_MAX_SUMMONS_BASE, VASSALS_CROAK_RAGE_DURATION,
  IRON_SLAYER_POTENCY_PER_AMOUNT, IRON_SLAYER_DURATION,
  BASTION_REGEN_POTENCY, BASTION_REINFORCE_POTENCY, BASTION_RATE_PER_AMOUNT, BASTION_BUFF_DURATION,
  AIR_PRESSURE_BUFF_POTENCY_PER_AMOUNT, AIR_PRESSURE_BUFF_DURATION,
  APOLLO_TAUNT_POTENCY, APOLLO_TAUNT_DURATION,
  VALOR_TAUNT_POTENCY, VALOR_TAUNT_DURATION,
  CHANNELED_REINFORCE_POTENCY, CHANNELED_REINFORCE_DURATION,
  GLADIATORIAL_RAGE_POTENCY, GLADIATORIAL_RAGE_DURATION,
  GLYPH_CONDUIT_POTENCY_PER_AMOUNT, GLYPH_CONDUIT_DURATION_MULT,
  ROARING_WEAKNESS_POTENCY, ROARING_SHATTER_POTENCY, ROARING_ANTI_HEAL_POTENCY, ROARING_DEBUFF_DURATION,
  STORM_REND_POTENCY_PER_AMOUNT, STORM_REND_DURATION,
  EROSION_POTENCY_BASE, EROSION_POTENCY_PER_AMOUNT, EROSION_DURATION,
  QUICKDRAW_POTENCY_PER_AMOUNT, QUICKDRAW_DURATION,
  TAILWIND_BUFF_POTENCY, TAILWIND_BUFF_DURATION,
  TOXIN_TRANSFER_DURATION_EXTRA,
  GROUNDED_DESPAIR_POTENCY_PER_AMOUNT, GROUNDED_DESPAIR_DURATION_PER_AMOUNT,
  BOUNCE_DURATION_BASE, BOUNCE_DURATION_PER_STACK,
  MOD_GLADIATORIAL_POTENCY, MOD_MAGE_RAGE_POTENCY, MOD_OCEANS_RAGE_POTENCY,
  MOD_SLAYER_RAGE_POTENCY, MOD_SLAYER_WEAKNESS_POTENCY,
  MOD_IRON_SLAYER_POTENCY, MOD_IRON_SLAYER_DURATION,
  MOD_FURY_DURATION, MOD_TAILWIND_POTENCY, MOD_WIND_WALKER_DURATION_DIVISOR, MOD_SLOW_LEAK_DURATION,
  ENDLESS_DESPAIR_POTENCY_PER_STACK, ENDLESS_DESPAIR_FLAT_BONUS,
  ENDLESS_DESPAIR_DURATION_PER_STACK, STORED_CORRUPTION_DURATION_PER_STACK,
} from '../lib/constants/buffs'

export interface BuffDefinition {
  name: string
  color: string
  description: string
  dynamicDescription?: (perks: Record<string, number>, potency: number) => string 
  effectPerTenthPotency: number
  effectUnit: '%' | 'flat'
  statKey?: string
  isDebuff?: boolean
  isSelfDebuff?: boolean
  isNeutral?: boolean
  potencyCapped?: boolean
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
  sourceType: 'perk' | 'weaponArt' | 'rune' | 'cantrip' | 'race'
  isSelfDebuff?: boolean
  burnMode?: 'dot' | 'singed'
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
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    statKey: 'physicalBoost',
  },
  Bounce: {
    name: 'Bounce',
    color: '#f438d7',
    description: "Jump x% higher.",
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH, 
    effectUnit: 'flat',
  },
  Regen: {
    name: 'Regen',
    color: '#18ff0d',
    description: 'Regenerate health over time.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    statKey: 'healing',
  },
  Reinforce: {
    name: 'Reinforce',
    color: '#fbed0a',
    description: 'Take x% less damage.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    statKey: 'physicalDefense',
  },
  Tailwind: {
    name: 'Tailwind',
    color: '#ffffff',
    description: 'Move x% faster.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
  },
  Whirlwind: {
    name: 'Whirlwind',
    color: '#a5f3fc',
    description: 'Move and jump x% faster/higher.',
    effectPerTenthPotency: WHIRLWIND_EFFECT_PER_TENTH,
    effectUnit: 'flat',
  },
  'Critical Boost': {
    name: 'Critical Boost',
    color: '#ede714',
    description: 'Next attack will crit.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
  },
  Hexigen: {
    name: 'Hexigen',
    color: '#fc0279',
    description: 'Rage increases hex based on your rage boost.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
  },
  Inspired: {
    name: 'Inspired',
    color: '#818cf8',
    description: 'Gain x% inspiration.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
  },
  'Perfection': {
    name: 'Perfection',
    color: '#e5e7eb',
    description: '+2% damage · +1% crit chance & crit damage · +3% speed per potency. Indefinite — lose perkAmount potency on unblocked hit.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    potencyCapped: true,
  },
  'Air Pressure': {
    name: 'Air Pressure',
    color: '#AAFFDB',
    description: 'Take x% less damage and upon using a rune release an air burst.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    statKey: 'airDefense',
    potencyCapped: true,
  },
  'Magic Reinforce': {
    name: 'Magic Reinforce',
    color: '#1cf8ff',
    description: 'Take x% less damage and gain y flat reduction to magic damage.',
    dynamicDescription: (perks, potency) => {
      const x = +(potency * 50).toFixed(4)
      const y = +(potency * 3).toFixed(4)
      return `Take ${x}% less damage and gain ${y} flat reduction to magic damage.`
    },
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
  },
  Luminescent: {
    name: 'Luminescent',
    color: '#fde047',
    description: "Deal x% of your damage as bonus holy damage that counts as the applier's damage.",
    dynamicDescription: (_perks, potency) => {
      const pct = +(potency * 50).toFixed(4)
      return `Deal ${pct}% of your damage as bonus holy damage that counts as the applier's damage.`
    },
    effectPerTenthPotency: LUMINESCENT_PCT_PER_POTENCY,
    effectUnit: '%',
  },
  'Draconic Infusion': {
    name: 'Draconic Infusion',
    color: '#ff6336',
    description: 'All attacks gain draconic damage type. Does not apply to attacks without proc coefficient.',
    dynamicDescription: (_perks, potency) => {
      const bonus = +potency.toFixed(4)
      return `All attacks gain +${bonus} draconic damage type. Lasts 20s. Does not apply without proc coefficient.`
    },
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
  },
  'Lightning Cloak': {
    name: 'Lightning Cloak',
    color: '#AAFFDB',
    description: 'Gain 20% movement speed. Attacks trigger chain lightning dealing 1/3 of hit damage as Air+Magic to up to 4 additional targets.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
  },
  'Bloodlust': {
    name: 'Bloodlust',
    color: '#ff0044',
    description: 'Gain x% attack speed gain more upon hitting an opponent.',
    dynamicDescription: (_perks, potency) => {
      const pct = +(potency * 20).toFixed(4)
      return `Gain ${pct}% attack speed gain more upon hitting an opponent.`
    },
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    potencyCapped: true,
  },
  'Glyph Conduit': {
    name: 'Glyph Conduit',
    color: '#17b3fe',
    description: 'Deal x% more magic damage.',
    dynamicDescription: (_perks, potency) => {
      const pct = +(potency * 200).toFixed(4)
      return `Deal ${pct}% more magic damage.`
    },
    effectPerTenthPotency: GLYPH_CONDUIT_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    statKey: 'magicBoost',
  },

  //Debuffs
  Slowness: {
    name: 'Slowness',
    color: '#7eb4ad',
    description: 'Move x% slower.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    isDebuff: true,
  },
  Despair: {
    name: 'Despair',
    color: '#54425d',
    description: 'Deal x% more damage.',
    effectPerTenthPotency: DESPAIR_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    isDebuff: true,
  },
  Weakness: {
    name: 'Weakness',
    color: '#8b11e9',
    description: 'Deal x% less damage.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    isDebuff: true,
  },
  Bleed: {
    name: 'Bleed',
    color: '#ff0004',
    description: 'bleeds over time.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    isDebuff: true,
  },
  Burn: {
    name: 'Burn',
    color: '#fd5d00',
    description: 'burns over time.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    isDebuff: true,
  },
  Singed: {
    name: 'Singed',
    color: '#fd5d00',
    description: 'Counts as Burn for all related effects. Bursts Fire damage on application instead of over time.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    isDebuff: true,
  },
  Poison: {
    name: 'Poison',
    color: '#d900ff',
    description: 'poisons over time.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    isDebuff: true,
  },
  Frostbite: {
    name: 'Frostbite',
    color: '#59aff9',
    description: 'Take 10% more Water and Air damage.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    isDebuff: true,
  },
  Sticky: {
    name: 'Sticky',
    color: '#ff9349',
    description: 'Move x% slower and take 20% more magic damage.',
    dynamicDescription: (perks, potency) => {
      const slowPct = Math.round(potency * 10000) / 100
      const hasMelting = (perks['Melting Slime'] ?? 0) > 0
      if (hasMelting) {
        return `Move ${slowPct}% slower, deals fire and poise damage and take 20% more magic, fire and earth damage.`
      }
      return `Move ${slowPct}% slower and take 20% more magic damage.`
    },
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    isDebuff: true,
  },
  'Sticky (Melting Slime)': {
    name: 'Sticky (Melting Slime)',
    color: '#ff9349',
    description: 'Move x% slower and take 20% more magic, fire and earth damage.',
    dynamicDescription: (_perks, potency) => {
      const slowPct = Math.round(potency * 10000) / 100
      return `Move ${slowPct}% slower and take 20% more magic, fire and earth damage.`
    },
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    isDebuff: true,
  },
  'Sticky (Sickness)': {
    name: 'Sticky (Sickness)',
    color: '#4ade80',
    description: 'Move x% slower and take 20% more hex, magic and earth damage.',
    dynamicDescription: (_perks, potency) => {
      const slowPct = Math.round(potency * 10000) / 100
      return `Move ${slowPct}% slower and take 20% more hex, magic and earth damage.`
    },
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    isDebuff: true,
  },
  'Sticky (Hex Web)': {
    name: 'Sticky (Hex Web)',
    color: '#a855f7',
    description: 'Move x% slower and take 20% more hex and magic damage.',
    dynamicDescription: (_perks, potency) => {
      const slowPct = Math.round(potency * 10000) / 100
      return `Move ${slowPct}% slower and take 20% more hex and magic damage.`
    },
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    isDebuff: true,
  },
  Shatter: {
    name: 'Shatter',
    color: '#ff8183',
    description: 'Lose x Armor.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    isDebuff: true,
  },
  'Electrical Rend': {
    name: 'Electrical Rend',
    color: '#fff27a',
    description: 'Rend enemy with electricity.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    isDebuff: true,
  },
  Hypnotized: {
    name: 'Hypnotized',
    color: '#8b4aab',
    description: 'Hypnotize the enemy.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    isDebuff: true,
  },
  Taunt: {
    name: 'Taunt',
    color: '#e50604',
    description: 'Enemies with this debuff will only target whoever applied it.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    isDebuff: true,
  },
  'Anti Heal': {
    name: 'Anti Heal',
    color: '#34ff00',
    description: 'Reduce healing by x%.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    isDebuff: true,
  },
  Wound: {
    name: 'Wound',
    color: '#911213',
    description: 'Grant bleed x seconds of stun and adds x% true damage to bleed.',
    dynamicDescription: (_perks, potency) => {
      const trueDmgPct = Math.round(potency * 10000) / 100
      const stunSec = Math.round(potency * 50) / 100
      return `Bleed deals ${trueDmgPct}% additional true damage and stuns for ${stunSec}s.`
    },
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    isDebuff: true,
  },

  'Minion Absorbed': {
    name: 'Minion Absorbed',
    color: '#ff004b',
    description: 'Deal x% more damage.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
  },

  //Neutral
  'Last Croak': {
    name: 'Last Croak',
    color: '#94ff88',
    description: 'Neutral status. Consume on RMB hit to trigger an explosion and gain Rage. Rage potency = 0.1 + 0.01 × Potency × PerkAmount.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    isNeutral: true,
  },
  'Tongue Shot': {
    name: 'Tongue Shot',
    color: '#39d9c4',
    description: 'Next finisher will shoot out a tongue that roots the nearest enemy.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    isNeutral: true,
  },
  'Beenades': {
    name: 'Beenades',
    color: '#ffe97a',
    description: 'Throw an additional x Beenades.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    isNeutral: true,
  },
  
  'Ancient Shield': {
    name: 'Ancient Shield',
    color: '#9aff00',
    description: 'Gain a shield equal to potency HP for 15s. Consumes buffs/neutrals applied to allies.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    statKey: 'protection',
    isNeutral: true,
  },
  'Quickdraw': {
    name: 'Quickdraw',
    color: '#daa520',
    description: 'Deal x% more damage with your weapon arts and runes.',
    dynamicDescription: (_perks, potency) => {
      const pct = Math.round(potency * 30000) / 100
      return `Deal ${pct}% more damage with your weapon arts and runes.`
    },
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    isNeutral: true,
  },
  Exhaust: {
    name: 'Exhaust',
    color: '#fe8284',
    description: 'All hits apply burn.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
  },
  'Converted Energy': {
    name: 'Converted Energy',
    color: '#01fb67',
    description: 'Deal x% more damage.',
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
  },
  'Hex Shield': {
    name: 'Hex Shield',
    color: '#00fd66',
    description: 'Block the next debuff you receive and heal.',
    dynamicDescription: (_perks, potency) => {
      const heal = potency * 3
      return `Blocks ${potency} debuff(s). Heals ${heal} HP on block.`
    },
    effectPerTenthPotency: BUFF_EFFECT_PER_TENTH,
    effectUnit: 'flat',
    isNeutral: true,
  },
  'Steam Buildup': {
    name: 'Steam Buildup',
    color: '#94a3b8',
    description: 'Gain stacks upon applying burn. At max stacks, RMB is replaced with a Steam Blast.',
    effectPerTenthPotency: 0,
    effectUnit: 'flat',
    isNeutral: true,
  },
  'Bursting': {
    name: 'Bursting',
    color: '#f97316',
    description: 'Increases Bombardier explosion proc chance from 40% to 80%.',
    effectPerTenthPotency: 0,
    effectUnit: 'flat',
    isNeutral: true,
  },
}

const ITEM_BUFF_MAP: GrantedBuff[] = [
  {
    buffName: 'Rage',
    potency: RAGE_RUNE_BUFF_POTENCY,
    duration: RAGE_RUNE_BUFF_DURATION,
    sourceName: 'Rage Rune',
    sourceType: 'rune',
  },
  {
    buffName: 'Rage',
    potency: TOAD_SLAM_RAGE_POTENCY,
    duration: TOAD_SLAM_RAGE_DURATION,
    sourceName: 'Toad Slam Rune',
    sourceType: 'rune',
  },
  {
    buffName: 'Bounce',
    potency: BOUNCE_RUNE_POTENCY,
    duration: BOUNCE_RUNE_DURATION,
    sourceName: 'Bounce Rune',
    sourceType: 'rune',
  },
    {
    buffName: 'Beenades',
    potency: BEENADE_RUNE_POTENCY,
    duration: 0,
    sourceName: 'Beenade Rune',
    sourceType: 'rune',
  },
  {
    buffName: 'Ancient Shield',
    potency: ANCIENT_CLERIC_SHIELD_POTENCY,
    duration: ANCIENT_CLERIC_SHIELD_DURATION,
    condition: 'On cast · potency = 20 + 4 × buffs consumed (allies also receive)',
    sourceName: 'Ancient Cleric Rune',
    sourceType: 'rune',
  },
  {
    buffName: 'Poison',
    potency: 0,
    duration: BOOSTSHROOM_POISON_DURATION,
    condition: 'On hit',
    sourceName: 'Boostshroom Rune',
    sourceType: 'rune',
  },
  {
    buffName: 'Poison',
    potency: 0,
    duration: SPORELING_POISON_DURATION,
    condition: 'On hit',
    sourceName: 'Sporeling Toss Rune',
    sourceType: 'rune',
  },
  {
    buffName: 'Lightning Cloak',
    potency: THUNDEROUS_CLOAK_POTENCY,
    duration: THUNDEROUS_CLOAK_DURATION,
    condition: 'Hold & release right before hitting enemy · hit crits',
    sourceName: 'Thunderous Charge Rune',
    sourceType: 'rune',
  },
  {
    buffName: 'Shatter',
    potency: WINTER_WOOF_SHATTER_POTENCY,
    duration: WINTER_WOOF_SHATTER_DURATION,
    condition: 'On Weapon Art hit',
    sourceName: 'Winter Woof Mount Rune',
    sourceType: 'rune',
  },
  {
    buffName: 'Slowness',
    potency: GLACIAL_SNAPPER_SLOWNESS_POTENCY,
    duration: GLACIAL_SNAPPER_SLOWNESS_DURATION,
    condition: 'On Weapon Art hit',
    sourceName: 'Glacial Snapper Mount Rune',
    sourceType: 'rune',
  },
    {
    buffName: 'Bleed',
    potency: 0,
    duration: GLACIAL_SNAPPER_BLEED_DURATION,
    condition: 'On Weapon Art hit',
    sourceName: 'Glacial Snapper Mount Rune',
    sourceType: 'rune',
  },
  {
    buffName: 'Bleed',
    potency: 0,
    duration: CACITROPS_BLEED_DURATION,
    condition: 'On hit',
    sourceName: 'Cacitrops Rune',
    sourceType: 'rune',
  },
  {
    buffName: 'Burn',
    potency: 0,
    duration: BRAINBLAST_BURN_DURATION,
    condition: 'On cast',
    sourceName: 'Brainblast Rune',
    sourceType: 'rune',
  },
  {
    buffName: 'Sticky (Melting Slime)',
    potency: BRAINBLAST_STICKY_POTENCY,
    duration: BRAINBLAST_STICKY_DURATION,
    condition: 'On cast',
    sourceName: 'Brainblast Rune',
    sourceType: 'rune',
  },
  {
    buffName: 'Sticky (Hex Web)',
    potency: HEX_WEB_STICKY_POTENCY,
    duration: HEX_WEB_STICKY_DURATION,
    condition: 'On cast · each hit',
    sourceName: 'Hex Web Rune',
    sourceType: 'rune',
  },
  {
    buffName: 'Burn',
    potency: 0,
    duration: 5,
    condition: 'On cast',
    sourceName: 'Fireball Rune',
    sourceType: 'rune',
  },
]

export const BASIC_DEBUFF_POOL: Array<{ buffName: string; potency: number; duration: number }> = [
  { buffName: 'Bleed',    potency: BASIC_DEBUFF_POTENCY,   duration: BASIC_DEBUFF_DURATION },
  { buffName: 'Burn',     potency: BASIC_DEBUFF_POTENCY,   duration: BASIC_DEBUFF_DURATION },
  { buffName: 'Poison',   potency: BASIC_DEBUFF_POTENCY,   duration: BASIC_DEBUFF_DURATION },
  { buffName: 'Shatter',  potency: BASIC_SHATTER_POTENCY,  duration: BASIC_DEBUFF_DURATION },
  { buffName: 'Slowness', potency: BASIC_SLOWNESS_POTENCY, duration: BASIC_DEBUFF_DURATION },
  { buffName: 'Weakness', potency: BASIC_WEAKNESS_POTENCY, duration: BASIC_DEBUFF_DURATION },
]

type PerkBuffFactory = (amount: number, allPerks: Record<string, number>) => GrantedBuff[]

const PERK_BUFFS: Record<string, PerkBuffFactory> = {

  'Perfection': (amount) => [
    {
      buffName: 'Perfection',
      potency: PERFECTION_POTENCY_PER_AMOUNT * amount,
      duration: 0,
      condition: `On dodge/parry · +${amount}/dodge · max ${amount * 5} · −${amount} on unblocked hit`,
      sourceName: 'Perfection',
      sourceType: 'perk',
    },
  ],

  'Bounce Momentum': (amount) => [
    {
      buffName: 'Tongue Shot',
      potency: BOUNCE_MOMENTUM_BUFF_POTENCY,
      duration: BOUNCE_MOMENTUM_DURATION_PER_AMOUNT * amount,
      condition: 'On jump while Bounce is active',
      sourceName: 'Bounce Momentum',
      sourceType: 'perk',
    },
  ],

  'Toadzerker Spirit': () => {
    return [
      {
        buffName: 'Bounce',
        potency: TOADZERKER_BUFF_POTENCY,
        duration: TOADZERKER_BUFF_DURATION,
        sourceName: 'Toadzerker',
        sourceType: 'perk',
      },
      {
        buffName: 'Rage',
        potency: TOADZERKER_BUFF_POTENCY,
        duration: TOADZERKER_BUFF_DURATION,
        sourceName: 'Toadzerker',
        sourceType: 'perk',
      },
    ]
  },

  'Iron Bounce': (amount) => {
    const bounceDuration = IRON_BOUNCE_DURATION_BASE + IRON_BOUNCE_DURATION_PER_AMOUNT * amount
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
        potency: SPRINGBLAST_BUFF_POTENCY_PER_AMOUNT * amount,
        duration: SPRINGBLAST_BUFF_DURATION_BASE + SPRINGBLAST_BUFF_DURATION_PER_AMOUNT * amount,
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
    buffName: 'Rage', potency: WRATHFUL_CRITS_POTENCY_PER_AMOUNT * amount, duration: WRATHFUL_CRITS_DURATION_BASE + WRATHFUL_CRITS_DURATION_PER_AMOUNT * amount, condition: 'On critical hit', sourceName: 'Wrathful Crits', sourceType: 'perk' 
  }],

  'Blood Lust': (amount) => [
    {
      buffName: 'Bloodlust',
      potency: BLOOD_LUST_POTENCY_PER_AMOUNT * amount,
      duration: BLOOD_LUST_DURATION_PER_AMOUNT * amount,
      condition: 'Hitting a bleeding target · +0.1 per hit · max 2.5 per perk',
      sourceName: 'Blood Lust',
      sourceType: 'perk',
    },
  ],

  'Emergency Exit': (amount) => [
    {
      buffName: 'Tailwind',
      potency: 0.4 * amount,
      duration: 5,
      condition: 'Getting hit while not blocking',
      sourceName: 'Emergency Exit',
      sourceType: 'perk',
    },
    {
      buffName: 'Reinforce',
      potency: 0.3 * amount,
      duration: 10,
      condition: 'Getting hit while not blocking',
      sourceName: 'Emergency Exit',
      sourceType: 'perk',
    },
  ],

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
  'Luminescent Fervor': (amount) => [
    {
      buffName: 'Luminescent',
      potency: LUMINESCENT_BUFF_POTENCY_PER_AMOUNT * amount,
      duration: LUMINESCENT_BUFF_DURATION,
      condition: 'On healing an Ally or self',
      sourceName: 'Luminescent Fervor',
      sourceType: 'perk',
    },
  ],
  'Smoldering': (amount) => [
    {
      buffName: 'Burn',
      potency: 0,
      duration: 10,
      condition: 'On Weapon Art activation',
      sourceName: 'Smoldering',
      sourceType: 'perk',
      isSelfDebuff: true,
    },
  ],
  'Bomber Spirit': () => [
    {
      buffName: 'Bursting',
      potency: 0,
      duration: 10,
      condition: 'On RMB activation (Monk) · Bombardier proc rate 40% → 80%',
      sourceName: 'Bomber Spirit',
      sourceType: 'perk',
    },
  ],
  'Cursed Experiment': (amount) => [
    { buffName: 'Rage',           potency: 0.3 + 0.1 * amount, duration: 5 + 2 * amount, condition: 'Rune used below 50% HP', sourceName: 'Cursed Experiment', sourceType: 'perk' },
    { buffName: 'Critical Boost', potency: 1.0,                 duration: 5 + 2 * amount, condition: 'Rune used below 50% HP', sourceName: 'Cursed Experiment', sourceType: 'perk' },
    { buffName: 'Hexigen',        potency: 1.0,                 duration: 7 + 2 * amount, condition: 'Rune used below 50% HP', sourceName: 'Cursed Experiment', sourceType: 'perk' },
    { buffName: 'Regen',          potency: 1.0,                 duration: 5 + 2 * amount, condition: 'Rune used below 50% HP', sourceName: 'Cursed Experiment', sourceType: 'perk' },
    { buffName: 'Slowness',       potency: 1.0,                 duration: 10,             condition: 'After buff expires',     sourceName: 'Cursed Experiment', sourceType: 'perk',
    isSelfDebuff: true },
  ],
    'Royal Parry': () => [
    { buffName: 'Critical Boost', potency: 1.0,                 duration: 15, condition: 'Upon a successful parry', sourceName: 'Royal Parry', sourceType: 'perk' },
  ],

  'Beastial Rage': (amount) => [{ 
    buffName: 'Rage', potency: BEASTIAL_RAGE_POTENCY_PER_AMOUNT * amount, duration: BEASTIAL_RAGE_DURATION, condition: 'On kill or Poisebreak', sourceName: 'Beastial Rage', sourceType: 'perk' 
  }],
  'Vassals Croak': (amount, allPerks) => {
    const swarm = allPerks['Swarm'] ?? 0
    const maxStacks = Math.floor(VASSALS_CROAK_MAX_SUMMONS_BASE + swarm)
    const minRage = roundMultiplier(0.1 + 0.01 * 1 * amount)
    const maxRage = roundMultiplier(0.1 + 0.01 * maxStacks * amount)
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
        duration: VASSALS_CROAK_RAGE_DURATION,
        condition: `On RMB consume · ${minRage}–${maxRage} potency (1–${maxStacks} stacks)`,
        sourceName: 'Vassals Croak',
        sourceType: 'perk',
      },
    ]
  },
  'Iron Slayer Spirit': (amount) => [
    {
      buffName: 'Weakness',
      potency: IRON_SLAYER_POTENCY_PER_AMOUNT * amount,
      duration: IRON_SLAYER_DURATION,
      condition: 'Enemies within range on roar',
      sourceName: 'Iron Slayer Spirit',
      sourceType: 'perk',
    },
  ],

  'Bastion Bless': (amount) => {
    const rate = BASTION_RATE_PER_AMOUNT * amount
    const condition = `~${rate}% chance on healing`
    
    return [
      {
        buffName: 'Regen',
        potency: BASTION_REGEN_POTENCY,
        duration: BASTION_BUFF_DURATION,
        condition,
        sourceName: 'Bastion Bless',
        sourceType: 'perk',
      },
      {
        buffName: 'Reinforce',
        potency: BASTION_REINFORCE_POTENCY,
        duration: BASTION_BUFF_DURATION,
        condition,
        sourceName: 'Bastion Bless',
        sourceType: 'perk',
      },
    ]
  },
    'Barbskin': () => [
    {
      buffName: 'Bleed',
      potency: 0,
      duration: 5,
      condition: 'Inflicting Bleed will cause yourself to Bleed',
      sourceName: 'Barbskin',
      sourceType: 'perk',
      isSelfDebuff: true
    },
  ],
  'Cursed Bark': (amount) => BASIC_DEBUFF_POOL.map(d => ({
    buffName: d.buffName,
    potency: d.potency,
    duration: d.duration,
    condition: amount > 0 ? 'Random debuff on being attacked (guaranteed if not blocking)' : '',
    sourceName: 'Cursed Bark',
    sourceType: 'perk',
  })),
  'Aggressive Personality': (amount) => [
    {
      buffName: 'Taunt',
      potency: 0,
      duration: 0,
      condition: 'On Warhammer/Dual Mallets M1 Finisher or Mallet M2 hit',
      sourceName: 'Aggressive Personality',
      sourceType: 'perk',
    },
  ],
  'Air Pressure': (amount) => [
    {
      buffName: 'Air Pressure',
      potency: AIR_PRESSURE_BUFF_POTENCY_PER_AMOUNT * amount,
      duration: AIR_PRESSURE_BUFF_DURATION,
      condition: 'Dealing Air Damage',
      sourceName: 'Air Pressure',
      sourceType: 'perk',
    },
  ],
  'Apollo Boost': () => [
      {
        buffName: 'Taunt',
        potency: APOLLO_TAUNT_POTENCY, 
        duration: APOLLO_TAUNT_DURATION,
        condition: 'Using a Rune',
        sourceName: 'Apollo Boost',
        sourceType: 'perk',
      },
    ],
    'Valor': () => [
      {
        buffName: 'Taunt',
        potency: VALOR_TAUNT_POTENCY,
        duration: VALOR_TAUNT_DURATION,
        condition: 'Weapon Art hits an enemy',
        sourceName: 'Valor',
        sourceType: 'perk',
      },
    ],
    'Channeled Weapon': () => [
    {
      buffName: 'Magic Reinforce',
      potency: CHANNELED_REINFORCE_POTENCY,
      duration: CHANNELED_REINFORCE_DURATION,
      condition: 'rank 2 in the Scholar Guild.',
      sourceName: 'PONDER(Scholar cantrip)',
      sourceType: 'cantrip',
    },
  ],
  'Gladiatorial Rage': () => [
    {
      buffName: 'Rage',
      potency: GLADIATORIAL_RAGE_POTENCY,
      duration: GLADIATORIAL_RAGE_DURATION,
      condition: 'rank 2 in the Gladiator Guild.',
      sourceName: 'HUNT(Gladiator cantrip)',
      sourceType: 'cantrip',
    },
  ],
  'Minion Absorption': (amount) => [
    {
      buffName: 'Minion Absorbed',
      potency: 0,
      duration: 0,
      condition: 'On minion summoned · cannot reactivate while buff is active',
      sourceName: 'Minion Absorption',
      sourceType: 'perk',
    },
  ],
  'Glyph Conduit': (amount) => [
    {
      buffName: 'Glyph Conduit',
      potency: GLYPH_CONDUIT_POTENCY_PER_AMOUNT * amount,
      duration: Math.round(GLYPH_CONDUIT_DURATION_MULT * amount),
      condition: 'On RMB or Rune use',
      sourceName: 'Glyph Conduit',
      sourceType: 'perk',
    },
  ],
  'Roaring Heads': (amount) => [
    {
      buffName: 'Weakness',
      potency: ROARING_WEAKNESS_POTENCY,
      duration: ROARING_DEBUFF_DURATION,
      condition: '65% chance on hit',
      sourceName: 'Roaring Heads',
      sourceType: 'perk',
      isSelfDebuff: true,
    },
    {
      buffName: 'Shatter',
      potency: ROARING_SHATTER_POTENCY,
      duration: ROARING_DEBUFF_DURATION,
      condition: '65% chance on hit',
      sourceName: 'Roaring Heads',
      sourceType: 'perk',
      isSelfDebuff: true,
    },
    {
      buffName: 'Anti Heal',
      potency: ROARING_ANTI_HEAL_POTENCY,
      duration: ROARING_DEBUFF_DURATION,
      condition: '65% chance on hit',
      sourceName: 'Roaring Heads',
      sourceType: 'perk',
      isSelfDebuff: true,
    },
  ],
  'Hex Shield': (amount) => [
    {
      buffName: 'Hex Shield',
      potency: 1 * amount,
      duration: 0,
      condition: `Max stacks · +1 every 10s`,
      sourceName: 'Hex Shield',
      sourceType: 'perk',
    },
    {
      buffName: 'Converted Energy',
      potency: 0.1 * amount,
      duration: 10,
      condition: 'On debuff block',
      sourceName: 'Hex Shield',
      sourceType: 'perk',
    },
  ],
  'Honey Arts': () => [
    {
      buffName: 'Sticky',
      potency: 0.1,
      duration: 5,
      condition: 'On Weapon Art hit',
      sourceName: 'Honey Arts',
      sourceType: 'perk',
    },
  ],
  'Sharp Claws': (amount) => [
    {
      buffName: 'Bleed',
      potency: 0,
      duration: 5,
      condition: 'On guardbreak',
      sourceName: 'Sharp Claws',
      sourceType: 'perk',
    },
    {
      buffName: 'Wound',
      potency: 0.1 * amount,
      duration: 6,
      condition: 'On guardbreak',
      sourceName: 'Sharp Claws',
      sourceType: 'perk',
    },
  ],
  'Wild Bolt': () => [
    { buffName: 'Bleed', potency: 0, duration: 5, condition: 'Random (1 of 6) on Laser hit', sourceName: 'Wild Bolt', sourceType: 'perk' },
    { buffName: 'Burn', potency: 0, duration: 5, condition: 'Random (1 of 6) on Laser hit', sourceName: 'Wild Bolt', sourceType: 'perk' },
    { buffName: 'Poison', potency: 0, duration: 5, condition: 'Random (1 of 6) on Laser hit', sourceName: 'Wild Bolt', sourceType: 'perk' },
    { buffName: 'Shatter', potency: 0.2, duration: 5, condition: 'Random (1 of 6) on Laser hit', sourceName: 'Wild Bolt', sourceType: 'perk' },
    { buffName: 'Slowness', potency: 0.2, duration: 5, condition: 'Random (1 of 6) on Laser hit', sourceName: 'Wild Bolt', sourceType: 'perk' },
    { buffName: 'Weakness', potency: 0.5, duration: 5, condition: 'Random (1 of 6) on Laser hit', sourceName: 'Wild Bolt', sourceType: 'perk' },
  ],
  'Storm Rend': (amount) => [
    {
      buffName: 'Electrical Rend',
      potency: STORM_REND_POTENCY_PER_AMOUNT * amount,
      duration: STORM_REND_DURATION,
      condition: '≈20% chance on hit',
      sourceName: 'Storm Rend',
      sourceType: 'perk',
    },
  ],
  'Erosion': (amount) => [
    {
      buffName: 'Shatter',
      potency: EROSION_POTENCY_BASE + EROSION_POTENCY_PER_AMOUNT * amount,
      duration: EROSION_DURATION,
      sourceName: 'Erosion',
      sourceType: 'perk',
    },
  ],
  'Quickdraw': (amount) => [
    {
      buffName: 'Quickdraw',
      potency: QUICKDRAW_POTENCY_PER_AMOUNT * amount,
      duration: QUICKDRAW_DURATION,
      condition: 'Upon equipping your weapon',
      sourceName: 'Quickdraw',
      sourceType: 'perk',
    },
  ],

  'Sickness': (amount) => [
    {
      buffName: 'Sticky (Sickness)',
      potency: 0.1,
      duration: 5,
      condition: 'On sneeze',
      sourceName: 'Sickness',
      sourceType: 'perk',
    },
  ],
  'Exhaust': (amount) => [
    {
      buffName: 'Exhaust',
      potency: 0,
      duration: 0,
      condition: 'On Weapon Art use',
      sourceName: 'Exhaust',
      sourceType: 'perk',
    },
  ],

  'Tailwind': (amount) => [
    {
      buffName: 'Tailwind',
      potency: TAILWIND_BUFF_POTENCY,
      duration: TAILWIND_BUFF_DURATION,
      condition: 'On weapon art activation',
      sourceName: 'Tailwind',
      sourceType: 'perk',
    },
  ],
  'Volatile Shell': () => [
    {
      buffName: 'Poison',
      potency: 0,
      duration: 5,
      condition: 'When your Shield is depleted completely',
      sourceName: 'Volatile Shell',
      sourceType: 'perk',
    },
  ],
  'Spore Burst': () => [
    {
      buffName: 'Poison',
      potency: 0,
      duration: 5,
      condition: 'On Finisher hit',
      sourceName: 'Spore Burst',
      sourceType: 'perk',
    },
    {
      buffName: 'Poison',
      potency: 1,
      duration: 5,
      condition: 'On Finisher hit (self)',
      sourceName: 'Spore Burst',
      sourceType: 'perk',
      isSelfDebuff: true,
    },
  ],
  'Toxin Transfer': (amount) => [
    {
      buffName: 'Poison',
      potency: 0.1 * amount,
      duration: 0,
      condition: 'On hit while poisoned (duration = self poison duration + 5s)',
      sourceName: 'Toxin Transfer',
      sourceType: 'perk',
    },
  ],
  'Grounded Despair': (amount) => [
    {
      buffName: 'Despair',
      potency: GROUNDED_DESPAIR_POTENCY_PER_AMOUNT * amount,
      duration: GROUNDED_DESPAIR_DURATION_PER_AMOUNT * amount,
      condition: 'On jump and land',
      sourceName: 'Grounded Despair',
      sourceType: 'perk',
      isSelfDebuff: true,
    },
  ],
  'Steam Charge': (amount) => [
    {
      buffName: 'Steam Buildup',
      potency: Math.round(8 / amount),
      duration: 0,
      condition: `Gain 1 stack per Burn application. Max ${Math.round(8 / amount)} stacks. Rounds to nearest whole number.`,
      sourceName: 'Steam Charge',
      sourceType: 'perk',
    },
  ],
  'Queen Bumblz Spirit': () => [
    {
      buffName: 'Sticky',
      potency: 0.1,
      duration: 5,
      condition: 'on Spirit Hit',
      sourceName: 'Queen Bumblz Spirit',
      sourceType: 'perk',
    },
  ],
}

const WEAPON_ART_BUFF_MAP: Record<string, GrantedBuff[]> = {
  'Warrior Stomp': [
    { buffName: 'Rage', potency: WARRIOR_STOMP_RAGE_POTENCY, duration: WARRIOR_STOMP_RAGE_DURATION, sourceName: 'Warrior Stomp', sourceType: 'weaponArt' },
    { buffName: 'Taunt', potency: WARRIOR_STOMP_TAUNT_POTENCY, duration: WARRIOR_STOMP_TAUNT_DURATION, sourceName: 'Warrior Stomp', sourceType: 'weaponArt' },
  ],
  'Javelin': [
    { buffName: 'Slowness', potency: 0, duration: JAVELIN_SLOWNESS_DURATION, sourceName: 'Javelin', sourceType: 'weaponArt' },
  ],
  'Lightning Cloak': [
    { buffName: 'Lightning Cloak', potency: 0, duration: LIGHTNING_CLOAK_DURATION_WA, sourceName: 'Lightning Cloak', sourceType: 'weaponArt' },
  ],
  'Cursed Ground': [
    { 
      buffName: 'Weakness', 
      potency: CURSED_GROUND_WEAKNESS_POTENCY, 
      duration: CURSED_GROUND_WEAKNESS_DURATION, 
      condition: 'On cast (All nearby opponents)',
      sourceName: 'Cursed Ground', 
      sourceType: 'weaponArt' 
    },
    ...BASIC_DEBUFF_POOL.map(d => ({
      buffName: d.buffName,
      potency: d.potency,
      duration: d.duration,
      condition: '50% chance from pool',
      sourceName: 'Cursed Ground',
      sourceType: 'weaponArt' as const,
    })),
  ],
}

export function getWeaponArtBuffs(weaponArtName: string): GrantedBuff[] {
  return WEAPON_ART_BUFF_MAP[weaponArtName] ?? []
}

const TRUE_BALANCE_DEBUFF_MAP: Record<string, {
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
    potency: roundMultiplier(data.maxPotency),
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

function durationMultFromStack(base: number, perStack: number): (stacks: number) => number {
  return (stacks: number) => base + perStack * stacks
}

const BOUNCE_DURATION_MULT = durationMultFromStack(BOUNCE_DURATION_BASE, BOUNCE_DURATION_PER_STACK)

const BUFF_POTENCY_MODIFIERS: BuffPotencyModifier[] = [
  { buffName: 'Bounce', potencyPerStack: 0, label: 'Bounce Momentum', durationMultiplierFormula: BOUNCE_DURATION_MULT },

  { buffName: 'Rage', potencyPerStack: MOD_GLADIATORIAL_POTENCY, label: 'Gladiatorial Rage' },
  { buffName: 'Rage', potencyPerStack: MOD_MAGE_RAGE_POTENCY, label: 'Mage Rage' },
  { buffName: 'Rage', potencyPerStack: MOD_OCEANS_RAGE_POTENCY, label: 'Oceans Rage' },
  { buffName: 'Rage', potencyPerStack: MOD_SLAYER_RAGE_POTENCY, label: 'Slayer Rage', runeFilter: 'Rage Rune' },
  { buffName: 'Weakness', potencyPerStack: MOD_SLAYER_WEAKNESS_POTENCY, label: 'Slayer Rage', runeFilter: 'Weakening Roar Rune' },
  { buffName: 'Rage', potencyPerStack: MOD_IRON_SLAYER_POTENCY, label: 'Iron Slayer Spirit', durationMultiplierPerStack: MOD_IRON_SLAYER_DURATION },
  { buffName: 'Rage', potencyPerStack: 0,   label: 'Fury', durationMultiplierPerStack: MOD_FURY_DURATION },
  { buffName: 'Tailwind', potencyPerStack: MOD_TAILWIND_POTENCY, label: 'Tailwind' },
  { buffName: 'Tailwind', potencyPerStack: 0, label: 'Wind Walker', durationMultiplierFormula: stacks => 1 + stacks / MOD_WIND_WALKER_DURATION_DIVISOR },
  { buffName: 'Bleed', potencyPerStack: 0, label: 'Slow Leak', durationMultiplierPerStack: MOD_SLOW_LEAK_DURATION },
]

const MODIFIERS_BY_BUFF = BUFF_POTENCY_MODIFIERS.reduce((acc, mod) => {
  (acc[mod.buffName] ??= []).push(mod)
  return acc
}, {} as Record<string, BuffPotencyModifier[]>)


interface GenericDebuffModifier {
  perkName: string
  potencyMultiplierPerStack: number
  flatPotencyBonus: number
  durationMultiplierPerStack: number
}

const GENERIC_DEBUFF_MODIFIERS: GenericDebuffModifier[] = [
  {
    perkName: 'Endless Despair',
    potencyMultiplierPerStack: ENDLESS_DESPAIR_POTENCY_PER_STACK,
    flatPotencyBonus: ENDLESS_DESPAIR_FLAT_BONUS,
    durationMultiplierPerStack: ENDLESS_DESPAIR_DURATION_PER_STACK,
  },
  {
    perkName: 'Stored Corruption',
    potencyMultiplierPerStack: 0,
    flatPotencyBonus: 0,
    durationMultiplierPerStack: STORED_CORRUPTION_DURATION_PER_STACK,
  },
]


const BUFFS_BY_ITEM_SOURCE = ITEM_BUFF_MAP.reduce((acc, buff) => {
  (acc[buff.sourceName] ??= []).push(buff)
  return acc
}, {} as Record<string, GrantedBuff[]>)

function getSpecificBuffModifiers(
  buff: GrantedBuff,
  def: BuffDefinition | undefined,
  perks: Record<string, number>
) {
  let bonus = 0
  let durationMult = 1

  const modifiers = MODIFIERS_BY_BUFF[buff.buffName]
  if (!modifiers) return { bonus, durationMult }

  const isSelfDebuff = buff.isSelfDebuff || def?.isSelfDebuff
  const isDespair = buff.buffName === 'Despair'

  for (const mod of modifiers) {
    if (mod.runeFilter && mod.runeFilter !== buff.sourceName) continue

    const stacks = perks[mod.label] ?? 0
    if (stacks <= 0) continue

    const isContained = mod.label === 'Contained'

    if (isSelfDebuff && !isContained && !isDespair) continue

    bonus += mod.potencyPerStack * stacks

    if (mod.durationMultiplierFormula) {
      durationMult *= mod.durationMultiplierFormula(stacks)
    } else if (mod.durationMultiplierPerStack) {
      durationMult *=
        1 + (mod.durationMultiplierPerStack - 1) * stacks
    }
  }

  return { bonus, durationMult }
}

function getBastionBlessBonus(
  buff: GrantedBuff,
  def: BuffDefinition | undefined,
  perks: Record<string, number>
) {
  const stacks = perks['Bastion Bless'] ?? 0

  if (
    stacks > 0 &&
    !buff.isSelfDebuff &&
    def &&
    !def.isDebuff &&
    !def.isNeutral &&
    !def.potencyCapped
  ) {
    return BASTION_BLESS_MULT * stacks * buff.potency
  }

  return 0
}

function getGenericDebuffModifiers(
  buff: GrantedBuff,
  def: BuffDefinition | undefined,
  perks: Record<string, number>
) {
  let potencyMult = 1
  let flatBonus = 0
  let durationMult = 1

  if (!def?.isDebuff) {
    return {
      potencyMult,
      flatBonus,
      durationMult,
    }
  }

  const isSelfDebuff = buff.isSelfDebuff || def.isSelfDebuff
  const isDespair = buff.buffName === 'Despair'

  if (isSelfDebuff && !isDespair) {
    return {
      potencyMult,
      flatBonus,
      durationMult,
    }
  }

  for (const gm of GENERIC_DEBUFF_MODIFIERS) {
    const stacks = perks[gm.perkName] ?? 0
    if (stacks <= 0) continue

    potencyMult *= 1 + gm.potencyMultiplierPerStack * stacks
    flatBonus += gm.flatPotencyBonus
    durationMult *= 1 + gm.durationMultiplierPerStack * stacks
  }

  return {
    potencyMult,
    flatBonus,
    durationMult,
  }
}

function getTricksterReflection(
  buff: GrantedBuff,
  def: BuffDefinition | undefined,
  perks: Record<string, number>,
  wardingDebuffMult: number
): number {
  const tricksterStacks = perks['Trickster'] ?? 0
  if (tricksterStacks <= 0) return 0

  const isSelfDebuff = buff.isSelfDebuff || def?.isSelfDebuff
  if (!isSelfDebuff) return 0
  if (!def?.isDebuff) return 0

  // Only Despair (Grounded Despair) gets Trickster reflection
  if (buff.buffName !== 'Despair') return 0

  // The reflection bonus must be computed from the Warding-adjusted potency.
  // Since the UI applies Warding as a post-multiplier, we compute the raw
  // bonus from the adjusted base and divide by wardingMult so the post-hoc
  // multiplication produces the correct result.
  const adjustedBase = buff.potency * wardingDebuffMult
  const rawBonus = (tricksterStacks / 10) * (1 + adjustedBase)
  return roundMultiplier(rawBonus / wardingDebuffMult)
}

export function applyBuffPerkModifiers(
  buffs: GrantedBuff[],
  perks: Record<string, number>,
  activeRune?: string,
  wardingDebuffMult?: number
): GrantedBuff[] {
  if (buffs.length === 0) return buffs

  const wMult = wardingDebuffMult ?? 1

  return buffs.map(buff => {
    const def = BUFF_DEFS[buff.buffName]
    const isSelfDebuff = buff.isSelfDebuff || def?.isSelfDebuff

    const specific = getSpecificBuffModifiers(buff, def, perks)
    const bastionBonus = getBastionBlessBonus(buff, def, perks)
    const tricksterBonus = getTricksterReflection(buff, def, perks, wMult)
    const generic = getGenericDebuffModifiers(buff, def, perks)

    const isNeutral = def?.isNeutral
    const containedStacks = perks['Contained'] ?? 0
    const containedMult = !isNeutral && containedStacks > 0
      ? 1 + 0.33 * containedStacks
      : 1

    const darkOneStacks = perks['Dark One'] ?? 0
    const darkOneDurationMult = isSelfDebuff && def?.isDebuff && darkOneStacks > 0
      ? 1 + 0.10 * darkOneStacks
      : 1

    const bonus = specific.bonus + bastionBonus + tricksterBonus
    const durationMult =
      specific.durationMult * generic.durationMult * containedMult * darkOneDurationMult

    if (
      bonus === 0 &&
      durationMult === 1 &&
      generic.potencyMult === 1 &&
      generic.flatBonus === 0
    ) {
      return buff
    }

    // Endless Despair flat +0.1 must not be multiplied by Warding.
    // Since the UI applies Warding as a post-multiplier, we divide
    // the flat bonus by wardingMult so the UI multiplication cancels out.
    const effectiveFlatBonus = isSelfDebuff
      ? generic.flatBonus / wMult
      : generic.flatBonus

    const tricksterStacks = perks['Trickster'] ?? 0
    const isDespairWithTrickster = buff.buffName === 'Despair' && tricksterStacks > 0

    let finalPotency
    if (isDespairWithTrickster) {
      const preTricksterDisplayed = (buff.potency + specific.bonus + bastionBonus) * generic.potencyMult * wMult + generic.flatBonus
      const tricksterDisplayed = (tricksterStacks / 10) * (1 + preTricksterDisplayed)
      finalPotency = roundMultiplier((preTricksterDisplayed + tricksterDisplayed) / wMult)
    } else {
      finalPotency = roundMultiplier(
        (buff.potency + bonus) * generic.potencyMult +
          effectiveFlatBonus
      )
    }

    return {
      ...buff,
      duration: Math.round(buff.duration * durationMult),
      potency: finalPotency,
      basePotency: buff.potency,
      bonusPotency:
        finalPotency !== buff.potency
          ? roundMultiplier(finalPotency - buff.potency)
          : undefined,
    }
  })
}

export function applyToxinTransferDuration(
  buffs: GrantedBuff[],
  perks: Record<string, number>
): GrantedBuff[] {
  const ttAmt = perks['Toxin Transfer'] ?? 0
  if (ttAmt <= 0) return buffs

  const selfPoisonDuration = Math.max(
    0,
    ...buffs
      .filter(b => b.buffName === 'Poison' && b.isSelfDebuff)
      .map(b => b.duration)
  )

  return buffs.map(b => {
    if (b.sourceName !== 'Toxin Transfer' || b.buffName !== 'Poison') return b
    return { ...b, duration: selfPoisonDuration + TOXIN_TRANSFER_DURATION_EXTRA }
  })
}

export function convertTailwindToWhirlwind(
  buffs: GrantedBuff[],
  perks: Record<string, number>
): GrantedBuff[] {
  const wwAmt = perks['Whirlwind'] ?? 0
  if (wwAmt <= 0) return buffs
  const result = buffs.map(b => {
    if (b.buffName !== 'Tailwind') return b
    return {
      ...b,
      buffName: 'Whirlwind',
      sourceName: 'Whirlwind',
      duration: Math.round(b.duration * BOUNCE_DURATION_MULT(wwAmt)),
    }
  })
  result.push({
    buffName: 'Bleed',
    potency: 0,
    duration: 5,
    condition: 'On WA/Rune use (AoE wind slash)',
    sourceName: 'Whirlwind',
    sourceType: 'perk',
  })
  return result
}

export function getBuffDescription(
  buffName: string,
  perks: Record<string, number>,
  potency: number = 0
): string {
  const buff = BUFF_DEFS[buffName]
  if (!buff) return ''

  let desc = buff.dynamicDescription
    ? buff.dynamicDescription(perks, potency)
    : buff.description

  if (buffName === 'Weakness') {
    const dmgReduction = roundMultiplier(1 - (1 / (1 + potency)))
    return `Deal ${(dmgReduction * 100).toFixed(4).replace(/\.?0+$/, '')}% less damage.`
  }

  if (buffName === 'Shatter') {
    const armorLoss = roundMultiplier(potency * 100)
    return `Lose ${armorLoss} Armor.`
  }
  if (buffName === 'Anti Heal') {
    const dmgReduction = roundMultiplier(1 - (1 / (1 + potency)))
    return `Reduce healing by ${(dmgReduction * 100).toFixed(4).replace(/\.?0+$/, '')}%.`
  }

  const effect = calcBuffEffect(buffName, potency)
  const pct = effect.unit === '%' ? effect.value : effect.value * 100
  return desc.replace(/x%/g, `${+(pct).toFixed(4).replace(/\.?0+$/, '')}%`)
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
  rune: string; ring: string; infusionRing: string;
  helmet: string; chestplate: string; leggings: string;
  weaponBlade: string; weaponHandle: string; monkGlove: string;
  race?: string;
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
  if (build.race) buffs.push(...getRaceBuffs(build.race))
  return buffs
}
// ─── Race buffs ───────────────────────────────────────────────────────────────

const RACE_BUFF_MAP: Record<string, GrantedBuff[]> = {
  'BUNIKIN': [
    {
      buffName: 'Critical Boost',
      potency: 1.0,
      duration: 10,
      condition: 'On successful dodge (passive)',
      sourceName: 'BUNIKIN',
      sourceType: 'race',
    },
  ],
  'DARK ELF': BASIC_DEBUFF_POOL.map(d => ({
    buffName: d.buffName,
    potency: d.potency,
    duration: d.duration,
    condition: 'On hit (passive - 8% chance)',
    sourceName: 'DARK ELF',
    sourceType: 'race' as const,
  })),
}

function getRaceBuffs(race: string): GrantedBuff[] {
  return RACE_BUFF_MAP[race] ?? []
}

export interface ActiveBuffsBuildInput {
  rune: string
  ring: string
  infusionRing: string
  helmet: string
  chestplate: string
  leggings: string
  weaponBlade: string
  weaponHandle: string
  monkGlove: string
  race?: string
  selectedWeaponArt: string
}

/**
 * When Cauterize is active (and Cursed Flames is not), marks all enemy-applied
 * Burn entries with `burnMode: 'singed'` to signal that they burst on application
 * instead of ticking as DoT. Non-self-debuff Burn entries are converted.
 */
export function applyCauterizeConversion(
  buffs: GrantedBuff[],
  perks: Record<string, number>,
): GrantedBuff[] {
  const cauterize = perks['Cauterize'] ?? 0
  if (cauterize <= 0) return buffs
  if ((perks['Cursed Flames'] ?? 0) > 0) return buffs
  return buffs.map(b => {
    if (b.buffName === 'Burn' && !b.isSelfDebuff) {
      return { ...b, burnMode: 'singed' }
    }
    return b
  })
}

/**
 * Returns the number of enemy Burn application entries in the buff list.
 * Used to multiply the Cauterize/Singed single-burst damage.
 * Extracted as a helper so the counting strategy can evolve independently
 * of the damage formula.
 */
export function getBurnApplicationCount(buffs: GrantedBuff[]): number {
  return buffs.filter(b => b.buffName === 'Burn').length
}

/**
 * Shared assembly pipeline: item buffs + raw perk buffs + weapon art buffs,
 * merged through convertTailwindToWhirlwind(applyBuffPerkModifiers(...)).
 * Only use this where perk buffs are NOT pre-modified/filtered before assembly
 * (e.g. BuffList.svelte customizes Exhaust/Wild Bolt before merging and must
 * NOT use this helper).
 */
export function assembleActiveBuffs(
  build: ActiveBuffsBuildInput,
  perks: Record<string, number>,
  wardingDebuffMult?: number,
): GrantedBuff[] {
  const itemBuffs = getActiveBuildBuffs({
    rune: build.rune, ring: build.ring, infusionRing: build.infusionRing,
    helmet: build.helmet, chestplate: build.chestplate, leggings: build.leggings,
    weaponBlade: build.weaponBlade, weaponHandle: build.weaponHandle,
    monkGlove: build.monkGlove, race: build.race,
  })
  const buffs = convertTailwindToWhirlwind(applyBuffPerkModifiers(
    [...itemBuffs, ...getPerkBuffs(perks), ...getWeaponArtBuffs(build.selectedWeaponArt)],
    perks,
    build.rune || undefined,
    wardingDebuffMult,
  ), perks)
  return applyCauterizeConversion(buffs, perks)
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

  const value = roundMultiplier(def.effectPerTenthPotency * potency * 10)
  const sign = def.isDebuff ? '' : '+'
  const label =
    def.effectUnit === '%'
      ? `${sign}${value}% ${def.description.split(' ').slice(0, 3).join(' ')}…`
      : `${sign}${value} ${def.statKey ?? ''}`

  return { value, unit: def.effectUnit, label }
}

function calcPotencyPercent(perkAmount: number): number {
  const p = perkAmount / 10
  return Math.floor(
    Math.pow(p, Math.min(1, p) + 1)*100
    * (1 + p / 1.5)
    * 100
  ) / 100
}

export function formatPerkDescription(desc: string, count: number): string {
  return desc.replace(/x%/g, Math.round(calcPotencyPercent(count) * 100) / 100 + '%')
}