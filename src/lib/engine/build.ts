import type { StatKey, StatMap, ArmorPart, EnchantSlot, BuildState } from '../types'
import { STAT_KEYS, applyUpgrade } from '../types'
import { CDR_PERK_DATA } from '../../data/cdr'
import { applyStatBoostPerks, OFFENSIVE_BOOSTS } from '../../data/statboost'
import { getActiveBuildBuffs, getPerkBuffs, getWeaponArtBuffs, applyBuffPerkModifiers, convertTailwindToWhirlwind, assembleActiveBuffs, BUFF_DEFS } from '../../data/BuffData'
import { getActiveRaceEffect, calcOrkTenacityBonus } from '../../data/raceEffects'
import { BOOST_DEFS, type BoostContext } from '../../data/Boost'
import type { BoostEntry, BoostResult } from '../types'
import { calcCrit } from '../crit'
import type { CritResult } from '../crit'
import { roundMultiplier, calcWardingDebuffMultiplier } from '../utils'
import {
  getRace, getGuild, getGuildRank, getArmorPart, getRing, getRune,
  getBlade, getHandle, getGlove, getEssence, isMonkGuild, getPerk,
} from './data'
import { applyEnchantmentsToSlot, applyPerkEffectiveness, applyInfusion } from './enchant'
import { applyShrineToStats, SHRINE_MULTIPLIERS } from './shrine'
import { MONK_RANK_MULTIPLIER } from './weapon'

// ─── CDR ──────────────────────────────────────────────────────────────────────

export interface CDRStep   { source: string; pct: number; multiplier: number; isMultiply?: boolean }
export interface CDRResult { runeCDR: number; waCDR: number; runeSetCD?: number; runeBreakdown: CDRStep[]; waBreakdown: CDRStep[] }

function calcCDR(
  perks:                  Record<string, number>,
  raceCooldownModifiers?: Record<string, number>,
  activeRuneName?:        string,
  activeRaceName?:        string,
  emotionalState?:        'buffs' | 'debuffs' | 'both',
  cdrToggles?:            Record<string, boolean>,
): CDRResult {
  const runeSteps: CDRStep[] = []
  const waSteps:   CDRStep[] = []

  const emotionalAmt = perks["Emotional"] ?? 0
  if (emotionalAmt > 0 && emotionalState === 'buffs') {
    const totalPct = 0.5 * emotionalAmt
    waSteps.push({ source: "Emotional (Only Buffs)", pct: Math.round(totalPct * 100), multiplier: 1 / (1 + totalPct) })
  }

  let runeSetCD: number | undefined = undefined

  for (const perkName in perks) {
    if (!Object.prototype.hasOwnProperty.call(perks, perkName)) continue
    const perkAmount = perks[perkName]
    const data       = CDR_PERK_DATA[perkName]
    if (!data || perkAmount <= 0) continue

    if (data.toggleable && cdrToggles?.[perkName] === false) continue

    const passesFilter = data.runeFilter == null || (activeRuneName != null && data.runeFilter.includes(activeRuneName))
    if (data.runeSetCD != null && passesFilter) runeSetCD = data.runeSetCD

    if (data.runePct && passesFilter) {
      const totalPct = data.runePct * perkAmount
      runeSteps.push({ source: perkName, pct: Math.round(totalPct * 100), multiplier: 1 / (1 + totalPct) })
    }
    if (data.runeMultiplier) {
      const m = data.runeMultiplier(perkAmount)
      runeSteps.push({ source: perkName, pct: Math.round((m - 1) * 100), multiplier: m, isMultiply: true })
    }
    if (data.waPct) {
      const totalPct = data.waPct * perkAmount
      waSteps.push({ source: perkName, pct: Math.round(totalPct * 100), multiplier: 1 / (1 + totalPct) })
    }
    if (data.waMultiplier) {
      const m = data.waMultiplier(perkAmount)
      waSteps.push({ source: perkName, pct: Math.round((1 - m) * 100), multiplier: m, isMultiply: true })
    }
  }

  if (raceCooldownModifiers) {
    if (raceCooldownModifiers["RuneCDR"] != null) {
      const m = raceCooldownModifiers["RuneCDR"]
      runeSteps.push({ source: `${activeRaceName} (Race)`, pct: Math.round((1 - m) * 100), multiplier: m, isMultiply: true })
    }
    if (raceCooldownModifiers["weaponArtCDR"] != null) {
      const m = raceCooldownModifiers["weaponArtCDR"]
      waSteps.push({ source: `${activeRaceName} (Race)`, pct: Math.round((1 - m) * 100), multiplier: m, isMultiply: true })
    }
  }

  let rCDR = 1.0
  for (let i = 0; i < runeSteps.length; i++) rCDR *= runeSteps[i].multiplier
  let wCDR = 1.0
  for (let i = 0; i < waSteps.length; i++) wCDR *= waSteps[i].multiplier

  return {
    runeCDR:       roundMultiplier(rCDR),
    waCDR:         roundMultiplier(wCDR),
    runeSetCD,
    runeBreakdown: runeSteps,
    waBreakdown:   waSteps,
  }
}

