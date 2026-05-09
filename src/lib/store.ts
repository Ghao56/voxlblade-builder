import { writable, derived } from 'svelte/store'
import type { BuildState, EnchantSlot } from './types'
import { calcBuild, races, guilds, enforceEnchantSlot } from './engine'

export const build = writable<BuildState>({
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
  // Upgrade levels (0 = +0, 5 = max)
  upgradeHelmet: 0,
  upgradeChestplate: 0,
  upgradeLeggings: 0,
  upgradeRing: 0,
  upgradeRune: 0,
})

export const result = derived(build, $b => calcBuild($b))

export function setEnchantment(slot: EnchantSlot, index: 0|1|2, value: string) {
  build.update(s => {
    const next = [...s.enchantments[slot]] as [string,string,string]
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