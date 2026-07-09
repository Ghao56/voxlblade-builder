<script lang="ts">
  import { build, result, clearBuild } from './lib/store'
  import DraconicAbilityStats from './DraconicAbilityStats.svelte'
  import {
    races, guilds, armors, rings, runes, blades, handles, gloves, essences,
    getGuild, getArmorPart, getRing, getRune, getEnchant, getPerk,
    getBlade, getHandle, getGlove, getEssence,
    formatStat, formatLabel, applyEnchantmentsToSlot, applyInfusion,
    calcWeapon, calcMonkWeapon, isMonkGuild, MONK_RANK_MULTIPLIER,
    type CDRResult
  } from './lib/engine'
  import { setEnchantment, setGuild } from './lib/store'
  import type { EnchantSlot, StatMap, StatPrefix, ScalingKey } from './lib/types'
  import { DMG_TYPE_PRIORITY, SCALING_TO_BOOST } from './lib/types'
  import { OFFENSIVE_BOOSTS } from './data/statboost'
  import { enchantments, getEnchant as ge, isExclusiveEnchant } from './lib/engine'
  import EnchantSelect from './lib/EnchantSelect.svelte'
  import { getEnchantTooltipText } from './lib/enchantTooltip'
  import { applyUpgrade, UPGRADE_MAX } from './lib/types'
  import { WEAPON_ARTS, type WeaponArt } from './data/weaponArts'
  import {
    DRAGON_CLAW_BASE_DAMAGE, DRAGON_CLAW_DAMAGE_PER_STACK,
    DRAGON_CLAW_HOLY_HEAL_BASE, DRAGON_CLAW_HOLY_HEAL_PER_STACK,
    DRAGON_CLAW_WATER_HEAL_BASE, DRAGON_CLAW_WATER_HEAL_PER_STACK,
    DRAGON_BUBBLE_BASE_DAMAGE, DRAGON_BUBBLE_DAMAGE_PER_STACK,
    DRAGON_BUBBLE_HOLY_HEAL_BASE, DRAGON_BUBBLE_HOLY_HEAL_PER_STACK,
    DRAGON_BUBBLE_WATER_HEAL_BASE, DRAGON_BUBBLE_WATER_HEAL_PER_STACK,
    DRAGON_STATE_HP_GATE,
    gateThreshold
  } from './data/Perkbasedmg'
  import { DRACONIC_COLOR_ATTACK_STATS } from './data/draconicColorEffects'
  import EmotionalTracker from './EmotionalTracker.svelte'
  import LevelBar from './LevelBar.svelte'
  import DamageAnalyzer from './DamageAnalyzer.svelte'
  import TagFilter from './TagFilter.svelte'
  import StatFilter from './StatFilter.svelte'
  import WeaponStatFilter from './WeaponStatFilter.svelte'
  import BuffList from './BuffList.svelte'
  import { checkWA, getUnmetReqs } from './data/Weaponartcheck'
  import { getEffectiveDraconicInfusionPotency } from './data/draconicBuffs'
  import { BUFF_DEFS, getActiveBuildBuffs, getPerkBuffs, getWeaponArtBuffs, applyBuffPerkModifiers, convertTailwindToWhirlwind, formatPerkDescription } from './data/BuffData'
  import { calcOrkTenacityBonus } from './data/raceEffects'
  import { CDR_PERK_DATA } from './data/cdr'
  import { calcMaxSummonCount } from './data/SummonData'
  import CdrStepsCalc from './CdrStepsCalc.svelte'
  import { RaceModal, GuildModal, AccessorySelectModal, WeaponPartModal } from './lib/modals'
  import AppHeader from './lib/AppHeader.svelte'
  import Toast from './lib/Toast.svelte'
  import { addToast } from './lib/stores/toast'

  function toggleCdrPerk(perkName: string) {
    build.update(s => {
      const toggles = s.cdrToggles ?? {}
      return {
        ...s,
        cdrToggles: {
          ...toggles,
          [perkName]: toggles[perkName] === false ? true : false,
        },
      }
    })
  }

  $: toggleableCdrPerks = Object.keys(CDR_PERK_DATA).filter(name =>
    CDR_PERK_DATA[name].toggleable && ($result.perks[name] ?? 0) > 0
  )
  $: {
    const _maxSummons = calcMaxSummonCount($result.perks)
    if ($build.summonCount !== _maxSummons) {
      build.update(s => ({ ...s, summonCount: _maxSummons }))
    }
  }

  $: _dragonStateAmt = $result.perks['Dragon State'] ?? 0
  $: _dragonStateThreshold = _dragonStateAmt > 0 ? gateThreshold(DRAGON_STATE_HP_GATE, _dragonStateAmt) : undefined
  $: _weightySlamAmt = $result.perks['Weighty Slam'] ?? 0

  let weaponStatFilter: Map<string, 'include' | 'exclude'> = new Map()
  let weaponStatFilterRef: WeaponStatFilter

  let statFilterSortMode:'highest'|'lowest'|'alphabetical'|'most-effective'|'brawny'='highest'
  let weaponStatFilterSortMode:'highest'|'lowest'|'alphabetical'= 'highest'

  // ── Armor effective-boost sort helpers ────────────────────────────────────
  function computeArmorEffectiveBoost(
    armorStats: Record<string, number>,
    weaponScalings: Record<string, number>,
    statMultiplier: number = 1
  ): number {
    let total = 0
    for (const [key, scalingVal] of Object.entries(weaponScalings)) {
      const boostKey = SCALING_TO_BOOST[key]
      if (!boostKey) continue
      total += scalingVal * (armorStats[boostKey] ?? 0)
    }
    return Math.round(total * statMultiplier * 100) / 100
  }

  function computeArmorBrawnyEffectiveBoost(
    armorStats: Record<string, number>,
    weaponScalings: Record<string, number>,
    brawnyAmt: number,
    statMultiplier: number = 1
  ): number {
    const convRate = Math.min(brawnyAmt, 1.0)
    const s: Record<string, number> = { ...armorStats }
    let gained = 0
    for (const key of OFFENSIVE_BOOSTS) {
      if (key === 'physicalBoost') continue
      const val = s[key] ?? 0
      if (val <= 0) continue
      const c = val * convRate
      s[key] = val - c
      gained += c
    }
    s['physicalBoost'] = (s['physicalBoost'] ?? 0) + gained
    return computeArmorEffectiveBoost(s, weaponScalings, statMultiplier)
  }

  $: _armorSortScalings = weaponResult?.scalings ?? {}
  $: _brawnyPerkAmt = $result.perks['Brawny'] ?? 0
  $: _armorSortActive = (statFilterSortMode === 'most-effective' || statFilterSortMode === 'brawny') && Object.keys(_armorSortScalings).length > 0

function weaponMatchesFilter(item: any): boolean {
  if (weaponStatFilter.size === 0) return true;
  for (const [key, state] of weaponStatFilter) {
    const val = item[key] ?? item.stats?.[key] ?? 0;
    if (state === 'include' && !(val > 0)) return false;
    if (state === 'exclude' &&   val > 0)  return false;
  }
  return true;
}

  let activeAppTab: 'overview' | 'analyze' = 'overview'

  function switchTab(tab: 'overview' | 'analyze') {
    if (tab === activeAppTab) return
    activeAppTab = tab
  }

  // ── Undo clear ─────────────────────────────────────────────────────────────
  import type { BuildState } from './lib/types'
  let _previousBuild: BuildState | null = null
  let _undoVisible = false
  let _undoTimer: ReturnType<typeof setTimeout> | null = null

  function handleClearBuild() {
    _previousBuild = { ...$build, enchantments: JSON.parse(JSON.stringify($build.enchantments)) }
    clearBuild()
    _undoVisible = true
    if (_undoTimer) clearTimeout(_undoTimer)
    _undoTimer = setTimeout(() => { _undoVisible = false; _previousBuild = null }, 8000)
    addToast('Build cleared', 'info')
  }

  function handleUndo() {
    if (!_previousBuild) return
    build.set(_previousBuild)
    _previousBuild = null
    _undoVisible = false
    if (_undoTimer) { clearTimeout(_undoTimer); _undoTimer = null }
  }

  function toggleUpgrade(key: 'upgradeHelmet'|'upgradeChestplate'|'upgradeLeggings'|'upgradeRing'|'upgradeRune') {
    build.update(s => ({...s, [key]: (s[key] + 1) % (UPGRADE_MAX + 1)}))
  }

  function adjustStoredCorruption(delta: number) {
    build.update(s => ({
      ...s,
      storedCorruptionAmount: Math.max(0, Math.floor((s.storedCorruptionAmount ?? 0) + delta)),
    }))
  }
 
  function clampStoredCorruption() {
    build.update(s => ({
      ...s,
      storedCorruptionAmount: Math.max(0, Math.floor(s.storedCorruptionAmount ?? 0)),
    }))
  }

  $: storedCorruptionAmt = $build.storedCorruptionAmount ?? 0
  $: storedCorruptionDurationMult = Math.round((1 + storedCorruptionAmt * 0.1) * 100) / 100
  $: storedCorruptionDmgTakenPct = Math.round(storedCorruptionAmt * 5 * 100) / 100

    import { tick, onMount } from 'svelte'

  let waHydrated = false
  onMount(async () => {
    await tick()
    waHydrated = true
  })

// ── Modal state ────────────────────────────────────────────────────────────
  type ModalType = 'race' | 'guild' | 'armor-helmet' | 'armor-chestplate' | 'armor-leggings' | 'infusion-helmet' | 'infusion-chestplate' | 'infusion-leggings' | 'ring' | 'infusion-ring' | 'rune' | 'blade' | 'handle' | 'glove' | 'essence' | null
  let activeModal: ModalType = null
  let modalSearch = ''
  function openModal(m: ModalType) { activeModal = m; modalSearch = ''; statFilter = new Map() }
  function closeModal() { activeModal = null; modalSearch = '' }


  function matchSearch(name: string, perkNames: string[] = []): boolean {
    if (!modalSearch.trim()) return true
    const q = modalSearch.toLowerCase()
    if (name.toLowerCase().includes(q)) return true
    return perkNames.some(p => p.toLowerCase().includes(q))
  }

  // Helper: extract perk names from a weapon part (blades/handles/gloves/essences have perks array)
  function getPerkNames(data: any): string[] {
    if (!data) return []
    const names: string[] = []
    if (data.perkName) names.push(data.perkName)
    if (Array.isArray(data.perks)) data.perks.forEach((p: any) => p?.name && names.push(p.name))
    return names
  }


  // ── Collapsible panels ─────────────────────────────────────────────────────
  let showDetailsPanel = true
  let showPerksPanel = true
  let activePerksTab: 'perks' | 'boosts' = 'perks'
  let activeDetailsTab: 'selection' | 'weapon' = 'selection'

  // ── Inline enchant panel ───────────────────────────────────────────────────
  let inlineEnchantSlot: EnchantSlot | null = null
  function toggleInlineEnchant(slot: EnchantSlot) {
    inlineEnchantSlot = inlineEnchantSlot === slot ? null : slot
  }
  // ── Derived ────────────────────────────────────────────────────────────────
  $: guildData = getGuild($build.guild)
  $: isMonk = isMonkGuild($build.guild)

  $: raceArmorPen = (() => {
    const race = races.find(r => r.name === $build.race)
    return (race?.statModifiers as Record<string,number> | undefined)?.armorPenetration ?? 0
  })()
$: gladRageArmorPen = (() => {
  if (($result.perks['Gladiatorial Rage'] ?? 0) <= 0) return 0
  const BOOST_KEYS = ['dexterityBoost','physicalBoost','magicBoost','fireBoost','waterBoost','earthBoost','airBoost','hexBoost','holyBoost']
  const highestBoost = Math.max(0, ...BOOST_KEYS.map(k => ($result.stats as Record<string,number>)[k] ?? 0))
  return highestBoost / 15
})()

$: _orkTenacityBonus = $build.race === 'ORK' ? (() => {
  const itemBuffs = getActiveBuildBuffs({
    rune: $build.rune, ring: $build.ring, infusionRing: $build.infusionRing,
    helmet: $build.helmet, chestplate: $build.chestplate, leggings: $build.leggings,
    weaponBlade: $build.weaponBlade, weaponHandle: $build.weaponHandle,
    monkGlove: $build.monkGlove, race: $build.race,
  })
  const baseBuffs = [...itemBuffs, ...getPerkBuffs($result.perks), ...getWeaponArtBuffs($build.selectedWeaponArt)]
  const processed = convertTailwindToWhirlwind(applyBuffPerkModifiers(baseBuffs, $result.perks, $build.rune || undefined), $result.perks)
  return calcOrkTenacityBonus(processed, BUFF_DEFS)
})() : 0
$: _effectiveTenacity = ($result.stats.tenacity ?? 0) + _orkTenacityBonus

$: statRows = Object.entries($result.stats).filter(([k, v]) => {
    if (k === 'armorPenetration') {
      const displayVal = (v as number) - raceArmorPen - gladRageArmorPen
      return displayVal !== 0
    }
    return v !== 0
  }).map(([k, v]) => {
    if (k === 'armorPenetration') return [k, (v as number) - raceArmorPen - gladRageArmorPen] as [string, number]
    if (k === 'tenacity') return [k, _effectiveTenacity] as [string, number]
    return [k, v] as [string, number]
  }).sort(([a],[b]) => a.localeCompare(b))

  $: perkRows = Object.entries($result.perks).filter(([,v]) => v > 0).sort(([a],[b]) => a.localeCompare(b))
  $: cdr = $result.cdr
  $: isDraconic = $build.guild === 'Draconic'

  const DRACO_COLORS = DRACONIC_COLOR_ATTACK_STATS.map(c => ({
    id: c.color,
    label: c.label,
    color: c.colorHex,
    stat: c.stat
  }))

  $: dracoColor = DRACO_COLORS.find(c => c.id === $build.draconicColor) ?? null
  $: isDragonBlooded = $build.race === 'DRAGON BLOODED'

  const DRACONIC_ABILITIES: Array<{ id: string; label: string }> = [
    { id: 'claw',     label: 'Dragon Claw' },
    { id: 'infusion', label: 'Dragon Infusion' },
    { id: 'bubble',   label: 'Dragon Bubble' },
  ]

  $: selectedDraconicAbility = DRACONIC_ABILITIES.find(a => a.id === $build.draconicRuneInfusion) ?? null

  function selectDraconicAbility(id: string) {
    build.update(s => ({ ...s, draconicRuneInfusion: s.draconicRuneInfusion === id ? '' : id }))
  }

  function cycleDraconicAbility() {
    const ids = DRACONIC_ABILITIES.map(a => a.id)
    const idx = ids.indexOf($build.draconicRuneInfusion)
    build.update(s => ({ ...s, draconicRuneInfusion: ids[(idx + 1) % ids.length] }))
  }

  function linearDmg(base: number, perStack: number, pa: number) { return base + perStack * pa }
  function linearHeal(base: number, perStack: number, pa: number) { return +(base + perStack * pa).toFixed(3) }

  $: draconicPerkAmt = (() => {
    const p = $result.perks['Draconic Blood'] ?? 0
    return Math.round(p * 100) / 100
  })()
  $: dragonInfusionPreviewPotency = getEffectiveDraconicInfusionPotency($build.guild, 'infusion', $build.draconicColor || 'physical', draconicPerkAmt, $result.perks)

  $: draconicBaseCDs = { claw: 5, infusion: 35, bubble: 7 }
  $: draconicColorEffectRows = (() => {
    const amt = draconicPerkAmt
    const c = $build.draconicColor
    if (!c) return []
    const rows: Array<{k: string, v: string}> = []
    if (c === 'air') {
      rows.push({ k: 'Atk Speed',  v: `+${Math.round(amt * 10 * 100)/100}% ` })
      rows.push({ k: 'Knockback',  v: `+${Math.round(amt * 20 * 100)/100}% ` })
    } else if (c === 'fire') {
      rows.push({ k: 'Burn Chance', v: '100% (proc-affected)' })
      rows.push({ k: 'Burn Potency',v: `+${Math.round(amt * 15 * 100)/100}% ` })
    } else if (c === 'hex') {
      rows.push({ k: 'Debuff Pot.',  v: `+${Math.round(amt * 5 * 100)/100}% ` })
      rows.push({ k: 'Debuff Dur.',  v: `+${Math.round(amt * 15 * 100)/100}% ` })
    } else if (c === 'holy') {
      rows.push({ k: 'Healing',     v: `+${Math.round(amt * 10 * 100)/100}% ` })
      rows.push({ k: 'Buff Potency',v: `+${Math.round(amt * 5 * 100)/100}% ` })
    } else if (c === 'water') {
      rows.push({ k: 'Debuff Immunity', v: 'Active' })
      rows.push({ k: 'Pulse CD',    v: `${Math.max(1, 8 - amt)}s (heal 0.1 · 1.0 Water)` })
    } else if (c === 'earth') {
      rows.push({ k: 'Poise Dmg',   v: `+${Math.round(amt * 15 * 100)/100}% ` })
      rows.push({ k: 'Stun Resist', v: `+${Math.round(amt * 0.15 * 1000)/1000} ` })
    }
    return rows
  })()
  $: draconicFinalCDs = {
    claw:     Math.max(1, Math.floor(draconicBaseCDs.claw * cdr.runeCDR)),
    infusion: Math.max(1, Math.floor(draconicBaseCDs.infusion * cdr.runeCDR)),
    bubble:   Math.max(1, Math.floor(draconicBaseCDs.bubble * cdr.runeCDR)),
  }
  $: draconicHasCDR = cdr.runeCDR < 1.0 || cdr.runeSetCD != null
  $: _draconicAirMult = $build.draconicColor === 'air' ? 0.75 : 1
  $: draconicClawFinalCD   = Math.max(1, Math.floor(draconicBaseCDs.claw   * cdr.runeCDR * _draconicAirMult))
  $: draconicBubbleFinalCD = Math.max(1, Math.floor(draconicBaseCDs.bubble * cdr.runeCDR * _draconicAirMult))
  $: draconicClawBubbleHasCDR = draconicHasCDR || $build.draconicColor === 'air'
  $: hasRuneCDR = cdr.runeCDR !== 1.0 || cdr.runeSetCD != null
  $: hasWACDR = cdr.waCDR !== 1.0

  $: shrineActive = $build.shrineActive
  $: selectedWA = (() => {
    const found = WEAPON_ARTS.find(wa => wa.name === $build.selectedWeaponArt)
    if (found && availableWeaponArts.some(wa => wa.name === found.name)) return found
    return availableWeaponArts[0] ?? WEAPON_ARTS[0]
  })()

  $: monkGlovePerkBonus = (() => {
    if (!isMonk || !weaponResult?.part1Name) return 0
    // rank 1 = 0, rank 2 = +1, rank 3 = +2
    return Math.max(0, $build.guildRank - 1)
  })()

  $: monkGloveStatMult = (() => {
    if (!isMonk) return 1
    // rank 1 = 1.0, rank 2 = 1.25, rank 3 = 1.5
    return 1 + Math.max(0, $build.guildRank - 1) * MONK_RANK_MULTIPLIER
  })()

  // ── Enchant helpers ────────────────────────────────────────────────────────
  let enchantCats: Record<EnchantSlot, 'unAscended' | 'Ascended'> = {
    helmet: 'unAscended', chestplate: 'unAscended', leggings: 'unAscended',
    ring: 'unAscended', rune: 'unAscended'
  }
  $: {
    const slots: EnchantSlot[] = ['helmet', 'chestplate', 'leggings', 'ring', 'rune']
    let dirty = false
    for (const slot of slots) {
      const first = $build.enchantments[slot].find(Boolean)
      if (first) {
        const e = ge(first)
        const cat = (e?.category ?? 'unAscended') as 'unAscended' | 'Ascended'
        if (enchantCats[slot] !== cat) {
          enchantCats[slot] = cat
          dirty = true
        }
      }
    }
    if (dirty) enchantCats = { ...enchantCats }
  }
  function toggleEnchantCat(slot: EnchantSlot) {
    enchantCats[slot] = enchantCats[slot] === 'unAscended' ? 'Ascended' : 'unAscended'
    enchantCats = { ...enchantCats }
    build.update(s => ({ ...s, enchantments: { ...s.enchantments, [slot]: ['','',''] as [string,string,string] } }))
  }

  function enchantOpts(slot: EnchantSlot, exclude1: string, exclude2: string) {
    const cat = enchantCats[slot]
    return enchantments.filter(e => e.category === cat && e.name !== exclude1 && e.name !== exclude2)
  }

  function isExclSlot(slot: EnchantSlot): boolean {
    return isExclusiveEnchant(ge($build.enchantments[slot][0]))
  }

  function hasEnchants(slot: EnchantSlot): boolean {
    return $build.enchantments[slot].some(Boolean)
  }

  function clearEnchants(slot: EnchantSlot) {
    build.update(s => ({ ...s, enchantments: { ...s.enchantments, [slot]: ['','',''] as [string,string,string] } }))
  }

  function swapEnchantments(slot: EnchantSlot, i: 0|1|2, j: 0|1|2) {
    build.update(s => {
      const next = [...s.enchantments[slot]] as [string,string,string]
      ;[next[i], next[j]] = [next[j], next[i]]
      return { ...s, enchantments: { ...s.enchantments, [slot]: next } }
    })
  }