// ─── Boosts ───────────────────────────────────────────────────────────────────

function calcBoosts(
  perks:             Record<string, number>,
  emotionalState?:   string,
  level:             number = 80,
  naturalCritChance: number = 0,
  jumpBoost:         number = 0,
  summonCount:       number = 0,
  ragePotency:       number = 0,
  bouncePotency:     number = 0,
  tailwindPotency:   number = 0,
  speedBoost:        number = 0,
  attackSpeed:       number = 0,
  tenacity:          number = 0,
  raceName?:         string,
  hpFillPct?:        number,
  inDarkness:        boolean = true,
  mountActive:       boolean = true,
  summonBoostPct:    number = 0,
  quickdrawPotency:  number = 0,
  selectedWeaponArt?: string,
): BoostResult {
  const dmgMap  = new Map<string, BoostEntry>()
  const healMap = new Map<string, BoostEntry>()

  const lvlMult = roundMultiplier(1 + Math.max(0, Math.min(80, level)) / 80)
  dmgMap.set('Level Damage', {
    sourceName:    'Level Damage',
    rawMultiplier: lvlMult,
    condition:     `LV0 → ×1.0 · LV80 → ×2.0`,
    type:          'dmg',
  })
  healMap.set('Level Healing', {
    sourceName:    'Level Healing',
    rawMultiplier: lvlMult,
    condition:     `LV0 → ×1.0 · LV80 → ×2.0`,
    type:          'heal',
  })

  const ctx: BoostContext = {
    perks, naturalCritChance, jumpBoost, summonCount,
    ragePotency, bouncePotency, quickdrawPotency,
    tailwindPotency, speedBoost, attackSpeed, tenacity, inDarkness, emotionalState, level,
    mountActive, summonBoostPct, selectedWeaponArt, hpFillPct,
  }

  for (const def of BOOST_DEFS) {
    if (def.isLevel) continue

    if (def.calcFn) {
      const result = def.calcFn(ctx)
      if (result) {
        const entry: BoostEntry = {
          sourceName:    def.sourceName,
          rawMultiplier: result.multiplier,
          condition:     result.condition,
          type:          def.type,
          appliesTo:     def.appliesTo,
          needsProcCoeff: def.needsProcCoeff,
          procScaling:   def.procScaling,
          hasToggle:     def.hasToggle,
        }
        if (def.type === 'dmg') dmgMap.set(def.sourceName, entry)
        else                      healMap.set(def.sourceName, entry)
      }
      continue
    }

    if (def.multiplierPerPerk !== undefined) {
      const perkAmount = perks[def.sourceName] ?? 0
      if (perkAmount <= 0) continue

      if (def.sourceName === 'Emotional' && def.type === 'heal' && emotionalState !== 'both') continue

      const entry: BoostEntry = {
        sourceName:    def.sourceName,
        rawMultiplier: 1 + def.multiplierPerPerk * perkAmount,
        condition:     def.condition,
        type:          def.type,
        appliesTo:     def.appliesTo,
        needsProcCoeff: def.needsProcCoeff,
        procScaling:   def.procScaling,
        hasToggle:     def.hasToggle,
      }
      if (def.type === 'dmg') dmgMap.set(def.sourceName, entry)
      else                      healMap.set(def.sourceName, entry)
    }
  }

  if (raceName && hpFillPct != null) {
    const raceEffect = getActiveRaceEffect(raceName, hpFillPct)
    if (raceEffect?.dmgBoostMultiplier) {
      dmgMap.set(raceEffect.label, {
        sourceName:    raceEffect.label,
        rawMultiplier: raceEffect.dmgBoostMultiplier,
        condition:     raceEffect.condition,
        type:          'dmg',
      })
    }
  }

  const dmgEntries  = [...dmgMap.values()]
  const healEntries = [...healMap.values()]

  let dmgFinal = 1.0
  for (let i = 0; i < dmgEntries.length; i++) dmgFinal *= dmgEntries[i].rawMultiplier
  let healFinal = 1.0
  for (let i = 0; i < healEntries.length; i++) healFinal *= healEntries[i].rawMultiplier

  return {
    dmgEntries,
    healEntries,
    dmgFinalMultiplier:  roundMultiplier(dmgFinal),
    healFinalMultiplier: roundMultiplier(healFinal),
  }
}

