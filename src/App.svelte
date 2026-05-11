<script lang="ts">
  import { build, result } from './lib/store'
  import {
    races, guilds, armors, rings, runes, blades, handles, gloves, essences,
    getGuild, getArmorPart, getRing, getRune, getEnchant, getPerk,
    getBlade, getHandle, getGlove, getEssence,
    formatStat, formatLabel, applyEnchantmentsToSlot, applyInfusion,
    calcWeapon, calcMonkWeapon, isMonkGuild,
    type CDRResult
  } from './lib/engine'
  import { setEnchantment } from './lib/store'
  import type { EnchantSlot, StatMap, StatPrefix, ScalingKey } from './lib/types'
  import { enchantments, getEnchant as ge, isExclusiveEnchant } from './lib/engine'
  import EnchantSelect from './lib/EnchantSelect.svelte'
  import { applyUpgrade, UPGRADE_MAX } from './lib/types'
  import { WEAPON_ARTS, type WeaponArt } from './data/weaponArts'

  import BuildSaves from './BuildSaves.svelte'

  function toggleUpgrade(key: 'upgradeHelmet'|'upgradeChestplate'|'upgradeLeggings'|'upgradeRing'|'upgradeRune') {
    build.update(s => ({...s, [key]: s[key] === UPGRADE_MAX ? 0 : UPGRADE_MAX}))
  }

  // ── Modal state ────────────────────────────────────────────────────────────
  type ModalType = 'race' | 'guild' | 'armor-helmet' | 'armor-chestplate' | 'armor-leggings' | 'infusion-helmet' | 'infusion-chestplate' | 'infusion-leggings' | 'ring' | 'infusion-ring' | 'rune' | 'blade' | 'handle' | 'glove' | 'essence' | null
  let activeModal: ModalType = null
  function openModal(m: ModalType) { activeModal = m }
  function closeModal() { activeModal = null }


  // ── Collapsible panels ─────────────────────────────────────────────────────
  let showDetailsPanel = true
  let showPerksPanel = true
  let activeDetailsTab: 'selection' | 'weapon' = 'selection'

  // ── Inline enchant panel ───────────────────────────────────────────────────
  let inlineEnchantSlot: EnchantSlot | null = null
  function toggleInlineEnchant(slot: EnchantSlot) {
    inlineEnchantSlot = inlineEnchantSlot === slot ? null : slot
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  $: guildData = getGuild($build.guild)
  $: isMonk = isMonkGuild($build.guild)

  $: statRows = Object.entries($result.stats).filter(([,v]) => v !== 0).sort(([a],[b]) => a.localeCompare(b))
  $: perkRows = Object.entries($result.perks).filter(([,v]) => v > 0).sort(([a],[b]) => a.localeCompare(b))
  $: cdr = $result.cdr
  $: hasRuneCDR = cdr.runeCDR < 1.0 || cdr.runeSetCD != null
  $: hasWACDR = cdr.waCDR < 1.0

  $: shrineActive = $build.shrineActive
  $: selectedWA = WEAPON_ARTS.find(wa => wa.name === $build.selectedWeaponArt) ?? WEAPON_ARTS[0]

  // ── Enchant helpers ────────────────────────────────────────────────────────
  let enchantCats: Record<EnchantSlot, 'unAscended' | 'Ascended'> = {
    helmet: 'unAscended', chestplate: 'unAscended', leggings: 'unAscended',
    ring: 'unAscended', rune: 'unAscended'
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

  // ── Weapon filters ─────────────────────────────────────────────────────────
  let bladeFilterTier = ''
  let bladeFilterType = ''
  let handleFilterTier = ''
  let handleFilterType = ''
  let gloveFilterTier = ''
  let gloveFilterType = ''
  let essenceFilterTier = ''

  $: filteredBlades = blades.filter(b =>
    (!bladeFilterTier || b.tier === Number(bladeFilterTier)) &&
    (!bladeFilterType || b.bladeType === bladeFilterType)
  )
  $: filteredHandles = handles.filter(h =>
    (!handleFilterTier || h.tier === Number(handleFilterTier)) &&
    (!handleFilterType || h.handleType === handleFilterType)
  )
  $: filteredGloves = gloves.filter(g =>
    (!gloveFilterTier || g.tier === Number(gloveFilterTier)) &&
    (!gloveFilterType || g.gloveType === gloveFilterType)
  )
  $: filteredEssences = essences.filter(e =>
    (!essenceFilterTier || e.tier === Number(essenceFilterTier))
  )
// ── Weapon enchant damage type bonuses ────────────────────────────────────────
const WEAPON_ENCHANT_DMG_TYPE: Record<string, Partial<Record<string, number>>> = {
  'Stone': { earth: 0.3 },
  // thêm các enchant khác ở đây nếu cần
}

$: weaponEnchantDmgBonus = (() => {
  const bonus: Record<string, number> = {}
  const stoneWeapon = $result.perks['Stone Weapon'] ?? 0
  if (stoneWeapon > 0) bonus['earth'] = Math.round(stoneWeapon * 0.3 * 100) / 100
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
  // ── Weapon result ──────────────────────────────────────────────────────────
  $: weaponResult = isMonk
    ? (($build.monkGlove || $build.monkEssence) ? calcMonkWeapon($build.monkGlove, $build.monkEssence, shrineActive) : null)
    : (($build.weaponBlade || $build.weaponHandle) ? calcWeapon($build.weaponBlade, $build.weaponHandle, shrineActive) : null)

  $: summaryWeaponLabel = weaponResult?.part1Name && weaponResult?.part2Name && weaponResult.finalWeaponType
    ? weaponResult.finalWeaponType : 'None'
  $: summaryWeaponSub = weaponResult ? [weaponResult.part1Name, weaponResult.part2Name].filter(Boolean).join(' + ') : ''

  // ── Damage types per part (từ raw data, không phải weaponResult) ───────────
  function getDamageTypes(data: any): Record<string, number> {
    const dtKeys = ['true','physical','magic','fire','water','earth','air','hex','holy','summon']
    const result: Record<string, number> = {}
    for (const k of dtKeys) {
      const v = data?.[`${k}Type`]
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
    return `${Math.floor(effectiveBase * cdr.runeCDR)}s`
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

  function buildSlotCard(title: string, label: string, description: string, baseStats: StatMap, basePerks: Record<string, number>, enchSlot: EnchantSlot, extras?: string[]): DetailCard {
    const enchNames = $build.enchantments[enchSlot]
    const slotResult = applyEnchantmentsToSlot(baseStats, basePerks, enchNames)
    const filteredStats: Record<string, number> = {}
    for (const [k, v] of Object.entries(slotResult.stats)) {
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
        const main = part ? buildSlotCard(partType, buildEnchantLabel(armorName, enchSlot), part.description, upgradedStats, bp, enchSlot) : null
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
        const main = ring ? buildSlotCard('Ring', buildEnchantLabel(ring.name, 'ring'), ring.description, upgradedRingStats, bp, 'ring') : null
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
        groups.push({ main: buildSlotCard('Rune', buildEnchantLabel(rune.name, 'rune'), rune.description, applyUpgrade(rune.stats, $build.upgradeRune ?? 0), bp, 'rune', hasRuneCDR ? [`Base CD: ${rune.cooldown}s → ${formatCD(rune.cooldown, cdr)}`] : [`Cooldown: ${rune.cooldown}s`]), infusion: null })
      }
    }
    return groups
  })()

  $: hasDetails = identityCards.length > 0 || slotGroups.length > 0

  function formatDmgTypeLabel(key: string): string { return key.charAt(0).toUpperCase() + key.slice(1) + ' Type' }
  function formatScalingLabel(key: string): string { return key.charAt(0).toUpperCase() + key.slice(1) + ' Scaling' }

  $: part1Label = isMonk ? 'Glove' : 'Blade'
  $: part2Label = isMonk ? 'Essence' : 'Handle'
  $: sgPart1Name = isMonk ? ($build.monkGlove || `No ${part1Label.toLowerCase()}`) : ($build.weaponBlade || 'No blade')
  $: sgPart2Name = isMonk ? ($build.monkEssence || `No ${part2Label.toLowerCase()}`) : ($build.weaponHandle || 'No handle')
  $: sgPart1Empty = isMonk ? !$build.monkGlove : !$build.weaponBlade
  $: sgPart2Empty = isMonk ? !$build.monkEssence : !$build.weaponHandle

  // Tooltip for enchant
  let tooltip = { visible: false, text: '', x: 0, y: 0 }
  function getEnchantTooltipText(name: string): string {
    if (!name) return ''
    const e = getEnchant(name)
    if (!e) return ''
    const lines: string[] = []
    const statLines = Object.entries(e.stats).flatMap(([k, v]) => {
      if (!v) return []
      const mods = Array.isArray(v) ? v : [v]
      return [mods.map((m: any) => m.type === 'multiplier' ? `${k}: ×${m.value}` : `${k}: ${m.value > 0 ? '+' : ''}${m.value}`).join(', ')]
    })
    if (statLines.length) lines.push('Stats: ' + statLines.join(' | '))
    if (e.effects?.length) lines.push('Effects: ' + e.effects.map((ef: any) => `${ef.name} +${ef.value}`).join(', '))
    if (e.additionalNotes) lines.push('⚠ ' + e.additionalNotes)
    return lines.join('\n')
  }
  function onEnchantMove(e: MouseEvent, name: string) {
    const text = getEnchantTooltipText(name)
    tooltip = text ? { visible: true, text, x: e.clientX + 14, y: e.clientY - 10 } : { ...tooltip, visible: false }
  }
  function onEnchantLeave() { tooltip = { ...tooltip, visible: false } }

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

  // Pure function nhận scalings, stats, finalWeaponType, build state để Svelte track đúng
  function checkWA(
    wa: WeaponArt,
    scalings: Record<string, number>,
    stats: Record<string, number>,
    finalWeaponType: string,
    _isMonk: boolean,
    bladeName: string,
    handleName: string
  ): boolean {
    const req = wa.requirements

    // Monk WA chỉ dùng được khi là Monk
    if (wa.isMonk && !_isMonk) return false
    // Khi là Monk: chỉ hiện WA có req.guild === 'Monk' (isMonk flag)
    if (_isMonk && !wa.isMonk) return false

    if (req.guild === 'Monk' && !_isMonk) return false

    if (req.bothParts) {
      const has = req.bothParts.every(p => p === bladeName || p === handleName)
      if (!has) return false
    }

    const scaleMap: Record<string, string> = {
      physicalScaling: 'physical', magicScaling: 'magic',
      fireScaling: 'fire', waterScaling: 'water', earthScaling: 'earth',
      airScaling: 'air', hexScaling: 'hex', holyScaling: 'holy',
      dexterityScaling: 'dexterity', summonScaling: 'summon'
    }
    for (const [reqKey, scalingKey] of Object.entries(scaleMap)) {
      const needed = (req as any)[reqKey]
      if (needed != null && (scalings[scalingKey] ?? 0) < needed) return false
    }

    if (req.physicalDefense != null && (stats.physicalDefense ?? 0) < req.physicalDefense) return false
    if (req.magicBoost != null && (stats.magicBoost ?? 0) < req.magicBoost) return false
    if (req.holyBoost != null && (stats.holyBoost ?? 0) < req.holyBoost) return false
    if (req.summonBoost != null && (stats.summonBoost ?? 0) < req.summonBoost) return false
    if (req.heatResistance != null && (stats.heatResistance ?? 0) < req.heatResistance) return false
    if (req.tenacity != null && (stats.tenacity ?? 0) < req.tenacity) return false

    if (req.weaponType && req.weaponType.length > 0) {
      if (!req.weaponType.some(t => t === finalWeaponType)) return false
    }

    return true
  }

  // Reactive snapshots để force Svelte track
  $: _waScalings = weaponResult?.scalings ?? {} as Record<string, number>
  $: _waStats = weaponResult?.stats ?? {} as Record<string, number>  // chỉ weapon stats
  $: _waWeaponType = weaponResult?.finalWeaponType ?? ''
  $: _waBlade = $build.weaponBlade
  $: _waHandle = $build.weaponHandle

  $: availableWeaponArts = WEAPON_ARTS.filter(wa =>
    checkWA(wa, _waScalings, _waStats, _waWeaponType, isMonk, _waBlade, _waHandle)
  )


  // Auto-select default khi switch monk/non-monk
  $: {
    if (isMonk && $build.selectedWeaponArt === 'Lunge') 
      build.update(s => ({...s, selectedWeaponArt: 'Barrage'}))
    else if (!isMonk && $build.selectedWeaponArt === 'Barrage') 
      build.update(s => ({...s, selectedWeaponArt: 'Lunge'}))
  }

  $: waAvailable = checkWA(selectedWA, _waScalings, _waStats, _waWeaponType, isMonk, _waBlade, _waHandle)
  $: waReq = selectedWA.requirements

  // Các req không đạt (để hiện trong UI)
  $: waUnmetReqs = (() => {
    const req = waReq
    const unmet: string[] = []
    if (req.guild && !isMonk) unmet.push(`Guild: ${req.guild}`)
    if (req.weaponType?.length && !req.weaponType.some(t => t === _waWeaponType))
      unmet.push(`Weapon: ${req.weaponType.join(' / ')}`)
    const scaleMapLabels: Array<[string, string, string]> = [
      ['physicalScaling', 'physical', 'Physical'],
      ['magicScaling', 'magic', 'Magic'],
      ['fireScaling', 'fire', 'Fire'],
      ['waterScaling', 'water', 'Water'],
      ['earthScaling', 'earth', 'Earth'],
      ['airScaling', 'air', 'Air'],
      ['hexScaling', 'hex', 'Hex'],
      ['holyScaling', 'holy', 'Holy'],
      ['dexterityScaling', 'dexterity', 'Dexterity'],
      ['summonScaling', 'summon', 'Summon'],
    ]
    for (const [reqKey, scalingKey, label] of scaleMapLabels) {
      const needed = (req as any)[reqKey]
      if (needed != null && (_waScalings[scalingKey] ?? 0) < needed)
        unmet.push(`${label} Scaling ≥ ${needed}`)
    }
    if (req.magicBoost != null && (_waStats.magicBoost ?? 0) < req.magicBoost) unmet.push(`Magic Boost ≥ +${req.magicBoost}%`)
    if (req.holyBoost != null && (_waStats.holyBoost ?? 0) < req.holyBoost) unmet.push(`Holy Boost ≥ +${req.holyBoost}%`)
    if (req.summonBoost != null && (_waStats.summonBoost ?? 0) < req.summonBoost) unmet.push(`Summon Boost ≥ +${req.summonBoost}%`)
    if (req.heatResistance != null && (_waStats.heatResistance ?? 0) < req.heatResistance) unmet.push(`Heat Resistance ≥ ${req.heatResistance}%`)
    if (req.tenacity != null && (_waStats.tenacity ?? 0) < req.tenacity) unmet.push(`Tenacity ≥ ${req.tenacity}`)
    if (req.physicalDefense != null && (_waStats.physicalDefense ?? 0) < req.physicalDefense) unmet.push(`Physical Defense ≥ +${req.physicalDefense}%`)
    if (req.bothParts && !req.bothParts.every(p => p === _waBlade || p === _waHandle))
      unmet.push(`Cần cả: ${req.bothParts.join(' + ')}`)
    return unmet
  })()
</script>

<svelte:window on:keydown={onKeydown} />

<!-- Tooltip -->
{#if tooltip.visible}
  <div class="enchant-tooltip" style="left:{tooltip.x}px;top:{tooltip.y}px">
    {#each tooltip.text.split('\n') as line}<p>{line}</p>{/each}
  </div>
{/if}

<!-- Modal Overlay -->
{#if activeModal}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="modal-overlay" on:click|self={closeModal}>
    <div class="modal-box" role="dialog" aria-modal="true">
      <button class="modal-close" on:click={closeModal}>✕</button>

      {#if activeModal === 'race'}
        <h2 class="modal-title">Select Race</h2>
        <div class="modal-list">
          {#each races as r}
            <button class="modal-item" class:modal-item--active={$build.race === r.name}
              on:click={() => { build.update(s => ({...s, race: r.name})); closeModal() }}>
              <span class="modal-item-name">{r.name}</span>
              <span class="modal-item-desc">{r.passive}</span>
              {#if r.statModifiers && Object.keys(r.statModifiers).length}
                <div class="modal-item-stats">
                  {#each Object.entries(r.statModifiers) as [k,v]}
                    <span class="modal-stat-pill" class:neg={v < 0}>{formatLabel(k)}: {formatStat(k, v as number)}</span>
                  {/each}
                </div>
              {/if}
            </button>
          {/each}
        </div>

      {:else if activeModal === 'guild'}
        <h2 class="modal-title">Select Guild</h2>
        <div class="modal-list">
          <button class="modal-item" class:modal-item--active={$build.guild === ''}
            on:click={() => { build.update(s => ({...s, guild: '', guildRank: 1})); closeModal() }}>
            <span class="modal-item-name">— None —</span>
          </button>
          {#each guilds as g}
            <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
            <div class="modal-item" class:modal-item--active={$build.guild === g.name}
              on:click={() => { build.update(s => ({...s, guild: g.name, guildRank: s.guild === g.name ? s.guildRank : 3})); closeModal() }}>
              <span class="modal-item-name">{g.name}</span>
              <div class="modal-rank-row">
                {#each g.ranks as rank}
                  <button class="rank-btn" class:rank-btn--active={$build.guild === g.name && $build.guildRank === rank.rank}
                    on:click|stopPropagation={() => { build.update(s => ({...s, guild: g.name, guildRank: rank.rank})); closeModal() }}>
                    Rank {rank.rank}
                  </button>
                {/each}
              </div>
              {#each [($build.guild === g.name ? g.ranks.find(r => r.rank === $build.guildRank) : g.ranks[0])] as displayRank}
                {#if displayRank?.stats && Object.keys(displayRank.stats).length}
                  <div class="modal-item-stats">
                    {#each Object.entries(displayRank.stats) as [k,v]}
                      <span class="modal-stat-pill" class:neg={(v as number) < 0}>{formatLabel(k)}: {formatStat(k, v as number)}</span>
                    {/each}
                  </div>
                {/if}
                {#if displayRank?.perks?.length}
                  <div class="modal-item-stats">
                    {#each displayRank.perks as p}
                      <span class="modal-perk-tag">{p.name} +{p.amount}</span>
                    {/each}
                  </div>
                {/if}
              {/each}
            </div>
          {/each}
        </div>

      {:else if activeModal === 'armor-helmet' || activeModal === 'armor-chestplate' || activeModal === 'armor-leggings'}
        {@const slotName = activeModal === 'armor-helmet' ? 'Helmet' : activeModal === 'armor-chestplate' ? 'Chestplate' : 'Leggings'}
        {@const storeKey = slotName.toLowerCase() as 'helmet'|'chestplate'|'leggings'}
        <h2 class="modal-title">Select {slotName}</h2>
        <div class="modal-list modal-list--compact">
          <button class="modal-item modal-item--sm" class:modal-item--active={$build[storeKey] === ''}
            on:click={() => { build.update(s => ({...s, [storeKey]: ''})); closeModal() }}>
            <span class="modal-item-name">— None —</span>
          </button>
          {#each armors as a}
            {@const part = getArmorPart(a.name, slotName as any)}
            {#if part}
              <button class="modal-item modal-item--sm" class:modal-item--active={$build[storeKey] === a.name}
                on:click={() => { build.update(s => ({...s, [storeKey]: a.name})); closeModal() }}>
                <span class="modal-item-name">{a.name}</span>
                <span class="modal-item-desc">{part.description}</span>
                {#if part.perkName}<span class="modal-perk-tag">{part.perkName} +{part.perkAmount}</span>{/if}
                <div class="modal-item-stats">
                  {#each Object.entries(part.stats).filter(([,v]) => v !== 0) as [k,v]}
                    <span class="modal-stat-pill" class:neg={(v as number) < 0}>{formatLabel(k)}: {formatStat(k, v as number)}</span>
                  {/each}
                </div>
              </button>
            {/if}
          {/each}
        </div>

      {:else if activeModal === 'infusion-helmet' || activeModal === 'infusion-chestplate' || activeModal === 'infusion-leggings'}
        {@const slotName = activeModal === 'infusion-helmet' ? 'Helmet' : activeModal === 'infusion-chestplate' ? 'Chestplate' : 'Leggings'}
        {@const infKey = ('infusion' + slotName) as 'infusionHelmet'|'infusionChestplate'|'infusionLeggings'}
        <h2 class="modal-title">Select Infusion {slotName}</h2>
        <div class="modal-list modal-list--compact">
          <button class="modal-item modal-item--sm modal-item--inf" class:modal-item--active={$build[infKey] === ''}
            on:click={() => { build.update(s => ({...s, [infKey]: ''})); closeModal() }}>
            <span class="modal-item-name">— None —</span>
          </button>
          {#each armors as a}
            {@const part = getArmorPart(a.name, slotName as any)}
            {#if part}
              <button class="modal-item modal-item--sm modal-item--inf" class:modal-item--active={$build[infKey] === a.name}
                on:click={() => { build.update(s => ({...s, [infKey]: a.name})); closeModal() }}>
                <span class="modal-item-name">{a.name} <span class="inf-label">×0.5</span></span>
                {#if part.perkName}<span class="modal-perk-tag">{part.perkName} +{part.perkAmount}</span>{/if}
                <div class="modal-item-stats">
                  {#each Object.entries(part.stats).filter(([,v]) => v !== 0) as [k,v]}
                    <span class="modal-stat-pill modal-stat-pill--inf" class:neg={(v as number) < 0}>{formatLabel(k)}: {formatStat(k, (v as number) * 0.5)}</span>
                  {/each}
                </div>
              </button>
            {/if}
          {/each}
        </div>

      {:else if activeModal === 'ring'}
        <h2 class="modal-title">Select Ring</h2>
        <div class="modal-list modal-list--compact">
          <button class="modal-item modal-item--sm" class:modal-item--active={$build.ring === ''}
            on:click={() => { build.update(s => ({...s, ring: ''})); closeModal() }}>
            <span class="modal-item-name">— None —</span>
          </button>
          {#each rings as r}
            <button class="modal-item modal-item--sm" class:modal-item--active={$build.ring === r.name}
              on:click={() => { build.update(s => ({...s, ring: r.name})); closeModal() }}>
              <span class="modal-item-name">{r.name}</span>
              <span class="modal-item-desc">{r.description}</span>
              {#if r.perkName}<span class="modal-perk-tag">{r.perkName} +{r.perkAmount}</span>{/if}
              <div class="modal-item-stats">
                {#each Object.entries(r.stats).filter(([,v]) => v !== 0) as [k,v]}
                  <span class="modal-stat-pill" class:neg={(v as number) < 0}>{formatLabel(k)}: {formatStat(k, v as number)}</span>
                {/each}
              </div>
            </button>
          {/each}
        </div>

      {:else if activeModal === 'infusion-ring'}
        <h2 class="modal-title">Select Infusion Ring</h2>
        <div class="modal-list modal-list--compact">
          <button class="modal-item modal-item--sm modal-item--inf" class:modal-item--active={$build.infusionRing === ''}
            on:click={() => { build.update(s => ({...s, infusionRing: ''})); closeModal() }}>
            <span class="modal-item-name">— None —</span>
          </button>
          {#each rings as r}
            <button class="modal-item modal-item--sm modal-item--inf" class:modal-item--active={$build.infusionRing === r.name}
              on:click={() => { build.update(s => ({...s, infusionRing: r.name})); closeModal() }}>
              <span class="modal-item-name">{r.name} <span class="inf-label">×0.5</span></span>
              {#if r.perkName}<span class="modal-perk-tag">{r.perkName} +{r.perkAmount}</span>{/if}
              <div class="modal-item-stats">
                {#each Object.entries(r.stats).filter(([,v]) => v !== 0) as [k,v]}
                  <span class="modal-stat-pill modal-stat-pill--inf" class:neg={(v as number) < 0}>{formatLabel(k)}: {formatStat(k, (v as number) * 0.5)}</span>
                {/each}
              </div>
            </button>
          {/each}
        </div>

      {:else if activeModal === 'rune'}
        <h2 class="modal-title">Select Rune</h2>
        <div class="modal-list modal-list--compact">
          <button class="modal-item modal-item--sm" class:modal-item--active={$build.rune === ''}
            on:click={() => { build.update(s => ({...s, rune: ''})); closeModal() }}>
            <span class="modal-item-name">— None —</span>
          </button>
          {#each runes as r}
            <button class="modal-item modal-item--sm" class:modal-item--active={$build.rune === r.name}
              on:click={() => { build.update(s => ({...s, rune: r.name})); closeModal() }}>
              <span class="modal-item-name">{r.name}</span>
              <span class="modal-item-desc">{r.description}</span>
              <span class="modal-cd-badge">CD: {r.cooldown}s</span>
              {#if r.perkName}<span class="modal-perk-tag">{r.perkName} +{r.perkAmount ?? 1}</span>{/if}
              <div class="modal-item-stats">
                {#each Object.entries(r.stats).filter(([,v]) => v !== 0) as [k,v]}
                  <span class="modal-stat-pill" class:neg={(v as number) < 0}>{formatLabel(k)}: {formatStat(k, v as number)}</span>
                {/each}
              </div>
            </button>
          {/each}
        </div>

      {:else if activeModal === 'blade'}
        <h2 class="modal-title">Select Blade</h2>
        <div class="modal-filters">
          <select bind:value={bladeFilterTier} class="modal-filter-sel">
            <option value="">All Tiers</option>
            {#each [1,2,3,4,5] as t}<option value={String(t)}>Tier {t}</option>{/each}
          </select>
          <select bind:value={bladeFilterType} class="modal-filter-sel">
            <option value="">All Types</option>
            {#each ['Small Blade','Medium Blade','Heavy Blade','Hammer Head'] as t}<option value={t}>{t}</option>{/each}
          </select>
        </div>
        <div class="modal-list modal-list--compact">
          <button class="modal-item modal-item--sm" class:modal-item--active={$build.weaponBlade === ''}
            on:click={() => { build.update(s => ({...s, weaponBlade: ''})); closeModal() }}>
            <span class="modal-item-name">— None —</span>
          </button>
          {#each filteredBlades as b}
            {@const bAny = b as any}
            <button class="modal-item modal-item--sm modal-item--blade" class:modal-item--active={$build.weaponBlade === b.name}
              on:click={() => { build.update(s => ({...s, weaponBlade: b.name})); closeModal() }}>
              <div class="modal-item-head">
                <span class="modal-item-name">{b.name}</span>
                <span class="modal-tier-badge">T{b.tier}</span>
                <span class="modal-type-badge modal-type-badge--blade">{b.bladeType}</span>
                {#if b.attackSpeed != null}<span class="modal-cd-badge">{b.attackSpeed}x spd</span>{/if}
              </div>
              {#if bAny.physicalType || bAny.magicType || bAny.fireType || bAny.waterType || bAny.airType || bAny.hexType || bAny.holyType || bAny.earthType || bAny.trueType}
                <div class="modal-item-stats">
                  {#each (['true','physical','magic','fire','water','air','hex','holy','earth'] as string[]) as sk}
                    {#if bAny[`${sk}Type`]}
                      <span class="modal-stat-pill" style="background:rgba(251,146,60,.1);border-color:rgba(251,146,60,.2);color:var(--weapon-blade)">{sk.charAt(0).toUpperCase() + sk.slice(1)} Type: {bAny[`${sk}Type`]}x</span>
                    {/if}
                  {/each}
                </div>
              {/if}
              {#if bAny.physicalScaling || bAny.magicScaling || bAny.fireScaling || bAny.waterScaling || bAny.airScaling || bAny.hexScaling || bAny.holyScaling || bAny.earthScaling || bAny.dexterityScaling || bAny.summonScaling}
                <div class="modal-item-stats">
                  {#each (['physical','magic','fire','water','air','hex','holy','earth','dexterity','summon'] as StatPrefix[]) as sk}
                    {#if b[`${sk}Scaling` as ScalingKey]}
                      <span class="modal-stat-pill" style="background:rgba(167,139,250,.1);border-color:rgba(167,139,250,.2);color:var(--accent3)">{sk.charAt(0).toUpperCase() + sk.slice(1)} Scaling: {b[`${sk}Scaling` as ScalingKey]}</span>
                    {/if}
                  {/each}
                </div>
              {/if}
              {#if bAny.perks?.length}
                {#each bAny.perks as p}<span class="modal-perk-tag">{p.name} +{p.amount}</span>{/each}
              {/if}
              <div class="modal-item-stats">
                {#each Object.entries(b.stats ?? {}).filter(([, v]) => v !== 0) as [k, v]}
                  <span class="modal-stat-pill" class:neg={(v as number) < 0}>{formatLabel(k)}: {formatStat(k, v as number)}</span>
                {/each}
              </div>
            </button>
          {/each}
        </div>

      {:else if activeModal === 'handle'}
        <h2 class="modal-title">Select Handle</h2>
        <div class="modal-filters">
          <select bind:value={handleFilterTier} class="modal-filter-sel">
            <option value="">All Tiers</option>
            {#each [1,2,3,4,5] as t}<option value={String(t)}>Tier {t}</option>{/each}
          </select>
          <select bind:value={handleFilterType} class="modal-filter-sel">
            <option value="">All Types</option>
            {#each ['Medium Handle','Long Handle','Pole'] as t}<option value={t}>{t}</option>{/each}
          </select>
        </div>
        <div class="modal-list modal-list--compact">
          <button class="modal-item modal-item--sm" class:modal-item--active={$build.weaponHandle === ''}
            on:click={() => { build.update(s => ({...s, weaponHandle: ''})); closeModal() }}>
            <span class="modal-item-name">— None —</span>
          </button>
          {#each filteredHandles as h}
            {@const hAny = h as any}
            <button class="modal-item modal-item--sm modal-item--handle" class:modal-item--active={$build.weaponHandle === h.name}
              on:click={() => { build.update(s => ({...s, weaponHandle: h.name})); closeModal() }}>
              <div class="modal-item-head">
                <span class="modal-item-name">{h.name}</span>
                <span class="modal-tier-badge modal-tier-badge--handle">T{h.tier}</span>
                <span class="modal-type-badge modal-type-badge--handle">{h.handleType}</span>
                {#if h.attackSpeed != null}<span class="modal-cd-badge">{h.attackSpeed}x spd</span>{/if}
              </div>
              {#if hAny.physicalType || hAny.magicType || hAny.fireType || hAny.waterType || hAny.airType || hAny.hexType || hAny.holyType || hAny.earthType || hAny.trueType}
                <div class="modal-item-stats">
                  {#each (['true','physical','magic','fire','water','air','hex','holy','earth'] as string[]) as sk}
                    {#if hAny[`${sk}Type`]}
                      <span class="modal-stat-pill" style="background:rgba(251,146,60,.1);border-color:rgba(251,146,60,.2);color:var(--weapon-blade)">{sk.charAt(0).toUpperCase() + sk.slice(1)} Type: {hAny[`${sk}Type`]}x</span>
                    {/if}
                  {/each}
                </div>
              {/if}
              {#if hAny.physicalScaling || hAny.magicScaling || hAny.fireScaling || hAny.waterScaling || hAny.airScaling || hAny.hexScaling || hAny.holyScaling || hAny.earthScaling || hAny.dexterityScaling || hAny.summonScaling}
                <div class="modal-item-stats">
                  {#each (['physical','magic','fire','water','air','hex','holy','earth','dexterity','summon'] as StatPrefix[]) as sk}
                    {#if hAny[`${sk}Scaling` as ScalingKey]}
                      <span class="modal-stat-pill" style="background:rgba(167,139,250,.1);border-color:rgba(167,139,250,.2);color:var(--accent3)">{sk.charAt(0).toUpperCase() + sk.slice(1)} Scaling: {hAny[`${sk}Scaling` as ScalingKey]}</span>
                    {/if}
                  {/each}
                </div>
              {/if}
              {#if hAny.perks?.length}
                {#each hAny.perks as p}<span class="modal-perk-tag">{p.name} +{p.amount}</span>{/each}
              {/if}
              <div class="modal-item-stats">
                {#each Object.entries(h.stats).filter(([,v]) => v !== 0) as [k,v]}
                  <span class="modal-stat-pill" class:neg={(v as number) < 0}>{formatLabel(k)}: {formatStat(k, v as number)}</span>
                {/each}
              </div>
            </button>
          {/each}
        </div>

      {:else if activeModal === 'glove'}
        <h2 class="modal-title">Select Glove</h2>
        <div class="modal-filters">
          <select bind:value={gloveFilterTier} class="modal-filter-sel">
            <option value="">All Tiers</option>
            {#each [1,2,3,4,5] as t}<option value={String(t)}>Tier {t}</option>{/each}
          </select>
        </div>
        <div class="modal-list modal-list--compact">
          <button class="modal-item modal-item--sm" class:modal-item--active={$build.monkGlove === ''}
            on:click={() => { build.update(s => ({...s, monkGlove: ''})); closeModal() }}>
            <span class="modal-item-name">— None —</span>
          </button>
          {#each filteredGloves as g}
            {@const gAny = g as any}
            <button class="modal-item modal-item--sm modal-item--glove" class:modal-item--active={$build.monkGlove === g.name}
              on:click={() => { build.update(s => ({...s, monkGlove: g.name})); closeModal() }}>
              <div class="modal-item-head">
                <span class="modal-item-name">{g.name}</span>
                <span class="modal-tier-badge modal-tier-badge--glove">T{g.tier}</span>
                {#if g.attackSpeed != null}<span class="modal-cd-badge">{g.attackSpeed}x spd</span>{/if}
              </div>
              {#if gAny.physicalType || gAny.magicType || gAny.fireType || gAny.waterType || gAny.airType || gAny.hexType || gAny.holyType || gAny.earthType || gAny.trueType}
                <div class="modal-item-stats">
                  {#each (['true','physical','magic','fire','water','air','hex','holy','earth'] as string[]) as sk}
                    {#if gAny[`${sk}Type`]}
                      <span class="modal-stat-pill" style="background:rgba(251,146,60,.1);border-color:rgba(251,146,60,.2);color:var(--weapon-blade)">{sk.charAt(0).toUpperCase() + sk.slice(1)} Type: {gAny[`${sk}Type`]}x</span>
                    {/if}
                  {/each}
                </div>
              {/if}
              {#if gAny.physicalScaling || gAny.magicScaling || gAny.fireScaling || gAny.waterScaling || gAny.airScaling || gAny.hexScaling || gAny.holyScaling || gAny.earthScaling || gAny.dexterityScaling || gAny.summonScaling}
                <div class="modal-item-stats">
                  {#each (['physical','magic','fire','water','air','hex','holy','earth','dexterity','summon'] as StatPrefix[]) as sk}
                    {#if gAny[`${sk}Scaling` as ScalingKey]}
                      <span class="modal-stat-pill" style="background:rgba(167,139,250,.1);border-color:rgba(167,139,250,.2);color:var(--accent3)">{sk.charAt(0).toUpperCase() + sk.slice(1)} Scaling: {gAny[`${sk}Scaling` as ScalingKey]}</span>
                    {/if}
                  {/each}
                </div>
              {/if}
              {#if gAny.perks?.length}
                {#each gAny.perks as p}<span class="modal-perk-tag">{p.name} +{p.amount}</span>{/each}
              {/if}
              <div class="modal-item-stats">
                {#each Object.entries(g.stats).filter(([,v]) => v !== 0) as [k,v]}
                  <span class="modal-stat-pill" class:neg={(v as number) < 0}>{formatLabel(k)}: {formatStat(k, v as number)}</span>
                {/each}
              </div>
            </button>
          {/each}
        </div>

      {:else if activeModal === 'essence'}
        <h2 class="modal-title">Select Essence</h2>
        <div class="modal-filters">
          <select bind:value={essenceFilterTier} class="modal-filter-sel">
            <option value="">All Tiers</option>
            {#each [1,2,3,4,5] as t}<option value={String(t)}>Tier {t}</option>{/each}
          </select>
        </div>
        <div class="modal-list modal-list--compact">
          <button class="modal-item modal-item--sm" class:modal-item--active={$build.monkEssence === ''}
            on:click={() => { build.update(s => ({...s, monkEssence: ''})); closeModal() }}>
            <span class="modal-item-name">— None —</span>
          </button>
          {#each filteredEssences as e}
            {@const eAny = e as any}
            <button class="modal-item modal-item--sm modal-item--essence" class:modal-item--active={$build.monkEssence === e.name}
              on:click={() => { build.update(s => ({...s, monkEssence: e.name})); closeModal() }}>
              <div class="modal-item-head">
                <span class="modal-item-name">{e.name}</span>
                <span class="modal-tier-badge modal-tier-badge--essence">T{e.tier}</span>
                {#if e.attackSpeed != null}<span class="modal-cd-badge">{e.attackSpeed}x spd</span>{/if}
              </div>
              {#if eAny.physicalType || eAny.magicType || eAny.fireType || eAny.waterType || eAny.airType || eAny.hexType || eAny.holyType || eAny.earthType || eAny.trueType}
                <div class="modal-item-stats">
                  {#each (['true','physical','magic','fire','water','air','hex','holy','earth'] as string[]) as sk}
                    {#if eAny[`${sk}Type`]}
                      <span class="modal-stat-pill" style="background:rgba(251,146,60,.1);border-color:rgba(251,146,60,.2);color:var(--weapon-blade)">{sk.charAt(0).toUpperCase() + sk.slice(1)} Type: {eAny[`${sk}Type`]}x</span>
                    {/if}
                  {/each}
                </div>
              {/if}
              {#if eAny.physicalScaling || eAny.magicScaling || eAny.fireScaling || eAny.waterScaling || eAny.airScaling || eAny.hexScaling || eAny.holyScaling || eAny.earthScaling || eAny.dexterityScaling || eAny.summonScaling}
                <div class="modal-item-stats">
                  {#each (['physical','magic','fire','water','air','hex','holy','earth','dexterity','summon'] as StatPrefix[]) as sk}
                    {#if eAny[`${sk}Scaling` as ScalingKey]}
                      <span class="modal-stat-pill" style="background:rgba(167,139,250,.1);border-color:rgba(167,139,250,.2);color:var(--accent3)">{sk.charAt(0).toUpperCase() + sk.slice(1)} Scaling: {eAny[`${sk}Scaling` as ScalingKey]}</span>
                    {/if}
                  {/each}
                </div>
              {/if}
              {#if eAny.perks?.length}
                {#each eAny.perks as p}<span class="modal-perk-tag">{p.name} +{p.amount}</span>{/each}
              {/if}
              <div class="modal-item-stats">
                {#each Object.entries(e.stats).filter(([,v]) => v !== 0) as [k,v]}
                  <span class="modal-stat-pill" class:neg={(v as number) < 0}>{formatLabel(k)}: {formatStat(k, v as number)}</span>
                {/each}
              </div>
            </button>
          {/each}
        </div>
      {/if}

    </div>
  </div>
{/if}



<!-- ═══════════════════════════════ MAIN APP ═══════════════════════════════ -->
<div class="app">
  <header>
    <h1>Voxl<span class="accent">Builder</span></h1>
    <span class="header-hint">Click any cell to edit · Click ✦ to enchant</span>
  </header>

  <BuildSaves />

  <div class="workspace">

    <!-- BUILD SUMMARY + INLINE ENCHANTS -->
    <div class="panel summary-panel">
      <h3 class="panel-title summary-title">Build Summary</h3>
      <div class="summary-layout">
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
                {#if $build.helmet}
                
                    <button class="sg-upgrade-btn"
                      class:sg-upgrade-btn--maxed={$build.upgradeHelmet === 5}
                      on:click|stopPropagation={() => toggleUpgrade('upgradeHelmet')}
                      title={$build.upgradeHelmet === 5 ? 'Reset to +0' : 'Max upgrade'}>
                      {$build.upgradeHelmet === 5 ? '+5' : '+0'}
                    </button>
                {/if}
              <span class="sg-value">{$build.helmet || 'No helmet'}</span>
              {#if $build.helmet && hasEnchants('helmet')}
                <span class="sg-ench">{$build.enchantments.helmet.filter(Boolean).join(' · ')}</span>
              {/if}
              
              {#if $build.helmet}
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
              {#if $build.chestplate}
                <button class="sg-upgrade-btn"
                  class:sg-upgrade-btn--maxed={$build.upgradeChestplate === 5}
                  on:click|stopPropagation={() => toggleUpgrade('upgradeChestplate')}
                  title={$build.upgradeChestplate === 5 ? 'Click to reset to +0' : 'Click to max upgrade'}>
                  {$build.upgradeChestplate === 5 ? '+5' : '+0'}
                </button>
              {/if}
              <span class="sg-value">{$build.chestplate || 'No chestplate'}</span>
              {#if $build.chestplate && hasEnchants('chestplate')}
                <span class="sg-ench">{$build.enchantments.chestplate.filter(Boolean).join(' · ')}</span>
              {/if}
              {#if $build.chestplate}
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
              {#if $build.ring}            
                <button class="sg-upgrade-btn"
                  class:sg-upgrade-btn--maxed={$build.upgradeRing === 5}
                  on:click|stopPropagation={() => toggleUpgrade('upgradeRing')}
                  title={$build.upgradeRing === 5 ? 'Click to reset to +0' : 'Click to max upgrade'}>
                  {$build.upgradeRing === 5 ? '+5' : '+0'}
                </button>
              {/if}
              <span class="sg-value">{$build.ring || 'No ring'}</span>
              {#if $build.ring && hasEnchants('ring')}
                <span class="sg-ench">{$build.enchantments.ring.filter(Boolean).join(' · ')}</span>
              {/if}
              {#if $build.ring}
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
                  <span class="sg-sub">{race.passive.length > 40 ? race.passive.slice(0,40)+'…' : race.passive}</span>
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
              {#if $build.leggings}
                  <button class="sg-upgrade-btn"
                    class:sg-upgrade-btn--maxed={$build.upgradeLeggings === 5}
                    on:click|stopPropagation={() => toggleUpgrade('upgradeLeggings')}
                    title={$build.upgradeLeggings === 5 ? 'Click to reset to +0' : 'Click to max upgrade'}>
                    {$build.upgradeLeggings === 5 ? '+5' : '+0'}
                  </button>
              {/if}
              <span class="sg-value">{$build.leggings || 'No leggings'}</span>
              {#if $build.leggings && hasEnchants('leggings')}
                <span class="sg-ench">{$build.enchantments.leggings.filter(Boolean).join(' · ')}</span>
              {/if}
              {#if $build.leggings}
                <button class="sg-clear" on:click|stopPropagation={() => build.update(s => ({...s, leggings: ''}))} title="Clear">✕</button>
                <button class="sg-ench-btn" class:sg-ench-btn--active={inlineEnchantSlot === 'leggings'}
                  on:click|stopPropagation={() => toggleInlineEnchant('leggings')} title="Enchant">✦</button>
              {/if}
            </div>
            <div class="sg-cell sg-infusion sg-span2" style="opacity:0.3">
              <span class="sg-label">Inf. Rune</span>
              <span class="sg-value">Coming soon</span>
            </div>
            <div class="sg-cell sg-item sg-span2 sg-clickable" class:sg-empty={!$build.rune}
              role="button" tabindex="0"
              on:click={() => openModal('rune')}
              on:keydown={e => e.key === 'Enter' && openModal('rune')}>
              <span class="sg-label">Rune</span>
              {#if $build.rune}
                <button class="sg-upgrade-btn"
                  class:sg-upgrade-btn--maxed={$build.upgradeRune === 5}
                  on:click|stopPropagation={() => toggleUpgrade('upgradeRune')}
                  title={$build.upgradeRune === 5 ? 'Click to reset to +0' : 'Click to max upgrade'}>
                  {$build.upgradeRune === 5 ? '+5' : '+0'}
                </button>
                {/if}
              <span class="sg-value">{$build.rune || 'No rune'}</span>
              {#if $build.rune}
                {#if hasEnchants('rune')}
                  <span class="sg-ench">{$build.enchantments.rune.filter(Boolean).join(' · ')}</span>
                {/if}
                {@const rune = runes.find(r => r.name === $build.rune)}
                {#if rune}
                  {#if hasRuneCDR}
                    <span class="sg-cd-row">
                      <span class="sg-cd-base">{rune.cooldown}s</span>
                      <span class="sg-cd-arrow">→</span>
                      <span class="sg-cd-final">{formatCD(rune.cooldown, cdr)}</span>
                    </span>
                  {:else}
                    <span class="sg-sub">CD: {rune.cooldown}s</span>
                  {/if}
                {/if}
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
                <button class="sg-clear" on:click|stopPropagation={() => build.update(s => ({...s, guild: '', guildRank: 1}))} title="Clear">✕</button>
              {/if}
            </div>

          </div>



          <!-- ── INLINE ENCHANT PANEL ── -->
          <!-- Dùng biến reactive iep* thay vì {@const} để tránh stale closure -->
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
                      Clear all
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
                <!-- Slot 0 luôn hiện -->
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
                <!-- Slot 1: chỉ khi s0 có giá trị và không exclusive -->
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
                <!-- Slot 2: chỉ khi s1 có giá trị và không exclusive -->
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
    {Math.floor(selectedWA.cooldown * cdr.waCDR)}s
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
            on:click={() => build.update(s => ({...s, selectedWeaponArt: wa.name}))}>
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
        </div>
      </div>
    </div>

    <!-- Perks & Effects — collapsible -->
    {#if perkRows.length > 0}
      <div class="panel perks-panel">
        <button class="panel-title-btn perks-title" on:click={() => showPerksPanel = !showPerksPanel}>
          <span>Perks &amp; Effects <span class="perk-count-badge">{perkRows.length}</span></span>
          <span class="collapse-icon">{showPerksPanel ? '▲' : '▼'}</span>
        </button>
        {#if showPerksPanel}
          <div class="perks-grid">
            {#each perkRows as [name, count]}
              {@const perk = getPerk(name)}
              <div class="perk-card">
                <div class="perk-row">
                  <span class="perk-name">{name} <span class="perk-val">+{Math.round(count * 100) / 100}</span></span>
                </div>
                {#if perk?.description}
                  <p class="perk-desc">{perk.description}</p>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
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
                              {#each cdr.runeBreakdown as step}<div class="cdr-step"><span class="cdr-source">{step.source}</span><span class="cdr-mult">-{step.pct}%</span></div>{/each}
                              {#each runes.filter(r => r.name === $build.rune).slice(0,1) as rune}
                                <!-- SAU (Rune CDR block) -->
<div class="cdr-steps-calc">
  {#if cdr.runeSetCD != null}
    <div class="cdr-calc-row">
      <span class="cdr-cd-old">{rune.cooldown}s</span>
      <span class="cdr-arrow">→</span>
      <span class="cdr-cd-new">{cdr.runeSetCD}s</span>
    </div>
    {#each cdr.runeBreakdown as step, i}
  {@const prevCD = i === 0 ? cdr.runeSetCD : cdr.runeSetCD * cdr.runeBreakdown.slice(0,i).reduce((a,s)=>a*s.multiplier,1)}
  {@const nextCD = cdr.runeSetCD * cdr.runeBreakdown.slice(0,i+1).reduce((a,s)=>a*s.multiplier,1)}
  {@const isLast = i === cdr.runeBreakdown.length - 1}
  <div class="cdr-calc-row">
    <span class="cdr-cd-old">{i === 0 ? prevCD : prevCD.toFixed(2)}s</span>
    <span class="cdr-arrow">{step.isMultiply ? '×' : '÷'}</span>
    <span class="cdr-calc-mult">{step.isMultiply ? step.multiplier.toFixed(2) : (1/step.multiplier).toFixed(2)}</span>
    <span class="cdr-arrow">=</span>
    <span class="cdr-cd-new">{nextCD.toFixed(2)}s</span>
  </div>
  {#if isLast}
    <div class="cdr-calc-row cdr-calc-row--floor">
      <span class="cdr-floor-label">floor</span>
      <span class="cdr-arrow">→</span>
      <span class="cdr-cd-new">{Math.floor(nextCD)}s</span>
    </div>
  {/if}
{/each}
    {:else}
    {#each cdr.runeBreakdown as step, i}
      {@const prevCD = i === 0 ? rune.cooldown : rune.cooldown * cdr.runeBreakdown.slice(0,i).reduce((a,s)=>a*s.multiplier,1)}
      {@const nextCD = rune.cooldown * cdr.runeBreakdown.slice(0,i+1).reduce((a,s)=>a*s.multiplier,1)}
      {@const isLast = i === cdr.runeBreakdown.length - 1}
      <div class="cdr-calc-row">
        <span class="cdr-cd-old">{i === 0 ? prevCD : prevCD.toFixed(2)}s</span>
        <span class="cdr-arrow">{step.isMultiply ? '×' : '÷'}</span>
        <span class="cdr-calc-mult">{step.isMultiply ? step.multiplier.toFixed(2) : (1/step.multiplier).toFixed(2)}</span>
        <span class="cdr-arrow">=</span>
        <span class="cdr-cd-new">{nextCD.toFixed(2)}s</span>
      </div>
      {#if isLast}
        <div class="cdr-calc-row cdr-calc-row--floor">
          <span class="cdr-floor-label">floor</span>
          <span class="cdr-arrow">→</span>
          <span class="cdr-cd-new">{Math.floor(nextCD)}s</span>
        </div>
      {/if}
    {/each}
                          {/if}
                        </div>
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
    {Math.floor(selectedWA.cooldown * cdr.waCDR)}s
  </span>
{:else}
  <span class="wa-cd-badge">CD: {selectedWA.cooldown}s</span>
{/if}
      {#if !waAvailable}<span class="wa-req-badge">⚠ Req. not met</span>{/if}
    </div>
  </div>
  <p class="wa-desc">{selectedWA.description}</p>
  {#if selectedWA.baseDamage}
    <div class="wa-stat-row"><span class="wa-stat-key">Damage</span><span class="wa-stat-val">{selectedWA.baseDamage}</span></div>
  {/if}
  {#if selectedWA.damageType}
    <div class="wa-stat-row">
      <span class="wa-stat-key">Type</span>
      {#if selectedWA.damageType === 'Same as weapon' && weaponResult}
        <div class="damage-type-grid" style="flex:1">
          {#each Object.entries(weaponDamageTypesWithBonus) as [k, v]}
            <div class="damage-type-pill"><span class="dt-name">{formatDmgTypeLabel(k)}</span><span class="dt-val">{v}x</span></div>
          {/each}
        </div>
      {:else}
        <span class="wa-stat-val">{selectedWA.damageType}</span>
      {/if}
    </div>
  {/if}
  {#if selectedWA.scaling}
    <div class="wa-stat-row">
      <span class="wa-stat-key">Scaling</span>
      {#if selectedWA.scaling === 'Same as weapon' && weaponResult}
        <div class="scaling-grid" style="flex:1">
          {#each Object.entries(weaponResult.scalings) as [k, v]}
            <div class="scaling-pill"><span class="sc-name">{formatScalingLabel(k)}</span><span class="sc-val">{v}</span></div>
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
  {#if hasWACDR}
    <div class="cdr-block" style="margin-top:6px;">
      <div class="cdr-block-header"><span class="cdr-icon">⏱</span><span class="cdr-title">Weapon Art CDR</span></div>
      {#each cdr.waBreakdown as step}
        <div class="cdr-step"><span class="cdr-source">{step.source}</span><span class="cdr-mult">-{step.pct}%</span></div>
      {/each}
      <div class="cdr-steps-calc">
  {#each cdr.waBreakdown as step, i}
  {@const prevCD = i === 0 ? selectedWA.cooldown : selectedWA.cooldown * cdr.waBreakdown.slice(0,i).reduce((a,s)=>a*s.multiplier,1)}
  {@const nextCD = selectedWA.cooldown * cdr.waBreakdown.slice(0,i+1).reduce((a,s)=>a*s.multiplier,1)}
  {@const isLast = i === cdr.waBreakdown.length - 1}
  <div class="cdr-calc-row">
    <span class="cdr-cd-old">{i === 0 ? prevCD : prevCD.toFixed(2)}s</span>
    <span class="cdr-arrow">{step.isMultiply ? '×' : '÷'}</span>
    <span class="cdr-calc-mult">{step.isMultiply ? step.multiplier.toFixed(2) : (1/step.multiplier).toFixed(2)}</span>
    <span class="cdr-arrow">=</span>
    <span class="cdr-cd-new">{nextCD.toFixed(2)}s</span>
  </div>
  {#if isLast}
    <div class="cdr-calc-row cdr-calc-row--floor">
      <span class="cdr-floor-label">floor</span>
      <span class="cdr-arrow">→</span>
      <span class="cdr-cd-new">{Math.floor(nextCD)}s</span>
    </div>
  {/if}
{/each}
</div>
    </div>
  {/if}
</div>
          <div class="weapon-result-layout">
            <!-- Part 1 -->
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
                        {#if boosted}<span class="sc-val-old">{rawVal}</span><span class="sc-val sc-val--new">{finalVal}</span>
                        {:else}<span class="sc-val">{rawVal}</span>{/if}
                      </div>
                    {/each}
                  </div>
                {/if}
                {#if part1Data && Object.keys(part1Data.stats).length}
                  <div class="stat-list">
                    {#each Object.entries(part1Data.stats).filter(([,v]) => v !== 0) as [k, rawVal]}
                      {@const finalVal = (weaponResult.part1FinalStats as Record<string,number>)[k] ?? rawVal}
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
                {#if (part1Data as any)?.perks?.length}
                  <div class="perk-list">
                    {#each ((part1Data as any)?.perks ?? []) as p}
                      <div class="perk-row"><span>{p.name} <span class="perk-val">+{p.amount}</span></span></div>
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
                        {#if boosted}<span class="sc-val-old">{rawVal}</span><span class="sc-val sc-val--new">{finalVal}</span>
                        {:else}<span class="sc-val">{rawVal}</span>{/if}
                      </div>
                    {/each}
                  </div>
                {/if}
                {#if part2Data && Object.keys(part2Data.stats).length}
                  <div class="stat-list">
                    {#each Object.entries(part2Data.stats).filter(([,v]) => v !== 0) as [k, rawVal]}
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
                      <div class="scaling-pill"><span class="sc-name">{formatScalingLabel(k)}</span><span class="sc-val">{v}</span></div>
                    {/each}
                  </div>
                {/if}
                {#if Object.keys(weaponResult.stats).length}
                  <div class="stat-list">
                    {#each Object.entries(weaponResult.stats).filter(([,v]) => v !== 0) as [k,v]}
                      <div class="stat-row"><span>{formatLabel(k)}</span><span class="stat-val" class:neg={v < 0}>{formatStat(k, v as number)}</span></div>
                    {/each}
                  </div>
                {/if}
                {#if Object.keys(weaponResult.perks).length}
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
</div>

<style>
  :root {
    --bg: #0d0f0e; --surface: #141715; --surface2: #1a1d1b; --surface3: #212420;
    --border: rgba(255,255,255,0.06); --border-strong: rgba(255,255,255,0.1);
    --ink: #e8e4da; --ink-muted: #8a8d85;
    --accent: #4ade80; --accent2: #f59e0b; --accent3: #a78bfa;
    --infusion: #38bdf8; --infusion-border: rgba(56,189,248,0.22);
    --neg: #f87171;
    --weapon-blade: #fb923c; --weapon-handle: #34d399; --weapon-combined: #fbbf24;
    --monk-glove: #e879f9; --monk-essence: #818cf8; --monk-combined: #c084fc;
    --radius: 14px; --radius-sm: 8px;
    --font-display: 'Georgia','Times New Roman',serif;
    --font-body: 'Trebuchet MS','Segoe UI',system-ui,sans-serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :global(body) { background: var(--bg); color: var(--ink); font-family: var(--font-body); min-height: 100vh; }

  .app { max-width: 1400px; margin: 0 auto; padding: 24px clamp(10px,3vw,32px) 60px; }

  header {
    display: flex; align-items: flex-end; justify-content: space-between;
    padding: 24px 32px; border-radius: 20px;
    background: linear-gradient(135deg,#161a16 0%,#1c201c 100%);
    border: 1px solid var(--border-strong); margin-bottom: 16px; position: relative; overflow: hidden;
  }
  header::before {
    content:""; position:absolute; inset:0;
    background: radial-gradient(ellipse at 90% 0%,rgba(74,222,128,.07) 0%,transparent 50%),
                radial-gradient(ellipse at 10% 100%,rgba(245,158,11,.05) 0%,transparent 40%);
    pointer-events:none;
  }
  h1 { font-family:var(--font-display); font-size:clamp(1.8rem,4vw,3rem); font-weight:400; letter-spacing:-.02em; }
  .accent { color:var(--accent); }
  .header-hint { font-size:.72rem; color:var(--ink-muted); letter-spacing:.1em; text-transform:uppercase; opacity:.6; }

  .workspace { display:flex; flex-direction:column; gap:14px; }

  /* ── MODAL ── */
  .modal-overlay {
    position:fixed; inset:0; background:rgba(0,0,0,.72); z-index:1000;
    display:flex; align-items:center; justify-content:center;
    padding:16px; backdrop-filter:blur(4px);
    animation: fadeIn .15s ease;
  }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  .modal-box {
    background:var(--surface); border:1px solid var(--border-strong);
    border-radius:var(--radius); padding:24px; width:min(680px,100%);
    max-height:85vh; overflow-y:auto; position:relative;
    animation: slideUp .18s ease;
    scrollbar-width:thin; scrollbar-color:var(--border-strong) transparent;
  }
  @keyframes slideUp { from{transform:translateY(12px);opacity:0} to{transform:translateY(0);opacity:1} }
  .modal-box::-webkit-scrollbar { width:5px; }
  .modal-box::-webkit-scrollbar-thumb { background:var(--border-strong); border-radius:3px; }
  .modal-close {
    position:absolute; top:14px; right:14px;
    background:var(--surface3); border:1px solid var(--border); border-radius:6px;
    color:var(--ink-muted); font-size:.8rem; width:28px; height:28px; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    transition:background .15s,color .15s;
  }
  .modal-close:hover { background:rgba(248,113,113,.15); color:var(--neg); }
  .modal-title { font-family:var(--font-display); font-size:1.3rem; font-weight:400; color:var(--ink); margin-bottom:16px; }
  .modal-filters { display:flex; gap:8px; margin-bottom:12px; }
  .modal-filter-sel {
    flex:1; appearance:none; background:var(--surface2); border:1px solid var(--border-strong);
    border-radius:var(--radius-sm); color:var(--ink); font-family:var(--font-body);
    font-size:.8rem; padding:7px 26px 7px 10px; cursor:pointer;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%234ade80' d='M1 1l4 4 4-4'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:right 8px center;
  }
  .modal-list { display:flex; flex-direction:column; gap:6px; max-height:500px; overflow-y:auto; padding-right:4px; scrollbar-width:thin; scrollbar-color:var(--border-strong) transparent; }
  .modal-list::-webkit-scrollbar { width:4px; }
  .modal-list::-webkit-scrollbar-thumb { background:var(--border-strong); border-radius:2px; }
  .modal-list--compact { gap:5px; }
  .modal-item {
    width:100%; text-align:left; background:var(--surface2);
    border:1px solid var(--border); border-radius:var(--radius-sm);
    color:var(--ink); font-family:var(--font-body); padding:12px 14px;
    cursor:pointer; display:flex; flex-direction:column; gap:4px;
    transition:background .12s,border-color .12s;
  }
  .modal-item:hover { background:var(--surface3); border-color:var(--border-strong); }
  .modal-item--active { border-color:var(--accent); background:rgba(74,222,128,.07); }
  .modal-item--sm { padding:9px 12px; }
  .modal-item--inf { border-color:var(--infusion-border); }
  .modal-item--blade.modal-item--active { border-color:var(--weapon-blade); background:rgba(251,146,60,.08); }
  .modal-item--handle.modal-item--active { border-color:var(--weapon-handle); background:rgba(52,211,153,.08); }
  .modal-item--glove.modal-item--active { border-color:var(--monk-glove); background:rgba(232,121,249,.08); }
  .modal-item--essence.modal-item--active { border-color:var(--monk-essence); background:rgba(129,140,248,.08); }
  .modal-item-head { display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
  .modal-item-name { font-size:.88rem; font-weight:600; color:var(--ink); }
  .modal-item-desc { font-size:.76rem; color:var(--ink-muted); line-height:1.4; }
  .modal-item-stats { display:flex; flex-wrap:wrap; gap:4px; margin-top:2px; }
  .modal-stat-pill { font-size:.67rem; font-weight:700; padding:2px 7px; border-radius:999px; background:rgba(74,222,128,.1); border:1px solid rgba(74,222,128,.2); color:var(--accent); }
  .modal-stat-pill.neg { background:rgba(248,113,113,.1); border-color:rgba(248,113,113,.2); color:var(--neg); }
  .modal-stat-pill--inf { background:rgba(56,189,248,.1); border-color:rgba(56,189,248,.2); color:var(--infusion); }
  .modal-perk-tag { font-size:.67rem; font-weight:700; padding:2px 7px; border-radius:999px; background:rgba(245,158,11,.1); border:1px solid rgba(245,158,11,.22); color:var(--accent2); width:fit-content; }
  .modal-cd-badge { font-size:.67rem; font-weight:700; padding:2px 7px; border-radius:999px; background:rgba(52,211,153,.1); border:1px solid rgba(52,211,153,.22); color:var(--weapon-handle); width:fit-content; }
  .modal-tier-badge { font-size:.62rem; font-weight:800; padding:2px 6px; border-radius:4px; background:rgba(251,146,60,.12); border:1px solid rgba(251,146,60,.25); color:var(--weapon-blade); }
  .modal-tier-badge--handle { background:rgba(52,211,153,.12); border-color:rgba(52,211,153,.25); color:var(--weapon-handle); }
  .modal-tier-badge--glove { background:rgba(232,121,249,.12); border-color:rgba(232,121,249,.25); color:var(--monk-glove); }
  .modal-tier-badge--essence { background:rgba(129,140,248,.12); border-color:rgba(129,140,248,.25); color:var(--monk-essence); }
  .modal-type-badge { font-size:.62rem; padding:2px 6px; border-radius:4px; background:var(--surface3); color:var(--ink-muted); border:1px solid var(--border); }
  .modal-type-badge--blade { color:var(--weapon-blade); }
  .modal-type-badge--handle { color:var(--weapon-handle); }
  .modal-rank-row { display:flex; gap:6px; margin-top:4px; }
  .rank-btn { padding:4px 12px; border-radius:6px; border:1px solid var(--border); background:var(--surface3); color:var(--ink-muted); font-size:.75rem; font-weight:600; cursor:pointer; transition:all .12s; }
  .rank-btn:hover { border-color:rgba(74,222,128,.35); color:var(--accent); }
  .rank-btn--active { border-color:var(--accent); background:rgba(74,222,128,.12); color:var(--accent); }
  .inf-label { font-size:.6rem; color:var(--infusion); font-weight:600; opacity:.7; }

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
    display: grid;
    grid-template-columns: 1fr 240px;
    grid-template-rows: auto auto;
    gap: 12px;
    align-items: start;
  }
  .summary-grid-wrap { grid-row: 1 / 3; }
  .summary-stats { grid-row: 1; grid-column: 2; }
  .wa-panel { grid-row: 2; grid-column: 2; }

  @media (max-width: 1020px) {
    .summary-layout {
      grid-template-columns: 1fr;
      grid-template-rows: auto;
    }
    .summary-grid-wrap { grid-row: unset; grid-column: 1; }
    .summary-stats { grid-row: unset; grid-column: 1; }
    .wa-panel { grid-row: unset; grid-column: 1; margin-top: 0; }
  }
  .summary-grid-wrap { overflow-x:auto; }
  .summary-grid { display:grid; grid-template-columns:repeat(10,minmax(60px,1fr)); gap:6px; min-width:600px; }

  .sg-span10 { grid-column:span 10; }
  .sg-span3  { grid-column:span 3; }
  .sg-span2  { grid-column:span 2; }

  .sg-cell {
    border-radius:8px; padding:9px 11px;
    display:flex; flex-direction:column; gap:2px; min-height:60px;
    border:1px solid transparent; position:relative;
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

  .summary-stats { background:var(--surface2); border:1px solid var(--border); border-radius:10px; padding:10px 12px; display:flex; flex-direction:column; gap:4px; max-height:400px; overflow-y:auto; scrollbar-width:thin; }
  .ss-header { font-size:.62rem; text-transform:uppercase; letter-spacing:.16em; color:var(--ink-muted); font-weight:700; padding-bottom:6px; border-bottom:1px solid var(--border); margin-bottom:2px; }
  .ss-section { display:flex; flex-direction:column; gap:2px; }
  .ss-row { display:flex; justify-content:space-between; align-items:center; gap:8px; padding:3px 5px; border-radius:4px; font-size:.75rem; transition:background .1s; }
  .ss-row:hover { background:var(--surface3); }
  .ss-key { color:var(--ink-muted); }
  .ss-val { font-weight:700; color:var(--accent); white-space:nowrap; }
  .ss-val.neg { color:var(--neg); }

  /* ── INLINE ENCHANT PANEL ── */
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
  .panel-title-btn {
    display:flex; align-items:center; justify-content:space-between; width:100%;
    background:none; border:none; color:inherit; cursor:pointer; padding:0;
    font-size:.8rem; text-transform:uppercase; letter-spacing:.18em; font-weight:700;
    margin-bottom:0; font-family:var(--font-body);
  }
  .collapse-icon { font-size:.65rem; color:var(--ink-muted); opacity:.5; }
  .perk-count-badge { display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:50%; background:rgba(245,158,11,.15); border:1px solid rgba(245,158,11,.25); color:var(--accent2); font-size:.6rem; font-weight:800; margin-left:6px; vertical-align:middle; }

  .perks-panel { border-color:rgba(245,158,11,.13); background:linear-gradient(160deg,var(--surface) 60%,rgba(245,158,11,.03) 100%); }
  .perks-title { color:var(--accent2); }
  .panel-title-btn.perks-title { margin-bottom:14px; }
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
  .cdr-mult { font-weight:700; color:#34d399; }
  .cdr-cd-old { font-size:.75rem; color:var(--ink-muted); text-decoration:line-through; opacity:.4; }
  .cdr-arrow { font-size:.7rem; color:var(--ink-muted); opacity:.35; }
  .cdr-cd-new { font-size:.95rem; font-weight:800; color:#34d399; }

  .empty { color:var(--ink-muted); font-style:italic; font-size:.85rem; }

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
    header { flex-direction:column; align-items:flex-start; gap:4px; }
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
  background: linear-gradient(135deg, rgba(167,139,250,.09) 0%, rgba(167,139,250,.04) 100%);
  border: 1px solid rgba(167,139,250,.22);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
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
.cdr-calc-row--floor { 
  padding-top: 4px;
  border-top: 1px dashed rgba(52,211,153,.2);
  margin-top: 2px;
}
.cdr-floor-label { 
  font-size: .62rem; 
  color: var(--ink-muted); 
  opacity: .5;
  font-style: italic;
  letter-spacing: .08em;
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
</style>