function applyEnchantToAll(slot: EnchantSlot) {
  const current = $build.enchantments[slot]
  const currentCat = enchantCats[slot]
  
  build.update(s => {
    const updated = { ...s.enchantments }
    const allSlots: EnchantSlot[] = ['helmet', 'chestplate', 'leggings', 'ring', 'rune']
    for (const s2 of allSlots) {
      if (s2 !== slot) {
        updated[s2] = [...current] as [string, string, string]
      }
    }
    return { ...s, enchantments: updated }
  })
  const allSlots: EnchantSlot[] = ['helmet', 'chestplate', 'leggings', 'ring', 'rune']
  for (const s2 of allSlots) {
    if (s2 !== slot) {
      enchantCats[s2] = currentCat
    }
  }
  enchantCats = { ...enchantCats }
}

  // ── Inline enchant reactive values ─────────────────────────────────────────
  $: iepSlot = inlineEnchantSlot
  $: iepS0 = iepSlot ? $build.enchantments[iepSlot][0] : ''
  $: iepS1 = iepSlot ? $build.enchantments[iepSlot][1] : ''
  $: iepS2 = iepSlot ? $build.enchantments[iepSlot][2] : ''
  // Reactive exclusive map (same pattern as old code)
  $: exclMap = {
    helmet:     isExclusiveEnchant(ge($build.enchantments.helmet[0])),
    chestplate: isExclusiveEnchant(ge($build.enchantments.chestplate[0])),
    leggings:   isExclusiveEnchant(ge($build.enchantments.leggings[0])),
    ring:       isExclusiveEnchant(ge($build.enchantments.ring[0])),
    rune:       isExclusiveEnchant(ge($build.enchantments.rune[0]))
  }
  $: iepExcl = iepSlot ? exclMap[iepSlot] : false
  $: iepHasEnchants = !!(iepS0 || iepS1 || iepS2)
  $: iepCat = iepSlot ? enchantCats[iepSlot] : 'unAscended'
  // enchantCats được đọc trực tiếp ở đây để Svelte track dependency
  $: iepOpts0 = iepSlot ? enchantments.filter(e => e.category === enchantCats[iepSlot] && e.name !== iepS1 && e.name !== iepS2) : []
  $: iepOpts1 = iepSlot ? enchantments.filter(e => e.category === enchantCats[iepSlot] && e.name !== iepS0 && e.name !== iepS2) : []
  $: iepOpts2 = iepSlot ? enchantments.filter(e => e.category === enchantCats[iepSlot] && e.name !== iepS0 && e.name !== iepS1) : []

// ── Modal search suggestions ───────────────────────────────────────────────
  let showSuggestions = false
  let modalCandidates: Array<{label: string; type: 'name' | 'perk'}> = []
  let modalSuggestions: Array<{label: string; type: 'name' | 'perk'}> = []
  let noExactResults = false
  let didYouMean: Array<{label: string; type: 'name' | 'perk'; score?: number}> = []

  // Thuật toán Substring Levenshtein: Tìm kiếm khoảng cách lỗi trên phân đoạn chuỗi
  // Giúp gõ "drgon" vẫn bắt được "Dragon Blade" (chỉ tính sai lệch 1 ký tự của từ "Dragon")
  function substringLevenshtein(query: string, candidate: string): number {
    const q = query.toLowerCase().trim();
    const c = candidate.toLowerCase().trim();
    
    if (!q) return 0;
    if (c.includes(q)) return 0; // Khớp hoàn toàn cụm từ thì không tính lỗi

    const m = q.length;
    const n = c.length;
    
    // Khởi tạo ma trận DP cho Substring Match
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    
    // Hàng đầu tiên bằng 0 vì vị trí bắt đầu trong candidate có thể là bất kỳ đâu
    for (let i = 0; i <= m; i++) dp[i][0] = i;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (q[i - 1] === c[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],    // Xóa
            dp[i][j - 1],    // Thêm
            dp[i - 1][j - 1] // Sửa
          );
        }
      }
    }
    // Kết quả là điểm lỗi nhỏ nhất tìm thấy ở bất kỳ phân đoạn nào trong chuỗi ứng viên
    return Math.min(...dp[m]);
  }

  // Khối 1: Gom ứng viên (Bao gồm cả Tên Vật phẩm và Tên Perk)
  $: {
    if (!activeModal) {
      modalCandidates = [];
    } else {
      const out: Array<{label: string; type: 'name'|'perk'}> = [];
      const seen = new Set<string>();
      
      const add = (label: string, type: 'name'|'perk') => {
        if (!label) return;
        const key = `${label.toLowerCase()}||${type}`;
        if (!seen.has(key)) { 
          seen.add(key); 
          out.push({ label, type }); 
        }
      }
      const ARMOR_SLOT_MODALS = new Set([
        'armor-helmet', 'armor-chestplate', 'armor-leggings',
        'infusion-helmet', 'infusion-chestplate', 'infusion-leggings',
      ]);
      if (activeModal === 'race') {
        races.forEach(r => add(r.name, 'name'));
      } else if (activeModal === 'guild') {
        guilds.forEach(g => {
          add(g.name, 'name');
          g.ranks.forEach(r => (r.perks ?? []).forEach((p: any) => add(p.name, 'perk')));
        });
      } else if (ARMOR_SLOT_MODALS.has(activeModal)) {
        const slotName = activeModal.endsWith('helmet') ? 'Helmet' 
                      : activeModal.endsWith('chestplate') ? 'Chestplate' 
                      : 'Leggings';
        armors.forEach(a => { 
          const p = getArmorPart(a.name, slotName); 
          if (p) { add(a.name, 'name'); if (p.perkName) add(p.perkName, 'perk'); } 
        });
      } else if (activeModal === 'ring' || activeModal === 'infusion-ring') {
        rings.forEach(r => { add(r.name, 'name'); if (r.perkName) add(r.perkName, 'perk'); });
      } else if (activeModal === 'rune') {
        runes.forEach(r => { add(r.name, 'name'); if (r.perkName) add(r.perkName, 'perk'); });
      } else if (activeModal === 'blade') {
        blades.forEach(b => { add(b.name, 'name'); getPerkNames(b).forEach(p => add(p, 'perk')); });
      } else if (activeModal === 'handle') {
        handles.forEach(h => { add(h.name, 'name'); getPerkNames(h).forEach(p => add(p, 'perk')); });
      } else if (activeModal === 'glove') {
        gloves.forEach(g => { add(g.name, 'name'); getPerkNames(g).forEach(p => add(p, 'perk')); });
      } else if (activeModal === 'essence') {
        essences.forEach(e => { add(e.name, 'name'); getPerkNames(e).forEach(p => add(p, 'perk')); });
      }

      modalCandidates = out;
    }
  }

  // Khối 2: Lọc gợi ý chính xác khi gõ (Tìm cả tên món đồ lẫn tên Perk của món đó)
  $: {
    if (!modalSearch.trim() || !showSuggestions) {
      modalSuggestions = [];
    } else {
      const q = modalSearch.toLowerCase();
      modalSuggestions = modalCandidates.filter(c => c.label.toLowerCase().includes(q));
    }
  }

  $: {
    if (!modalSearch.trim()) {
      noExactResults = false;
    } else if (activeModal === 'race') {
      noExactResults = searchedRaces.length === 0;
    } else if (activeModal === 'guild') {
      noExactResults = searchedGuilds.length === 0;
    } else if (activeModal === 'ring' || activeModal === 'infusion-ring') {
      noExactResults = searchedRings.length === 0;
    } else if (activeModal === 'rune') {
      noExactResults = searchedRunes.length === 0;
    } else if (activeModal === 'blade') {
      noExactResults = searchedBlades.length === 0;
    } else if (activeModal === 'handle') {
      noExactResults = searchedHandles.length === 0;
    } else if (activeModal === 'glove') {
      noExactResults = searchedGloves.length === 0;
    } else if (activeModal === 'essence') {
      noExactResults = searchedEssences.length === 0;
    } else if (activeModal?.startsWith('armor-') || activeModal?.startsWith('infusion-')) {
      noExactResults = searchedArmorsForModal.length === 0;
    } else {
      noExactResults = false;
    }
  }

  $: {
    if (!modalSearch.trim() || !noExactResults || modalSearch.length < 2) {
      didYouMean = [];
    } else {
      const q = modalSearch.toLowerCase().trim();
      const maxAllowedScore = Math.max(1, Math.floor(q.length * 0.35));

      didYouMean = modalCandidates
        .map(c => ({ ...c, score: substringLevenshtein(q, c.label) }))
        .filter(c => c.score <= maxAllowedScore)
        .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
        .slice(0, 6);
    }
  }
  function filterAccessoryItems(items: any[], search: string) {
    const filtered = items.filter(item =>
      matchSearchReactive(item.name, item.perkName ? [item.perkName] : [], search) &&
      perkMatchesTags(item.perkName) &&
      itemMatchesStatFilter(item.stats as Record<string, number>, statFilter)
    )

    const scalings = weaponResult?.scalings ?? {}
    if ((statFilterSortMode === 'most-effective' || statFilterSortMode === 'brawny') && Object.keys(scalings).length > 0) {
      const brawnyAmt = Math.max(1, _brawnyPerkAmt)
      return [...filtered].sort((a, b) => {
        const sa = statFilterSortMode === 'brawny'
          ? computeArmorBrawnyEffectiveBoost(a.stats as Record<string,number>, scalings, brawnyAmt)
          : computeArmorEffectiveBoost(a.stats as Record<string,number>, scalings)
        const sb = statFilterSortMode === 'brawny'
          ? computeArmorBrawnyEffectiveBoost(b.stats as Record<string,number>, scalings, brawnyAmt)
          : computeArmorEffectiveBoost(b.stats as Record<string,number>, scalings)
        return sb - sa || a.name.localeCompare(b.name)
      })
    }

    return sortByStatFilter(
      filtered,
      (item, k) => item.stats?.[k] ?? 0,
      statFilter,
      statFilterSortMode as 'highest'|'lowest'|'alphabetical'
    )
  }
  $: searchedRaces = races.filter(r => matchSearchReactive(r.name, [], modalSearch))
  $: searchedGuilds = guilds.filter(g => {
    if (!matchSearchReactive(g.name, g.ranks.flatMap(r => (r.perks ?? []).map((p: any) => p.name)), modalSearch)) return false
    if (selectedTags.size === 0) return true
    return g.ranks.some(r => (r.perks ?? []).some((p: any) => perkMatchesTags(p.name)))
  })

  $: searchedRings = (void selectedTags, void statFilter, void statFilterSortMode, void weaponResult, void modalSearch, filterAccessoryItems(rings, modalSearch))
  $: searchedRunes = (void selectedTags, void statFilter, void statFilterSortMode, void weaponResult, void modalSearch, filterAccessoryItems(runes, modalSearch))

  function filterWeaponItems(items: any[], search: string) {
    return sortByStatFilter(
      items.filter(item =>
        matchSearchReactive(
          item.name,
          getPerkNames(item),
          search
        ) &&
        anyPerkMatchesTags(getPerkNames(item)) &&
        weaponMatchesFilter(item)
      ),
      (item, k) => item[k] ?? item.stats?.[k] ?? 0,
      weaponStatFilter,
      weaponStatFilterSortMode
    )
  }

  $: searchedBlades   = (void weaponStatFilter, void selectedTags, void modalSearch, filterWeaponItems(filteredBlades,   modalSearch))
  $: searchedHandles  = (void weaponStatFilter, void selectedTags, void modalSearch, filterWeaponItems(filteredHandles,  modalSearch))
  $: searchedGloves   = (void weaponStatFilter, void selectedTags, void modalSearch, filterWeaponItems(filteredGloves,   modalSearch))
  $: searchedEssences = (void weaponStatFilter, void selectedTags, void modalSearch, filterWeaponItems(filteredEssences, modalSearch))

  $: searchedArmorsForModal = (() => {
    void selectedTags; void statFilter; void statFilterSortMode; void weaponResult; void modalSearch;
    const slotName = activeModal === 'armor-helmet' || activeModal === 'infusion-helmet' ? 'Helmet' : activeModal === 'armor-chestplate' || activeModal === 'infusion-chestplate' ? 'Chestplate' : activeModal === 'armor-leggings' || activeModal === 'infusion-leggings' ? 'Leggings' : null;
    if (!slotName) return [];

    const filtered = armors.filter(a => {
      const part = getArmorPart(a.name, slotName as any);
      return part && matchSearchReactive(a.name, part.perkName ? [part.perkName] : [], modalSearch) && perkMatchesTags(part.perkName) && itemMatchesStatFilter(part.stats as Record<string, number>, statFilter);
    })

    const scalings = weaponResult?.scalings ?? {}
      if (statFilterSortMode === 'most-effective' && Object.keys(scalings).length > 0) {
        return [...filtered].sort((a, b) => {
          const pa = getArmorPart(a.name, slotName as any)
          const pb = getArmorPart(b.name, slotName as any)
          const sa = computeArmorEffectiveBoost(applyUpgrade(pa?.stats as StatMap ?? {}, UPGRADE_MAX), scalings)
          const sb = computeArmorEffectiveBoost(applyUpgrade(pb?.stats as StatMap ?? {}, UPGRADE_MAX), scalings)
          return sb - sa || a.name.localeCompare(b.name)
        })
      }

      if (statFilterSortMode === 'brawny') {
        const brawnyAmt = Math.max(1, _brawnyPerkAmt)
        return [...filtered].sort((a, b) => {
          const pa = getArmorPart(a.name, slotName as any)
          const pb = getArmorPart(b.name, slotName as any)
          const sa = computeArmorBrawnyEffectiveBoost(applyUpgrade(pa?.stats as StatMap ?? {}, UPGRADE_MAX), scalings, brawnyAmt)
          const sb = computeArmorBrawnyEffectiveBoost(applyUpgrade(pb?.stats as StatMap ?? {}, UPGRADE_MAX), scalings, brawnyAmt)
          return sb - sa || a.name.localeCompare(b.name)
        })
      }

    return sortByStatFilter(
      filtered,
      (a, k) => {
        const part = getArmorPart(a.name, slotName as any);
        return part?.stats?.[k] ?? 0;
      },
      statFilter,
      statFilterSortMode as 'highest'|'lowest'|'alphabetical'
    );
  })();

  $: searchedModalItems = (void selectedTags, void statFilter, void statFilterSortMode, void weaponResult, void modalSearch, void weaponStatFilter, modalItems(activeModal ?? ''));

  function matchSearchReactive(name: string, perkNames: string[], query: string): boolean {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    if (name.toLowerCase().includes(q)) return true
    return perkNames.some(p => p.toLowerCase().includes(q))
  }

  let bladeFilterTier = ''
  let bladeFilterType = ''
  let handleFilterTier = ''
  let handleFilterType = ''
  let gloveFilterTier = ''
  let gloveFilterType = ''
  let essenceFilterTier = ''

  // ── Perk tag filter ─────────────────────────────────────────────────────
  let selectedTags: Set<string> = new Set()
  let statFilter: Map<string, 'include' | 'exclude'> = new Map()