// ─── Build result ─────────────────────────────────────────────────────────────

export interface BuildResult { stats: StatMap; perks: Record<string, number>; cdr: CDRResult; boosts: BoostResult; crit: CritResult }

// ─── Equipment accumulation ───────────────────────────────────────────────────

function accumulateMonkWeapon(
  state:    BuildState,
  perks:    Record<string, number>,
  addStats: (s: StatMap | undefined | null) => void,
  addPerks: (list: Array<{ name: string; amount: number }> | undefined) => void,
): void {
  const glove = getGlove(state.monkGlove)
  if (glove) {
    const monkPerkBonus  = Math.max(0, state.guildRank - 1)
    const monkPct        = monkPerkBonus * MONK_RANK_MULTIPLIER
    const gloveStats:    StatMap = {}
    const baseGloveStats = glove.stats as StatMap

    for (let i = 0; i < STAT_KEYS.length; i++) {
      const k = STAT_KEYS[i]
      const v = baseGloveStats[k]
      if (v == null) continue
      const shrineMult = state.shrineActive ? (SHRINE_MULTIPLIERS[glove.tier] ?? 1.0) : 1.0
      const monkPart = v > 0 ? v * monkPct : 0
      gloveStats[k] = v * shrineMult + monkPart
    }
    addStats(gloveStats)
    if (glove.perkName) perks[glove.perkName] = (perks[glove.perkName] ?? 0) + (glove.perkAmount ?? 1)
    if ((glove as any).perks) {
      const gp = (glove as any).perks
      for (let i = 0; i < gp.length; i++) {
        perks[gp[i].name] = (perks[gp[i].name] ?? 0) + gp[i].amount + (i === 0 ? Math.max(0, state.guildRank - 1) : 0)
      }
    }
  }

  const essence = getEssence(state.monkEssence)
  if (essence) {
    const _monkPct  = Math.max(0, state.guildRank - 1) * MONK_RANK_MULTIPLIER
    const _baseEss  = essence.stats as StatMap
    if (_monkPct > 0) {
      const _boostedEss: StatMap = {}
      for (let i = 0; i < STAT_KEYS.length; i++) {
        const k = STAT_KEYS[i]
        const v = _baseEss[k]
        if (v == null) continue
        const _sm = state.shrineActive ? (SHRINE_MULTIPLIERS[essence.tier] ?? 1.0) : 1.0
        _boostedEss[k] = v > 0 ? v * _sm + v * _monkPct : v * _sm
      }
      addStats(_boostedEss)
    } else {
      addStats(state.shrineActive ? applyShrineToStats(_baseEss, essence.tier) : _baseEss)
    }
    if (essence.perkName) perks[essence.perkName] = (perks[essence.perkName] ?? 0) + (essence.perkAmount ?? 1)
    if ((essence as any).perks) addPerks((essence as any).perks)
  }
}

