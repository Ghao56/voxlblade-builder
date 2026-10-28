// Random build generator: rolls a complete, rule-valid build from the game data.
import type { BuildState, ArmorPart } from './types'
import {
  races, guilds, armors, rings, runes, blades, handles, gloves, essences,
  enchantments, isMonkGuild, isExclusiveEnchant, armorSupportsSlot,
} from './engine'
import { WEAPON_ARTS } from '../data/weaponArts'
import { DRACONIC_COLOR_ATTACK_STATS } from '../data/draconicColorEffects'
import { POTIONS } from '../data/potions'

type ArmorType = ArmorPart['type']

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function findArmor(type: ArmorType, used: Set<string>): string {
  // Avoid grabbing the same set twice so a roll always mixes gear
  const pool = armors.filter(a => !used.has(a.name) && armorSupportsSlot(a.name, type))
  const name = (pool.length ? pool : armors.filter(a => armorSupportsSlot(a.name, type)))
    .map(a => a.name)
  const chosen = pick(name)
  used.add(chosen)
  return chosen
}

function randSlot(): [string, string, string] {
  const excl = enchantments.filter(e => e.stacking === 'exclusive')
  if (Math.random() < 0.2 && excl.length) {
    const e = pick(excl).name
    return [e, '', '']  // exclusive stacking: nothing else fits the slot
  }
  const normal = enchantments.filter(e => e.stacking !== 'exclusive')
  const count = 1 + Math.floor(Math.random() * 3)
  const names = new Set<string>()
  while (names.size < count) names.add(pick(normal).name)
  const [a, b, c] = [...names]
  return [a, b ?? '', c ?? '']
}

export function randomizeBuildState(base: BuildState): BuildState {
  const guild = pick(guilds)
  const isMonk = isMonkGuild(guild.name)
  const isDraconic = guild.name === 'Draconic'

  const used: Set<string> = new Set()
  const racePool = isDraconic
    ? ['DRAGON BLOODED']
    : races.filter(r => r.name !== 'DRAGON BLOODED').map(r => r.name)

  return {
    ...base,
    race: pick(racePool),
    guild: guild.name,
    guildRank: 3,  // max tier — the one you'd actually play
    helmet: findArmor('Helmet', used),
    chestplate: findArmor('Chestplate', used),
    leggings: findArmor('Leggings', used),
    infusionHelmet: findArmor('Helmet', used),
    infusionChestplate: findArmor('Chestplate', used),
    infusionLeggings: findArmor('Leggings', used),
    ring: pick(rings).name,
    infusionRing: pick(rings).name,
    rune: pick(runes).name,
    weaponBlade: isMonk ? '' : pick(blades).name,
    weaponHandle: isMonk ? '' : pick(handles).name,
    monkGlove: isMonk ? pick(gloves).name : '',
    monkEssence: isMonk ? pick(essences).name : '',
    shrineActive: true,  // shrine on is always the better state — don't roll it off
    selectedWeaponArt: pick(WEAPON_ARTS).name,
    draconicColor: isDraconic ? pick(DRACONIC_COLOR_ATTACK_STATS).color : '',
    draconicRuneInfusion: isDraconic ? pick(['claw', 'infusion', 'bubble']) : '',
    enchantments: {
      helmet: randSlot(),
      chestplate: randSlot(),
      leggings: randSlot(),
      ring: randSlot(),
      rune: randSlot(),
    },
    potion1: Math.random() < 0.5 ? pick(POTIONS).name : '',
    potion2: Math.random() < 0.5 ? pick(POTIONS).name : '',
  }
}