function onStatFilterChange( e: CustomEvent<{ 
    filter: Map<string,'include'|'exclude'>
    sortMode:'highest'|'lowest'|'alphabetical'|'most-effective'|'brawny'
  }>
){
 statFilter =e.detail.filter
 statFilterSortMode =e.detail.sortMode
}

  function toggleTag(tag: string) {
    if (selectedTags.has(tag)) selectedTags.delete(tag)
    else selectedTags.add(tag)
    selectedTags = new Set(selectedTags)
  }

  function clearTags() {
    selectedTags = new Set()
  }

  function perkMatchesTags(perkName: string | undefined): boolean {
    if (selectedTags.size === 0) return true
    if (!perkName) return false
    const perk = getPerk(perkName)
    if (!perk) return false
    return [...selectedTags].every(t => perk.tags.includes(t))
  }

  function itemMatchesStatFilter(
    stats: Record<string, number>,
    sf: Map<string, 'include' | 'exclude'>
  ): boolean {

    if (sf.size === 0) return true

    for (const [key, state] of sf) {
      const isNeg = key.startsWith('neg:')

      const actualKey = isNeg
        ? key.slice(4)
        : key

      const val = stats[actualKey] ?? 0
      if (!isNeg) {

        if (state === 'include' && val <= 0) return false
        if (state === 'exclude' && val > 0) return false
      } else {
        if (state === 'include' && val >= 0) return false
        if (state === 'exclude' && val < 0) return false
      }
    }
    return true
  }
  function sortByStatFilter(
    items: any[],
    getStatVal: (item: any, key: string) => number,
    sf: Map<string, 'include' | 'exclude'>,
    mode: 'highest' | 'lowest' | 'alphabetical' = 'highest'
  ): any[] {
    if (sf.size === 0) return items;

    const includeKeys: string[] = [];
    const includeNegKeys: string[] = [];
    const excludeKeys: string[] = [];
    const excludeNegKeys: string[] = [];

    for (const [key, state] of sf) {
      const isNeg = key.startsWith('neg:');
      const actualKey = isNeg ? key.slice(4) : key;

      if (state === 'include') {
        if (isNeg) includeNegKeys.push(actualKey);
        else includeKeys.push(actualKey);
      } else {
        if (isNeg) excludeNegKeys.push(actualKey);
        else excludeKeys.push(actualKey);
      }
    }

    function score(item: any): number {
      let s = 0;
      for (const k of includeKeys)    s += getStatVal(item, k);
      for (const k of includeNegKeys) s -= getStatVal(item, k);
      for (const k of excludeKeys)    s -= getStatVal(item, k);
      for (const k of excludeNegKeys) s += getStatVal(item, k);
      return s;
    }

    return [...items].sort((a, b) => {
      const aScore = score(a);
      const bScore = score(b);
      if (mode === 'highest') {
        if (bScore !== aScore) return bScore - aScore;
        return a.name.localeCompare(b.name);
      }
      if (mode === 'lowest') {
        if (aScore !== bScore) return aScore - bScore;
        return a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });
  }

  function anyPerkMatchesTags(perkNames: string[]): boolean {
    if (selectedTags.size === 0) return true
    return perkNames.some(n => perkMatchesTags(n))
  }

  function tierFilter(items: any[], tierVar: string, typeVar?: string, typeKey?: string) {
    return items.filter(i =>
      (!tierVar || i.tier === Number(tierVar)) &&
      (!typeVar || !typeKey || i[typeKey] === typeVar)
    )
  }
  $: filteredBlades = tierFilter(blades, bladeFilterTier, bladeFilterType, 'bladeType')
  $: filteredHandles = tierFilter(handles, handleFilterTier, handleFilterType, 'handleType')
  $: filteredGloves = tierFilter(gloves, gloveFilterTier, gloveFilterType, 'gloveType')
  $: filteredEssences = tierFilter(essences, essenceFilterTier)
// ── Weapon enchant damage type bonuses ────────────────────────────────────────
interface PerkDmgTypeBonusDef {
  perkName: string
  type: string
  amountPerStack: number
}

const PERK_DMG_TYPE_BONUS_DEFS: PerkDmgTypeBonusDef[] = [
  { perkName: 'Stone Weapon', type: 'earth', amountPerStack: 0.3 },
]

$: weaponEnchantDmgBonus = (() => {
  const bonus: Record<string, number> = {}
  for (const def of PERK_DMG_TYPE_BONUS_DEFS) {
    const amt = $result.perks[def.perkName] ?? 0
    if (amt <= 0) continue
    bonus[def.type] = Math.round(((bonus[def.type] ?? 0) + amt * def.amountPerStack) * 100) / 100
  }
  return bonus
})()

$: weaponDamageTypesWithBonus = (() => {
  if (!weaponResult) return {}
  const result: Record<string, number> = { ...weaponResult.damageTypes }
  for (const [k, v] of Object.entries(weaponEnchantDmgBonus)) {
    result[k] = Math.round(((result[k] ?? 0) + v) * 100) / 100
  }
  return result
})()

$: highestDamageType = (() => {
  const entries = Object.entries(weaponDamageTypesWithBonus)
  if (entries.length === 0) return null
  
  return entries.reduce((a, b) => {
    if (b[1] > a[1]) return b
    if (b[1] === a[1]) {
      const ia = DMG_TYPE_PRIORITY.indexOf(a[0])
      const ib = DMG_TYPE_PRIORITY.indexOf(b[0])
      const pa = ia === -1 ? 999 : ia
      const pb = ib === -1 ? 999 : ib
      return pb < pa ? b : a
    }
    return a
  })
})()
  // ── Weapon result ──────────────────────────────────────────────────────────
 $: weaponResult = isMonk
  ? (($build.monkGlove || $build.monkEssence) ? calcMonkWeapon($build.monkGlove, $build.monkEssence, shrineActive, $build.guildRank) : null)
  : (($build.weaponBlade || $build.weaponHandle) ? calcWeapon($build.weaponBlade, $build.weaponHandle, shrineActive) : null)

  $: summaryWeaponLabel = weaponResult?.part1Name && weaponResult?.part2Name && weaponResult.finalWeaponType
    ? weaponResult.finalWeaponType : 'None'
  $: summaryWeaponSub = weaponResult ? [weaponResult.part1Name, weaponResult.part2Name].filter(Boolean).join(' + ') : ''

  // ── Damage types per part (từ raw data, không phải weaponResult) ───────────
  function getDamageTypes(data: any): Record<string, number> {
    const dtKeys = ['true','physical','magic','fire','water','earth','air','hex','holy','summon']
    const result: Record<string, number> = {}
    for (const k of dtKeys) {
      // Check top-level first, then inside .stats (blades/handles/gloves/essences store type keys in stats)
      const v = data?.[`${k}Type`] ?? data?.stats?.[`${k}Type`]
      if (v != null && v !== 0) result[k] = v
    }
    return result
  }

  $: part1DamageTypes = (() => {
    if (!weaponResult?.part1Name) return {}
    const data = isMonk ? getGlove(weaponResult.part1Name) : getBlade(weaponResult.part1Name)
    return getDamageTypes(data)
  })()

  $: part2DamageTypes = (() => {
    if (!weaponResult?.part2Name) return {}
    const data = isMonk ? getEssence(weaponResult.part2Name) : getHandle(weaponResult.part2Name)
    return getDamageTypes(data)
  })()

  function formatCD(base: number, cdr: CDRResult) {
    const effectiveBase = cdr.runeSetCD ?? base
    return `${Math.max(1, Math.floor(effectiveBase * cdr.runeCDR))}s`
  }

  // ── Detail cards ───────────────────────────────────────────────────────────
  interface EnchantInfo { name: string; notes: string | undefined }
  interface DetailCard {
    title: string; label: string; description?: string
    stats: Record<string, number>
    perks: Array<{ name: string; amount: number; fromEnchant: boolean }>
    extras?: string[]
    enchants?: EnchantInfo[]
    isInfusion?: boolean
  }
  interface SlotGroup { main: DetailCard | null; infusion: DetailCard | null }

  function getEnchantInfos(slot: EnchantSlot): EnchantInfo[] {
    return $build.enchantments[slot].filter(Boolean).map(name => {
      const e = getEnchant(name)
      return e ? { name, notes: e.additionalNotes } : null
    }).filter((x): x is EnchantInfo => x !== null)
  }

  function buildSlotCard(title: string, label: string, description: string, baseStats: StatMap, basePerks: Record<string, number>, enchSlot: EnchantSlot, extras?: string[], upgradeLevel: number = 0): DetailCard {
    const enchNames = $build.enchantments[enchSlot]
    const slotResult = applyEnchantmentsToSlot(baseStats, basePerks, enchNames)
    const preUpgradeArmorPen = slotResult.stats.armorPenetration
    const finalStats = upgradeLevel > 0 ? applyUpgrade(slotResult.stats, upgradeLevel) : { ...slotResult.stats }
    if (finalStats.armorPenetration !== preUpgradeArmorPen) {
      finalStats.armorPenetration = preUpgradeArmorPen
    }
    const filteredStats: Record<string, number> = {}
    for (const [k, v] of Object.entries(finalStats)) {
      const rounded = Math.round((v + Number.EPSILON) * 100) / 100
      if (rounded !== 0) filteredStats[k] = rounded
    }
    const perks = Object.entries(slotResult.perks).filter(([,v]) => v !== 0).map(([name, amount]) => ({
      name, amount: Math.round((amount + Number.EPSILON) * 100) / 100,
      fromEnchant: basePerks[name] == null
    }))
    return { title, label, description, stats: filteredStats, perks, extras, enchants: getEnchantInfos(enchSlot) }
  }

  function buildInfusionCard(title: string, label: string, description: string, baseStats: StatMap, basePerks: Record<string, number>): DetailCard {
    const inf = applyInfusion(baseStats, basePerks)
    const filteredStats: Record<string, number> = {}
    for (const [k, v] of Object.entries(inf.stats)) {
      const rounded = Math.round((v + Number.EPSILON) * 100) / 100
      if (rounded !== 0) filteredStats[k] = rounded
    }
    const perks = Object.entries(inf.perks).filter(([,v]) => v !== 0).map(([name, amount]) => ({
      name, amount: Math.round((amount + Number.EPSILON) * 100) / 100, fromEnchant: false
    }))
    return { title, label, description, stats: filteredStats, perks, isInfusion: true }
  }

  function buildEnchantLabel(baseName: string, enchSlot: EnchantSlot): string {
    const enchNames = $build.enchantments[enchSlot].filter(Boolean)
    return enchNames.length > 0 ? `${enchNames.join(' ')} ${baseName}` : baseName
  }

  $: identityCards = (() => {
    const cards: DetailCard[] = []
    const race = races.find(r => r.name === $build.race)
    if (race) cards.push({ title: 'Race', label: race.name, description: race.passive, stats: (race.statModifiers ?? {}) as Record<string, number>, perks: [] })
    const guild = getGuild($build.guild)
    const rank = guild?.ranks.find(r => r.rank === $build.guildRank)
    if (guild && rank) cards.push({ title: 'Guild', label: `${guild.name} R${rank.rank}`, description: '', stats: (rank.stats ?? {}) as Record<string, number>, perks: (rank.perks ?? []).map(p => ({ ...p, fromEnchant: false })) })
    return cards
  })()

  $: slotGroups = (() => {
    const groups: SlotGroup[] = []
    const armorSlots: Array<[string, 'Helmet'|'Chestplate'|'Leggings', EnchantSlot, string, string, number]> = [
      [$build.helmet, 'Helmet', 'helmet', $build.infusionHelmet, 'Helmet', $build.upgradeHelmet ?? 0],
      [$build.chestplate, 'Chestplate', 'chestplate', $build.infusionChestplate, 'Chestplate', $build.upgradeChestplate ?? 0],
      [$build.leggings, 'Leggings', 'leggings', $build.infusionLeggings, 'Leggings', $build.upgradeLeggings ?? 0],
    ]
    for (const [armorName, partType, enchSlot, infName, , upgradeLevel] of armorSlots) {
      const part = armorName ? getArmorPart(armorName, partType as any) : null
      const ip = infName ? getArmorPart(infName, partType as any) : null
      if (part || ip) {
        const bp: Record<string, number> = part?.perkName ? { [part.perkName]: 1 } : {}
        const upgradedStats = part ? applyUpgrade(part.stats as StatMap, upgradeLevel) : {}
        const main = part ? buildSlotCard(partType, buildEnchantLabel(armorName, enchSlot), part.description, part.stats as StatMap, bp, enchSlot, undefined, upgradeLevel) : null
        let infusion: DetailCard | null = null
        if (ip) {
          const ibp: Record<string, number> = ip.perkName ? { [ip.perkName]: 1 } : {}
          infusion = buildInfusionCard(`Infusion ${partType}`, infName, ip.description, ip.stats as StatMap, ibp)
        }
        groups.push({ main, infusion })
      }
    }
    if ($build.ring) {
      const ring = getRing($build.ring)
      const ir = $build.infusionRing ? getRing($build.infusionRing) : null
      if (ring || ir) {
        const bp: Record<string, number> = ring?.perkName ? { [ring.perkName]: ring.perkAmount ?? 1 } : {}
        const upgradedRingStats = applyUpgrade(ring.stats, $build.upgradeRing ?? 0)
        const main = ring ? buildSlotCard('Ring', buildEnchantLabel(ring.name, 'ring'), ring.description, ring.stats, bp, 'ring', undefined, $build.upgradeRing ?? 0) : null
        let infusion: DetailCard | null = null
        if (ir) {
          const ibp: Record<string, number> = ir.perkName ? { [ir.perkName]: ir.perkAmount ?? 1 } : {}
          infusion = buildInfusionCard('Infusion Ring', $build.infusionRing, ir.description, ir.stats, ibp)
        }
        groups.push({ main, infusion })
      }
    }
    if ($build.rune) {
      const rune = getRune($build.rune)
      if (rune) {
        const bp: Record<string, number> = rune.perkName ? { [rune.perkName]: rune.perkAmount ?? 1 } : {}
        const cdExtras = rune.name === 'Foot Dive Rune'
          ? [`CD: 25s (miss) / 5s (hit)`]
          : (hasRuneCDR ? [`Base CD: ${rune.cooldown}s → ${formatCD(rune.cooldown, cdr)}`] : [`Cooldown: ${rune.cooldown}s`])
        groups.push({ main: buildSlotCard('Rune', buildEnchantLabel(rune.name, 'rune'), rune.description, rune.stats, bp, 'rune', cdExtras, $build.upgradeRune ?? 0), infusion: null })
      }
    }
    return groups
  })()

  $: hasDetails = identityCards.length > 0 || slotGroups.length > 0

  function formatDmgTypeLabel(key: string): string { return key.charAt(0).toUpperCase() + key.slice(1) + ' Type' }
  function formatScalingLabel(key: string): string { return key.charAt(0).toUpperCase() + key.slice(1) + ' Scaling' }
  function fmtScaling(v: number): string {
    const r = Math.round(v * 10000) / 10000
    return String(r)
  }

  $: part1Label = isMonk ? 'Glove' : 'Blade'
  $: part2Label = isMonk ? 'Essence' : 'Handle'
  $: sgPart1Name = isMonk ? ($build.monkGlove || `No ${part1Label.toLowerCase()}`) : ($build.weaponBlade || 'No blade')
  $: sgPart2Name = isMonk ? ($build.monkEssence || `No ${part2Label.toLowerCase()}`) : ($build.weaponHandle || 'No handle')
  $: sgPart1Empty = isMonk ? !$build.monkGlove : !$build.weaponBlade
  $: sgPart2Empty = isMonk ? !$build.monkEssence : !$build.weaponHandle

  let tooltip = { visible: false, text: '', x: 0, y: 0 }
  function onEnchantMove(e: MouseEvent, name: string) {
    const text = getEnchantTooltipText(name)
    tooltip = text ? { visible: true, text, x: e.clientX + 14, y: e.clientY - 10 } : { ...tooltip, visible: false }
  }
  function onEnchantLeave() { tooltip = { ...tooltip, visible: false } }

  function applySuggestion(label: string, type: 'name' | 'perk') {
    if (type === 'name') {
      if (activeModal === 'race') {
        build.update(s => ({...s, race: label})); closeModal()
      } else if (activeModal === 'guild') {
        const g = guilds.find(g => g.name === label)
        if (g) setGuild(label, $build.guild === label ? $build.guildRank : 3)
        closeModal()
      } else if (activeModal === 'armor-helmet') {
        build.update(s => ({...s, helmet: label})); closeModal()
      } else if (activeModal === 'armor-chestplate') {
        build.update(s => ({...s, chestplate: label})); closeModal()
      } else if (activeModal === 'armor-leggings') {
        build.update(s => ({...s, leggings: label})); closeModal()
      } else if (activeModal === 'infusion-helmet') {
        build.update(s => ({...s, infusionHelmet: label})); closeModal()
      } else if (activeModal === 'infusion-chestplate') {
        build.update(s => ({...s, infusionChestplate: label})); closeModal()
      } else if (activeModal === 'infusion-leggings') {
        build.update(s => ({...s, infusionLeggings: label})); closeModal()
      } else if (activeModal === 'ring') {
        build.update(s => ({...s, ring: label})); closeModal()
      } else if (activeModal === 'infusion-ring') {
        build.update(s => ({...s, infusionRing: label})); closeModal()
      } else if (activeModal === 'rune') {
        build.update(s => ({...s, rune: label})); closeModal()
      } else if (activeModal === 'blade') {
        build.update(s => ({...s, weaponBlade: label})); closeModal()
      } else if (activeModal === 'handle') {
        build.update(s => ({...s, weaponHandle: label})); closeModal()
      } else if (activeModal === 'glove') {
        build.update(s => ({...s, monkGlove: label})); closeModal()
      } else if (activeModal === 'essence') {
        build.update(s => ({...s, monkEssence: label})); closeModal()
      }
    } else {
      modalSearch = label
      showSuggestions = false
    }
  }

  function onSearchFocus() { showSuggestions = true }
  function onSearchBlur() { setTimeout(() => { showSuggestions = false }, 150) }

  function modalItems(type: string): any[] {
    switch (type) {
      case 'race': return searchedRaces
      case 'guild': return searchedGuilds
      case 'blade': return searchedBlades
      case 'handle': return searchedHandles
      case 'glove': return searchedGloves
      case 'essence': return searchedEssences
      case 'ring': case 'infusion-ring': return searchedRings
      case 'rune': return searchedRunes
      default: return searchedArmorsForModal
    }
  }
  function modalTypeOptions(type: string): string[] {
    switch (type) {
      case 'blade': return ['Small Blade', 'Medium Blade', 'Heavy Blade', 'Hammer Head']
      case 'handle': return ['Medium Handle', 'Long Handle', 'Pole']
      default: return []
    }
  }
  function modalTierVal(type: string): string {
    switch (type) {
      case 'blade': return bladeFilterTier
      case 'handle': return handleFilterTier
      case 'glove': return gloveFilterTier
      case 'essence': return essenceFilterTier
      default: return ''
    }
  }
  function modalTypeVal(type: string): string {
    switch (type) {
      case 'blade': return bladeFilterType
      case 'handle': return handleFilterType
      default: return ''
    }
  }
  function handleTierChange(val: string) {
    switch (activeModal) {
      case 'blade': bladeFilterTier = val; break
      case 'handle': handleFilterTier = val; break
      case 'glove': gloveFilterTier = val; break
      case 'essence': essenceFilterTier = val; break
    }
  }
  function handleTypeChange(val: string) {
    switch (activeModal) {
      case 'blade': bladeFilterType = val; break
      case 'handle': handleFilterType = val; break
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (activeModal) closeModal()
      else if (inlineEnchantSlot) inlineEnchantSlot = null
    }
  }

  function getSlotHasItem(slot: EnchantSlot): boolean {
    const s = $build
    if (slot === 'helmet') return !!s.helmet
    if (slot === 'chestplate') return !!s.chestplate
    if (slot === 'leggings') return !!s.leggings
    if (slot === 'ring') return !!s.ring
    if (slot === 'rune') return !!s.rune
    return false
  }

  // ── Weapon Art helpers ─────────────────────────────────────────────────────
  $: _waScalings = weaponResult?.baseScalings ?? {} as Record<string, number>
  $: _waStats = weaponResult?.stats ?? {} as Record<string, number>
  $: _waWeaponType = weaponResult?.finalWeaponType ?? ''
  $: _waBlade = $build.weaponBlade
  $: _waHandle = $build.weaponHandle

  $: availableWeaponArts = (() => {
    const validWAs = WEAPON_ARTS.filter(wa =>
      checkWA(wa, _waScalings, _waStats, _waWeaponType, isMonk, _waBlade, _waHandle)
    )
    const activeReplacements = new Set(
      validWAs.map(wa => wa.replaces).filter(Boolean)
    )
    return validWAs.filter(wa => !activeReplacements.has(wa.name))
  })()

  $: if (waHydrated) {
    const _inAvail = availableWeaponArts.some(wa => wa.name === $build.selectedWeaponArt)
    if (!_inAvail && availableWeaponArts.length > 0) {
      build.update(s => ({ ...s, selectedWeaponArt: availableWeaponArts[0].name }))
    }
  }

  $: waAvailable = checkWA(selectedWA, _waScalings, _waStats, _waWeaponType, isMonk, _waBlade, _waHandle)
  $: waReq = selectedWA.requirements

  $: waUnmetReqs = getUnmetReqs(selectedWA, _waScalings, _waStats, _waWeaponType, isMonk, _waBlade, _waHandle)

// ── Weapon stat groups ──────────────────────────────────────────────────────
const DMG_TYPE_KEYS = new Set(['physicalType','magicType','fireType','waterType','earthType','airType','hexType','holyType','trueType','summonType'])
const SCALING_KEYS = new Set(['physicalScaling','magicScaling','fireScaling','waterScaling','earthScaling','airScaling','hexScaling','holyScaling','dexterityScaling','summonScaling'])

function splitWeaponStats(stats: Record<string, number> = {}) {
  const dmgTypes: [string, number][] = []
  const scalings: [string, number][] = []
  const boosts: [string, number][] = []

  for (const [k, v] of Object.entries(stats)) {
    if (!v) continue

    if (DMG_TYPE_KEYS.has(k)) {
      dmgTypes.push([k, v])
    } else if (SCALING_KEYS.has(k)) {
      scalings.push([k, v])
    } else {
      boosts.push([k, v])
    }
  }

  return { dmgTypes, scalings, boosts }
}

function prettyKey(key: string, suffix: string) {
  const base = key.replace(suffix, '')
  return base.charAt(0).toUpperCase() + base.slice(1)
}

$: waScalingParsed = (() => {
  const sc = selectedWA.scaling
  if (!sc || sc === 'Same as weapon' || sc === 'None') return null
  const re = /([\d.]+)\s*(Physical|Magic|Fire|Water|Earth|Air|Hex|Holy|True|Dex(?:terity)?|Summon)/gi
  const pills: Array<{ label: string; val: number }> = []
  let m: RegExpExecArray | null
  while ((m = re.exec(sc)) !== null) {
    const label = /dex/i.test(m[2]) ? 'Dexterity Scaling' : m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase() + ' Scaling'
    pills.push({ label, val: parseFloat(m[1]) })
  }
  return pills.length > 0 ? pills : null
})()

$: _appWaAvgTotal = (() => {
  if (!selectedWA.avgTotalHits || !selectedWA.baseDamage) return null
  const parts = selectedWA.baseDamage.split('+')
  const hitVals: number[] = []
  for (const part of parts) {
    if (/healing/i.test(part)) continue
    const nx = part.trim().match(/^([\d.]+)/)
    if (nx) hitVals.push(parseFloat(nx[1]))
  }
  if (hitVals.length === 0) return null
  const starsPerType = selectedWA.avgTotalHits / hitVals.length
  const rawTotal = hitVals.reduce((s, v) => s + v, 0) * starsPerType
  return {
    total: selectedWA.avgTotalHits,
    starsPerType: Math.round(starsPerType * 100) / 100,
    rawTotal: Math.round(rawTotal * 100) / 100,
  }
})()
</script>

<svelte:window on:keydown={onKeydown} />

<!-- Tooltip -->
{#if tooltip.visible}
  <div class="enchant-tooltip" style="left:{tooltip.x}px;top:{tooltip.y}px">
    {#each tooltip.text.split('\n') as line}<p>{line}</p>{/each}
  </div>
{/if}

<!-- Modals -->
{#if activeModal === 'race'}
  <RaceModal close={closeModal} bind:modalSearch
    {showSuggestions} {modalSuggestions} {noExactResults} {didYouMean}
    onFocus={onSearchFocus} onBlur={onSearchBlur}
    onSelect={(e) => applySuggestion(e.detail.label, e.detail.type)} />
{:else if activeModal === 'guild'}
  <GuildModal close={closeModal} bind:modalSearch
    {showSuggestions} {modalSuggestions} {noExactResults} {didYouMean}
    onFocus={onSearchFocus} onBlur={onSearchBlur}
    onSelect={(e) => applySuggestion(e.detail.label, e.detail.type)}
    {selectedTags} {toggleTag} {clearTags} onChange={onStatFilterChange} />
{:else if activeModal === 'blade' || activeModal === 'handle' || activeModal === 'glove' || activeModal === 'essence'}
  <WeaponPartModal close={closeModal} bind:modalSearch
    {showSuggestions} {modalSuggestions} {noExactResults} {didYouMean}
    onFocus={onSearchFocus} onBlur={onSearchBlur}
    onSelect={(e) => applySuggestion(e.detail.label, e.detail.type)}
    {selectedTags} {toggleTag} {clearTags}
    modalType={activeModal}
    searchedItems={searchedModalItems}
    {weaponStatFilter}
    onWeaponStatFilterChange={e => weaponStatFilter = e.detail}
    tierFilterOptions={[1,2,3,4,5]}
    typeFilterOptions={modalTypeOptions(activeModal)}
    tierFilterValue={modalTierVal(activeModal)}
    typeFilterValue={modalTypeVal(activeModal)}
    onTierFilterChange={handleTierChange}
    onTypeFilterChange={handleTypeChange} />
{:else if activeModal}
  <AccessorySelectModal close={closeModal} bind:modalSearch
    {showSuggestions} {modalSuggestions} {noExactResults} {didYouMean}
    onFocus={onSearchFocus} onBlur={onSearchBlur}
    onSelect={(e) => applySuggestion(e.detail.label, e.detail.type)}
    {selectedTags} {toggleTag} {clearTags} onChange={onStatFilterChange}
    modalType={activeModal}
    searchedItems={searchedModalItems}
    showSortButtons={true}
    {weaponResult}
    bind:statFilterSortMode
    effectiveLabel={activeModal?.startsWith('infusion-') ? 'armor boost' : 'boost'}
    hideTags={activeModal === 'ring' || activeModal === 'infusion-ring' ? [] : undefined} />
{/if}



<!-- ═══════════════════════════════ MAIN APP ═══════════════════════════════ -->
<div class="app">
  <AppHeader bind:activeAppTab on:switchTab={e => switchTab(e.detail)} />
  {#if activeAppTab === 'overview'}
    <div class="workspace">

      <!-- BUILD SUMMARY + INLINE ENCHANTS -->
      <div class="panel summary-panel">
        <div class="summary-title-row">
          <h3 class="panel-title summary-title">Build Summary</h3>
          <LevelBar protection={$result.stats.protection ?? 0} hpThreshold={_dragonStateThreshold} />
        </div>
        <div class="summary-actions">
          <button class="clear-all-btn" on:click={handleClearBuild} title="Clear all selections">
            ✕ Clear All
          </button>
          {#if _undoVisible}
            <button class="undo-btn" on:click={handleUndo} title="Undo clear">
              ↩ Undo
            </button>
          {/if}
        </div>
        <div class="summary-layout">
          <div class="left-column">
            <div class="summary-grid-wrap">
              <div class="summary-grid">
                <!-- Weapon type row -->
                <div class="sg-cell sg-weapon sg-span10 sg-clickable"
                  on:click={() => build.update(s => ({...s, shrineActive: !s.shrineActive}))}
                  role="button" tabindex="0"
                  on:keydown={e => e.key === 'Enter' && build.update(s => ({...s, shrineActive: !s.shrineActive}))}>
                  <div class="sg-weapon-inner">
                    <div class="sg-weapon-left">
                      <span class="sg-label">{isMonk ? 'Monk Weapon Type' : 'Weapon Type'}</span>
                      <span class="sg-value">{summaryWeaponLabel}</span>
                      {#if summaryWeaponSub}<span class="sg-sub">{summaryWeaponSub}</span>{/if}
                      {#if weaponResult?.attackSpeed != null && weaponResult.part1Name && weaponResult.part2Name}
                        <span class="sg-badge">{weaponResult.attackSpeed}x spd</span>
                      {/if}
                    </div>
                    <div class="shrine-inline">
                      <div class="shrine-btn-inline" class:shrine-btn-inline--active={shrineActive}>
                        <span class="shrine-icon-sm">⚖</span>
                        <span class="shrine-label-sm">Shrine</span>
                        <span class="shrine-state-sm">{shrineActive ? 'ON' : 'OFF'}</span>
                      </div>
                      {#if shrineActive}
                        <span class="shrine-hint-sm">T1×3.0 · T2×1.7 · T3×1.4 · T4×1.1 · T5×1.0</span>
                      {/if}
                    </div>
                  </div>
                </div>

                <!-- Row 1: Inf Helmet | Helmet | Blade/Glove | Handle/Essence -->
                <div class="sg-cell sg-infusion sg-span2 sg-clickable" class:sg-empty={!$build.infusionHelmet}
                  role="button" tabindex="0"
                  on:click={() => openModal('infusion-helmet')}
                  on:keydown={e => e.key === 'Enter' && openModal('infusion-helmet')}>
                  <span class="sg-label">Inf. Helmet</span>
                  <span class="sg-value">{$build.infusionHelmet || 'No infused helmet'}</span>
                  {#if $build.infusionHelmet}
                    <button class="sg-clear" on:click|stopPropagation={() => build.update(s => ({...s, infusionHelmet: ''}))} title="Clear">✕</button>
                  {/if}
                </div>
                <div class="sg-cell sg-armor sg-span2 sg-clickable" class:sg-empty={!$build.helmet}
                  role="button" tabindex="0"
                  on:click={() => openModal('armor-helmet')}
                  on:keydown={e => e.key === 'Enter' && openModal('armor-helmet')}>
                    <span class="sg-label">Helmet</span>
                    <span class="sg-value">{$build.helmet || 'No helmet'}</span>
                    {#if $build.helmet && hasEnchants('helmet')}
                      <span class="sg-ench">{$build.enchantments.helmet.filter(Boolean).join(' · ')}</span>
                    {/if}
                    {#if $build.helmet}
                      <button class="sg-upgrade-btn"
                        class:sg-upgrade-btn--maxed={$build.upgradeHelmet === 5}
                        on:click|stopPropagation={() => toggleUpgrade('upgradeHelmet')}
                        title="Cycle upgrade (+{$build.upgradeHelmet} → +{($build.upgradeHelmet + 1) % 6})">
                        +{$build.upgradeHelmet}
                      </button>
                      <button class="sg-clear" on:click|stopPropagation={() => build.update(s => ({...s, helmet: ''}))} title="Clear">✕</button>
                      <button class="sg-ench-btn" class:sg-ench-btn--active={inlineEnchantSlot === 'helmet'}
                        on:click|stopPropagation={() => toggleInlineEnchant('helmet')} title="Enchant">✦</button>
                    {/if}
                </div>
                <div class="sg-cell sg-span3 sg-clickable"
                  class:sg-blade={!isMonk} class:sg-monk-glove={isMonk} class:sg-empty={sgPart1Empty}
                  role="button" tabindex="0"
                  on:click={() => openModal(isMonk ? 'glove' : 'blade')}
                  on:keydown={e => e.key === 'Enter' && openModal(isMonk ? 'glove' : 'blade')}>
                  <span class="sg-label">{part1Label}</span>
                  <span class="sg-value">{sgPart1Name}</span>
                  {#if weaponResult?.part1Type}<span class="sg-sub">{weaponResult.part1Type}</span>{/if}
                </div>
                <div class="sg-cell sg-span3 sg-clickable"
                  class:sg-handle={!isMonk} class:sg-monk-essence={isMonk} class:sg-empty={sgPart2Empty}
                  role="button" tabindex="0"
                  on:click={() => openModal(isMonk ? 'essence' : 'handle')}
                  on:keydown={e => e.key === 'Enter' && openModal(isMonk ? 'essence' : 'handle')}>
                  <span class="sg-label">{part2Label}</span>
                  <span class="sg-value">{sgPart2Name}</span>
                  {#if weaponResult?.part2Type}<span class="sg-sub">{weaponResult.part2Type}</span>{/if}
                </div>

                <!-- Row 2: Inf Chest | Chest | Inf Ring | Ring | Race -->
                <div class="sg-cell sg-infusion sg-span2 sg-clickable" class:sg-empty={!$build.infusionChestplate}
                  role="button" tabindex="0"
                  on:click={() => openModal('infusion-chestplate')}
                  on:keydown={e => e.key === 'Enter' && openModal('infusion-chestplate')}>
                  <span class="sg-label">Inf. Chestplate</span>
                  <span class="sg-value">{$build.infusionChestplate || 'No infused chestplate'}</span>
                  {#if $build.infusionChestplate}
                    <button class="sg-clear" on:click|stopPropagation={() => build.update(s => ({...s, infusionChestplate: ''}))} title="Clear">✕</button>
                  {/if}
                </div>
                <div class="sg-cell sg-armor sg-span2 sg-clickable" class:sg-empty={!$build.chestplate}
                  role="button" tabindex="0"
                  on:click={() => openModal('armor-chestplate')}
                  on:keydown={e => e.key === 'Enter' && openModal('armor-chestplate')}>
                  <span class="sg-label">Chestplate</span>
                  <span class="sg-value">{$build.chestplate || 'No chestplate'}</span>
                  {#if $build.chestplate && hasEnchants('chestplate')}
                    <span class="sg-ench">{$build.enchantments.chestplate.filter(Boolean).join(' · ')}</span>
                  {/if}
                  {#if $build.chestplate}
                    <button class="sg-upgrade-btn"
                      class:sg-upgrade-btn--maxed={$build.upgradeChestplate === 5}
                      on:click|stopPropagation={() => toggleUpgrade('upgradeChestplate')}
                      title="Cycle upgrade (+{$build.upgradeChestplate} → +{($build.upgradeChestplate + 1) % 6})">
                      +{$build.upgradeChestplate}
                    </button>
                    <button class="sg-clear" on:click|stopPropagation={() => build.update(s => ({...s, chestplate: ''}))} title="Clear">✕</button>
                    <button class="sg-ench-btn" class:sg-ench-btn--active={inlineEnchantSlot === 'chestplate'}
                      on:click|stopPropagation={() => toggleInlineEnchant('chestplate')} title="Enchant">✦</button>
                  {/if}
                </div>
                <div class="sg-cell sg-infusion sg-span2 sg-clickable" class:sg-empty={!$build.infusionRing}
                  role="button" tabindex="0"
                  on:click={() => openModal('infusion-ring')}
                  on:keydown={e => e.key === 'Enter' && openModal('infusion-ring')}>
                  <span class="sg-label">Inf. Ring</span>
                  <span class="sg-value">{$build.infusionRing || 'No infused ring'}</span>
                  {#if $build.infusionRing}
                    <button class="sg-clear" on:click|stopPropagation={() => build.update(s => ({...s, infusionRing: ''}))} title="Clear">✕</button>
                  {/if}
                </div>
                <div class="sg-cell sg-item sg-span2 sg-clickable" class:sg-empty={!$build.ring}
                  role="button" tabindex="0"
                  on:click={() => openModal('ring')}
                  on:keydown={e => e.key === 'Enter' && openModal('ring')}>
                  <span class="sg-label">Ring</span>  
                  <span class="sg-value">{$build.ring || 'No ring'}</span>
                  {#if $build.ring && hasEnchants('ring')}
                    <span class="sg-ench">{$build.enchantments.ring.filter(Boolean).join(' · ')}</span>
                  {/if}
                  {#if $build.ring}
                    <button class="sg-upgrade-btn"
                      class:sg-upgrade-btn--maxed={$build.upgradeRing === 5}
                      on:click|stopPropagation={() => toggleUpgrade('upgradeRing')}
                      title="Cycle upgrade (+{$build.upgradeRing} → +{($build.upgradeRing + 1) % 6})">
                      +{$build.upgradeRing}
                    </button>
                    <button class="sg-clear" on:click|stopPropagation={() => build.update(s => ({...s, ring: ''}))} title="Clear">✕</button>
                    <button class="sg-ench-btn" class:sg-ench-btn--active={inlineEnchantSlot === 'ring'}
                      on:click|stopPropagation={() => toggleInlineEnchant('ring')} title="Enchant">✦</button>
                  {/if}
                </div>
                <button class="sg-cell sg-race sg-span2 sg-clickable" on:click={() => openModal('race')}>
                  <span class="sg-label">Race</span>
                  <span class="sg-value">{$build.race || '—'}</span>
                  {#if $build.race}
                    {@const race = races.find(r => r.name === $build.race)}
                    {#if race?.passive}
                      <span class="sg-sub">{race.passive}</span>
                    {/if}
                  {/if}
                </button>

                <!-- Row 3: Inf Legs | Legs | — | Rune | Guild -->
                <div class="sg-cell sg-infusion sg-span2 sg-clickable" class:sg-empty={!$build.infusionLeggings}
                  role="button" tabindex="0"
                  on:click={() => openModal('infusion-leggings')}
                  on:keydown={e => e.key === 'Enter' && openModal('infusion-leggings')}>
                  <span class="sg-label">Inf. Leggings</span>
                  <span class="sg-value">{$build.infusionLeggings || 'No infused leggings'}</span>
                  {#if $build.infusionLeggings}
                    <button class="sg-clear" on:click|stopPropagation={() => build.update(s => ({...s, infusionLeggings: ''}))} title="Clear">✕</button>
                  {/if}
                </div>
                <div class="sg-cell sg-armor sg-span2 sg-clickable" class:sg-empty={!$build.leggings}
                  role="button" tabindex="0"
                  on:click={() => openModal('armor-leggings')}
                  on:keydown={e => e.key === 'Enter' && openModal('armor-leggings')}>
                  <span class="sg-label">Leggings</span>
                  <span class="sg-value">{$build.leggings || 'No leggings'}</span>
                  {#if $build.leggings && hasEnchants('leggings')}
                    <span class="sg-ench">{$build.enchantments.leggings.filter(Boolean).join(' · ')}</span>
                  {/if}
                  {#if $build.leggings}
                    <button class="sg-upgrade-btn"
                      class:sg-upgrade-btn--maxed={$build.upgradeLeggings === 5}
                      on:click|stopPropagation={() => toggleUpgrade('upgradeLeggings')}
                      title="Cycle upgrade (+{$build.upgradeLeggings} → +{($build.upgradeLeggings + 1) % 6})">
                      +{$build.upgradeLeggings}
                    </button>
                    <button class="sg-clear" on:click|stopPropagation={() => build.update(s => ({...s, leggings: ''}))} title="Clear">✕</button>
                    <button class="sg-ench-btn" class:sg-ench-btn--active={inlineEnchantSlot === 'leggings'}
                      on:click|stopPropagation={() => toggleInlineEnchant('leggings')} title="Enchant">✦</button>
                  {/if}
                </div>
                {#if isDraconic}
                  <div class="sg-cell sg-span2 sg-clickable sg-draconic-rune-cell" class:sg-empty={!selectedDraconicAbility}
                    role="button" tabindex="0"
                    on:click={cycleDraconicAbility}
                    on:keydown={e => e.key === 'Enter' && cycleDraconicAbility()}
                    title="Click to cycle the Draconic Ability — or select it directly in the panel below.">
                    <span class="sg-label">Draconic Rune</span>
                    <span class="sg-value">{selectedDraconicAbility?.label ?? 'Select ability'}</span>
                    <span class="sg-sub">{selectedDraconicAbility ? 'Rune Infusion locked' : 'Click to choose'}</span>
                  </div>
                {:else}
                  <div class="sg-cell sg-infusion sg-span2" style="opacity:0.3">
                    <span class="sg-label">Inf. Rune</span>
                    <span class="sg-value">Coming soon</span>
                  </div>
                {/if}
                <div class="sg-cell sg-item sg-span2 sg-clickable" class:sg-empty={!$build.rune}
                  role="button" tabindex="0"
                  on:click={() => openModal('rune')}
                  on:keydown={e => e.key === 'Enter' && openModal('rune')}>
                  <span class="sg-label">Rune</span>
                  <span class="sg-value">{$build.rune || 'No rune'}</span>
                  {#if $build.rune && hasEnchants('rune')}
                    <span class="sg-ench">{$build.enchantments.rune.filter(Boolean).join(' · ')}</span>
                  {/if}
                  {#if $build.rune}
                  {@const rune = runes.find(r => r.name === $build.rune)}
                    {#if rune}
                      {#if hasRuneCDR}
                        <span class="sg-cd-row">
                          <span class="sg-sub">CD:</span>
                          <span class="sg-cd-base">{rune.cooldown}s</span>
                          <span class="sg-cd-arrow">→</span>
                          <span class="sg-cd-final">{formatCD(rune.cooldown, cdr)}</span>
                        </span>
                      {:else}
                        <span class="sg-sub">CD: {rune.cooldown}s</span>
                      {/if}
                    {/if}
                    <button class="sg-upgrade-btn"
                      class:sg-upgrade-btn--maxed={$build.upgradeRune === 5}
                      on:click|stopPropagation={() => toggleUpgrade('upgradeRune')}
                      title="Cycle upgrade (+{$build.upgradeRune} → +{($build.upgradeRune + 1) % 6})">
                      +{$build.upgradeRune}
                    </button>
                    <button class="sg-clear" on:click|stopPropagation={() => build.update(s => ({...s, rune: ''}))} title="Clear">✕</button>
                    <button class="sg-ench-btn" class:sg-ench-btn--active={inlineEnchantSlot === 'rune'}
                      on:click|stopPropagation={() => toggleInlineEnchant('rune')} title="Enchant">✦</button>
                  {/if}
                </div>
                <div class="sg-cell sg-guild sg-span2 sg-clickable" class:sg-empty={!$build.guild}
                  role="button" tabindex="0"
                  on:click={() => openModal('guild')}
                  on:keydown={e => e.key === 'Enter' && openModal('guild')}>
                  <span class="sg-label">Guild</span>
                  <span class="sg-value">{$build.guild || '—'}</span>
                  {#if $build.guild}<span class="sg-sub">Rank {$build.guildRank}</span>{/if}
                  {#if $build.guild}
                    <button class="sg-clear" on:click|stopPropagation={() => setGuild('', 1)} title="Clear">✕</button>
                  {/if}
                </div>
              </div>
              {#if isDraconic && isDragonBlooded}
                <div class="sg-cell sg-span10 sg-draconic-row">
                  <div class="sg-draconic-header">
                    <span class="sg-label" style="color:#a855f7">Draconic Rune</span>
                    <span class="sg-draconic-hint">Select your dragon color</span>
                  </div>
                  <div class="sg-draconic-colors">
                    {#each DRACO_COLORS as dc}
                      <button class="draco-color-btn"
                        class:draco-color-btn--active={$build.draconicColor === dc.id}
                        style="--dc:{dc.color}"
                        on:click={() => build.update(s => ({ ...s, draconicColor: s.draconicColor === dc.id ? '' : dc.id }))}>
                        {dc.label}
                      </button>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
            {#if iepSlot}
              <div class="inline-enchant-panel">
                <div class="iep-header">
                  <span class="iep-title">Enchant: {iepSlot.charAt(0).toUpperCase() + iepSlot.slice(1)}</span>
                  <div class="iep-cat-row">
                    <button class="iep-cat-btn" class:iep-cat-btn--active={iepCat === 'unAscended'}
                      on:click={() => { if (iepCat !== 'unAscended') toggleEnchantCat(iepSlot) }}>
                      Unascended
                    </button>
                    <button class="iep-cat-btn iep-cat-btn--asc" class:iep-cat-btn--active={iepCat === 'Ascended'}
                      on:click={() => { if (iepCat !== 'Ascended') toggleEnchantCat(iepSlot) }}>
                      Ascended
                    </button>
                    {#if iepHasEnchants}
                      <button class="iep-clear-btn" on:click={() => clearEnchants(iepSlot)}>
                        Clear
                      </button>
                      <button class="iep-apply-all-btn" on:click={() => applyEnchantToAll(iepSlot)}
                        title="Apply this enchantment setup to all slots">
                        Apply to all
                      </button>
                    {/if}
                    <button class="iep-close-btn" on:click={() => inlineEnchantSlot = null}>✕</button>
                  </div>
                </div>
                <div class="iep-slots">
                  <div class="iep-slot">
                    <span class="iep-slot-num">1</span>
                    <EnchantSelect
                      value={iepS0}
                      options={iepOpts0}
                      on:change={e => setEnchantment(iepSlot, 0, e.detail)}
                    />
                    {#if iepS0}
                      <button class="iep-slot-clear" title="Clear slot 1"
                        on:click={() => setEnchantment(iepSlot, 0, '')}>✕</button>
                    {/if}
                  </div>
                  {#if iepS0 && !iepExcl}
                    {#if iepS1}
                      <button class="iep-swap-btn" title="Swap slot 1 ↔ slot 2"
                        on:click={() => swapEnchantments(iepSlot, 0, 1)}>⇅</button>
                    {/if}
                    <div class="iep-slot">
                      <span class="iep-slot-num">2</span>
                      <EnchantSelect
                        value={iepS1}
                        options={iepOpts1}
                        on:change={e => setEnchantment(iepSlot, 1, e.detail)}
                      />
                      {#if iepS1}
                        <button class="iep-slot-clear" title="Clear slot 2"
                          on:click={() => setEnchantment(iepSlot, 1, '')}>✕</button>
                      {/if}
                    </div>
                  {/if}
                  {#if iepS1 && !iepExcl}
                    {#if iepS2}
                      <button class="iep-swap-btn" title="Swap slot 2 ↔ slot 3"
                        on:click={() => swapEnchantments(iepSlot, 1, 2)}>⇅</button>
                    {/if}
                    <div class="iep-slot">
                      <span class="iep-slot-num">3</span>
                      <EnchantSelect
                        value={iepS2}
                        options={iepOpts2}
                        on:change={e => setEnchantment(iepSlot, 2, e.detail)}
                      />
                      {#if iepS2}
                        <button class="iep-slot-clear" title="Clear slot 3"
                          on:click={() => setEnchantment(iepSlot, 2, '')}>✕</button>
                      {/if}
                    </div>
                  {/if}
                </div>
                {#if iepExcl && iepS0}
                  <p class="iep-excl-note">⚠ Exclusive enchantment — only one slot available</p>
                {/if}
              </div>
            {/if}
          </div>
          
          <!-- ── WEAPON ART PANEL ── -->
          <div class="right-column">
            <div class="wa-panel">
              <div class="wa-panel-header">
                <span class="wa-panel-title">Weapon Art</span>
              </div>
              <div class="wa-selected" class:wa-selected--invalid={!waAvailable}>
                  <div class="wa-selected-top">
                    <span class="wa-name">{selectedWA.name}</span>
                    {#if hasWACDR}
                      <span class="wa-cd-badge wa-cd-badge--reduced">
                        <span class="wa-cd-old">{selectedWA.cooldown}s</span>
                        <span class="wa-cd-arrow">→</span>
                        {Math.max(1, Math.floor(selectedWA.cooldown * cdr.waCDR))}s
                      </span>
                    {:else}
                      <span class="wa-cd-badge">CD: {selectedWA.cooldown}s</span>
                    {/if}
                    {#if !waAvailable}
                      <span class="wa-req-badge">⚠ Req. not met</span>
                    {/if}
                  </div>
                </div>
                {#if availableWeaponArts.length > 1}
                    <div class="wa-available-list">
                      <span class="wa-avail-label">Available ({availableWeaponArts.length})</span>
                      <div class="wa-chips">
                        {#each availableWeaponArts as wa}
                          <button class="wa-chip" class:wa-chip--active={$build.selectedWeaponArt === wa.name}
                            on:click={() => build.update(s => ({ ...s, selectedWeaponArt: wa.name }))}>
                            {wa.name}
                          </button>
                        {/each}
                      </div>
                    </div>
                  {/if}
                </div>
                <div class="summary-stats">
                  <div class="ss-header">Stats</div>
                  {#if statRows.length === 0}
                    <p class="empty ss-empty">No stats yet.</p>
                  {:else}
                    <div class="ss-section">
                      {#each statRows as [k, v]}
                        <div class="ss-row">
                          <span class="ss-key">{formatLabel(k)}</span>
                          <span class="ss-val" class:neg={v < 0}>{formatStat(k, v)}</span>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div> </div> </div> </div> {#if perkRows.length > 0}
        <div class="panel perks-panel">
          <div class="perks-tabs-header">
            <button class="perks-tab" class:perks-tab--active={activePerksTab === 'perks'}
              on:click={() => activePerksTab = 'perks'}>
              Perks &amp; Effects
              <span class="perk-count-badge">{perkRows.length}</span>
            </button>
            <button class="perks-collapse-btn" on:click={() => showPerksPanel = !showPerksPanel}>
              {showPerksPanel ? '▲' : '▼'}
            </button>
          </div>

          {#if showPerksPanel}
            {#if activePerksTab === 'perks'}
              <div class="perks-grid">
                {#each perkRows as [name, count]}
                  {@const perk = getPerk(name)}
                  <div class="perk-card">
                    <div class="perk-row">
                      <span class="perk-name">{name} <span class="perk-val">+{Math.round(count * 100) / 100}</span></span>
                    </div>
                    {#if perk?.description}
                      <p class="perk-desc">{formatPerkDescription(perk.description, count)}</p>
                    {/if}
                    {#if name === 'Emotional'}
                      <EmotionalTracker />
                    {/if}
                    {#if name === 'Cursed'}
                       <div class="corruption-widget">
                         <div class="corruption-head">
                           <div class="corruption-head-text">
                            <span class="corruption-title">Stored Corruption</span>
                            <span class="corruption-sub">Absorbed by destroying Binded Corruptions</span>
                          </div>
                          <div class="corruption-stepper">
                            <button
                               type="button"
                               class="corruption-step-btn"
                               on:click={() => adjustStoredCorruption(-1)}
                               aria-label="Decrease Stored Corruption"
                             >−</button>
                            <input
                               type="number"
                               min="0"
                               step="1"
                               class="corruption-input"
                               aria-label="Stored Corruption Amount"
                               bind:value={$build.storedCorruptionAmount}
                               on:change={clampStoredCorruption}
                            />
                            <button
                               type="button"
                               class="corruption-step-btn"
                               on:click={() => adjustStoredCorruption(1)}
                               aria-label="Increase Stored Corruption"
                            >+</button>
                          </div>
                         </div>
                         <div class="corruption-effects">
                           <span class="corruption-effect-chip corruption-effect-chip--dur" title="Debuff duration multiplier">
                             <span class="ce-label">Debuff Dur.</span>
                             <span class="ce-val">×{storedCorruptionDurationMult}</span>
                           </span>
                           <span class="corruption-effect-chip corruption-effect-chip--dmg" title="Increase to damage taken">
                             <span class="ce-label">Dmg Taken</span>
                             <span class="ce-val">+{storedCorruptionDmgTakenPct}%</span>
                           </span>
                         </div>
                       </div>
                     {/if}
                  </div>
                {/each}
              </div>
              <div class="boosts-layout">

              </div>
            {/if}
          {/if}
        </div>
      {/if}
      <BuffList />

          <!-- ── DRACONIC RUNE PANEL ── -->
      {#if isDraconic}
        <div class="panel draconic-panel">
          <div class="draconic-panel-header">
            <span class="draconic-panel-title">
              Draconic Rune
              {#if dracoColor && isDragonBlooded}
                <span class="draco-color-badge" style="background:{dracoColor.color}20;border-color:{dracoColor.color}60;color:{dracoColor.color}">
                  {dracoColor.label} · {dracoColor.stat.charAt(0).toUpperCase() + dracoColor.stat.slice(1)} Type
                </span>
              {/if}

              {#if !selectedDraconicAbility}
                <span class="draco-select-hint">Pick your Rune Infusion ability below</span>
              {/if}
            </span>
          </div>
          <div class="draconic-abilities">

            <!-- Dragon Claw -->
             <button type="button" class="draconic-ability-card draconic-ability-card--selectable"
              class:draconic-ability-card--selected={$build.draconicRuneInfusion === 'claw'}
              class:draconic-ability-card--unselected={$build.draconicRuneInfusion && $build.draconicRuneInfusion !== 'claw'}
              on:click={() => selectDraconicAbility('claw')}>
              <div class="dab-header">
                <span class="dab-name">Dragon Claw</span>
                {#if $build.draconicRuneInfusion === 'claw'}<span class="dab-selected-badge">✦ Selected</span>{/if}
                <div class="dab-cds">
                  {#if draconicClawBubbleHasCDR}
                    <span class="dab-cd-old">{draconicBaseCDs.claw}s</span>
                    <span class="dab-cd-arrow">→</span>
                    <span class="dab-cd">{draconicClawFinalCD}s</span>
                  {:else}
                    <span class="dab-cd">CD: {draconicBaseCDs.claw}s</span>
                  {/if}
                </div>
              </div>
              <div class="dab-stats">
                <div class="dab-stat-row">
                  <span class="dab-stat-k">Damage</span>
                  <span class="dab-stat-v dab-stat-v--dmg">{linearDmg(DRAGON_CLAW_BASE_DAMAGE, DRAGON_CLAW_DAMAGE_PER_STACK, draconicPerkAmt)}</span>
                </div>
                <DraconicAbilityStats
                  {dracoColor}
                  poiseDmg={60}
                  healHoly={linearHeal(DRAGON_CLAW_HOLY_HEAL_BASE, DRAGON_CLAW_HOLY_HEAL_PER_STACK, draconicPerkAmt)}
                  healWater={linearHeal(DRAGON_CLAW_WATER_HEAL_BASE, DRAGON_CLAW_WATER_HEAL_PER_STACK, draconicPerkAmt)}
                  showHoly={$build.draconicColor === 'holy'}
                  showWater={$build.draconicColor === 'water'}
                />
                <div class="dab-notes">Guardbreaks</div>
              </div>
              </button>

            <!-- Dragon Infusion -->
            <button type="button" class="draconic-ability-card draconic-ability-card--infusion draconic-ability-card--selectable"
              class:draconic-ability-card--selected={$build.draconicRuneInfusion === 'infusion'}
              class:draconic-ability-card--unselected={$build.draconicRuneInfusion && $build.draconicRuneInfusion !== 'infusion'}
              on:click={() => selectDraconicAbility('infusion')}>
              <div class="dab-header">
                <span class="dab-name">Dragon Infusion</span>
                {#if $build.draconicRuneInfusion === 'infusion'}<span class="dab-selected-badge">✦ Selected</span>{/if}
                <div class="dab-cds">
                  {#if draconicHasCDR}
                    <span class="dab-cd-old">{draconicBaseCDs.infusion}s</span>
                    <span class="dab-cd-arrow">→</span>
                    <span class="dab-cd">{draconicFinalCDs.infusion}s</span>
                  {:else}
                    <span class="dab-cd">CD: {draconicBaseCDs.infusion}s</span>
                  {/if}
                  <span class="dab-duration">20s duration</span>
                </div>
              </div>
              <div class="dab-stats">
                <div class="dab-stat-row">
                  <span class="dab-stat-k">Dmg Type</span>
                  <span class="dab-stat-v" style={dracoColor ? `color:${dracoColor.color}` : ''}>
                    +{dragonInfusionPreviewPotency} {dracoColor ? dracoColor.stat : 'physical'}
                  </span>
                </div>

                <!-- Color-specific effects -->
                {#if draconicColorEffectRows.length > 0}
                  <div class="dab-stat-row" style="padding:2px 6px;opacity:.45;font-size:.6rem;">
                    <span style="text-transform:uppercase;letter-spacing:.12em;color:var(--ink-muted)">
                      {dracoColor?.label ?? ''} bonus
                    </span>
                  </div>
                  {#each draconicColorEffectRows as row}
                    <div class="dab-stat-row">
                      <span class="dab-stat-k">{row.k}</span>
                      <span class="dab-stat-v" style={dracoColor ? `color:${dracoColor.color}` : ''}>{row.v}</span>
                    </div>
                  {/each}
                {/if}
              </div>
              <div class="dab-notes">Does not apply to attacks without proc coefficient</div>
            </button>

            <!-- Dragon Bubble -->
            <button type="button" class="draconic-ability-card draconic-ability-card--selectable"
              class:draconic-ability-card--selected={$build.draconicRuneInfusion === 'bubble'}
              class:draconic-ability-card--unselected={$build.draconicRuneInfusion && $build.draconicRuneInfusion !== 'bubble'}
              on:click={() => selectDraconicAbility('bubble')}>
              <div class="dab-header">
                <span class="dab-name">Dragon Bubble</span>
                {#if $build.draconicRuneInfusion === 'bubble'}<span class="dab-selected-badge">✦ Selected</span>{/if}
                <div class="dab-cds">
                  {#if draconicClawBubbleHasCDR}
                    <span class="dab-cd-old">{draconicBaseCDs.bubble}s</span>
                    <span class="dab-cd-arrow">→</span>
                    <span class="dab-cd">{draconicBubbleFinalCD}s</span>
                  {:else}
                    <span class="dab-cd">CD: {draconicBaseCDs.bubble}s</span>
                  {/if}
                </div>
              </div>
              <div class="dab-stats">
                <div class="dab-stat-row">
                  <span class="dab-stat-k">Damage</span>
                  <span class="dab-stat-v dab-stat-v--dmg">{linearDmg(DRAGON_BUBBLE_BASE_DAMAGE, DRAGON_BUBBLE_DAMAGE_PER_STACK, draconicPerkAmt)}</span>
                </div>
                <DraconicAbilityStats
                  {dracoColor}
                  poiseDmg={45}
                  healHoly={linearHeal(DRAGON_BUBBLE_HOLY_HEAL_BASE, DRAGON_BUBBLE_HOLY_HEAL_PER_STACK, draconicPerkAmt)}
                  healWater={linearHeal(DRAGON_BUBBLE_WATER_HEAL_BASE, DRAGON_BUBBLE_WATER_HEAL_PER_STACK, draconicPerkAmt)}
                  showHoly={$build.draconicColor === 'holy'}
                  showWater={$build.draconicColor === 'water'}
                />
              </div>
              <div class="dab-notes">Goes through walls · Detonates on contact</div>
            </button>
          </div>
        </div>
      {/if}

      <!-- Combined details panel with tabs: Selection Details | Weapon -->
      <div class="panel details-panel">
        <div class="details-tabs-header">
          <button class="details-tab" class:details-tab--active={activeDetailsTab === 'selection'}
            on:click={() => activeDetailsTab = 'selection'}>
            Selection Details
          </button>
          {#if weaponResult}
            <button class="details-tab" class:details-tab--active={activeDetailsTab === 'weapon'}
              on:click={() => activeDetailsTab = 'weapon'}>
              {isMonk ? 'Monk Weapon' : 'Weapon'}
              {#if weaponResult.finalWeaponType}
                <span class="tab-weapon-badge" class:tab-weapon-badge--monk={isMonk}>{weaponResult.finalWeaponType}</span>
              {/if}
            </button>
          {/if}
          <button class="details-collapse-btn" on:click={() => showDetailsPanel = !showDetailsPanel}>
            {showDetailsPanel ? '▲' : '▼'}
          </button>
        </div>

        {#if showDetailsPanel}
          {#if activeDetailsTab === 'selection'}
            {#if !hasDetails}
              <p class="empty" style="padding:12px 0">Click cells above to select items and see details.</p>
            {:else}
              <div class="detail-layout">
                {#if identityCards.length > 0}
                  <div class="identity-col">
                    {#each identityCards as card}
                      <div class="detail-card">
                        <div class="detail-head">
                          <span class="detail-type">{card.title}</span>
                          <span class="detail-name">{card.label}</span>
                        </div>
                        {#if card.description}<p class="detail-desc">{card.description}</p>{/if}
                        {#if Object.keys(card.stats).length}
                          <div class="stat-list">
                            {#each Object.entries(card.stats).filter(([,v]) => v !== 0) as [k,v]}
                              <div class="stat-row"><span>{formatLabel(k)}</span><span class="stat-val" class:neg={v < 0}>{formatStat(k, v as number)}</span></div>
                            {/each}
                          </div>
                        {/if}
                        {#if card.perks.length}
                          <div class="perk-list">
                            {#each card.perks as p}
                              <div class="perk-row"><span>{p.name} <span class="perk-val">+{p.amount}</span></span></div>
                            {/each}
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                {/if}

                {#if slotGroups.length > 0}
                  <div class="gear-grid">
                    {#each slotGroups as group}
                      <div class="slot-col">
                        {#if group.main}
                          <div class="detail-card">
                            <div class="detail-head">
                              <span class="detail-type">{group.main.title}</span>
                              <span class="detail-name">{group.main.label}</span>
                              {#if group.main.enchants && group.main.enchants.length > 0}
                                <div class="detail-enchant-tags">
                                  {#each group.main.enchants as enc}
                                    <span class="enchant-tag">{enc.name}</span>
                                  {/each}
                                </div>
                              {/if}
                            </div>
                            {#if group.main.description}<p class="detail-desc">{group.main.description}</p>{/if}
                            {#if group.main.extras?.length}{#each group.main.extras as ex}<p class="detail-extra">{ex}</p>{/each}{/if}
                            {#if group.main.title === 'Rune' && hasRuneCDR}
                              <div class="cdr-block">
                                <div class="cdr-block-header"><span class="cdr-icon">⏱</span><span class="cdr-title">Rune CDR Breakdown</span></div>
                                {#if cdr.runeSetCD != null}<div class="cdr-step"><span class="cdr-source">Gladiatorial Rage</span><span class="cdr-mult">Sets CD = {cdr.runeSetCD}s</span></div>{/if}
                                {#each cdr.runeBreakdown as step}
                                  <div class="cdr-step">
                                    <span class="cdr-source">{step.source}</span>
                                    <span class="cdr-mult" class:cdr-mult--increase={step.multiplier > 1}>
                                      {step.multiplier > 1 ? '+' : '-'}{Math.abs(step.pct)}%
                                    </span>
                                  </div>
                                {/each}
                                {#each runes.filter(r => r.name === $build.rune).slice(0,1) as rune}
                                  {#if rune.name === 'Foot Dive Rune'}
                                    <div class="cdr-dual-label">Miss</div>
                                    <CdrStepsCalc
                                      breakdown={cdr.runeBreakdown}
                                      baseCd={25}
                                      setCD={cdr.runeSetCD ?? null}
                                    />
                                    <div class="cdr-dual-label" style="margin-top:6px">Hit</div>
                                    <CdrStepsCalc
                                      breakdown={cdr.runeBreakdown}
                                      baseCd={5}
                                      setCD={cdr.runeSetCD ?? null}
                                    />
                                  {:else}
                                    <CdrStepsCalc
                                      breakdown={cdr.runeBreakdown}
                                      baseCd={rune.cooldown}
                                      setCD={cdr.runeSetCD ?? null}
                                    />
                                  {/if}
                                {/each}
                              </div>
                            {/if}
                            {#if Object.keys(group.main.stats).length}
                              <div class="stat-list">
                                {#each Object.entries(group.main.stats).filter(([,v]) => v !== 0) as [k,v]}
                                  <div class="stat-row"><span>{formatLabel(k)}</span><span class="stat-val" class:neg={v < 0}>{formatStat(k, v as number)}</span></div>
                                {/each}
                              </div>
                            {/if}
                            {#if group.main.perks.length}
                              <div class="perk-list">
                                {#each group.main.perks as p}
                                  <div class="perk-row" class:perk-row--enchant={p.fromEnchant}>
                                    <span>{p.name} <span class="perk-val" class:perk-val--enchant={p.fromEnchant}>+{p.amount}</span></span>
                                  </div>
                                {/each}
                              </div>
                            {/if}
                            {#if group.main.enchants}
                              {#each group.main.enchants as enc}{#if enc.notes}<p class="detail-extra">{enc.notes}</p>{/if}{/each}
                            {/if}
                          </div>
                        {/if}

                        {#if group.infusion}
                          <div class="inf-bridge">
                            <span class="inf-bridge-line"></span>
                            <span class="inf-bridge-icon">inf</span>
                            <span class="inf-bridge-line"></span>
                          </div>
                          <div class="detail-card detail-card--infusion">
                            <div class="detail-head">
                              <span class="detail-type detail-type--infusion">{group.infusion.title}</span>
                              <span class="detail-name">{group.infusion.label}</span>
                            </div>
                            {#if Object.keys(group.infusion.stats).length}
                              <div class="stat-list">
                                {#each Object.entries(group.infusion.stats).filter(([,v]) => v !== 0) as [k,v]}
                                  <div class="stat-row stat-row--infusion"><span>{formatLabel(k)}</span><span class="stat-val stat-val--infusion" class:neg={v < 0}>{formatStat(k, v as number)}</span></div>
                                {/each}
                              </div>
                            {/if}
                            {#if group.infusion.perks.length}
                              <div class="perk-list">
                                {#each group.infusion.perks as p}
                                  <div class="perk-row"><span>{p.name} <span class="perk-val">+{p.amount}</span></span></div>
                                {/each}
                              </div>
                            {/if}
                            <div class="infusion-note">Stats x0.5 · Perks full</div>
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}

          {:else if activeDetailsTab === 'weapon' && weaponResult}
          <!-- WA Detail card -->
  <div class="detail-card wa-detail-card" class:wa-selected--invalid={!waAvailable} style="margin-bottom:10px;">
    <div class="detail-head">
      <span class="detail-type" style="color:var(--accent3)">Weapon Art</span>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span class="detail-name">{selectedWA.name}</span>
        {#if hasWACDR}
          <span class="wa-cd-badge wa-cd-badge--reduced">
            <span class="wa-cd-old">{selectedWA.cooldown}s</span>
            <span class="wa-cd-arrow">→</span>
            {Math.max(1, Math.floor(selectedWA.cooldown * cdr.waCDR))}s
          </span>
        {:else}
          <span class="wa-cd-badge">CD: {selectedWA.cooldown}s</span>
        {/if}
        {#if !waAvailable}<span class="wa-req-badge">⚠ Req. not met</span>{/if}
      </div>
    </div>
    <p class="wa-desc">{selectedWA.description}</p>
    {#if selectedWA.damageType}
      <div class="wa-stat-row" style="align-items: flex-start;">
        <span class="wa-stat-key" style="margin-top: 4px;">Damage & Type</span>
        
        <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
          
          {#if selectedWA.hitDamageTypes && selectedWA.hitDamageTypes.length > 0 && selectedWA.baseDamage}
            {@const dmgParts = selectedWA.baseDamage.split('+')}
            {#each selectedWA.hitDamageTypes as dtStr, i}
              {@const currentDmg = (dmgParts[i] || '').trim()}
              {@const hitSc = selectedWA.hitScalings?.[i]} 
              <div style="display: flex; align-items: center; gap: 10px; padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.04); background: rgba(255,255,255,0.02); ">
                <span class="wa-stat-val" style="font-family: monospace; font-size: 0.8rem; font-weight: 600; min-width: 100px; flex-shrink:0;">
                  {currentDmg}
                </span>
                <div class="damage-type-grid">
                  {#if dtStr === 'Same as weapon'}
                    {#each Object.entries(weaponDamageTypesWithBonus) as [k, v]}
                      <div class="damage-type-pill">
                        <span class="dt-name">{k.charAt(0).toUpperCase() + k.slice(1)}</span>
                        <span class="dt-val">{v}x</span>
                      </div>
                    {/each}
                  {:else}
                    {#each dtStr.split('+') as part}
                      {@const pts = part.trim().split(' ')}
                      <div class="damage-type-pill">
                        <span class="dt-name">{pts[1]}</span>
                        <span class="dt-val">{pts[0]}x</span>
                      </div>
                    {/each}
                  {/if}
                </div>
                {#if hitSc === 'Same as weapon' && weaponResult}
                  <div class="scaling-grid">
                    {#each Object.entries(weaponResult.scalings) as [k, v]}
                      <div class="scaling-pill"><span class="sc-name">{formatScalingLabel(k)}</span><span class="sc-val">{fmtScaling(v)}</span></div>
                    {/each}
                  </div>
                {:else if hitSc}
                  <div class="scaling-grid">
                    {#each (() => {
                      const pills = []
                      const re = /([\d.]+)\s*(Physical|Magic|Fire|Water|Earth|Air|Hex|Holy|Dex(?:terity)?|Summon)/gi
                      let m
                      while ((m = re.exec(hitSc)) !== null)
                        pills.push({ label: (/dex/i.test(m[2]) ? 'Dexterity' : m[2]) + ' Scaling', val: m[1] })
                      return pills
                    })() as pill}
                      <div class="scaling-pill"><span class="sc-name">{pill.label}</span><span class="sc-val">{pill.val}</span></div>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}

          {:else}
            {@const dmgOnly = selectedWA.baseDamage ?.replace(/\+?\s*[\d.×x\s]+healing/gi,'').trim()}
            <div style="display: flex; align-items: center; gap: 10px; padding: 4px 8px; border-radius: 4px;  border: 1px solid rgba(255,255,255,0.04); background: rgba(255,255,255,0.02);">
              {#if dmgOnly}
                <span class="wa-stat-val" style="flex-shrink:0;">{dmgOnly}</span>
              {/if}
              {#if selectedWA.damageType}
                <div class="damage-type-grid">
                  {#if selectedWA.damageType === 'Same as weapon' && weaponResult}
                    {#if _weightySlamAmt > 0 && selectedWA.name === 'Slam'}
                      <div class="damage-type-pill">
                        <span class="dt-name">Physical</span>
                        <span class="dt-val">1x</span>
                      </div>
                    {:else}
                      {#each Object.entries(weaponDamageTypesWithBonus) as [k, v]}
                        <div class="damage-type-pill">
                          <span class="dt-name">{k.charAt(0).toUpperCase() + k.slice(1)}</span>
                          <span class="dt-val">{v}x</span>
                        </div>
                      {/each}
                    {/if}
                  {:else if selectedWA.damageType.includes('Highest damage type') && highestDamageType && weaponResult}
                    {@const [hdKey] = highestDamageType}
                    <div style="display:flex;flex-direction:column;gap:3px;">
                      <div class="damage-type-grid">
                        <div class="damage-type-pill damage-type-pill--highest">
                          <span class="dt-name">{hdKey.charAt(0).toUpperCase() + hdKey.slice(1)}</span>
                          <span class="dt-val">1.0x</span>
                        </div>
                      </div>
                      <span class="wa-highest-hint">(highest of: {Object.entries(weaponDamageTypesWithBonus).map(([k,v]) => `${k} ${v}x`).join(', ')})</span>
                    </div>
                  {:else}
                    {#each selectedWA.damageType.split('+') as type}
                      {@const pts = type.trim().split(' ')}
                      <div class="damage-type-pill">
                        <span class="dt-name">{pts[1] ?? type.trim()}</span>
                        <span class="dt-val">{pts[0] ? pts[0] + 'x' : ''}</span>
                      </div>
                    {/each}
                  {/if}
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/if}
    {#if selectedWA.baseDamage && /healing/i.test(selectedWA.baseDamage)}
      {@const healMatches =selectedWA.baseDamage.match(/[\d.×x\s]+healing/gi)}
      {#if healMatches?.length}
        <div class="wa-stat-row">
          <span class="wa-stat-key">Healing</span>
          <div style="display:flex;flex-wrap:wrap;gap:8px;flex:1;">
            {#each healMatches as heal}
              {@const formattedHeal =heal.replace(/healing/gi,'').replace(/×/g,'x').trim()}
        {@const isMultiHeal =formattedHeal.includes('x')}
        <span class="wa-stat-val heal-val">
          {formattedHeal}
          <span class="heal-label">{isMultiHeal ? 'ticks' : 'heal'}</span>
        </span>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
    {#if selectedWA.scaling}
      <div class="wa-stat-row">
        <span class="wa-stat-key">Scaling</span>
        {#if selectedWA.scaling === 'Same as weapon' && weaponResult}
          <div class="scaling-grid" style="flex:1">
            {#each Object.entries(weaponResult.scalings) as [k, v]}
              <div class="scaling-pill"><span class="sc-name">{formatScalingLabel(k)}</span><span class="sc-val">{fmtScaling(v)}</span></div>
            {/each}
          </div>
        {:else if selectedWA.hitScalings && selectedWA.hitScalings.length > 0}
      <span class="wa-stat-val" style="font-size:.74rem;color:var(--ink-muted);font-style:italic;">Per-hit (see above)</span>
        {:else if waScalingParsed}
          <div class="scaling-grid" style="flex:1">
            {#each waScalingParsed as pill}
              <div class="scaling-pill"><span class="sc-name">{pill.label}</span><span class="sc-val">{pill.val}</span></div>
            {/each}
          </div>
        {:else}
          <span class="wa-stat-val">{selectedWA.scaling}</span>
        {/if}
      </div>
    {/if}
    {#if selectedWA.extras?.length}
      {#each selectedWA.extras as ex}
        <div class="wa-stat-row wa-stat-row--extra"><span class="wa-stat-val wa-stat-val--extra">{ex}</span></div>
      {/each}
    {/if}
    {#if !waAvailable && waUnmetReqs.length > 0}
      <div class="wa-req-block">
        <span class="wa-req-title">Requirements not met:</span>
        {#each waUnmetReqs as item}<div class="wa-req-item">{item}</div>{/each}
      </div>
    {/if}

    {#if toggleableCdrPerks.length > 0}
      <div class="cdr-toggle-row">
        {#each toggleableCdrPerks as perkName}
          {@const isOn = $build.cdrToggles?.[perkName] !== false}
          <button class="cdr-toggle-chip" class:cdr-toggle-chip--off={!isOn}
            on:click={() => toggleCdrPerk(perkName)}>
            {isOn ? '✓' : '✕'} {perkName}
          </button>
        {/each}
      </div>
    {/if}
    {#if hasWACDR}
      <div class="cdr-block" style="margin-top:6px;">
        <div class="cdr-block-header"><span class="cdr-icon">⏱</span><span class="cdr-title">Weapon Art CDR</span></div>
        {#each cdr.waBreakdown as step}
          <div class="cdr-step">
            <span class="cdr-source">{step.source}</span>
            <span class="cdr-mult" class:cdr-mult--increase={step.multiplier > 1}>
              {step.multiplier > 1 ? '+' : '-'}{Math.abs(step.pct)}%
            </span>
          </div>
        {/each}
        <CdrStepsCalc breakdown={cdr.waBreakdown} baseCd={selectedWA.cooldown} />
      </div>
    {/if}
    {#if _appWaAvgTotal}
      <div class="wa-avg-total-box">
        <div class="wa-atb-left">
          <span class="wa-atb-label">Avg Total</span>
          <span class="wa-atb-hint">~{_appWaAvgTotal.total} stars · {_appWaAvgTotal.starsPerType}/type · base only</span>
        </div>
        <span class="wa-atb-base">{_appWaAvgTotal.rawTotal}</span>
      </div>
    {/if}
      </div>
            <div class="weapon-result-layout">
              {#if weaponResult.part1Name}
                {@const part1Data = isMonk ? getGlove(weaponResult.part1Name) : getBlade(weaponResult.part1Name)}
                <div class="detail-card weapon-card" class:weapon-card--blade={!isMonk} class:weapon-card--glove={isMonk}>
                  <div class="detail-head">
                    <span class="detail-type" class:weapon-type-label={!isMonk} class:monk-type-label={isMonk}>
                      {weaponResult.part1TypeLabel} · {weaponResult.part1Type}
                    </span>
                    <span class="detail-name">{weaponResult.part1Name}</span>
                    <div class="weapon-tier-badge" class:monk-tier-badge={isMonk}>T{part1Data?.tier}</div>
                  </div>
                  {#if part1Data?.attackSpeed != null}
                    <div class="weapon-meta-row"><span class="weapon-meta-label">Attack Speed</span><span class="weapon-meta-val">{part1Data.attackSpeed}x</span></div>
                  {/if}
                  {#if Object.keys(part1DamageTypes).length}
                    <div class="weapon-section-label">Damage Types</div>
                    <div class="damage-type-grid">
                      {#each Object.entries(part1DamageTypes) as [k, v]}
                        <div class="damage-type-pill"><span class="dt-name">{formatDmgTypeLabel(k)}</span><span class="dt-val">{v}x</span></div>
                      {/each}
                    </div>
                  {/if}
                  {#if Object.keys(weaponResult.part1RawScalings).length}
                    <div class="weapon-section-label">Scalings</div>
                    <div class="scaling-grid">
                      {#each Object.entries(weaponResult.part1RawScalings) as [k, rawVal]}
                        {@const finalVal = weaponResult.part1FinalScalings[k] ?? rawVal}
                        {@const boosted = weaponResult.shrineActive && finalVal !== rawVal}
                        <div class="scaling-pill" class:scaling-pill--boosted={boosted}>
                          <span class="sc-name">{formatScalingLabel(k)}</span>
                          {#if boosted}<span class="sc-val-old">{fmtScaling(rawVal)}</span><span class="sc-val sc-val--new">{fmtScaling(finalVal)}</span>
                          {:else}<span class="sc-val">{fmtScaling(rawVal)}</span>{/if}
                        </div>
                      {/each}
                    </div>
                  {/if}
                  {#if part1Data && Object.keys(part1Data.stats).length}
    <div class="stat-list">
    {#each Object.entries(part1Data.stats).filter(([k,v]) => v !== 0 && !k.endsWith('Type') && !k.endsWith('Scaling')) as [k, rawVal]}
      {@const shrineFinal = (weaponResult.part1FinalStats as Record<string,number>)[k] ?? rawVal}
      {@const shrineRaw = (weaponResult.part1RawStats as Record<string,number>)[k] ?? rawVal}
      {@const boosted = shrineFinal !== (rawVal as number)}
    <div class="stat-row" class:stat-row--boosted={boosted}>
      <span>{formatLabel(k)}</span>
      <div class="stat-val-group">
        {#if boosted}
          <span class="stat-val stat-val-ghost" class:neg={(rawVal as number) < 0}>{formatStat(k, shrineRaw as number)}</span>
          <span class="stat-val stat-val--new" class:neg={shrineFinal < 0}>{formatStat(k, shrineFinal as number)}</span>
        {:else}
          <span class="stat-val" class:neg={shrineFinal < 0}>{formatStat(k, shrineFinal as number)}</span>
        {/if}
      </div>
    </div>
  {/each}
    </div>
  {/if}
                  {#if (part1Data as any)?.perks?.length}
                  <div class="perk-list">
                    {#each ((part1Data as any)?.perks ?? []) as p, pi}
                      {@const bonusAmt = (isMonk && pi === 0) ? p.amount + monkGlovePerkBonus : p.amount}
                      <div class="perk-row">
                        <span>{p.name} <span class="perk-val">+{bonusAmt}</span></span>
                        {#if isMonk && pi === 0 && monkGlovePerkBonus > 0}
                          <span class="monk-perk-bonus">(+{monkGlovePerkBonus} Monk)</span>
                        {/if}
                      </div>
                    {/each}
                  </div>
                {/if}
                </div>
              {:else}
                <div class="detail-card weapon-card weapon-card--empty"><p class="empty">No {part1Label.toLowerCase()} selected.</p></div>
              {/if}

              <div class="weapon-combine">
                <div class="weapon-combine-line"></div>
                <div class="weapon-combine-icon" class:monk-combine-icon={isMonk}>+</div>
                <div class="weapon-combine-line"></div>
              </div>

              <!-- Part 2 -->
              {#if weaponResult.part2Name}
                {@const part2Data = isMonk ? getEssence(weaponResult.part2Name) : getHandle(weaponResult.part2Name)}
                <div class="detail-card weapon-card" class:weapon-card--handle={!isMonk} class:weapon-card--essence={isMonk}>
                  <div class="detail-head">
                    <span class="detail-type" class:weapon-type-label--handle={!isMonk} class:monk-type-label--essence={isMonk}>
                      {weaponResult.part2TypeLabel} · {weaponResult.part2Type}
                    </span>
                    <span class="detail-name">{weaponResult.part2Name}</span>
                    <div class="weapon-tier-badge" class:weapon-tier-badge--handle={!isMonk} class:monk-tier-badge--essence={isMonk}>T{part2Data?.tier}</div>
                  </div>
                  {#if part2Data?.attackSpeed != null}
                    <div class="weapon-meta-row"><span class="weapon-meta-label">Attack Speed</span><span class="weapon-meta-val">{part2Data.attackSpeed}x</span></div>
                  {/if}
                  {#if Object.keys(part2DamageTypes).length}
                    <div class="weapon-section-label">Damage Types</div>
                    <div class="damage-type-grid">
                      {#each Object.entries(part2DamageTypes) as [k, v]}
                        <div class="damage-type-pill"><span class="dt-name">{formatDmgTypeLabel(k)}</span><span class="dt-val">{v}x</span></div>
                      {/each}
                    </div>
                  {/if}
                  {#if Object.keys(weaponResult.part2RawScalings).length}
                    <div class="weapon-section-label">Scalings</div>
                    <div class="scaling-grid">
                      {#each Object.entries(weaponResult.part2RawScalings) as [k, rawVal]}
                        {@const finalVal = weaponResult.part2FinalScalings[k] ?? rawVal}
                        {@const boosted = weaponResult.shrineActive && finalVal !== rawVal}
                        <div class="scaling-pill" class:scaling-pill--boosted={boosted}>
                          <span class="sc-name">{formatScalingLabel(k)}</span>
                          {#if boosted}<span class="sc-val-old">{fmtScaling(rawVal)}</span><span class="sc-val sc-val--new">{fmtScaling(finalVal)}</span>
                          {:else}<span class="sc-val">{fmtScaling(rawVal)}</span>{/if}
                        </div>
                      {/each}
                    </div>
                  {/if}
                  {#if part2Data && Object.keys(part2Data.stats).length}
                    <div class="stat-list">
                      {#each Object.entries(part2Data.stats).filter(([k,v]) => v !== 0 && !k.endsWith('Type') && !k.endsWith('Scaling')) as [k, rawVal]}
                        {@const finalVal = (weaponResult.part2FinalStats as Record<string,number>)[k] ?? rawVal}
                        {@const boosted = weaponResult.shrineActive && finalVal !== rawVal}
                        <div class="stat-row" class:stat-row--boosted={boosted}>
                          <span>{formatLabel(k)}</span>
                          <div class="stat-val-group">
                            {#if boosted}
                              <span class="stat-val stat-val-ghost" class:neg={rawVal < 0}>{formatStat(k, rawVal as number)}</span>
                              <span class="stat-val stat-val--new" class:neg={finalVal < 0}>{formatStat(k, finalVal as number)}</span>
                            {:else}
                              <span class="stat-val" class:neg={rawVal < 0}>{formatStat(k, rawVal as number)}</span>
                            {/if}
                          </div>
                        </div>
                      {/each}
                    </div>
                  {/if}
                  {#if (part2Data as any)?.perks?.length}
                    <div class="perk-list">
                      {#each ((part2Data as any)?.perks ?? []) as p}
                        <div class="perk-row"><span>{p.name} <span class="perk-val">+{p.amount}</span></span></div>
                      {/each}
                    </div>
                  {/if}
                </div>
              {:else}
                <div class="detail-card weapon-card weapon-card--empty"><p class="empty">No {part2Label.toLowerCase()} selected.</p></div>
              {/if}

              {#if weaponResult.part1Name && weaponResult.part2Name}
                <div class="weapon-combine weapon-combine--arrow">
                  <div class="weapon-combine-line"></div>
                  <div class="weapon-combine-icon">→</div>
                  <div class="weapon-combine-line"></div>
                </div>
                <div class="weapon-combined-card" class:weapon-combined-card--monk={isMonk}>
                  <div class="weapon-combined-header">
                    <div class="weapon-combined-left">
                      <span class="weapon-combined-title" class:monk-combined-title={isMonk}>{isMonk ? 'Combined Fists' : 'Combined Weapon'}</span>
                      {#if weaponResult.finalWeaponType}
                        <span class="weapon-type-badge" class:monk-type-badge={isMonk}>{weaponResult.finalWeaponType}</span>
                      {:else}
                        <span class="weapon-type-badge weapon-type-badge--none">None</span>
                      {/if}
                      {#if weaponResult.weaponModifier}<span class="weapon-modifier-badge">{isMonk ? '' : 'via '}{weaponResult.weaponModifier}</span>{/if}
                      {#if weaponResult.hybridActive}<span class="weapon-modifier-badge weapon-modifier-badge--hybrid">Hybrid</span>{/if}
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                      <span class="weapon-combined-speed">{weaponResult.attackSpeed}x Attack Speed</span>
                      {#if $build.race === 'KITSUNE'}
                        <span class="weapon-speed-race-bonus">+0.1 from Kitsune</span>
                      {/if}
                    </div>
                  </div>
                  {#if Object.keys(weaponDamageTypesWithBonus).length}
                    <div class="weapon-section-label">Damage Types</div>
                    <div class="damage-type-grid">
                      {#each Object.entries(weaponDamageTypesWithBonus) as [k, v]}
                        {@const base = weaponResult.damageTypes[k] ?? 0}
                        {@const bonus = weaponEnchantDmgBonus[k] ?? 0}
                        <div class="damage-type-pill" class:damage-type-pill--boosted={bonus > 0}>
                          <span class="dt-name">{formatDmgTypeLabel(k)}</span>
                          {#if bonus > 0}
                            <span class="dt-val-old">{base}x</span>
                            <span class="dt-val dt-val--boosted">{v}x</span>
                          {:else}
                            <span class="dt-val">{v}x</span>
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {/if}
                                  {#if Object.keys(weaponResult.scalings).length}
                    <div class="weapon-section-label">Scalings</div>
                    <div class="scaling-grid">
                      {#each Object.entries(weaponResult.scalings) as [k, v]}
                        <div class="scaling-pill"><span class="sc-name">{formatScalingLabel(k)}</span><span class="sc-val">{fmtScaling(v)}</span></div>
                      {/each}
                    </div>
                  {/if}
                  {#if Object.keys(weaponResult.stats).length}
                    <div class="weapon-section-label">Stats</div>
                    <div class="stat-list">
                      {#each Object.entries(weaponResult.stats).filter(([k,v]) => v !== 0 && !k.endsWith('Type') && !k.endsWith('Scaling')) as [k,v]}
                        <div class="stat-row"><span>{formatLabel(k)}</span><span class="stat-val" class:neg={v < 0}>{formatStat(k, v as number)}</span></div>
                      {/each}
                    </div>
                  {/if}
                  {#if Object.keys(weaponResult.perks).length}
                    <div class="weapon-section-label">Perks</div>
                    <div class="perk-list">
                      {#each Object.entries(weaponResult.perks) as [name, amount]}
                        <div class="perk-row"><span>{name} <span class="perk-val">+{amount}</span></span></div>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          {/if}
        {/if}
      </div>

    </div>
    {:else}
      <div class="analyze-wrap">
        <div class="analyze-hp-bar">
          <LevelBar protection={$result.stats.protection ?? 0} hpThreshold={_dragonStateThreshold} />
        </div>
        <DamageAnalyzer />
      </div>
    {/if}

  <Toast />
</div> <style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :global(body) { background: var(--bg); color: var(--ink); font-family: var(--font-body); min-height: 100vh; }

  .app { max-width: 1400px; margin: 0 auto; padding: 24px clamp(10px,3vw,32px) 60px; }



  .workspace { display:flex; flex-direction:column; gap:14px; }
  .analyze-hp-bar { display:flex; padding:0 4px 8px 4px; }

  .corruption-widget {
    margin-top: 6px;
    padding: 10px 12px;
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(168,85,247,.08), rgba(168,85,247,.03));
    border: 1px solid rgba(168,85,247,.22);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .corruption-head { display: flex; align-items: center; gap: 8px; }
  .corruption-head-text { display: flex; flex-direction: column; gap: 0; flex: 1; min-width: 0; }
  .corruption-title { font-size: .74rem; font-weight: 800; color: #c084fc; letter-spacing: .02em; }
  .corruption-sub { font-size: .6rem; color: var(--ink-muted); opacity: .55; font-style: italic; }
  .corruption-stepper {
    display: flex; align-items: center;
    background: var(--surface3); border: 1px solid rgba(168,85,247,.25);
    border-radius: 7px; overflow: hidden; flex-shrink: 0;
  }
   .corruption-step-btn {
     width: 24px; height: 26px; display: flex; align-items: center; justify-content: center;
     background: rgba(168,85,247,.08); border: none; color: #c084fc;
     font-size: .85rem; font-weight: 700; cursor: pointer; line-height: 1;
     transition: background .12s; font-family: var(--font-body);
   }
   .corruption-step-btn:hover { background: rgba(168,85,247,.22); }
   .corruption-step-btn:active { background: rgba(168,85,247,.32); }
   .corruption-input {
     width: 42px; text-align: center; background: transparent;
     border: none; border-left: 1px solid rgba(168,85,247,.2); border-right: 1px solid rgba(168,85,247,.2);
     color: var(--ink); font-family: 'Courier New', monospace; font-size: .85rem; font-weight: 800;
     padding: 4px 0; -moz-appearance: textfield; appearance: textfield;
   }
   .corruption-input::-webkit-inner-spin-button,
   .corruption-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
   .corruption-input:focus { outline: none; background: rgba(168,85,247,.08); }
   .corruption-effects { display: flex; flex-wrap: wrap; gap: 6px; }
   .corruption-effect-chip {
     display: flex; align-items: center; gap: 5px;
     padding: 3px 9px; border-radius: 999px; font-size: .65rem; font-weight: 700; border: 1px solid;
   }
   .corruption-effect-chip--dur { background: rgba(168,85,247,.1); border-color: rgba(168,85,247,.28); color: #c084fc; }
   .corruption-effect-chip--dmg { background: rgba(248,113,113,.1); border-color: rgba(248,113,113,.28); color: var(--neg); }
   .ce-label { opacity: .7; text-transform: uppercase; letter-spacing: .06em; font-size: .58rem; }
   .ce-val { font-family: 'Courier New', monospace; font-weight: 800; }



  /* ── Tooltip ── */
  :global(.enchant-tooltip) {
    position:fixed; z-index:9999; background:var(--surface); border:1px solid rgba(167,139,250,.3);
    border-radius:8px; padding:10px 12px; max-width:260px; pointer-events:none;
    box-shadow:0 8px 24px rgba(0,0,0,.5);
  }
  :global(.enchant-tooltip p) { margin:0 0 4px; font-size:.76rem; color:var(--ink); line-height:1.45; }

  /* ── SUMMARY ── */
  .panel { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:18px; }
  .panel-title { font-size:.8rem; text-transform:uppercase; letter-spacing:.18em; color:var(--ink-muted); font-weight:700; margin-bottom:14px; }
  .summary-panel { border-color:rgba(74,222,128,.13); background:linear-gradient(160deg,var(--surface) 60%,rgba(74,222,128,.03) 100%); }
  .summary-title { color:var(--accent); }
  .summary-layout {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .left-column {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: visible;
  }

  .right-column {
    flex: 0 0 auto;
    width: 250px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  @media (max-width: 1020px) {
    .summary-layout {
      flex-direction: column;
    }
    .right-column {
      width: 100%;
    }
  }
  @media (max-width: 640px) {
    .left-column {
      width: 100%;
      min-width: 0;
      overflow: visible;
    }
    .summary-grid {
      grid-template-columns: repeat(10, minmax(45px, 1fr));
      min-width: 600px;
    }
    .summary-grid-wrap {
      width: 100vw;
      margin-left: calc(-50vw + 50%);
      margin-right: calc(-50vw + 50%);
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      flex-shrink: 0;
    }
  }
  .summary-grid-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }
  .summary-grid { display:grid; grid-template-columns:repeat(10,minmax(45px,1fr)); gap:6px; min-width:unset; }

  .sg-span10 { grid-column:span 10; }
  .sg-span3  { grid-column:span 3; }
  .sg-span2  { grid-column:span 2; }

  .sg-cell {
    border-radius:8px;
    padding:9px 11px;
    display:flex;
    flex-direction:column;
    gap:2px;
    min-height:80px;
    border:1px solid transparent;
    position:relative;
    align-self:stretch;
  }
  .sg-clickable { cursor:pointer; transition:all .15s; }
  .sg-clickable:hover { filter:brightness(1.15); transform:translateY(-1px); box-shadow:0 4px 12px rgba(0,0,0,.3); }
  .sg-empty { opacity:.38; }

  .sg-clear {
    position:absolute; top:5px; right:5px;
    width:20px; height:20px; border-radius:4px;
    background:rgba(248,113,113,.18); border:1px solid rgba(248,113,113,.3);
    color:var(--neg); font-size:.6rem; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    transition:background .15s; line-height:1; padding:0;
  }
  .sg-clear:hover { background:rgba(248,113,113,.4); }

  .sg-ench-btn {
    position:absolute; bottom:5px; right:5px;
    width:20px; height:20px; border-radius:4px;
    background:rgba(167,139,250,.15); border:1px solid rgba(167,139,250,.25);
    color:var(--accent3); font-size:.65rem; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    transition:all .15s; line-height:1; padding:0;
  }
  .sg-ench-btn:hover { background:rgba(167,139,250,.3); border-color:var(--accent3); }
  .sg-ench-btn--active { background:rgba(167,139,250,.3); border-color:var(--accent3); box-shadow:0 0 6px rgba(167,139,250,.4); }

  .sg-weapon { background:linear-gradient(135deg,rgba(251,146,60,.16),rgba(251,191,36,.1)); border-color:rgba(251,146,60,.26); }
  .sg-armor  { background:linear-gradient(135deg,rgba(74,222,128,.1),rgba(74,222,128,.05)); border-color:rgba(74,222,128,.18); }
  .sg-infusion { background:linear-gradient(135deg,rgba(56,189,248,.1),rgba(56,189,248,.05)); border-color:rgba(56,189,248,.2); }
  .sg-blade  { background:linear-gradient(135deg,rgba(251,146,60,.12),rgba(251,146,60,.06)); border-color:rgba(251,146,60,.22); }
  .sg-handle { background:linear-gradient(135deg,rgba(52,211,153,.12),rgba(52,211,153,.06)); border-color:rgba(52,211,153,.22); }
  .sg-item   { background:linear-gradient(135deg,rgba(167,139,250,.1),rgba(167,139,250,.05)); border-color:rgba(167,139,250,.18); }
  .sg-race   { background:linear-gradient(135deg,rgba(56,189,248,.1),rgba(56,189,248,.05)); border-color:rgba(56,189,248,.18); }
  .sg-guild  { background:linear-gradient(135deg,rgba(245,158,11,.12),rgba(245,158,11,.06)); border-color:rgba(245,158,11,.22); }
  .sg-monk-glove   { background:linear-gradient(135deg,rgba(232,121,249,.12),rgba(232,121,249,.06)); border-color:rgba(232,121,249,.22); }
  .sg-monk-essence { background:linear-gradient(135deg,rgba(129,140,248,.12),rgba(129,140,248,.06)); border-color:rgba(129,140,248,.22); }

  .sg-label { font-size:.59rem; text-transform:uppercase; letter-spacing:.16em; font-weight:700; opacity:.6; }
  .sg-weapon .sg-label { color:var(--weapon-blade); }
  .sg-armor  .sg-label { color:var(--accent); }
  .sg-infusion .sg-label { color:var(--infusion); }
  .sg-blade  .sg-label { color:var(--weapon-blade); }
  .sg-handle .sg-label { color:var(--weapon-handle); }
  .sg-item   .sg-label { color:var(--accent3); }
  .sg-race   .sg-label { color:var(--infusion); }
  .sg-guild  .sg-label { color:var(--accent2); }
  .sg-monk-glove   .sg-label { color:var(--monk-glove); }
  .sg-monk-essence .sg-label { color:var(--monk-essence); }

  .sg-value { font-size:.84rem; font-weight:700; color:var(--ink); line-height:1.2; }
  .sg-sub   { font-size:.67rem; color:var(--ink-muted); line-height:1.3; margin-top:1px; }
  .sg-ench  { font-size:.62rem; color:var(--accent3); opacity:.75; margin-top:1px; }
  .sg-badge { display:inline-block; font-size:.62rem; font-weight:700; padding:2px 7px; border-radius:999px; background:rgba(251,191,36,.12); border:1px solid rgba(251,191,36,.22); color:var(--weapon-combined); margin-top:3px; width:fit-content; }
  .sg-cd-row { display:flex; align-items:center; gap:4px; margin-top:3px; }
  .sg-cd-base { font-size:.65rem; color:var(--ink-muted); text-decoration:line-through; opacity:.45; }
  .sg-cd-arrow { font-size:.6rem; color:var(--ink-muted); opacity:.35; }
  .sg-cd-final { font-size:.8rem; font-weight:800; color:#34d399; }

  .sg-weapon-inner { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; width:100%; }
  .sg-weapon-left { display:flex; flex-direction:column; gap:2px; flex:1; min-width:0; }
  .shrine-inline { display:flex; flex-direction:column; align-items:flex-end; gap:4px; flex-shrink:0; }
  .shrine-btn-inline { display:flex; align-items:center; gap:5px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12); border-radius:7px; padding:5px 10px; cursor:pointer; color:var(--ink-muted); font-family:var(--font-body); font-size:.72rem; font-weight:700; transition:all .15s; white-space:nowrap; }
  .shrine-btn-inline:hover { border-color:rgba(251,191,36,.4); color:var(--weapon-combined); }
  .shrine-btn-inline--active { background:rgba(251,191,36,.1); border-color:rgba(251,191,36,.35); color:var(--weapon-combined); }
  .shrine-icon-sm { font-size:.85rem; }
  .shrine-label-sm { letter-spacing:.06em; }
  .shrine-state-sm { font-size:.65rem; opacity:.7; }
  .shrine-hint-sm { font-size:.6rem; color:var(--weapon-combined); opacity:.6; }
.summary-stats {
  position: relative;
  background: var(--surface2);
  border: 1px solid rgba(139,92,246,.18);
  border-radius: 12px;
  padding: 0;
  display: flex;
  flex-direction: column;
  max-height: 354px;
  overflow-y: auto;
  overscroll-behavior: contain;
  transition: border-color .25s ease, box-shadow .25s ease;
  scrollbar-width: thin;
  scrollbar-color: rgba(139,92,246,.45) transparent;
  order: -1;
}
.summary-stats:hover {
  border-color: rgba(139,92,246,.4);
  box-shadow: 0 0 0 1px rgba(139,92,246,.12), 0 8px 28px rgba(139,92,246,.1);
}
.summary-stats::-webkit-scrollbar { width: 12px; }
.summary-stats::-webkit-scrollbar-track { background: transparent; }
.summary-stats::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #8b5cf6, #6366f1);
  border-radius: 999px;
  border: 3px solid transparent;
  background-clip: padding-box;
}
.summary-stats::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #a78bfa, #818cf8);
  border: 3px solid transparent;
  background-clip: padding-box;
}
.ss-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--surface2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  -webkit-mask-image: none;
  mask-image: none;
  font-size: .6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .2em;
  color: var(--accent3);
  padding: 12px 16px 8px;
  margin: 0;
  border-bottom: 1px solid rgba(139,92,246,.2);
  box-shadow: 0 2px 12px rgba(0,0,0,.35);
  display: flex;
  align-items: center;
  gap: 6px;
}
.ss-header::before {
  content: '◈';
  font-size: .55rem;
  opacity: .45;
}

.ss-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px 16px;
}
  .ss-header { font-size:.62rem; text-transform:uppercase; letter-spacing:.16em; color:var(--ink-muted); font-weight:700; padding-bottom:6px; border-bottom:1px solid var(--border); margin-bottom:2px; }
  .ss-section { display:flex; flex-direction:column; gap:2px; }
  .ss-row { display:flex; justify-content:space-between; align-items:center; gap:8px; padding:3px 5px; border-radius:4px; font-size:.75rem; transition:background .1s; }
  .ss-row:hover { background:var(--surface3); }
  .ss-key { color:var(--ink-muted); }
  .ss-val { font-weight:700; color:var(--accent); white-space:nowrap; }
  .ss-val.neg { color:var(--neg); }
  .inline-enchant-panel {
    margin-top:10px;
    background:linear-gradient(135deg,rgba(167,139,250,.08) 0%,rgba(167,139,250,.04) 100%);
    border:1px solid rgba(167,139,250,.25);
    border-radius:10px; padding:12px 14px;
    animation: iepSlide .15s ease;
  }
  @keyframes iepSlide { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }

  .iep-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:10px; }
  .iep-title { font-size:.72rem; text-transform:uppercase; letter-spacing:.16em; font-weight:700; color:var(--accent3); }
  .iep-cat-row { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
  .iep-cat-btn {
    padding:4px 11px; border-radius:6px; border:1px solid rgba(255,255,255,.1);
    background:var(--surface3); color:var(--ink-muted); font-size:.72rem; font-weight:700;
    cursor:pointer; transition:all .15s; letter-spacing:.04em;
  }
  .iep-cat-btn:hover { border-color:rgba(167,139,250,.35); color:var(--accent3); }
  .iep-cat-btn--active { background:rgba(167,139,250,.15); border-color:rgba(167,139,250,.4); color:var(--accent3); }
  .iep-cat-btn--asc.iep-cat-btn--active { background:rgba(251,191,36,.1); border-color:rgba(251,191,36,.35); color:var(--weapon-combined); }
  .iep-clear-btn { padding:4px 10px; border-radius:6px; border:1px solid rgba(248,113,113,.25); background:rgba(248,113,113,.08); color:var(--neg); font-size:.7rem; cursor:pointer; transition:all .15s; }
  .iep-clear-btn:hover { background:rgba(248,113,113,.18); }
  .iep-close-btn { width:24px; height:24px; border-radius:5px; border:1px solid var(--border); background:var(--surface3); color:var(--ink-muted); font-size:.7rem; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; }
  .iep-close-btn:hover { background:rgba(248,113,113,.15); color:var(--neg); border-color:rgba(248,113,113,.3); }

  .iep-slot-clear { flex-shrink:0; width:22px; height:22px; border-radius:5px; border:1px solid rgba(248,113,113,.25); background:rgba(248,113,113,.08); color:var(--neg); font-size:.58rem; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; padding:0; line-height:1; }
  .iep-slot-clear:hover { background:rgba(248,113,113,.25); border-color:rgba(248,113,113,.5); }

  .iep-swap-btn { align-self:center; flex-shrink:0; width:22px; height:22px; border-radius:5px; border:1px solid rgba(167,139,250,.2); background:rgba(167,139,250,.07); color:var(--accent3); font-size:.8rem; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; padding:0; line-height:1; margin:0 -2px; }
  .iep-swap-btn:hover { background:rgba(167,139,250,.2); border-color:rgba(167,139,250,.5); }

  .iep-slots { display:flex; flex-direction:column; gap:4px; }
  .iep-slot { display:flex; align-items:center; gap:6px; }
  .iep-slot-num { font-size:.65rem; font-weight:800; color:var(--accent3); width:14px; flex-shrink:0; opacity:.7; }
  .iep-excl-note { font-size:.72rem; color:var(--accent2); margin-top:8px; padding:6px 10px; background:rgba(245,158,11,.08); border:1px solid rgba(245,158,11,.2); border-radius:6px; }

  /* ── Collapsible panel title buttons ── */
/* ── PERKS PANEL TABS ── */
.perks-panel { 
  border-color: rgba(245,158,11,.13); 
  background: linear-gradient(160deg, var(--surface) 60%, rgba(245,158,11,.03) 100%);
  padding: 0;
  overflow: hidden;
}

.perks-tabs-header {
  display: flex; align-items: stretch;
  border-bottom: 1px solid var(--border);
  background: var(--surface2);
  border-radius: var(--radius) var(--radius) 0 0;
}

.perks-tab {
  display: flex; align-items: center; gap: 7px;
  padding: 11px 16px; background: none; border: none;
  color: var(--ink-muted); font-size: .75rem; font-weight: 700;
  letter-spacing: .08em; text-transform: uppercase; cursor: pointer;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: all .15s; font-family: var(--font-body);
}
.perks-tab:hover { color: var(--ink); background: rgba(255,255,255,.03); }
.perks-tab--active { 
  color: var(--accent2); 
  border-bottom-color: var(--accent2); 
  background: rgba(245,158,11,.04); 
}

.perks-collapse-btn {
  margin-left: auto; padding: 0 14px; background: none; border: none;
  color: var(--ink-muted); font-size: .65rem; cursor: pointer; opacity: .5;
  transition: opacity .15s; font-family: var(--font-body);
}
.perks-collapse-btn:hover { opacity: 1; }

.perks-panel > div:not(.perks-tabs-header) { padding: 14px 18px; }


/* boosts layout (giữ nguyên các class cũ) */
.boosts-layout { display: flex; flex-direction: column; gap: 14px; }

  .perk-count-badge { display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:50%; background:rgba(245,158,11,.15); border:1px solid rgba(245,158,11,.25); color:var(--accent2); font-size:.6rem; font-weight:800; margin-left:6px; vertical-align:middle; }

  .perks-panel { border-color:rgba(245,158,11,.13); background:linear-gradient(160deg,var(--surface) 60%,rgba(245,158,11,.03) 100%); }

  .perks-grid { display:flex; flex-direction:column; gap:6px; margin-top:10px; }

  /* ── Details panel with tabs ── */
  .details-panel { padding:0; overflow:hidden; }
  .details-tabs-header {
    display:flex; align-items:stretch; gap:0;
    border-bottom:1px solid var(--border); background:var(--surface2);
    border-radius:var(--radius) var(--radius) 0 0;
  }
  .details-tab {
    display:flex; align-items:center; gap:8px;
    padding:11px 18px; background:none; border:none;
    color:var(--ink-muted); font-size:.78rem; font-weight:700;
    letter-spacing:.08em; text-transform:uppercase; cursor:pointer;
    border-bottom:2px solid transparent; margin-bottom:-1px;
    transition:all .15s; font-family:var(--font-body);
  }
  .details-tab:hover { color:var(--ink); background:rgba(255,255,255,.03); }
  .details-tab--active { color:var(--accent); border-bottom-color:var(--accent); background:rgba(74,222,128,.04); }
  .details-tab--active:nth-child(2) { color:var(--weapon-blade); border-bottom-color:var(--weapon-blade); background:rgba(251,146,60,.04); }
  .details-collapse-btn {
    margin-left:auto; padding:0 14px; background:none; border:none;
    color:var(--ink-muted); font-size:.65rem; cursor:pointer; opacity:.5;
    transition:opacity .15s; font-family:var(--font-body);
  }
  .details-collapse-btn:hover { opacity:1; }

  .tab-weapon-badge { font-size:.62rem; font-weight:700; padding:2px 6px; border-radius:999px; background:rgba(251,146,60,.12); border:1px solid rgba(251,146,60,.25); color:var(--weapon-blade); }
  .tab-weapon-badge--monk { background:rgba(232,121,249,.12); border-color:rgba(232,121,249,.25); color:var(--monk-glove); }

  .details-panel > div:not(.details-tabs-header) { padding:16px 18px; }
  .detail-layout { display:flex; gap:10px; align-items:flex-start; }
  .identity-col { flex:0 0 200px; display:flex; flex-direction:column; gap:10px; }
  .gear-grid { flex:1; display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:10px; align-items:start; }
  .slot-col { display:flex; flex-direction:column; }
  .inf-bridge { display:flex; align-items:center; gap:4px; padding:2px 12px; }
  .inf-bridge-line { flex:1; height:1px; background:var(--infusion-border); }
  .inf-bridge-icon { font-size:.6rem; color:var(--infusion); opacity:.6; text-transform:uppercase; letter-spacing:.1em; }
  .detail-card { background:var(--surface2); border:1px solid var(--border); border-radius:var(--radius-sm); padding:12px; display:flex; flex-direction:column; gap:8px; }
  .detail-card--infusion { border-color:var(--infusion-border); background:linear-gradient(160deg,var(--surface2) 50%,rgba(56,189,248,.05) 100%); }
  .detail-head { display:flex; flex-direction:column; gap:2px; }
  .detail-type { font-size:.62rem; text-transform:uppercase; letter-spacing:.18em; color:var(--accent); font-weight:700; }
  .detail-type--infusion { color:var(--infusion); }
  .detail-name { font-size:.9rem; font-weight:600; color:var(--ink); }
  .detail-enchant-tags { display:flex; flex-wrap:wrap; gap:4px; margin-top:4px; }
  .enchant-tag { font-size:.65rem; font-weight:600; padding:2px 7px; border-radius:999px; background:rgba(167,139,250,.12); border:1px solid rgba(167,139,250,.25); color:var(--accent3); }
  .detail-desc { font-size:.78rem; color:var(--ink-muted); line-height:1.45; }
  .detail-extra { font-size:.75rem; color:var(--accent2); }
  .infusion-note { font-size:.65rem; color:var(--infusion); opacity:.5; }

  .weapon-result-layout { display:grid; grid-template-columns:1fr auto 1fr auto 1fr; gap:10px; align-items:start; }
  .weapon-combined-card { background:linear-gradient(135deg,rgba(251,191,36,.08),rgba(251,146,60,.06)); border:1px solid rgba(251,191,36,.22); border-radius:var(--radius-sm); padding:12px; display:flex; flex-direction:column; gap:8px; }
  .weapon-combined-card--monk { background:linear-gradient(135deg,rgba(192,132,252,.1),rgba(129,140,248,.08)); border-color:rgba(192,132,252,.28); }
  .weapon-combined-header { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; }
  .weapon-combined-left { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .weapon-combined-title { font-size:.72rem; text-transform:uppercase; letter-spacing:.16em; color:var(--weapon-combined); font-weight:700; }
  .monk-combined-title { color:var(--monk-combined) !important; }
  .weapon-combined-speed { font-size:.8rem; font-weight:700; color:var(--weapon-combined); background:rgba(251,191,36,.1); padding:3px 8px; border-radius:999px; border:1px solid rgba(251,191,36,.2); }
  .weapon-speed-race-bonus { font-size:.68rem; font-weight:600; padding:2px 8px; border-radius:999px; background:rgba(74,222,128,.1); border:1px solid rgba(74,222,128,.22); color:var(--accent); }
  .weapon-type-badge { font-size:.72rem; font-weight:700; padding:2px 9px; border-radius:999px; background:rgba(251,146,60,.12); border:1px solid rgba(251,146,60,.28); color:var(--weapon-blade); }
  .weapon-type-badge--none { background:rgba(138,141,133,.1); border-color:rgba(138,141,133,.2); color:var(--ink-muted); }
  .monk-type-badge { background:rgba(232,121,249,.12) !important; border-color:rgba(232,121,249,.3) !important; color:var(--monk-glove) !important; }
  .weapon-modifier-badge { font-size:.65rem; font-weight:600; padding:2px 8px; border-radius:999px; background:rgba(167,139,250,.1); border:1px solid rgba(167,139,250,.25); color:var(--accent3); }
  .weapon-modifier-badge--hybrid { background:rgba(16,185,129,.1); border-color:rgba(16,185,129,.25); color:#10b981; }
  .weapon-combine { display:flex; flex-direction:column; align-items:center; justify-content:flex-start; padding-top:20px; gap:6px; }
  .weapon-combine-line { width:1px; flex:1; min-height:20px; background:rgba(251,146,60,.25); }
  .weapon-combine-icon { font-size:1rem; color:var(--weapon-blade); opacity:.6; }
  .monk-combine-icon { color:var(--monk-glove) !important; }
  .weapon-card { display:flex; flex-direction:column; gap:8px; }
  .weapon-card--blade  { border-color:rgba(251,146,60,.22); }
  .weapon-card--handle { border-color:rgba(52,211,153,.22); }
  .weapon-card--glove  { border-color:rgba(232,121,249,.25); }
  .weapon-card--essence { border-color:rgba(129,140,248,.25); }
  .weapon-card--empty { border-style:dashed; opacity:.4; }
  .weapon-type-label { color:var(--weapon-blade) !important; }
  .weapon-type-label--handle { color:var(--weapon-handle) !important; }
  .monk-type-label { color:var(--monk-glove) !important; }
  .monk-type-label--essence { color:var(--monk-essence) !important; }
  .weapon-tier-badge { display:inline-block; font-size:.62rem; font-weight:800; padding:2px 6px; border-radius:4px; background:rgba(251,146,60,.12); border:1px solid rgba(251,146,60,.25); color:var(--weapon-blade); margin-top:2px; width:fit-content; }
  .weapon-tier-badge--handle { background:rgba(52,211,153,.12); border-color:rgba(52,211,153,.25); color:var(--weapon-handle); }
  .monk-tier-badge { background:rgba(232,121,249,.12); border-color:rgba(232,121,249,.25); color:var(--monk-glove); }
  .monk-tier-badge--essence { background:rgba(129,140,248,.12); border-color:rgba(129,140,248,.25); color:var(--monk-essence); }
  .weapon-meta-row { display:flex; justify-content:space-between; align-items:center; padding:5px 8px; border-radius:5px; background:var(--surface3); font-size:.78rem; }
  .weapon-meta-label { color:var(--ink-muted); }
  .weapon-meta-val { font-weight:700; color:var(--accent2); }
  .weapon-section-label { font-size:.62rem; text-transform:uppercase; letter-spacing:.14em; color:var(--ink-muted); font-weight:700; margin-top:2px; }
  .damage-type-grid,.scaling-grid { display:flex; flex-wrap:wrap; gap:4px; }
  .damage-type-pill { display:flex; align-items:center; gap:4px; padding:3px 7px; border-radius:999px; background:rgba(251,146,60,.1); border:1px solid rgba(251,146,60,.2); font-size:.7rem; }
  .dt-name { color:var(--ink-muted); }
  .dt-val { font-weight:700; color:var(--weapon-blade); }
  .scaling-pill { display:flex; align-items:center; gap:4px; padding:3px 7px; border-radius:999px; background:rgba(167,139,250,.1); border:1px solid rgba(167,139,250,.2); font-size:.7rem; }
  .sc-name { color:var(--ink-muted); }
  .sc-val { font-weight:700; color:var(--accent3); }
  .sc-val-old { font-size:.65rem; opacity:.35; text-decoration:line-through; color:var(--ink-muted); margin-right:2px; }
  .sc-val--new { color:var(--weapon-combined) !important; font-weight:800; }
  .scaling-pill--boosted { border-color:rgba(251,191,36,.3); background:rgba(251,191,36,.08); }

  .stat-list { display:flex; flex-direction:column; gap:4px; }
  .stat-row { display:flex; justify-content:space-between; align-items:center; gap:8px; padding:6px 8px; border-radius:6px; background:var(--surface3); font-size:.8rem; }
  .stat-row--infusion { background:rgba(56,189,248,.06); }
  .stat-row--boosted { background:rgba(251,191,36,.05); }
  .stat-val { font-weight:700; color:var(--accent); white-space:nowrap; }
  .stat-val.neg { color:var(--neg); }
  .stat-val--infusion { color:var(--infusion); }
  .stat-val-group { display:flex; align-items:center; gap:5px; }
  .stat-val-ghost { font-weight:400; opacity:.35; font-size:.72rem; text-decoration:line-through; color:var(--ink-muted) !important; }
  .stat-val--new { color:var(--weapon-combined) !important; font-weight:800; }
  .perk-list { display:flex; flex-direction:column; gap:4px; }
  .perk-row { display:flex; align-items:center; font-size:.82rem; padding:4px 6px; border-radius:5px; }
  .perk-row--enchant { background:rgba(167,139,250,.06); }
  .perk-val { font-weight:700; color:var(--accent2); white-space:nowrap; margin-left:3px; }
  .perk-val--enchant { color:var(--accent3); }
  .perk-card { display:flex; flex-direction:column; gap:2px; padding:4px 0; border-bottom:1px solid var(--border); }
  .perk-card:last-child { border-bottom:none; }
  .perk-name { font-weight:600; }
  .perk-desc { font-size:.74rem; color:var(--ink-muted); line-height:1.4; }

  .cdr-block { background:rgba(52,211,153,.05); border:1px solid rgba(52,211,153,.18); border-radius:7px; padding:9px 11px; display:flex; flex-direction:column; gap:5px; }
  .cdr-block-header { display:flex; align-items:center; gap:5px; }
  .cdr-icon { font-size:.8rem; }
  .cdr-title { font-size:.62rem; text-transform:uppercase; letter-spacing:.16em; font-weight:700; color:#34d399; }
  .cdr-step { display:flex; justify-content:space-between; align-items:center; font-size:.75rem; padding:2px 4px; }
  .cdr-source { color:var(--ink-muted); }
  .cdr-dual-label { font-size:.65rem; font-weight:700; color:var(--ink-muted); opacity:.6; letter-spacing:.08em; text-transform:uppercase; }
  .cdr-mult { font-weight:700; color:#34d399; }
  .empty { color:var(--ink-muted); font-style:italic; font-size:.85rem; padding: 10px;}

  

  @media (max-width:1020px) {
    .summary-layout { grid-template-columns:1fr; }
  }
  @media (max-width:740px) {
    .weapon-result-layout { grid-template-columns:1fr auto 1fr; }
    .weapon-combined-card { grid-column:1/-1; }
    .weapon-combine--arrow { display:none; }
    .sg-weapon-inner { flex-direction:column; gap:8px; }
    .shrine-inline { align-items:flex-start; }
    .iep-slot { min-width:unset; }
  }
  @media (max-width:640px) {
    .weapon-result-layout { grid-template-columns:1fr; }
    .weapon-combine { flex-direction:row; padding-top:0; }
    .weapon-combine-line { width:40px; height:1px; min-height:unset; }
    .details-tab { padding:9px 12px; font-size:.7rem; }
  }
  @media (max-width:768px) {
    .detail-layout { flex-direction:column; }
    .identity-col { flex:none; width:100%; }
  }
  .sg-clickable:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
  .sg-upgrade-btn {
    display:inline-flex; align-items:center; justify-content:center;
    padding:1px 5px; border-radius:4px;
    background:rgba(251,191,36,.12); border:1px solid rgba(251,191,36,.22);
    color:var(--weapon-combined); font-size:.6rem; font-weight:800;
    cursor:pointer; transition:all .15s; line-height:1;
    width:fit-content; margin-top:2px;
  }
  .sg-upgrade-btn:hover { background:rgba(251,191,36,.25); }
  .sg-upgrade-btn--maxed {
    background:rgba(251,191,36,.22); border-color:rgba(251,191,36,.5);
    box-shadow: 0 0 6px rgba(251,191,36,.3);
  }
  /* ── WEAPON ART PANEL ── */
.wa-panel {
  order: 1;
  background: linear-gradient(135deg, rgba(167,139,250,.09) 0%, rgba(167,139,250,.04) 100%);
  border: 1px solid rgba(167,139,250,.22);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  margin-top: 0;
  transition: border-color .25s ease, box-shadow .25s ease, transform .2s ease;
}

.wa-panel:hover {
  border-color: rgba(167,139,250,.4);
  box-shadow: 0 0 0 1px rgba(167,139,250,.12), 0 8px 28px rgba(167,139,250,.1);
}

.wa-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.wa-panel-title {
  font-size: .62rem;
  text-transform: uppercase;
  letter-spacing: .18em;
  font-weight: 700;
  color: var(--accent3);
}
.wa-selected {
  background: var(--surface3);
  border: 1px solid rgba(167,139,250,.18);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.wa-selected--invalid {
  border-color: rgba(248,113,113,.25);
  background: rgba(248,113,113,.04);
}

.wa-selected-top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.wa-name {
  font-size: .9rem;
  font-weight: 700;
  color: var(--accent3);
  flex: 1;
  min-width: 0;
}

.wa-cd-badge {
  font-size: .65rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(52,211,153,.12);
  border: 1px solid rgba(52,211,153,.25);
  color: var(--weapon-handle);
  flex-shrink: 0;
}

.wa-req-badge {
  font-size: .65rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(248,113,113,.12);
  border: 1px solid rgba(248,113,113,.3);
  color: var(--neg);
  flex-shrink: 0;
}

.wa-desc {
  font-size: .78rem;
  color: var(--ink-muted);
  line-height: 1.4;
}

.wa-stat-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: .76rem;
}
.wa-stat-key {
  color: var(--ink-muted);
  font-size: .67rem;
  text-transform: uppercase;
  letter-spacing: .1em;
  font-weight: 700;
  min-width: 52px;
}
.wa-stat-val {
  color: var(--ink);
  font-weight: 600;
}
.wa-stat-row--extra { margin-top: 1px; }
.wa-stat-val--extra {
  font-size: .72rem;
  color: var(--accent2);
  font-style: italic;
  font-weight: 400;
}
.damage-type-pill--highest {
  border-color: rgba(251,191,36,.4);
  background: rgba(251,191,36,.12);
}
.damage-type-pill--highest .dt-val {
  color: var(--weapon-combined);
  font-weight: 800;
}
.wa-highest-hint {
  font-size: .62rem;
  color: var(--ink-muted);
  opacity: .55;
  font-style: italic;
}

.wa-req-block {
  margin-top: 4px;
  padding: 8px 10px;
  background: rgba(248,113,113,.06);
  border: 1px solid rgba(248,113,113,.18);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.wa-req-title {
  font-size: .62rem;
  text-transform: uppercase;
  letter-spacing: .12em;
  font-weight: 700;
  color: var(--neg);
  margin-bottom: 2px;
}
.wa-req-item {
  font-size: .74rem;
  color: var(--ink-muted);
}
.wa-req-item::before { content: '• '; color: var(--neg); opacity: .6; }

.wa-available-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.wa-avail-label {
  font-size: .6rem;
  text-transform: uppercase;
  letter-spacing: .14em;
  font-weight: 700;
  color: var(--ink-muted);
  opacity: .6;
}
.wa-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.wa-chip {
  font-size: .68rem;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid rgba(167,139,250,.2);
  background: rgba(167,139,250,.07);
  color: var(--ink-muted);
  cursor: pointer;
  transition: all .12s;
  font-family: var(--font-body);
}
.wa-chip:hover { border-color: rgba(167,139,250,.4); color: var(--accent3); }
.wa-chip--active {
  background: rgba(167,139,250,.18);
  border-color: rgba(167,139,250,.45);
  color: var(--accent3);
  font-weight: 700;
}.wa-cd-badge--reduced { 
  background: rgba(52,211,153,.2); 
  border-color: rgba(52,211,153,.4); 
}
.wa-cd-old {
  text-decoration: line-through;
  opacity: .45;
  font-size: .6rem;
  margin-right: 2px;
}
.wa-cd-arrow {
  opacity: .4;
  margin: 0 2px;
  font-size: .6rem;
}
.iep-apply-all-btn {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(74,222,128,.25);
  background: rgba(74,222,128,.08);
  color: var(--accent);
  font-size: .7rem;
  cursor: pointer;
  transition: all .15s;
}
.iep-apply-all-btn:hover { background: rgba(74,222,128,.18); }
.damage-type-pill--boosted {
  border-color: rgba(251,191,36,.3);
  background: rgba(251,191,36,.08);
}
.dt-val-old {
  font-size: .6rem;
  opacity: .35;
  text-decoration: line-through;
  color: var(--ink-muted);
  margin-right: 2px;
}
.dt-val--boosted {
  color: var(--weapon-combined) !important;
  font-weight: 800;
}
.monk-perk-bonus {
  font-size: .62rem;
  color: var(--monk-glove);
  opacity: .7;
  margin-left: 4px;
  font-weight: 600;
}
:root {
  /* Draconic Theme */
  --draco-primary: #ff6336;
  --draco-primary-rgb: 255, 99, 54;

  --draco-text: #ff9b7d;
  --draco-text-strong: #ffb29d;

  --draco-bg-1: rgba(var(--draco-primary-rgb), .16);
  --draco-bg-2: rgba(var(--draco-primary-rgb), .10);
  --draco-bg-3: rgba(var(--draco-primary-rgb), .06);
  --draco-bg-4: rgba(var(--draco-primary-rgb), .04);

  --draco-border-soft: rgba(var(--draco-primary-rgb), .15);
  --draco-border: rgba(var(--draco-primary-rgb), .25);
  --draco-border-strong: rgba(var(--draco-primary-rgb), .40);

  --draco-shadow:
    0 0 0 1px rgba(var(--draco-primary-rgb), .30),
    0 4px 14px rgba(var(--draco-primary-rgb), .18);
  --draco-text: #ff9b7d;
  --draco-text-strong: #ffb29d;
}
/* ── DRACONIC RUNE ── */

.sg-draconic-rune-cell {
  background:
    linear-gradient(
      135deg,
      var(--draco-bg-1),
      var(--draco-bg-3)
    );
  border-color: var(--draco-border);
}

.sg-draconic-rune-cell .sg-label {
  color: var(--draco-text);
}

.draco-select-hint {
  font-size: .65rem;
  color: var(--draco-text);
  font-weight: 600;
  padding: 2px 8px;
  background: rgba(var(--draco-primary-rgb), .08);
  border: 1px solid rgba(var(--draco-primary-rgb), .20);
  border-radius: 999px;
  text-transform: none;
  letter-spacing: 0;
}

.sg-draconic-row {
  background:
    linear-gradient(
      135deg,
      var(--draco-bg-2),
      var(--draco-bg-3)
    );
  border-color: var(--draco-border);
  min-height: unset;
  padding: 10px 12px;
}

.sg-draconic-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.sg-draconic-hint {
  font-size: .62rem;
  color: var(--ink-muted);
  opacity: .5;
  font-style: italic;
}

.sg-draconic-colors {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.draco-color-btn {
  padding: 4px 11px;
  border-radius: 999px;
  font-size: .7rem;
  font-weight: 700;
  border: 1px solid var(--dc, var(--draco-primary));
  background:
    color-mix(
      in srgb,
      var(--dc, var(--draco-primary)) 12%,
      transparent
    );
  color: var(--dc, var(--draco-primary));
  cursor: pointer;
  font-family: var(--font-body);
  transition: all .15s;
  opacity: .55;
}

.draco-color-btn:hover {
  opacity: .85;
}

.draco-color-btn--active {
  opacity: 1;
  background:
    color-mix(
      in srgb,
      var(--dc, var(--draco-primary)) 25%,
      transparent
    );
  box-shadow:
    0 0 8px
    color-mix(
      in srgb,
      var(--dc, var(--draco-primary)) 40%,
      transparent
    );
}

.draconic-panel {
  border-color: rgba(var(--draco-primary-rgb), .20);
  background:
    linear-gradient(
      160deg,
      var(--surface) 60%,
      var(--draco-bg-4) 100%
    );
}

.draconic-panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.draconic-panel-title {
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: .16em;
  font-weight: 700;
  color: var(--draco-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.draco-color-badge {
  font-size: .65rem;
  font-weight: 700;
  padding: 2px 9px;
  border-radius: 999px;
  border: 1px solid currentColor;
}

.draconic-abilities {
  display: grid;
  grid-template-columns:
    repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.draconic-ability-card {
  background: var(--surface2);
  border: 1px solid var(--draco-border-soft);
  border-radius: var(--radius-sm);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.draconic-ability-card--infusion {
  border-color: rgba(56,189,248,.20);
  background:
    linear-gradient(
      135deg,
      var(--surface2),
      rgba(56,189,248,.05)
    );
}

.draconic-ability-card--selectable {
  cursor: pointer;
  text-align: left;
  font-family: var(--font-body);
  width: 100%;
  transition:
    border-color .15s,
    background .15s,
    opacity .15s,
    transform .15s;
}

.draconic-ability-card--selectable:hover {
  border-color: var(--draco-border-strong);
  transform: translateY(-1px);
}

.draconic-ability-card--selected {
  border-color: var(--draco-primary) !important;
  background:
    linear-gradient(
      135deg,
      var(--draco-bg-1),
      var(--draco-bg-3)
    ) !important;
  box-shadow: var(--draco-shadow);
}

.draconic-ability-card--unselected {
  opacity: .55;
}

.draconic-ability-card--unselected:hover {
  opacity: .85;
}

.dab-selected-badge {
  font-size: .6rem;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(var(--draco-primary-rgb), .18);
  border: 1px solid rgba(var(--draco-primary-rgb), .40);
  color: var(--draco-text);
}

.dab-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px; }
.dab-name { font-size:.88rem; font-weight:700; color: var(--draco-text-strong); }
.dab-cds { display:flex; align-items:center; gap:5px; }
.dab-cd { font-size:.72rem; font-weight:700; padding:2px 8px; border-radius:999px; background:rgba(52,211,153,.12); border:1px solid rgba(52,211,153,.25); color:#34d399; }
.dab-cd-old { font-size:.62rem; color:var(--ink-muted); text-decoration:line-through; opacity:.4; }
.dab-cd-arrow { font-size:.6rem; color:var(--ink-muted); opacity:.35; }
.dab-duration { font-size:.65rem; color:var(--infusion); padding:2px 7px; background:rgba(56,189,248,.1); border:1px solid rgba(56,189,248,.2); border-radius:999px; }
.dab-stats { display:flex; flex-direction:column; gap:3px; }
:global(.dab-stat-row) { display:flex; align-items:center; gap:6px; font-size:.77rem; padding:3px 6px; border-radius:5px; background:var(--surface3); }
:global(.dab-stat-k) { color:var(--ink-muted); min-width:80px; font-size:.68rem; }
:global(.dab-stat-v) { font-weight:700; color:#c8c4ba; }
:global(.dab-stat-v--dmg) { color:var(--accent2); font-size:.95rem; text-shadow:0 0 8px rgba(245,158,11,.35); }

:global(.dab-notes) { font-size:.68rem; color:var(--draco-text); opacity:.65; font-style:italic; line-height:1.4; letter-spacing:.02em; }

.cdr-mult--increase { color: var(--neg); }
.summary-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.summary-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}

.undo-btn {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid rgba(74,222,128,.3);
  background: rgba(74,222,128,.08);
  color: var(--accent);
  font-size: .7rem;
  font-weight: 700;
  cursor: pointer;
  font-family: var(--font-body);
  letter-spacing: .04em;
  transition: all .15s;
  flex-shrink: 0;
  animation: fadeIn .2s ease;
}
.undo-btn:hover {
  background: rgba(74,222,128,.2);
  border-color: rgba(74,222,128,.55);
}


.heal-val{
  color:#7CFF8D;
  font-weight:700;
  display:flex;
  align-items:center;
  gap:6px;
}

.heal-label{
  color:#4ADE80;
  font-size:.75rem;
  font-weight:600;
  opacity:.9;
}
.sg-sub{
  white-space:normal;
  overflow-wrap:anywhere;
  line-height:1.15;
}

.clear-all-btn {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid rgba(248,113,113,.3);
  background: rgba(248,113,113,.08);
  color: var(--neg);
  font-size: .7rem;
  font-weight: 700;
  cursor: pointer;
  font-family: var(--font-body);
  letter-spacing: .04em;
  transition: all .15s;
  flex-shrink: 0;
}
.clear-all-btn:hover {
  background: rgba(248,113,113,.2);
  border-color: rgba(248,113,113,.55);
}

.cdr-toggle-row { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px; }
.cdr-toggle-chip {
  font-size:.68rem; font-weight:700; padding:3px 10px; border-radius:999px;
  border:1px solid rgba(52,211,153,.3); background:rgba(52,211,153,.1); color:#34d399;
  cursor:pointer; font-family:var(--font-body); transition:all .15s;
}
.cdr-toggle-chip--off {
  border-color:rgba(248,113,113,.3); background:rgba(248,113,113,.08); color:var(--neg); opacity:.7;
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .app { padding: 12px 10px 40px; }
  .sg-cell { padding: 8px 10px; min-height: 70px; }
  .sg-clear, .sg-ench-btn { width: 26px; height: 26px; }
  .summary-title-row { flex-direction: column; gap: 8px; }
  :global(.enchant-tooltip) { max-width: 200px; font-size: .72rem; }
}
@media (max-width: 480px) {
  .app { padding: 8px 6px 32px; }
  .panel { padding: 12px; }
  .sg-cell { min-height: 60px; padding: 6px 8px; }
  .sg-value { font-size: .76rem; }
  .sg-label { font-size: .52rem; }
  .summary-grid-wrap { margin-left: calc(-50vw + 50%); margin-right: calc(-50vw + 50%); width: 100vw; overflow-x: auto; }
  .summary-grid { min-width: 500px; }
}
</style>