function accumulateStandardWeapon(
  state:    BuildState,
  perks:    Record<string, number>,
  addStats: (s: StatMap | undefined | null) => void,
  addPerks: (list: Array<{ name: string; amount: number }> | undefined) => void,
): void {
  const blade = getBlade(state.weaponBlade)
  if (blade) {
    addStats(state.shrineActive ? applyShrineToStats(blade.stats as StatMap, blade.tier) : blade.stats as StatMap)
    if (blade.perkName) perks[blade.perkName] = (perks[blade.perkName] ?? 0) + (blade.perkAmount ?? 1)
    if ((blade as any).perks) addPerks((blade as any).perks)
  }
  const handle = getHandle(state.weaponHandle)
  if (handle) {
    addStats(state.shrineActive ? applyShrineToStats(handle.stats as StatMap, handle.tier) : handle.stats as StatMap)
    if (handle.perkName) perks[handle.perkName] = (perks[handle.perkName] ?? 0) + (handle.perkAmount ?? 1)
    if ((handle as any).perks) addPerks((handle as any).perks)
  }
}

function processEnchantedSlot(
  itemName: string,
  getItem: (name: string) => any,
  upgrade: number,
  enchants: [string, string, string],
  addStats: (s: StatMap | undefined | null) => void,
  addPerkMap: (map: Record<string, number>) => void,
): void {
  if (!itemName) return
  const item = getItem(itemName)
  if (!item) return
  let slotResult = applyEnchantmentsToSlot(
    item.stats,
    item.perkName ? { [item.perkName]: item.perkAmount ?? 1 } : {},
    enchants,
    upgrade,
  )
  addStats(slotResult.stats)
  addPerkMap(slotResult.perks)
}

function accumulateEquipment(state: BuildState): { stats: StatMap; perks: Record<string, number> } {
  const stats: StatMap                = {}
  const perks: Record<string, number> = {}

  const addStats = (s: StatMap | undefined | null) => {
    if (!s) return
    for (let i = 0; i < STAT_KEYS.length; i++) {
      const k = STAT_KEYS[i]
      if (s[k] != null) stats[k] = (stats[k] ?? 0) + (s[k] ?? 0)
    }
  }
  const addPerks = (list: Array<{ name: string; amount: number }> | undefined) => {
    if (!list) return
    for (let i = 0; i < list.length; i++) {
      perks[list[i].name] = (perks[list[i].name] ?? 0) + list[i].amount
    }
  }
  const addPerkMap = (map: Record<string, number>) => {
    for (const k in map) {
      if (Object.prototype.hasOwnProperty.call(map, k)) perks[k] = (perks[k] ?? 0) + map[k]
    }
  }

  addStats(getRace(state.race)?.statModifiers)

  const guild = getGuild(state.guild)
  if (guild) {
    const rank = getGuildRank(guild, state.guildRank)
    if (rank) { addStats(rank.stats); addPerks(rank.perks) }

    if (guild.name === 'Cursed' && state.storedCorruptionAmount > 0) {
      addPerkMap({ 'Stored Corruption': state.storedCorruptionAmount })
    }
  }

  const armorSlots: Array<[string, ArmorPart["type"], EnchantSlot, 'upgradeHelmet' | 'upgradeChestplate' | 'upgradeLeggings']> = [
    [state.helmet,     "Helmet",     "helmet",     "upgradeHelmet"],
    [state.chestplate, "Chestplate", "chestplate", "upgradeChestplate"],
    [state.leggings,   "Leggings",   "leggings",   "upgradeLeggings"],
  ]
  for (let i = 0; i < armorSlots.length; i++) {
    const [armorName, partType, enchSlot, upgradeKey] = armorSlots[i]
    if (!armorName) continue
    const part = getArmorPart(armorName, partType)
    if (!part) continue
    const upgrade = state[upgradeKey] ?? 0
    let slotResult = applyEnchantmentsToSlot(
      part.stats as StatMap,
      part.perkName ? { [part.perkName]: 1 } : {},
      state.enchantments[enchSlot],
      upgrade,
    )
    addStats(slotResult.stats)
    addPerkMap(slotResult.perks)
  }

  processEnchantedSlot(state.ring, getRing, state.upgradeRing ?? 0, state.enchantments.ring, addStats, addPerkMap)
  processEnchantedSlot(state.rune, getRune, state.upgradeRune ?? 0, state.enchantments.rune, addStats, addPerkMap)

  if (isMonkGuild(state.guild)) {
    accumulateMonkWeapon(state, perks, addStats, addPerks)
  } else {
    accumulateStandardWeapon(state, perks, addStats, addPerks)
  }

  const infusionSlots: Array<[string, ArmorPart["type"] | "Ring"]> = [
    [state.infusionHelmet,     "Helmet"],
    [state.infusionChestplate, "Chestplate"],
    [state.infusionLeggings,   "Leggings"],
    [state.infusionRing,       "Ring"],
  ]
  for (let i = 0; i < infusionSlots.length; i++) {
    const [infName, infType] = infusionSlots[i]
    if (!infName) continue
    const part = infType === "Ring" ? getRing(infName) : getArmorPart(infName, infType)
    if (part) {
      const inf = applyInfusion(part.stats as StatMap, part.perkName ? { [part.perkName]: (part as any).perkAmount ?? 1 } : {})
      addStats(inf.stats)
      addPerkMap(inf.perks)
    }
  }

  return { stats, perks }
}

