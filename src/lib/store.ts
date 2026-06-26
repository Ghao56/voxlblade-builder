import { writable, derived } from 'svelte/store'
import type { BuildState, EnchantSlot } from './types'
import { calcBuild, races, enforceEnchantSlot } from './engine'

const STORAGE_KEY = 'voxlbuilder_build_v1'

const DEFAULT_BUILD: BuildState = {
  race: races[0]?.name ?? "",
  guild: "",
  guildRank: 1,
  helmet: "",
  chestplate: "",
  leggings: "",
  ring: "",
  rune: "",
  enchantments: {
    helmet: ["","",""],
    chestplate: ["","",""],
    leggings: ["","",""],
    ring: ["","",""],
    rune: ["","",""],
  },
  infusionHelmet: "",
  infusionChestplate: "",
  infusionLeggings: "",
  infusionRing: "",
  weaponBlade: "Basic Blade",
  weaponHandle: "Basic Handle",
  monkGlove: "Basic Gloves",
  monkEssence: "Basic Essence",
  shrineActive: true,
  upgradeHelmet: 5,
  upgradeChestplate: 5,
  upgradeLeggings: 5,
  upgradeRing: 5,
  upgradeRune: 5,
  selectedWeaponArt: "Lunge",
  draconicColor: "",
  draconicRuneInfusion: "",
  emotionalState: 'buffs',
  level: 80,
  hpFill: 100,
  summonCount: 0,
  buffsConsumed: 0,
  inDarkness: true,
  cdrToggles: {},
}

function loadBuild(): BuildState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_BUILD }
    const parsed = JSON.parse(raw) as Partial<BuildState>
    return { ...DEFAULT_BUILD, ...parsed }
  } catch {
    return { ...DEFAULT_BUILD }
  }
}

export const build = writable<BuildState>(loadBuild())

build.subscribe(state => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {  }
})

export const result = derived(build, $b => calcBuild($b))

export function setEnchantment(slot: EnchantSlot, index: 0 | 1 | 2, value: string) {
  build.update(s => {
    const next = [...s.enchantments[slot]] as [string, string, string]
    next[index] = value
    return {
      ...s,
      enchantments: {
        ...s.enchantments,
        [slot]: enforceEnchantSlot(next, index)
      }
    }
  })
}

export function clearBuild() {
  build.set({ ...DEFAULT_BUILD })
}

export function setGuild(guildName: string, guildRank: number) {
  build.update(s => {
    const isDraconic = guildName === 'Draconic'
    return {
      ...s,
      guild: guildName,
      guildRank,
      race: isDraconic ? 'DRAGON BLOODED' : s.race,
      draconicColor: isDraconic ? (s.draconicColor || 'air') : '',
      draconicRuneInfusion: isDraconic ? s.draconicRuneInfusion : '',
    }
  })
}