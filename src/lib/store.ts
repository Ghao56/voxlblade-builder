import { writable, derived, get } from 'svelte/store'
import type { BuildState, EnchantSlot } from './types'
import { calcBuild, races, enforceEnchantSlot, armorSupportsSlot } from './engine'
import { isMonkGuild } from './engine/data/character'
import { STORAGE_KEY_BUILD, DEFAULT_LEVEL, DEFAULT_HP_FILL, DEFAULT_ENEMY_HP_FILL, SAVE_DEBOUNCE_MS } from './constants'

const DEFAULT_BUILD: BuildState = {
  race: races[0]?.name ?? "",
  guild: "",
  guildRank: 1,
  storedCorruptionAmount: 0,
  darkeningHexActivations: 10,
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
  upgradeInfusionHelmet: 0,
  upgradeInfusionChestplate: 0,
  upgradeInfusionLeggings: 0,
  upgradeInfusionRing: 0,
  selectedWeaponArt: "Lunge",
  draconicColor: "",
  draconicRuneInfusion: "",
  emotionalState: 'buffs',
  emotionalDisabled: false,
  propellingFunElement: 'air',
  propellingFunBuffMode: 'both',
  level: DEFAULT_LEVEL,
  hpFill: DEFAULT_HP_FILL,
  enemyHpFill: DEFAULT_ENEMY_HP_FILL,
  summonCount: 0,
  vassalsCroakSummons: undefined,
  lastCroakStacks: undefined,
  buffsConsumed: 0,
  sporelingsSummoned: 0,
  enchantedSwordType: 0,
  bastionBallistaArrows: 0,
  ichorSparkCharge: 100,
  divineCrashDistance: 250,
  channeledDepthsTime: 0,
  channeledDepthsTarget: 'WA',
  channeledDepthsHit: 1,
  voidContractTarget: 'M1',
  voidContractHit: 1,
  inDarkness: true,
  cdrToggles: {},
  potion1: "",
  potion2: "",
  disabledBoosts: ['Thief Training (would-crit bonus)'],
  disabledEffects: [],
  disabledBuffKeys: [],
  disabledPerkEntries: [],
  disabledHealBoosts: ['Extinguish'],
  rageDisabled: false,
  glyphConduitDisabled: false,
  extinguishDisabled: false,
  lightningCloakState: 'third',
  stormRendState: 'third',
  draconicInfusionDisabled: false,
  disableCurseRip: false,
  disableReaper: false,
  disableWeaponBoost: false,
  mycoticBloomDotDisabled: false,
  showCritValues: false,
  enemiesHit: 1,
  weaponCharge: 100,
}

function loadBuild(): BuildState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BUILD)
    if (!raw) return { ...DEFAULT_BUILD }
    const parsed = JSON.parse(raw) as Partial<BuildState>
    return { ...DEFAULT_BUILD, ...parsed }
  } catch {
    return { ...DEFAULT_BUILD }
  }
}

export const build = writable<BuildState>(loadBuild())

let _saveTimer: ReturnType<typeof setTimeout>
build.subscribe(state => {
  clearTimeout(_saveTimer)
  _saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BUILD, JSON.stringify(state))
    } catch {  }
  }, SAVE_DEBOUNCE_MS)
})

export const effectiveDarknessOverride = writable<boolean | null>(null)

export const result = derived([build, effectiveDarknessOverride], ([$b, $override]) => {
  const state = $override !== null ? { ...$b, inDarkness: $override } : $b
  return calcBuild(state)
})

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

function swapEnchantments(slotA: EnchantSlot, slotB: EnchantSlot) {
  if (slotA === slotB) return
  build.update(s => {
    const a = [...s.enchantments[slotA]] as [string, string, string]
    const b = [...s.enchantments[slotB]] as [string, string, string]
    return {
      ...s,
      enchantments: {
        ...s.enchantments,
        [slotA]: b,
        [slotB]: a,
      }
    }
  })
}

export const orkBuffTenacity = writable(0)

export function clearBuild() {
  build.set({ ...DEFAULT_BUILD })
}