function finalizePerks(rawPerks: Record<string, number>): Record<string, number> {
  let finalPerks: Record<string, number> = {}
  for (const k in rawPerks) {
    if (Object.prototype.hasOwnProperty.call(rawPerks, k)) {
      if (rawPerks[k] !== 0) finalPerks[k] = rawPerks[k]
    }
  }

  const cursedStacks            = finalPerks["Cursed"] ?? 0
  const perkEffectivenessStacks = finalPerks["Perk Effectiveness"] ?? 0
  if (perkEffectivenessStacks > 0 || cursedStacks > 0) {
    finalPerks = applyPerkEffectiveness(finalPerks, perkEffectivenessStacks, cursedStacks)
  }

  if (finalPerks["Buckler"] != null) finalPerks["Parry"] = (finalPerks["Parry"] ?? 0) + finalPerks["Buckler"]

  // Grantor perks (Ignition, Trickster, etc.) contribute their final amount to Potency perks
  const POTENCY_PERKS = new Set(['Bleed Potency', 'Burn Potency', 'Poison Potency'])
  for (const k of Object.keys(finalPerks)) {
    if (POTENCY_PERKS.has(k)) continue
    const def = getPerk(k)
    if (!def) continue
    for (const tag of def.tags) {
      if (POTENCY_PERKS.has(tag)) {
        finalPerks[tag] = (finalPerks[tag] ?? 0) + finalPerks[k]
      }
    }
  }

  return finalPerks
}

function applyEmotionalAttackSpeed(boostedStats: StatMap, finalPerks: Record<string, number>, emotionalState?: string): void {
  const emotionalAmt = finalPerks['Emotional'] ?? 0
  if (emotionalAmt > 0 && emotionalState === 'debuffs') {
    boostedStats.attackSpeed = (boostedStats.attackSpeed ?? 0) + 0.2 * emotionalAmt
  }
}

function applyGladiatorialRage(boostedStats: StatMap, finalPerks: Record<string, number>): void {
  if ((finalPerks['Gladiatorial Rage'] ?? 0) <= 0) return
  let highestBoost = 0
  for (let i = 0; i < OFFENSIVE_BOOSTS.length; i++) {
    const bV = boostedStats[OFFENSIVE_BOOSTS[i]] ?? 0
    if (bV > highestBoost) highestBoost = bV
  }
  const armorPen = highestBoost / 15
  if (armorPen > 0) boostedStats['armorPenetration'] = (boostedStats['armorPenetration'] ?? 0) + armorPen
}

function computeBuffs(state: BuildState, finalPerks: Record<string, number>, wardingDebuffMult: number): { allBuffs: any[]; orkBuffTenacity: number } {
  const allBuffs = assembleActiveBuffs(state, finalPerks, wardingDebuffMult)

  const orkBuffTenacity = state.race === 'ORK' ? calcOrkTenacityBonus(allBuffs, BUFF_DEFS) : 0
  return { allBuffs, orkBuffTenacity }
}

function maxBuffPotency(allBuffs: any[], buffName: string | string[]): number {
  const names = Array.isArray(buffName) ? buffName : [buffName]
  const vals  = allBuffs.filter(b => names.includes(b.buffName)).map(b => b.potency)
  return vals.length > 0 ? Math.max(...vals) : 0
}

function deriveResults(
  rawStats:   StatMap,
  finalPerks: Record<string, number>,
  state:      BuildState,
): BuildResult {
  const finalStats: StatMap = {}
  for (let i = 0; i < STAT_KEYS.length; i++) {
    const k = STAT_KEYS[i]
    if (rawStats[k] != null && rawStats[k] !== 0) {
      finalStats[k] = rawStats[k]
    }
  }

  const cdr = calcCDR(
    finalPerks,
    getRace(state.race)?.cooldownModifiers,
    state.rune || undefined,
    state.race || undefined,
    state.emotionalState,
    state.cdrToggles,
  )

  const boostedStats = applyStatBoostPerks(finalStats, finalPerks)
  applyEmotionalAttackSpeed(boostedStats, finalPerks, state.emotionalState)
  applyGladiatorialRage(boostedStats, finalPerks)

  const crit = calcCrit(boostedStats, finalPerks)

  const wardingDebuffMult = calcWardingDebuffMultiplier(boostedStats.warding ?? 0)
  const { allBuffs, orkBuffTenacity } = computeBuffs(state, finalPerks, wardingDebuffMult)
  const ragePotency      = maxBuffPotency(allBuffs, 'Rage')
  const bouncePotency    = maxBuffPotency(allBuffs, 'Bounce')
  const quickdrawPotency = maxBuffPotency(allBuffs, 'Quickdraw')
  const tailwindPotency  = maxBuffPotency(allBuffs, ['Tailwind', 'Whirlwind'])

  const _rawFill = state.hpFill ?? 100
  const _protection = boostedStats.protection ?? 0
  let _actualHpFill = _rawFill
  if (_protection < 0) {
    const _baseMaxHP = Math.round(120 * (1 + (state.level ?? 80) * 0.0125))
    const _effMaxHP  = Math.max(Math.round(_baseMaxHP * 0.1), _baseMaxHP + Math.round(_protection))
    _actualHpFill = Math.min(100, Math.round(_rawFill * _effMaxHP / _baseMaxHP * 100) / 100)
  }

  const isMountRune = state.rune.endsWith('Mount Rune')
  const boosts = calcBoosts(
    finalPerks, state.emotionalState, state.level ?? 80,
    crit.naturalCritChance, boostedStats.jumpBoost ?? 0,
    state.summonCount ?? 0, ragePotency, bouncePotency,
    tailwindPotency, boostedStats.speedBoost ?? 0, boostedStats.attackSpeed ?? 0, (finalStats.tenacity ?? 0) + orkBuffTenacity,
    state.race, _actualHpFill, state.inDarkness ?? true,
    isMountRune,
    boostedStats.summonBoost ?? 0, quickdrawPotency,
    state.selectedWeaponArt,
  )
  return { stats: boostedStats, perks: finalPerks, cdr, boosts, crit }
}

export function calcBuild(state: BuildState): BuildResult {
  const { stats, perks } = accumulateEquipment(state)
  const finalPerks       = finalizePerks(perks)
  return deriveResults(stats, finalPerks, state)
}