export function setGuild(guildName: string, guildRank: number) {
  build.update(s => {
    const isDraconic = guildName === 'Draconic'
    const wasMonk = isMonkGuild(s.guild)
    const nowMonk = isMonkGuild(guildName)
    return {
      ...s,
      guild: guildName,
      guildRank,
      race: isDraconic ? 'DRAGON BLOODED' : s.race,
      draconicColor: isDraconic ? (s.draconicColor || 'air') : '',
      draconicRuneInfusion: isDraconic ? s.draconicRuneInfusion : '',
      weaponBlade: wasMonk && !nowMonk ? 'Basic Blade' : nowMonk ? '' : s.weaponBlade,
      weaponHandle: wasMonk && !nowMonk ? 'Basic Handle' : nowMonk ? '' : s.weaponHandle,
      monkGlove: nowMonk ? (s.monkGlove || 'Basic Gloves') : '',
      monkEssence: nowMonk ? (s.monkEssence || 'Basic Essence') : '',
    }
  })
}

export type ArmorSlotKey = 'helmet' | 'chestplate' | 'leggings'
export type InfusionArmorSlotKey = 'infusionHelmet' | 'infusionChestplate' | 'infusionLeggings'
export type AnyArmorSlotKey = ArmorSlotKey | InfusionArmorSlotKey

const ARMOR_SLOT_TYPE_MAP: Record<AnyArmorSlotKey, 'Helmet' | 'Chestplate' | 'Leggings'> = {
  helmet: 'Helmet', chestplate: 'Chestplate', leggings: 'Leggings',
  infusionHelmet: 'Helmet', infusionChestplate: 'Chestplate', infusionLeggings: 'Leggings',
}

const UPGRADE_KEY_MAP: Record<AnyArmorSlotKey, 'upgradeHelmet' | 'upgradeChestplate' | 'upgradeLeggings' | 'upgradeInfusionHelmet' | 'upgradeInfusionChestplate' | 'upgradeInfusionLeggings'> = {
  helmet: 'upgradeHelmet', chestplate: 'upgradeChestplate', leggings: 'upgradeLeggings',
  infusionHelmet: 'upgradeInfusionHelmet', infusionChestplate: 'upgradeInfusionChestplate', infusionLeggings: 'upgradeInfusionLeggings',
}

export function moveArmorSlot(from: AnyArmorSlotKey, to: AnyArmorSlotKey, clone = true): boolean {
  if (from === to) return false
  let moved = false
  build.update(s => {
    const fromName = s[from]
    const toName = s[to]
    if (!fromName) return s
    if (!armorSupportsSlot(fromName, ARMOR_SLOT_TYPE_MAP[to])) return s
    const fromUp = UPGRADE_KEY_MAP[from]
    const toUp = UPGRADE_KEY_MAP[to]
    if (toName) {
      if (!armorSupportsSlot(toName, ARMOR_SLOT_TYPE_MAP[from])) return s
      moved = true
      const next = { ...s, [from]: toName, [to]: fromName }
      next[fromUp] = s[toUp]
      next[toUp] = s[fromUp]
      return next
    }
    moved = true
    if (clone) {
      return { ...s, [to]: fromName, [toUp]: s[fromUp] }
    }
    return { ...s, [from]: '', [to]: fromName, [fromUp]: 0, [toUp]: s[fromUp] }
  })
  return moved
}

export function canArmorMoveToSlot(armorName: string, to: AnyArmorSlotKey): boolean {
  return !!armorName && armorSupportsSlot(armorName, ARMOR_SLOT_TYPE_MAP[to])
}

export type RingSlotKey = 'ring' | 'infusionRing'

const RING_UPGRADE_KEY: Record<RingSlotKey, 'upgradeRing' | 'upgradeInfusionRing'> = {
  ring: 'upgradeRing',
  infusionRing: 'upgradeInfusionRing',
}

export function moveRingSlot(from: RingSlotKey, to: RingSlotKey, clone = true): boolean {
  if (from === to) return false
  let moved = false
  build.update(s => {
    const fromName = s[from]
    if (!fromName) return s
    const toName = s[to]
    const fromUp = RING_UPGRADE_KEY[from]
    const toUp = RING_UPGRADE_KEY[to]
    if (toName) {
      moved = true
      const next = { ...s, [from]: toName, [to]: fromName }
      next[fromUp] = s[toUp]
      next[toUp] = s[fromUp]
      return next
    }
    moved = true
    if (clone) {
      return { ...s, [to]: fromName, [toUp]: s[fromUp] }
    }
    return { ...s, [from]: '', [to]: fromName, [fromUp]: 0, [toUp]: s[fromUp] }
  })
  return moved
}