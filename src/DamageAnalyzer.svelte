<script lang="ts">
  import { build, result } from './lib/store'
  import { calcWeapon, calcMonkWeapon, isMonkGuild } from './lib/engine'
  import BaseDamageCalc from './BaseDamageCalc.svelte'
  import ScalingBreakdownRow from './ScalingBreakdownRow.svelte'
  import { WEAPON_ARTS } from './data/weaponArts'
  import { WEAPON_BASE_DMG } from './data/weapon base dmg'
  import { DMG_TYPE_COLORS, DMG_TYPE_PRIORITY, SCALING_TO_BOOST, PERCENT_STATS, type WeaponBaseDmg } from './lib/types'
  import { BUFF_DEFS, getActiveBuildBuffs, getPerkBuffs, getWeaponArtBuffs, applyBuffPerkModifiers, calcBuffEffect, getBuffDescription, convertTailwindToWhirlwind, getTrueBalanceBuffs } from './data/BuffData'
  import { DEBUFF_COMBAT_EFFECTS } from './data/debuffCombatEffects'
  import { getDraconicInfusionBuff, getDraconicHexDebuffs, getEffectiveDraconicInfusionPotency } from './data/draconicBuffs'  
  import { WA_SUMMON_MAP, SUMMON_MAP, calcSummonStat, calcMaxSummonCount } from './data/SummonData'
  import CritIcon from './CritIcon.svelte'
  import { PERK_DMG_DEFS, SECONDARY_TONE_COLORS, isHpGateActive } from './data/Perkbasedmg'
  import { resolveDefenseSources, calcBaseArmorDefPct, DEF_GROUP, type DefenseSource } from './lib/defense'
  import { getActiveRaceEffect } from './data/raceEffects'
  import { getActiveDefensivePerkSources } from './data/defensivePerks'
  import { getWeaponConditionalBoost } from './data/weaponConditionalBoosts'
  import { RUNE_DMG_DEFS } from './data/Runebasedmg'
  import { MOUNT_RUNE_DEFS } from './data/mountRunes'
  import { getDraconicColorDmgMultiplier } from './data/draconicColorEffects'
  import { applyDraconicBonuses, getDraconicBonuses } from './data/draconicRunes'
  import { calculateHealBoost, type HealSource } from './data/HealBoost'
  import { roundMultiplier } from './lib/utils'
  import { SELF_DAMAGE_PERK_DEFS, calcSelfDamage, type SelfDamagePerkDef } from './data/selfDamagePerks'
  import { resolveDamageTypes, applyAirToMagicConversion } from './lib/damageTypeResolve'
  import { calcTypedDmgBoosts } from './data/TypedDmgBoost'


  $: _m1FinisherWeaponBoost = getWeaponConditionalBoost(perks, _baseWeaponType, 'm1Finisher')
  $: _m2WeaponBoost         = getWeaponConditionalBoost(perks, _baseWeaponType, 'm2')

  $: _activeRaceEffect = getActiveRaceEffect($build.race, _hpFillPct)
  const _DEF_TYPE_LIST = ['physical','magic','fire','water','earth','air','hex','holy','true'] as const
  
  $: _activeDefensivePerkSources = (() => {
    const _hasProtection = ($result.stats.protection ?? 0) > 0
    const _debuffCount = _dummyDebuffs.filter(d => !disabledDebuffs.has(d.name)).length
    const baseSources = getActiveDefensivePerkSources(
      perks, _hpFillPct, _adaptivePlateTriggered, _effectiveInDarkness, _ragePotency > 0, mountActive, _hasProtection, _debuffCount
    )
    let potMult = 1
    
    const bastionStacks = perks['Bastion Bless'] ?? 0
    if (bastionStacks > 0) {
      potMult += 0.1 * bastionStacks
    }
    
    const _infActive = $build.draconicRuneInfusion === 'infusion'
    const color = $build.draconicColor
    if (_infActive && color === 'holy') {
      const _infPerkAmt = perks['Draconic Blood'] ?? 0
      potMult *= 1 + _infPerkAmt * 0.05
    }
    
    if (potMult === 1) return baseSources
    
    return baseSources.map(s => {
      if (s.potencyCapped) return s
      return {
        ...s,
        defPct: Math.round(s.defPct * potMult * 1000) / 1000
      }
    })
  })()
  $: _photosynthesisStacks = perks['Photosynthesis'] ?? 0
  $: _vampireStacks = perks['Vampire'] ?? 0
  $: {
  if (!environmentTouched) {
    if (_photosynthesisStacks > 0 && prevPhotosynthesis === 0 && _vampireStacks === 0 && $build.inDarkness) {
      build.update(s => ({
        ...s,
        inDarkness: false
      }))
    }
    if (
      _vampireStacks > 0 &&
      prevVampire === 0 &&
      _photosynthesisStacks === 0 &&
      !$build.inDarkness
    ) {
      build.update(s => ({
        ...s,
        inDarkness: true
      }))
    }
  }
  prevPhotosynthesis = _photosynthesisStacks
  prevVampire = _vampireStacks
}
  $: _effectiveInDarkness = $build.inDarkness

  $: _healScalingCtx = {
    perks,
    emotionalState: $build.emotionalState,
    inDarkness: _effectiveInDarkness,
    level: $build.level,
    draconicColor: $build.draconicColor,
    guild: $build.guild,
    draconicRuneInfusion: $build.draconicRuneInfusion,
    ragePotency: _ragePotency,
    activeBuffs: _allActiveBuffs,
  }

  $: _typedBoostResult = calcTypedDmgBoosts(perks, {
    perks,
    activeBuffs: _allActiveBuffs,
    inSunlight: !_effectiveInDarkness,
    draconicColor: $build.draconicColor,
  })
  $: _healScalingResult = calculateHealBoost(_healScalingCtx)
  $: _activeHealEntries = _healScalingResult.entries.filter(e => !disabledHealBoosts.has(e.sourceName))
  $: _typedHealBoostEntries = _typedBoostEntries
    .filter(e => e.healMult !== 1)
    .map(e => ({ sourceName: e.perkName, rawMultiplier: e.healMult, condition: e.condition, sourceType: 'perk' as HealSource }))
  $: _activeTypedHealEntries = _typedHealBoostEntries.filter(e => !disabledHealBoosts.has(e.sourceName))
  $: _tbHealEntry = (() => {
    const amt = perks['True Balance'] ?? 0
    if (amt <= 0) return null
    const hex = stats.hexBoost ?? 0
    if (hex <= 0) return null
    return {
      sourceName: 'True Balance',
      rawMultiplier: roundMultiplier(1 + hex * amt / 1500),
      condition: `${hex}% Hex Boost (True Balance)`,
      sourceType: 'perk' as HealSource,
    }
  })()
  $: _allHealEntriesForDisplay = [..._healScalingResult.entries, ..._typedHealBoostEntries, ...(_tbHealEntry ? [_tbHealEntry] : [])]
  $: _allHealEntries = [..._activeHealEntries, ..._activeTypedHealEntries, ...(_tbHealEntry && !disabledHealBoosts.has('True Balance') ? [_tbHealEntry] : [])]
  $: wardingPct = (stats.warding ?? 0) / 100
  $: wardingDebuffMult = Math.max(0, 1 - wardingPct)
  $: _healFinalMultiplier = (() => {
    const baseMult = _allHealEntries.reduce((acc, e) => acc * e.rawMultiplier, 1.0)
    return baseMult
  })()
  $: _healFinalMultiplierNoLevel = (() => {
    const baseMult = _allHealEntries
      .filter(e => e.sourceName !== 'Level Healing')
      .reduce((acc, e) => acc * e.rawMultiplier, 1.0)
    return baseMult
  })()

  $: _curseRipHealMult = _allHealEntries
    .filter(e => e.sourceName !== 'Level Healing')
    .reduce((acc, e) => acc * e.rawMultiplier, 1.0)

  $: _healCritDmgMult = (perks['Critical Healing'] ?? 0) > 0
    ? 120 + (stats.holyBoost ?? 0) / 5 + 16.5 * (perks['Critical Healing'] ?? 0)
    : 0

  $: _antiHealSelfMult = (() => {
    if (!_healScalingCtx.activeBuffs) return 1
    const antiHealBuffs = _healScalingCtx.activeBuffs.filter(b => b.buffName === 'Anti Heal' && b.isSelfDebuff && b.potency > 0)
    if (antiHealBuffs.length === 0) return 1
    const maxPotency = Math.max(...antiHealBuffs.map(b => b.potency))
    const effectivePotency = wardingDebuffMult !== 1
      ? Math.round(maxPotency * wardingDebuffMult * 1000) / 1000
      : maxPotency
    return 1 / (1 + effectivePotency)
  })()

  $: _selfDebuffDefenseEffects = (() => {
    const effects: Partial<Record<string, number>> = {}
    for (const b of _allActiveBuffs) {
      if (!b.isSelfDebuff) continue
      const def = BUFF_DEFS[b.buffName]
      if (!def?.isDebuff) continue
      
      const combatFx = DEBUFF_COMBAT_EFFECTS[b.buffName]
      if (!combatFx?.defReduction) continue
      
      const effectivePotency = wardingDebuffMult !== 1
        ? Math.round(b.potency * wardingDebuffMult * 1000) / 1000
        : b.potency
      
      const reduction = combatFx.defReduction(effectivePotency)
      for (const [defType, amount] of Object.entries(reduction)) {
        if (amount !== undefined) {
          effects[defType] = (effects[defType] ?? 0) + amount
        }
      }
    }
    return effects
  })()

  $: _statsAfterSelfDebuffDef = (() => {
    if (Object.keys(_selfDebuffDefenseEffects).length === 0) return stats as Record<string, number>
    const out = { ...(stats as Record<string, number>) }
    for (const [k, v] of Object.entries(_selfDebuffDefenseEffects)) {
      out[k] = (out[k] ?? 0) - (v ?? 0)
    }
    return out
  })()

  $: _defenseRows = _DEF_TYPE_LIST.map(type => {
      const baseArmorDefPct = calcBaseArmorDefPct(type, _statsAfterSelfDebuffDef)
      const _shatterReduction = type !== 'true'
        ? (DEF_GROUP[type] ?? []).reduce((sum, statKey) => sum + (_selfDebuffDefenseEffects[statKey] ?? 0), 0)
        : 0
      const sources: DefenseSource[] = (baseArmorDefPct !== 0 || _shatterReduction > 0) ? [{
         name: 'Base Armor',
         defPct: baseArmorDefPct,
        condition: _shatterReduction > 0 ? `Includes Shatter (Self): -${Math.round(_shatterReduction * 1000) / 1000}%` : undefined
       }] : []

      for (const s of _activeDefensivePerkSources) {
        sources.push({ name: s.name, defPct: s.defPct, isFlat: s.isFlat, condition: s.condition })
      }
      if (_activeRaceEffect?.flatDrPct) {
        sources.push({ name: _activeRaceEffect.label, defPct: _activeRaceEffect.flatDrPct, isFlat: true, condition: _activeRaceEffect.condition })
      }
      if (_activeReinforcePotency > 0) {
        const defPct = Math.round(_activeReinforcePotency * 100 * 1000) / 1000
        sources.push({ name: 'Reinforce', defPct })
      }
      if (_activeMagicReinforcePotency > 0) {
        const P = _activeMagicReinforcePotency
        const defPct = Math.round((P / 2) * 100 * 1000) / 1000
        const isMagicType = ['magic', 'fire', 'water', 'hex', 'holy'].includes(type)
        const flatDmg = Math.round(P * 3 * 1000) / 1000

        sources.push({
          name: 'Magic Reinforce',
          defPct,
          condition: isMagicType ? `Take ${flatDmg} less magic damage` : undefined
        })
      }
      return { type, color: DMG_TYPE_COLORS[type] ?? '#e8e4da', ...resolveDefenseSources(sources) }
    }).filter(r => r.percentSources.length > 0 || r.flatSources.length > 0)

  $: _hpFillPct = $build.hpFill ?? 100
  let _adaptivePlateTriggered = false

  $: _waSummonDef = (() => {
    const summonName = WA_SUMMON_MAP[selectedWA.name]
    if (!summonName) return null
    const def = SUMMON_MAP[summonName]
    if (!def) return null
    const sb = (($result.stats as Record<string,number>).summonBoost ?? 0)
    const lv = $build.level ?? 80
    return {
      ...def,
      scaledDmg: calcSummonStat(def.baseDmg, sb, lv),
      scaledHp: def.baseHp !== undefined ? calcSummonStat(def.baseHp, sb, lv) : undefined,
      scaledAttacks: def.attacks?.map(a => ({ 
        ...a,
        scaledDmg: calcSummonStat(a.baseDmg, sb, lv),
      })),
      summonBoostPct: sb,
    }
  })()

  $: _allActiveBuffsRaw = (() => {
    const itemBuffs = getActiveBuildBuffs({
      rune: $build.rune, ring: $build.ring, infusionRing: $build.infusionRing,
      helmet: $build.helmet, chestplate: $build.chestplate, leggings: $build.leggings,
      weaponBlade: $build.weaponBlade, weaponHandle: $build.weaponHandle,
      monkGlove: $build.monkGlove, race: $build.race,
    })    
    const baseBuffs = convertTailwindToWhirlwind(applyBuffPerkModifiers(
      [...itemBuffs, ...getPerkBuffs($result.perks), ...getWeaponArtBuffs($build.selectedWeaponArt)],
      $result.perks, $build.rune || undefined
    ), $result.perks)

    const _exhaustIdx = baseBuffs.findIndex(b => b.buffName === 'Exhaust')
    if (_exhaustIdx !== -1) {
      const wa = WEAPON_ARTS.find(wa => wa.name === $build.selectedWeaponArt)
      if (wa?.cooldown) {
        baseBuffs[_exhaustIdx] = { ...baseBuffs[_exhaustIdx], duration: wa.cooldown / 2 }
      }
    }

    const tbAmt = $result.perks['True Balance'] ?? 0
    if (tbAmt > 0) {
      const enemyDebuffs = baseBuffs.filter(b => {
        if (b.isSelfDebuff) return false
        const def = BUFF_DEFS[b.buffName]
        return def?.isDebuff
      })
      if (enemyDebuffs.length > 0) {
        const tbBuffs = applyBuffPerkModifiers(
          getTrueBalanceBuffs(tbAmt, enemyDebuffs),
          $result.perks,
          $build.rune || undefined
        )
        baseBuffs.push(...tbBuffs)
      }
    }

    const _infActive = $build.draconicRuneInfusion === 'infusion'
    const color = $build.draconicColor
    if (!_infActive || (color !== 'hex' && color !== 'holy')) {
      return baseBuffs
    }
    const _infPerkAmt = $result.perks['Draconic Blood'] ?? 0
    const potMult = 1 + _infPerkAmt * 0.05

    return baseBuffs.map(buff => {
      const def = BUFF_DEFS[buff.buffName]
      if (!def) return buff
      const isSelfDebuff = buff.isSelfDebuff || def.isSelfDebuff
      const isDespair = buff.buffName === 'Despair'
      
      if (color === 'hex' && def.isDebuff && !isSelfDebuff) {
        return { ...buff, potency: roundMultiplier(buff.potency * potMult) }
      }
      if (color === 'hex' && def.isDebuff && isSelfDebuff && isDespair) {
        return { ...buff, potency: roundMultiplier(buff.potency * potMult) }
      }
      if (color === 'holy' && !def.isDebuff && !def.isNeutral && !def.potencyCapped) {
        return { ...buff, potency: roundMultiplier(buff.potency * potMult) }
      }
      
      return buff
    })
  })()
  $: _allActiveBuffs = (_disabledKeysArr.length, _allActiveBuffsRaw.filter(b => !_isBuffDisabled(b)))
  $: _hasCritBoostBuff = _allActiveBuffs.some(b => b.buffName === 'Critical Boost')

  // ── Rage (still needed directly: defensive perk gating, PERK_DMG_DEFS condition, UI toggle row) ──
  $: _activeRageBuffs = _allActiveBuffs.filter(b => b.buffName === 'Rage')
  $: _ragePotency = _activeRageBuffs.length > 0
    ? Math.max(..._activeRageBuffs.map(b => b.potency))
    : 0
  $: _rageAffectedTypes = (() => {
    if (_ragePotency <= 0) return new Set<string>()
    const types = new Set(['physical'])
    if ((perks['Mage Rage'] ?? 0) > 0) types.add('magic')
    if ((perks['Oceans Rage'] ?? 0) > 0) types.add('water')
    if ((perks['Scourge'] ?? 0) > 0) types.add('true')
    if ((perks['Cursed Experiment'] ?? 0) > 0) types.add('hex')
    return types
  })()
  $: _rageMult = _ragePotency > 0
    ? roundMultiplier(1 + _ragePotency)
    : 1

  $: _activeGlyphConduitBuffs = _allActiveBuffs.filter(b => b.buffName === 'Glyph Conduit')
  $: _glyphConduitEntry = _typedBoostResult.activeEntries.find(e => e.perkName === 'Glyph Conduit')
  $: _glyphConduitMult = _glyphConduitEntry?.dmgMult ?? 1

  $: _typedBoostEntries = (() => {
    const entries = _typedBoostResult.activeEntries.filter(e =>
      !(e.perkName === 'Rage' && rageDisabled) &&
      !(e.perkName === 'Glyph Conduit' && glyphConduitDisabled)
    )
    const extinguishAmt = perks['Extinguish'] ?? 0
    if (extinguishAmt > 0 && !extinguishDisabled && _dummyDebuffs.some(d => d.name === 'Burn' && !disabledDebuffs.has(d.name))) {
      entries.push({
        perkName: 'Extinguish',
        label: 'Extinguish',
        types: ['water'],
        dmgMult: 1 + 0.5 * extinguishAmt,
        healMult: 1 + 0.5 * extinguishAmt,
        condition: 'vs Burning enemies',
        needsProcCoeff: true,
      })
    }
    return entries
  })()

  $: _draconicHexDebuffsForDummy = applyBuffPerkModifiers(
    getDraconicHexDebuffs(
      $build.guild, $build.draconicRuneInfusion, $build.draconicColor, $result.perks['Draconic Blood'] ?? 0
    ),
    $result.perks,
    $build.rune || undefined
  )
 
  $: _dummyDebuffs = (() => {
    const variantBase = new Map<string, string>([
      ['Sticky (Melting Slime)', 'Sticky'],
      ['Sticky (Sickness)', 'Sticky'],
      ['Sticky (Hex Web)', 'Sticky'],
    ])
    const groups = new Map<string, Map<string, number>>()
    for (const b of [..._allActiveBuffs, ..._draconicHexDebuffsForDummy]) {
      if (b.isSelfDebuff) continue
      const def = BUFF_DEFS[b.buffName]
      if (!def?.isDebuff) continue
      const key = variantBase.get(b.buffName) ?? b.buffName
      if (!groups.has(key)) groups.set(key, new Map())
      const inner = groups.get(key)!
      const existing = inner.get(b.buffName)
      if (!existing || b.potency > existing) {
        inner.set(b.buffName, b.potency)
      }
    }
    if (_allActiveBuffs.some(b => b.buffName === 'Exhaust')) {
      if (!groups.has('Burn')) groups.set('Burn', new Map())
      const inner = groups.get('Burn')!
      if (!inner.has('Burn') || 0 > (inner.get('Burn') ?? 0)) {
        inner.set('Burn', 0)
      }
    }
    // Melting Slime overrides every sticky into Melting Slime Sticky
    if ((perks['Melting Slime'] ?? 0) > 0) {
      for (const inner of groups.values()) {
        let maxPotency = 0
        let hasSticky = false
        for (const k of inner.keys()) {
          if (k.startsWith('Sticky')) {
            hasSticky = true
            maxPotency = Math.max(maxPotency, inner.get(k)!)
            inner.delete(k)
          }
        }
        if (hasSticky) inner.set('Sticky (Melting Slime)', maxPotency)
      }
    }
    const buildVariant = (buffName: string, potency: number) => {
      const combatFx = DEBUFF_COMBAT_EFFECTS[buffName]
      const effect = potency > 0 ? calcBuffEffect(buffName, potency) : null
      return {
        sourceName: buffName,
        potency,
        effectLabel: effect ? `${effect.value}${effect.unit === '%' ? '%' : ''}` : null,
        descLabel: combatFx ? combatFx.descFn(potency, perks) : null,
        damageMult: combatFx?.damageMult ? combatFx.damageMult(potency) : undefined,
        defReduction: combatFx?.defReduction ? combatFx.defReduction(potency) : undefined,
        typeDamageMult: combatFx?.typeDamageMult ? combatFx.typeDamageMult(potency, perks) : undefined,
      }
    }
    return [...groups.entries()].map(([name, inner]) => {
      const variants = [...inner.entries()].map(([bn, p]) => buildVariant(bn, p))
      variants.sort((a, b) => {
        if (a.sourceName === name && b.sourceName !== name) return 1
        if (a.sourceName !== name && b.sourceName === name) return -1
        return 0
      })
      const def = BUFF_DEFS[name]
      return {
        name,
        abbr: name.slice(0, 4),
        color: def?.color ?? '#888',
        ...variants[0],
        variants,
      }
    })
  })()

  $: _dummyHasPoisonActive = _dummyDebuffs.some(d => d.name === 'Poison' && !disabledDebuffs.has(d.name))
  $: _venomEaterCanShow = (perks['Venom Eater'] ?? 0) > 0 && _dummyHasPoisonActive
  $: _showCrit = crit.effectiveCritChance > 0 || _hasCritBoostBuff || crit.hasCritRelevantPerks || _venomEaterCanShow
  $: _critMult = crit.critDamageMultiplier / 100  
  let showCritValues = false

  $: crit = $result.crit
  $: boosts = $result.boosts
  $: stats = $result.stats
  $: perks = $result.perks
  $: _luminescentPct = (perks['Luminescent Fervor'] ?? 0) > 0 ? 0.05 * (perks['Luminescent Fervor'] ?? 0) : 0
  $: _dragonStateAmt = perks['Dragon State'] ?? 0
  $: _dragonStateHpGateActive = _dragonStateAmt > 0 && isHpGateActive(
    { hpThreshold: 80, aboveThreshold: true, getThreshold: (pa) => 85 - 5 * pa },
    _hpFillPct,
    _dragonStateAmt
  )
  $: _dragonStateBaseDmg = _dragonStateAmt > 0 ? (1.5 + 1.5 * _dragonStateAmt) : 0
  $: _dragonStateScalingMult = _computePerkScalingMult({ magic: 0.75, dexterity: 0.75, holy: 0.75 })
  $: _dragonStateCombatMult = _perkCombatMult
  $: _dragonStateTotalDmg = _dragonStateAmt > 0 && _dragonStateHpGateActive
    ? _dragonStateBaseDmg * _dragonStateScalingMult * _dragonStateCombatMult
    : 0
  $: _sporeBurstAmt = perks['Spore Burst'] ?? 0
  $: _sporeBurstBaseDmg = _sporeBurstAmt > 0 ? _sporeBurstAmt * 1 : 0
  $: _sporeBurstScalingMult = _computePerkScalingMult({ dexterity: 1.0, hex: 1.0, earth: 1.0 })
  $: _sporeBurstCombatMult = _perkCombatMult
  $: _sporeBurstTotalDmg = _sporeBurstBaseDmg * _sporeBurstScalingMult * _sporeBurstCombatMult
  $: _royalFinisherAmt = perks['Royal Finisher'] ?? 0
  $: _royalFinisherBaseDmg = _royalFinisherAmt > 0 ? (3 + _royalFinisherAmt * 1) : 0
  $: _royalFinisherScalingMult = _computePerkScalingMult({ magic: 1.0 })
  $: _royalFinisherCombatMult = _perkCombatMult
  $: _royalFinisherTotalDmg = _royalFinisherBaseDmg * _royalFinisherScalingMult * _royalFinisherCombatMult
  $: _springblastAmt = perks['Springblast'] ?? 0
  $: _springblastBaseDmgPerHit = _springblastAmt > 0
    ? Math.round(((6 + 2 * _springblastAmt) * (1 + 0.1 * _springblastAmt)) / (0.5 + springblastFinisherHits / 2) * 1000) / 1000
    : 0
  $: _springblastScalingMult = _computePerkScalingMult({ physical: 1.0 })
  $: _springblastCombatMult = _perkCombatMult
  $: _springblastTotalDmg = _springblastBaseDmgPerHit * _springblastScalingMult * _springblastCombatMult * springblastFinisherHits
  $: _perkOnHitDamages = [
    { tag: 'Spore Burst', baseDmg: _sporeBurstBaseDmg, scalingMult: _sporeBurstScalingMult, combatMult: _sporeBurstCombatMult, totalDmg: _sporeBurstTotalDmg, dmgTypes: { hex: 1.0 } as Record<string, number>, canProc: PERK_DMG_DEFS.find(d => d.perkName === 'Spore Burst')?.canProc },
    { tag: 'Royal Finisher', baseDmg: _royalFinisherBaseDmg, scalingMult: _royalFinisherScalingMult, combatMult: _royalFinisherCombatMult, totalDmg: _royalFinisherTotalDmg, dmgTypes: { magic: 1.0 } as Record<string, number>, canProc: PERK_DMG_DEFS.find(d => d.perkName === 'Royal Finisher')?.canProc },
    { tag: 'Springblast', baseDmg: _springblastBaseDmgPerHit, scalingMult: _springblastScalingMult, combatMult: _springblastCombatMult, totalDmg: _springblastTotalDmg, dmgTypes: { physical: 1.0 } as Record<string, number>, canProc: PERK_DMG_DEFS.find(d => d.perkName === 'Springblast')?.canProc },
  ]
  $: _waveRiderAmt = perks['Wave Rider'] ?? 0
  $: _oceanSongAmt = perks['Ocean Song'] ?? 0
  $: _wildBoltAmt = perks['Wild Bolt'] ?? 0
  $: _lightningCloakActive = _allActiveBuffs.some(b => b.buffName === 'Lightning Cloak')
  $: _activeLightningCloakBuffs = _allActiveBuffs.filter(b => b.buffName === 'Lightning Cloak')
  $: _stormRendAmt = perks['Storm Rend'] ?? 0
  let disableStormRend = false
  $: _stormRendActive = _stormRendAmt > 0 && !disableStormRend
  $: _lightningCloakPct = (_lightningCloakActive && !disableLightningCloak) || _stormRendActive ? (1 / 3) : 0
  $: _windWalkerAmt = perks['Wind Walker'] ?? 0
  $: _hasTailwindOrWhirlwind = (_disabledKeysArr.length,
    _allActiveBuffs.some(b => (b.buffName === 'Tailwind' || b.buffName === 'Whirlwind')))
  $: _effectiveTailwindPotency = (_disabledKeysArr.length,
    Math.max(0, ..._allActiveBuffs.filter(b => b.buffName === 'Tailwind' || b.buffName === 'Whirlwind').map(b => b.potency)))
  $: _spiritWindsAmt = perks['Spirit Winds'] ?? 0
  $: _spiritWindsConversionRate = _spiritWindsAmt > 0 && _hasTailwindOrWhirlwind ? 0.10 * _spiritWindsAmt : 0
  $: _darkMagicAmt = perks['Dark Magic'] ?? 0
  $: _darkMagicHexBonus = _darkMagicAmt > 0 ? 0.2 * _darkMagicAmt : 0
  $: _waArmorPenetration = (_windWalkerAmt > 0 && _hasTailwindOrWhirlwind ? 10 * _windWalkerAmt : 0) + ($build.race === 'ORK' ? 10 : 0)
  $: _stormRendPct = 0
  $: _explosiveChargePct = (perks['Explosive Charge'] ?? 0) > 0 ? 1.0 : 0
  $: _blubBlubAmt = perks['Blub Blub'] ?? 0

  // ── Ork race: +0.1 tenacity per active buff (excludes debuffs & self-debuffs) ──
  $: _orkBuffs = _allActiveBuffs.filter(b => {
    const def = BUFF_DEFS[b.buffName]
    return !def?.isDebuff && !b.isSelfDebuff && !def?.isNeutral
  })
  $: _orkBuffTenacity = $build.race === 'ORK' ? 0.1 * _orkBuffs.length : 0
  $: _effectiveTenacity = (stats.tenacity ?? 0) + _orkBuffTenacity

  let disabledDebuffs = new Set<string>()

  // ── Curse Rip ─────────────────────────────────────────────────────────────
  $: _curseRipPerkAmount = perks['Curse Rip'] ?? 0
  $: _curseRipActiveDebuffCount = (() => {
    if (_curseRipPerkAmount <= 0) return 0
    return _dummyDebuffs.filter(d => !disabledDebuffs.has(d.name)).length
  })()
  $: _curseRipDamageBoost = (() => {
    if (_curseRipPerkAmount <= 0 || _curseRipActiveDebuffCount <= 0) return 1
    const bonusPct = (10 * _curseRipPerkAmount - 10 + 5 * _curseRipActiveDebuffCount) / 100
    return 1 + bonusPct
  })()
  $: _reaperPerkAmount = perks['Reaper'] ?? 0
  $: _reaperActiveDebuffCount = (() => {
    if (_reaperPerkAmount <= 0) return 0
    return _dummyDebuffs.filter(d => !disabledDebuffs.has(d.name)).length
  })()
  $: _reaperDamageBoost = (() => {
    if (_reaperPerkAmount <= 0 || _reaperActiveDebuffCount <= 0) return 1
    return 1 + 0.05 * _reaperActiveDebuffCount * _reaperPerkAmount
  })()

  $: _disabledKeysArr = [...disabledBuffKeys]
  function _isBuffDisabled(buff: { buffName: string; sourceName: string }): boolean {
    return disabledBuffKeys.has(`${buff.buffName}:${buff.sourceName}`)
  }
  $: _activeReinforcePotency      = (_disabledKeysArr.length,
    _allActiveBuffs.reduce((m, b) => b.buffName === 'Reinforce'       ? Math.max(m, b.potency) : m, 0))
  $: _activeMagicReinforcePotency = (_disabledKeysArr.length,
    _allActiveBuffs.reduce((m, b) => b.buffName === 'Magic Reinforce' ? Math.max(m, b.potency) : m, 0))

  let rageDisabled = false
  let glyphConduitDisabled = false
  let disabledBuffKeys = new Set<string>()
  function toggleBuffKey(key: string) {
    if (disabledBuffKeys.has(key)) disabledBuffKeys.delete(key)
    else disabledBuffKeys.add(key)
    disabledBuffKeys = disabledBuffKeys // trigger reactivity
  }
  const HANDLED_BUFF_NAMES = new Set(['Rage', 'Glyph Conduit', 'Extinguish', 'Lightning Cloak', 'Storm Rend'])
  let extinguishDisabled = false

  let environmentTouched = false
  let prevPhotosynthesis = 0
  let prevVampire = 0

  type HitSeq = (number | { n: number; count: number })[]

  interface WeaponChargeConfig {
    enabled: boolean
    label: string
    max: number
    formula: (base: number, charge: number) => number
  }

  type DamageDisplayType = {
    label: string
    rawVal: number
    val: number
    scalingMult: number
    color: string
    rageApplied?: boolean
  }

  interface WeaponBaseDmg {
    type: string
    m1: HitSeq | null
    m2: HitSeq | null
    m2Charge?: WeaponChargeConfig
  }

  function fmtSeq(seq: HitSeq): string {
    return seq.map(h => {
      if (typeof h === 'number') return String(h)
      return `${h.n}\u00d7${h.count}`
    }).join(', ')
  }

  type HitBreakdown = Array<{
    label: string
    rawVal: number
    val: number
    scalingMult: number
    color: string
    rageApplied?: boolean
  }>

  function fmtNum(n: number): string {
    const r = roundMultiplier(n)
    return Number.isInteger(r) ? String(r) : r.toFixed(4).replace(/\.?0+$/, '')
  }

  function calcGroupMultiplier(entries: Array<{ rawMultiplier: number }>): number {
    return entries.reduce((acc, e) => acc * e.rawMultiplier, 1)
  }

  function seqWithTypes(
  seq: HitSeq,
  dmgTypes: Record<string, number>,
  scalingMult: number = 1,
  rageMult: number = 1,
  rageAffectedTypes: Set<string> = new Set(),
  combatMult: number = 1
): Array<{ base: number; count: number; types: HitBreakdown }> {
  return seq.map(h => {
    const base = typeof h === 'number' ? h : h.n
    const count = typeof h === 'number' ? 1 : h.count
    const effectiveMult = scalingMult * combatMult
    const types: HitBreakdown = Object.entries(dmgTypes).map(([k, mult]) => {
      const rageApplied = rageMult !== 1 && rageAffectedTypes.has(k)
      const finalMult = rageApplied ? mult * rageMult : mult
      return {
        label: k.charAt(0).toUpperCase() + k.slice(1),
        rawVal: Math.round(base * 10000) / 10000,
        val: Math.round(base * finalMult * 10000) / 10000,
        scalingMult: effectiveMult,
        color: DMG_TYPE_COLORS[k] ?? '#e8e4da',
        rageApplied,
      }
    })
    return { base, count, types }
  })
}

  $: _isMonk = isMonkGuild($build.guild)

  $: _blasterCount = [$build.ring, $build.infusionRing, $build.infusionHelmet, $build.infusionChestplate, $build.infusionLeggings]
    .filter(s => s === 'Blaster Ring').length

  $: _hasLockedAndLoaded = ($result.perks['Locked And Loaded'] ?? 0) > 0

  interface GunOverlay {
    type: string
    m2Only: boolean
    m2NoLock?: boolean
  }

  $: _weaponResult = _isMonk
    ? (($build.monkGlove || $build.monkEssence) ? calcMonkWeapon($build.monkGlove, $build.monkEssence, $build.shrineActive, $build.guildRank) : null)
    : (($build.weaponBlade || $build.weaponHandle) ? calcWeapon($build.weaponBlade, $build.weaponHandle, $build.shrineActive) : null)

  $: _baseWeaponType = _weaponResult?.finalWeaponType ?? ''
  $: _weaponPerks = _weaponResult?.perks ?? {}

  $: _gunOverlay = ((): GunOverlay | null => {
    const wt = _baseWeaponType
    const isFists = wt === 'Fists' || wt === 'Chain Fists'

    if (_blasterCount >= 2) {
      if (isFists) return { type: 'Rifle', m2Only: false, m2NoLock: true }
      if (wt) return { type: 'Shotgun', m2Only: true }
    }

    if (_hasLockedAndLoaded) {
      if (isFists) return { type: 'Dual Guns', m2Only: false }
      if (wt) return { type: 'Side Gun', m2Only: true }
    }

    if ((_weaponPerks['Cosmic Ray'] ?? 0) > 0) {
      return { type: 'Cosmic Ray', m2Only: true, m2NoLock: true }
    }
    if ((_weaponPerks['Mine'] ?? 0) > 0) {
      return { type: 'Mine', m2Only: true, m2NoLock: true }
    }

    return null
  })()

  $: _displayRows = (() => {
    type MergedRow = WeaponBaseDmg & { gunLabel?: string; m2Only?: boolean; m2NoLock?: boolean }
    const rows: MergedRow[] = []

    if (_baseWeaponType) {
      const base = WEAPON_BASE_DMG.find(w => w.type === _baseWeaponType)
      if (base) {
        if (_gunOverlay) {
          const gun = WEAPON_BASE_DMG.find(w => w.type === _gunOverlay.type)
          if (_gunOverlay.m2Only) {
            rows.push({ type: _baseWeaponType, m1: base.m1, m2: gun?.m2 ?? null, gunLabel: _gunOverlay.type, m2Only: true, m2NoLock: _gunOverlay.m2NoLock })
          } else {
            rows.push({ type: _baseWeaponType, m1: gun?.m1 ?? null, m2: gun?.m2 ?? null, gunLabel: _gunOverlay.type, m2Only: false, m2NoLock: _gunOverlay.m2NoLock })
          }
        } else {
          rows.push({ ...base })
        }
      }
    } else if (_gunOverlay) {
      const gun = WEAPON_BASE_DMG.find(w => w.type === _gunOverlay.type)
      if (gun) rows.push({ ...gun, gunLabel: _gunOverlay.type, m2NoLock: _gunOverlay.m2NoLock })
    }

    return rows
  })()

  $: _currentLabel = _gunOverlay && _baseWeaponType
    ? `${_baseWeaponType} + ${_gunOverlay.type}`
    : _gunOverlay?.type ?? _baseWeaponType

  interface WaDmgTypeBonusDef {
    perkName: string
    type: string
    amountPerStack: number
  }

  interface PerkDmgTypeBonusDef {
    perkName: string
    type?: string
    getType?: (ctx: { draconicColor: string }) => string
    amountPerStack: number
    getAmountPerStack?: (ctx: { draconicColor: string; perkAmount: number; guild: string; draconicRuneInfusion: string; perks: Record<string, number> }) => number
    condition?: (ctx: { ragePotency: number; draconicRuneInfusion: string; emotionalState: string }) => boolean
  }

  const PERK_DMG_TYPE_BONUS_DEFS: PerkDmgTypeBonusDef[] = [
    { perkName: 'Void Rage', type: 'hex', amountPerStack: 0.1, condition: ctx => ctx.ragePotency > 0 },
    { perkName: 'Channeled Weapon', type: 'magic', amountPerStack: 0.05 },
    { perkName: 'Emotional', type: 'fire', amountPerStack: 0.1, condition: ctx => ctx.emotionalState === 'debuffs' },
    {
      perkName: 'Draconic Blood',
      getType: ctx => ctx.draconicColor || 'physical',
      amountPerStack: 0.1,
      getAmountPerStack: ctx => {
        if (ctx.perkAmount <= 0) return 0
        const effective = getEffectiveDraconicInfusionPotency(ctx.guild, ctx.draconicRuneInfusion, ctx.draconicColor || 'physical', ctx.perkAmount, ctx.perks)
        return effective / ctx.perkAmount
      },
      condition: ctx => ctx.draconicRuneInfusion === 'infusion',
    },
  ]

  $: _perkDmgTypeBonuses = (() => {
    const bonus: Record<string, number> = {}
    for (const def of PERK_DMG_TYPE_BONUS_DEFS) {
      const amt = perks[def.perkName] ?? 0
      if (amt <= 0) continue
      if (def.condition && !def.condition({ ragePotency: _ragePotency, draconicRuneInfusion: $build.draconicRuneInfusion, emotionalState: $build.emotionalState })) continue
      if (def.perkName === 'Draconic Blood' && draconicInfusionDisabled) continue
      const type = def.getType ? def.getType({ draconicColor: $build.draconicColor }) : def.type
      if (!type) continue
      const amountPerStack = def.getAmountPerStack
        ? def.getAmountPerStack({ draconicColor: $build.draconicColor, perkAmount: amt, guild: $build.guild, draconicRuneInfusion: $build.draconicRuneInfusion, perks })
        : def.amountPerStack
      bonus[type] = Math.round(((bonus[type] ?? 0) + amt * amountPerStack) * 10000) / 10000
    }
    if (_toxinTransferHexBonus > 0) {
      bonus.hex = Math.round(((bonus.hex ?? 0) + _toxinTransferHexBonus) * 10000) / 10000
    }
    return bonus
  })()

  $: _emotionalHexBonus = (() => {
    const amt = perks['Emotional'] ?? 0
    if (amt <= 0) return 0
    if ($build.emotionalState !== 'buffs') return 0
    return Math.round(amt * 0.1 * 10000) / 10000
  })()

  $: _toxinTransferHexBonus = (() => {
    const amt = perks['Toxin Transfer'] ?? 0
    if (amt <= 0) return 0
    const hasSelfPoison = _allActiveBuffs.some(b => b.buffName === 'Poison' && b.isSelfDebuff)
    if (!hasSelfPoison) return 0
    return Math.round(amt * 0.1 * 10000) / 10000
  })()

  $: _emotionalFireBonus = (() => {
    const amt = perks['Emotional'] ?? 0
    if (amt <= 0) return 0
    if ($build.emotionalState !== 'debuffs') return 0
    return Math.round(amt * 0.1 * 10000) / 10000
  })()

  $: _waDmgTypeBonuses = (() => {
    const bonuses = { ..._perkDmgTypeBonuses }
    if (_emotionalHexBonus > 0) {
      bonuses.hex = Math.round(((bonuses.hex ?? 0) + _emotionalHexBonus) * 10000) / 10000
    }
    if (_hasTailwindOrWhirlwind) {
      const wwAmt = perks['Wind Walker'] ?? 0
      if (wwAmt > 0) {
        bonuses.air = Math.round(((bonuses.air ?? 0) + wwAmt * 0.15) * 10000) / 10000
      }
    }
    return bonuses
  })()
  $: _waOnlyBonuses = (() => {
    const result: Record<string, number> = {}
    for (const [k, v] of Object.entries(_waDmgTypeBonuses)) {
      const bv = _perkDmgTypeBonuses[k] ?? 0
      if (v !== bv) result[k] = Math.round((v - bv) * 10000) / 10000
    }
    return result
  })()

  function _applyDmgBonuses(base: Record<string, number>, bonuses: Record<string, number>): Record<string, number> {
    return resolveDamageTypes(base, bonuses)
  }

  function _resolveHitDmgTypes(
    dtStr: string,
    weaponTypes: Record<string, number>,
    bonuses: Record<string, number>
  ): Record<string, number> {
    if (dtStr === 'Same as weapon') return weaponTypes
    
    const types: Record<string, number> = {}
    const re = /([\d.]+)\s*(Physical|Magic|Fire|Water|Earth|Air|Hex|Holy|True|Summon)/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(dtStr)) !== null) {
      types[m[2].toLowerCase()] = parseFloat(m[1])
    }
    return _applyDmgBonuses(types, bonuses)
  }
  function _resolveHitDmgTypesBase(
    dtStr: string,
    weaponTypesBase: Record<string, number>
  ): Record<string, number> {
    if (dtStr === 'Same as weapon') return weaponTypesBase
  
    const types: Record<string, number> = {}
    const re = /([\d.]+)\s*(Physical|Magic|Fire|Water|Earth|Air|Hex|Holy|True|Summon)/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(dtStr)) !== null) {
      types[m[2].toLowerCase()] = parseFloat(m[1])
    }
    return types
  }

  $: _weaponDmgTypes = (() => {
    const base: Record<string, number> = { ...(_weaponResult?.damageTypes ?? {}) }
    const stoneWeapon = ($result.perks['Stone Weapon'] ?? 0)
    if (stoneWeapon > 0) {
      base['earth'] = Math.round(((base['earth'] ?? 0) + stoneWeapon * 0.3) * 10000) / 10000
    }
    return _applyDmgBonuses(base, _perkDmgTypeBonuses)
  })()
  $: _weaponDmgTypesBase = (() => {
    return { ...(_weaponResult?.damageTypes ?? {}) }
  })()
  $: _convertedWeaponDmgTypes = applyAirToMagicConversion(_weaponDmgTypes, _spiritWindsConversionRate, _darkMagicHexBonus)

  $: _gunDmgTypes = (() => {
    if (!_gunOverlay) return _weaponDmgTypes
    const entries = Object.entries(_weaponDmgTypes)
    if (entries.length === 0) return _weaponDmgTypes
    const priority = DMG_TYPE_PRIORITY
    const [highestKey] = entries.reduce((a, b) => {
      if (b[1] > a[1]) return b
      if (b[1] === a[1]) {
        const ia = priority.indexOf(a[0])
        const ib = priority.indexOf(b[0])
        return (ib === -1 ? 999 : ib) < (ia === -1 ? 999 : ia) ? b : a
      }
      return a
    })
    
    return { [highestKey]: 1 }
  })()

  let showAllWeapons = false

  function fmtMult(n: number): string {
    return `×${n.toFixed(4)}`
  }
  function isFinisher(row: any, attackType: 'm1' | 'm2', hitIndex: number): boolean {
    if (attackType === 'm2') return true
    const hasFinisher = (row as any).m1Finisher ?? true
    if (!hasFinisher) return false
    return row.m1 ? hitIndex === row.m1.length - 1 : false
  }

  $: natSources = crit.naturalBreakdown
  $: allCritSources = crit.allCritBreakdown
  $: critDmgSources = crit.critDmgBreakdown

  let disabledBoosts = new Set<string>([
    'Thief Training (would-crit bonus)'
  ])

  function toggleBoost(name: string) {
    if (disabledBoosts.has(name)) disabledBoosts.delete(name)
    else disabledBoosts.add(name)
    disabledBoosts = new Set(disabledBoosts)
  }

  let disabledHealBoosts = new Set<string>(['Extinguish'])
  let draconicInfusionDisabled = false
  let disableCurseRip = false
  let disableReaper = false
  let disableLightningCloak = false

  function toggleHealBoost(name: string) {
    if (disabledHealBoosts.has(name)) disabledHealBoosts.delete(name)
    else disabledHealBoosts.add(name)
    disabledHealBoosts = new Set(disabledHealBoosts)
  }
  type BoostAttackType = 'm1' | 'm2' | 'perk' | 'rune' | 'wa';
  $: _syntheticDmgBoostEntries = (() => {
    const entries: Array<{ sourceName: string; rawMultiplier: number; condition: string; type: 'dmg' }> = []

    const cr = _curseRipPerkAmount > 0 && _curseRipActiveDebuffCount > 0
    if (cr) entries.push({ sourceName: 'Curse Rip', rawMultiplier: _curseRipDamageBoost, condition: `${_curseRipActiveDebuffCount} unique debuff${_curseRipActiveDebuffCount > 1 ? 's' : ''} · ${_curseRipPerkAmount} stack`, type: 'dmg' })

    const rp = _reaperPerkAmount > 0 && _reaperActiveDebuffCount > 0
    if (rp) entries.push({ sourceName: 'Reaper', rawMultiplier: _reaperDamageBoost, condition: `${_reaperActiveDebuffCount} unique debuff${_reaperActiveDebuffCount > 1 ? 's' : ''} · ${_reaperPerkAmount} stack`, type: 'dmg' })

    const tbAmt = perks['True Balance'] ?? 0
    if (tbAmt > 0) {
      const holy = stats.holyBoost ?? 0
      if (holy > 0) entries.push({ sourceName: 'True Balance', rawMultiplier: roundMultiplier(1 + holy * tbAmt / 800), condition: `${holy}% Holy Boost (True Balance)`, type: 'dmg' })
    }

    const frenzyStacks = perks['Frenzy'] ?? 0
    if (frenzyStacks > 0 && _ragePotency > 0) {
      const pct = (0.05 + (1 / 6) * _ragePotency) * frenzyStacks
      entries.push({ sourceName: 'Frenzy', rawMultiplier: roundMultiplier(1 + pct), condition: `Rage active · potency ${Math.round(_ragePotency * 1000) / 1000}`, type: 'dmg' })
    }

    return entries
  })()
  $: _adjustedDmgEntries = boosts.dmgEntries
  $: activeEntries = [..._adjustedDmgEntries.filter(e => !disabledBoosts.has(e.sourceName) && !(e.sourceName === 'Spirit Winds' && _effectiveTailwindPotency <= 0) && !(e.sourceName === 'Venom Eater' && (!showCritValues || !_dummyHasPoisonActive)) && e.sourceName !== 'Curse Rip' && e.sourceName !== 'Reaper' && e.sourceName !== 'True Balance' && e.sourceName !== 'Frenzy'), ..._syntheticDmgBoostEntries.filter(e => {
    if (e.sourceName === 'Curse Rip' && disableCurseRip) return false
    if (e.sourceName === 'Reaper' && disableReaper) return false
    if (disabledBoosts.has(e.sourceName)) return false
    return true
  })]
  $: hasDisabledVisible = _adjustedDmgEntries.some(e => disabledBoosts.has(e.sourceName) || (e.sourceName === 'Spirit Winds' && _effectiveTailwindPotency <= 0)) || (_curseRipPerkAmount > 0 && disableCurseRip) || (_reaperPerkAmount > 0 && disableReaper) || ((perks['True Balance'] ?? 0) > 0 && disabledBoosts.has('True Balance')) || ((perks['Frenzy'] ?? 0) > 0 && disabledBoosts.has('Frenzy'))

  $: _levelMult = (() => {
    const levelEntry = boosts.dmgEntries.find(e => e.sourceName === 'Level Damage')
    return levelEntry ? levelEntry.rawMultiplier : 1
  })()
  
  $: _selfDebuffDamageMult = (() => {
    let mult = 1
    for (const b of _allActiveBuffs) {
      if (!b.isSelfDebuff) continue
      const def = BUFF_DEFS[b.buffName]
      if (!def?.isDebuff) continue

      const combatFx = DEBUFF_COMBAT_EFFECTS[b.buffName]
      if (!combatFx?.damageMult) continue

      const effectivePotency = wardingDebuffMult !== 1
        ? Math.round(b.potency * wardingDebuffMult * 1000) / 1000
        : b.potency

      mult *= combatFx.damageMult(effectivePotency)
    }
    return mult
  })()
  
  $: activeFinalMult = activeEntries.reduce((acc, e) => acc * e.rawMultiplier, 1.0)
  $: activeFinalMultRounded = roundMultiplier(activeFinalMult)

  function _categoryMult(type: BoostAttackType, canProc: boolean = true): number {
    return activeEntries
      .filter(e => !(e as any).appliesTo || (e as any).appliesTo.includes(type))
      .filter(e => canProc || !(e as any).needsProcCoeff)
      .reduce((acc, e) => acc * e.rawMultiplier, 1.0)
  }

  $: _m1CombatMult   = (void activeEntries, _categoryMult('m1'))
  $: _m2CombatMult   = (void activeEntries, _categoryMult('m2'))
  $: _waCombatMult   = (void activeEntries, _categoryMult('wa'))
  $: _runeCombatMult = (void activeEntries, _categoryMult('rune'))
  $: _perkCombatMult = (void activeEntries, _categoryMult('perk'))

  $: _hasSpecificBoosts = boosts.dmgEntries.some(e => !!(e as any).appliesTo)

  $: _allUniversalChips = [..._visibleDmgEntries.filter(e => !(e as any).appliesTo), ..._syntheticDmgBoostEntries.filter(e => {
    if (e.sourceName === 'Curse Rip' && disableCurseRip) return false
    if (e.sourceName === 'Reaper' && disableReaper) return false
    return true
  })]

  $: _universalActiveMult = Math.round(
    _allUniversalChips
      .filter(e => !disabledBoosts.has(e.sourceName) && !(e.sourceName === 'Spirit Winds' && _effectiveTailwindPotency <= 0))
      .reduce((acc, e) => acc * e.rawMultiplier, 1.0) * 10000
  ) / 10000

  $: _catGroups = (() => {
    const CAT_DEFS: Array<{ key: BoostAttackType; label: string }> = [
      { key: 'm1',   label: 'M1'   },
      { key: 'm2',   label: 'M2'   },
      { key: 'perk', label: 'Perk' },
      { key: 'rune', label: 'Rune' },
      { key: 'wa',   label: 'WA'   },
    ]
    type CatGroup = { labels: string[]; allChips: typeof boosts.dmgEntries; totalMult: number }
    const groups: CatGroup[] = []

    const allEntries = boosts.dmgEntries

    for (const { key, label } of CAT_DEFS) {
      const allChips   = allEntries.filter(e => (e as any).appliesTo?.includes(key))
      const activeChips = allChips.filter(e => !disabledBoosts.has(e.sourceName) && !(e.sourceName === 'Spirit Winds' && _effectiveTailwindPotency <= 0))
      const specMult   = activeChips.reduce((acc, e) => acc * e.rawMultiplier, 1.0)
      const totalMult  = roundMultiplier(_universalActiveMult * specMult)
      const sigKey     = allChips.map(e => e.sourceName).join('|')

      const existing = groups.find(g => g.allChips.map(e => e.sourceName).join('|') === sigKey)
      if (existing) existing.labels.push(label)
      else groups.push({ labels: [label], allChips, totalMult })
    }
    return groups
  })()

  const SCALING_COLORS: Record<string, string> = {
    physical:  '#fb923c',
    magic:     '#818cf8',
    fire:      '#f97316',
    water:     '#38bdf8',
    earth:     '#a3e635',
    air:       '#AAFFDB',
    hex:       '#e879f9',
    holy:      '#facc15',
    dexterity: '#ffe373',
    summon:    '#c084fc',
    protection: 'rgb(68, 226, 43)',
  }

  function buildScalingRows(scalings: Record<string, number>): ScalingRow[] {
    const rows: ScalingRow[] = []
    for (const [key, scalingVal] of Object.entries(scalings)) {
      if (!scalingVal) continue
      const boostKey = SCALING_TO_BOOST[key]
      if (!boostKey) continue
      const boostPct = (stats as Record<string, number>)[boostKey] ?? 0
      const contribution = Math.round(scalingVal * boostPct * 1000) / 1000
      rows.push({ key, scalingVal, boostKey, boostPct, contribution, color: SCALING_COLORS[key] ?? '#e8e4da' })
    }
    return rows
  }

  interface ScalingRow {
    key: string
    label?: string 
    scalingVal: number
    boostKey: string
    boostPct: number
    contribution: number
    color: string
  }

  $: scalingBreakdown = (() => {
    if (!_weaponResult) return { rows: [] as ScalingRow[], totalEffectivePct: 0, multiplier: 1 }
    const scalings = _weaponResult.scalings
    const rows = buildScalingRows(scalings)
    const totalEffective = rows.reduce((a, r) => a + r.contribution, 0)
    const totalEffectivePct = Math.round(totalEffective * 1000) / 1000
    const multiplier = roundMultiplier(1 + totalEffective / 100)
    return { rows, totalEffectivePct, multiplier }
  })()

  $: waScalingBreakdown = (() => {
    if (selectedWA.hitScalings?.length) {
      const rows: ScalingRow[] = []
      for (let i = 0; i < selectedWA.hitScalings.length; i++) {
        const scaling = selectedWA.hitScalings[i]
        if (!scaling || scaling === 'Same as weapon') continue
        const dmgLabel = selectedWA.hitDamageTypes?.[i]?.match(/[A-Za-z]+/)?.[0] ?? `Hit ${i+1}`
        const re = /([\d.]+)\s*(Physical|Magic|Fire|Water|Earth|Air|Hex|Holy|True|Dex(?:terity)?|Summon)/gi
        let m
        while ((m = re.exec(scaling)) !== null) {
          const key = /dex/i.test(m[2]) ? 'dexterity' : m[2].toLowerCase()
          const boostKey = SCALING_TO_BOOST[key]
          if (!boostKey) continue
          const scalingVal = parseFloat(m[1])
          const boostPct = (stats as Record<string, number>)[boostKey] ?? 0
          rows.push({ 
            key,
            label: `${dmgLabel} · ${key} ×${scalingVal}`,
            scalingVal,
            boostKey,
            boostPct,
            contribution: Math.round(scalingVal * boostPct * 1000) / 1000,
            color: SCALING_COLORS[key] ?? '#e8e4da'
          })
        }
      }
      if (!rows.length) return null
      const totalContribution = rows.reduce((sum, row) => sum + row.contribution, 0)
      const avgEffectivePct = Math.round((totalContribution / rows.length) * 1000) / 1000
      const multiplier = roundMultiplier(1 + avgEffectivePct / 100)
      return {
        rows,
        totalEffectivePct: avgEffectivePct,
        multiplier,
        isPerHit: true
      }
    }

    const sc = selectedWA.scaling
    if (!sc || sc === 'Same as weapon' || sc === 'None') return null
    const re = /([\d.]+)\s*(Physical|Magic|Fire|Water|Earth|Air|Hex|Holy|True|Dex(?:terity)?|Summon)/gi
    const parsed: Record<string, number> = {}
    let m: RegExpExecArray | null
    while ((m = re.exec(sc)) !== null)
      parsed[/dex/i.test(m[2]) ? 'dexterity' : m[2].toLowerCase()] = parseFloat(m[1])
    const rows = buildScalingRows(parsed)
    if (!rows.length) return null
    const totalEffectivePct = Math.round(rows.reduce((a, r) => a + r.contribution, 0) * 1000) / 1000
    return { rows, totalEffectivePct,
      multiplier: roundMultiplier(1 + totalEffectivePct / 100),
      isPerHit: false }
  })()
  $: runeScalingBreakdown = (() => {
    if (!_activeRuneDmgDef) return null
    const scalings = _activeRuneDmgDef.scalings
    if (!scalings || Object.keys(scalings).length === 0) return null

    const rows = buildScalingRows(scalings)
    if (!rows.length) return null

    const totalEffectivePct = Math.round(rows.reduce((a, r) => a + (PERCENT_STATS.has(r.boostKey) ? r.contribution : r.contribution * 100), 0) * 1000) / 1000
    const multiplier = roundMultiplier(1 + totalEffectivePct / 100)
    return { rows, totalEffectivePct, multiplier }
  })()
  $: _mountRuneScalingBreakdown = (() => {
    if (!_activeMountRuneDef || !mountActive) return null
    const scalings = _activeMountRuneDef.m1.getScalings()
    if (!scalings || Object.keys(scalings).length === 0) return null
    const rows = buildScalingRows(scalings)
    if (!rows.length) return null
    const totalEffectivePct = Math.round(rows.reduce((a, r) => a + (PERCENT_STATS.has(r.boostKey) ? r.contribution : r.contribution * 100), 0) * 1000) / 1000
    const multiplier = roundMultiplier(1 + totalEffectivePct / 100)
    return { rows, totalEffectivePct, multiplier }
  })()

  $: _draconicScalingBreakdown = (() => {
    if (!_draconicBloodEntry) return null
    const scalings = _draconicBloodEntry.resolvedScalings
    if (!scalings || Object.keys(scalings).length === 0) return null
    const rows = buildScalingRows(scalings)
    if (!rows.length) return null
    const totalEffectivePct = Math.round(rows.reduce((a, r) => a + (PERCENT_STATS.has(r.boostKey) ? r.contribution : r.contribution * 100), 0) * 1000) / 1000
    const multiplier = roundMultiplier(1 + totalEffectivePct / 100)
    return { rows, totalEffectivePct, multiplier }
  })()

  $: waScalingSameAsWeapon = selectedWA.scaling === 'Same as weapon'
  $: waScalingIsHealOnly = !_waHitsSeq && !!_waHealSeq
  $: _waHealScalingBreakdown = (waScalingIsHealOnly && waScalingBreakdown) ? waScalingBreakdown : null
  $: _healDisplayMult = _waHealScalingBreakdown
    ? roundMultiplier(_healFinalMultiplier * _waHealScalingBreakdown.multiplier)
    : _healFinalMultiplier

  // Perk heal scaling breakdown (e.g., Dragon Claw Heal)
  $: _perkHealScalingBreakdown = (() => {
    if (!_draconicBloodEntry) return null
    const _color = $build.draconicColor
    if (!_color || (_color !== 'holy' && _color !== 'water')) return null
    
    const healSe = (PERK_DMG_DEFS.find(d => d.perkName === 'Draconic Blood' && d.label === _draconicBloodEntry.displayName)
      ?.secondaryEffects ?? []).find(se =>
        (_color === 'holy'  && se.label === 'Base Heal (Holy)') ||
        (_color === 'water' && se.label === 'Base Heal (Water)')
      )
    
    if (!healSe) return null
    
    const rows = buildScalingRows({ [_color]: 1.0 })
    if (!rows.length) return null
    
    const totalEffectivePct = Math.round(rows.reduce((a, r) => a + r.contribution, 0) * 1000) / 1000
    return { 
      rows, 
      totalEffectivePct, 
      multiplier: roundMultiplier(1 + totalEffectivePct / 100),
      label: `${_draconicBloodEntry.displayName} Heal`
    }
  })()

  $: _scalingMult = (() => {
    if (!_weaponResult) return 1
    const scalings = _weaponResult.scalings
    let totalEffectivePct = 0
    for (const [key, scalingVal] of Object.entries(scalings)) {
      const boostKey = SCALING_TO_BOOST[key]
      if (!boostKey) continue
      const boostPct = (stats as Record<string, number>)[boostKey] ?? 0
      totalEffectivePct += scalingVal * boostPct
    }
    return 1 + totalEffectivePct / 100
  })()

  $: selectedWA = WEAPON_ARTS.find(wa => wa.name === $build.selectedWeaponArt) ?? WEAPON_ARTS[0]

  function parseWAHitsAll(baseDamage: string | undefined): {
    dmg: Array<{ n: number; count: number }>
    heal: Array<{ n: number; count: number }>
  } {
    const empty = { dmg: [], heal: [] }
    if (!baseDamage) return empty
    if (/\d+[^+]*[–—]\s*\d+/.test(baseDamage)) return empty
    const dmg: Array<{ n: number; count: number }> = []
    const heal: Array<{ n: number; count: number }> = []
    for (const part of baseDamage.split(/\s*\+\s*/)) {
      const isHeal = /healing/i.test(part)
      const mx = part.match(/([\d.]+)\s*[×x]\s*(\d+)/i)
      if (mx) {
        ;(isHeal ? heal : dmg).push({ n: parseFloat(mx[1]), count: parseInt(mx[2]) })
        continue
      }
      const nx = part.match(/^([\d.]+)/)
      if (nx) (isHeal ? heal : dmg).push({ n: parseFloat(nx[1]), count: 1 })
    }
    return { dmg, heal }
  }

  $: _waAllHits = parseWAHitsAll(selectedWA.baseDamage)
  $: _waHitsSeq = _waAllHits.dmg.length > 0 ? _waAllHits.dmg.map(h => 
    _wildBoltAmt > 0 && selectedWA.name === 'Laser' 
      ? { ...h, n: parseWAHitsAll(selectedWA.baseDamage).dmg[0]?.n - 0.75 } 
      : h
  ) : null
  $: _waHealSeq = _waAllHits.heal.length > 0 ? _waAllHits.heal : null

  const _wildBoltElements = ['fire', 'water', 'holy', 'hex', 'earth', 'air', 'magic']
  let _wildBoltElemIdx = 0
  function cycleWildBoltElem() {
    _wildBoltElemIdx = (_wildBoltElemIdx + 1) % _wildBoltElements.length
  }
  function randomWildBoltElem() {
    _wildBoltElemIdx = Math.floor(Math.random() * _wildBoltElements.length)
  }
  $: _wildBoltElement = _wildBoltAmt > 0 && selectedWA.name === 'Laser' ? _wildBoltElements[_wildBoltElemIdx] : null
  $: _waDmgTypes = (() => {
    const apply = (types: Record<string, number>) =>
      applyAirToMagicConversion(types, _spiritWindsConversionRate, _darkMagicHexBonus)

    if (_wildBoltElement) {
      return apply(_applyDmgBonuses({ [_wildBoltElement]: 1 }, _waDmgTypeBonuses))
    }
    const dt = selectedWA.damageType
    const addHex = (r: Record<string, number>) => _emotionalHexBonus > 0
      ? { ...r, hex: Math.round(((r.hex ?? 0) + _emotionalHexBonus) * 10000) / 10000 }
      : r
    
    if (!dt || dt === 'Same as weapon') {
      return apply(_applyDmgBonuses(addHex(_weaponDmgTypes), _waOnlyBonuses))
    }
    
    if (dt.includes('Highest damage type')) {
      const entries = Object.entries(_weaponDmgTypesBase)
      if (entries.length === 0) {
        return apply(_applyDmgBonuses(addHex(_weaponDmgTypes), _waOnlyBonuses))
      }
      const [highestKey] = entries.reduce((a, b) => {
        if (b[1] > a[1]) return b
        if (b[1] === a[1]) {
          const ia = DMG_TYPE_PRIORITY.indexOf(a[0])
          const ib = DMG_TYPE_PRIORITY.indexOf(b[0])
          return (ib === -1 ? 999 : ib) < (ia === -1 ? 999 : ia) ? b : a
        }
        return a
      })
      return apply(_applyDmgBonuses({ [highestKey]: 1 }, _waDmgTypeBonuses))
    }

    const types: Record<string, number> = {}
    const re =
      /([\d.]+)\s*(Physical|Magic|Fire|Water|Earth|Air|Hex|Holy|True|Summon)/gi

    let m: RegExpExecArray | null

    while ((m = re.exec(dt)) !== null) {
      types[m[2].toLowerCase()] = parseFloat(m[1])
    }

    if (Object.keys(types).length > 0) {
      return apply(_applyDmgBonuses(types, _waDmgTypeBonuses))
    } else {
      return apply(_applyDmgBonuses(addHex({ ..._weaponDmgTypes }), _waOnlyBonuses))
    }
  })()
  
  $: _waDmgTypesBase = (() => {
    if (_wildBoltElement) {
      return { [_wildBoltElement]: 1 }
    }
    const dt = selectedWA.damageType
    if (!dt || dt === 'Same as weapon') {
      return _weaponDmgTypesBase
    }
  
    if (dt.includes('Highest damage type')) {
      const entries = Object.entries(_weaponDmgTypesBase)
      if (entries.length === 0) {
        return _weaponDmgTypesBase
      }
      const [highestKey] = entries.reduce((a, b) => {
        if (b[1] > a[1]) return b
        if (b[1] === a[1]) {
          const ia = DMG_TYPE_PRIORITY.indexOf(a[0])
          const ib = DMG_TYPE_PRIORITY.indexOf(b[0])
          return (ib === -1 ? 999 : ib) < (ia === -1 ? 999 : ia) ? b : a
        }
        return a
      })
      return { [highestKey]: 1 }
    }
  
    const types: Record<string, number> = {}
    const re = /([\d.]+)\s*(Physical|Magic|Fire|Water|Earth|Air|Hex|Holy|True|Summon)/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(dt)) !== null) {
      types[m[2].toLowerCase()] = parseFloat(m[1])
    }
  
    if (Object.keys(types).length > 0) {
      return types
    } else {
      return _weaponDmgTypesBase
    }
  })()

  $: _waScalingMult = (() => {
    const sc = selectedWA.scaling
    if (!sc || sc === 'Same as weapon') return _scalingMult
    if (sc === 'None') return 1
    const re = /([\d.]+)\s*(Physical|Magic|Fire|Water|Earth|Air|Hex|Holy|Dex(?:terity)?|Summon)/gi
    let totalPct = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(sc)) !== null) {
      const typeName = /dex/i.test(m[2]) ? 'dexterity' : m[2].toLowerCase()
      totalPct += parseFloat(m[1]) * ((stats as Record<string, number>)[typeName + 'Boost'] ?? 0)
    }
    return 1 + totalPct / 100
  })()

  $: _waTyped = (() => {
  if (!_waHitsSeq || Object.keys(_waDmgTypes).length === 0) return null
  const seq: HitSeq = _waHitsSeq.map(h => h.count === 1 ? h.n : h)

  if (selectedWA.hitDamageTypes && selectedWA.hitDamageTypes.length > 0) {
    return seq.map((h, i) => {
      const base = typeof h === 'number' ? h : h.n
      const count = typeof h === 'number' ? 1 : h.count
      const dtStr = selectedWA.hitDamageTypes![Math.min(i, selectedWA.hitDamageTypes!.length - 1)]

      const hitScalingStr = selectedWA.hitScalings?.[Math.min(i, (selectedWA.hitScalings?.length ?? 1) - 1)]
      let hitScalingMult = _waScalingMult
      if (hitScalingStr && hitScalingStr !== 'Same as weapon') {
        const scRe = /([\d.]+)\s*(Physical|Magic|Fire|Water|Earth|Air|Hex|Holy|Dex(?:terity)?|Summon)/gi
        let totalPct = 0
        let scM: RegExpExecArray | null
        while ((scM = scRe.exec(hitScalingStr)) !== null) {
          const typeName = /dex/i.test(scM[2]) ? 'dexterity' : scM[2].toLowerCase()
          totalPct += parseFloat(scM[1]) * ((stats as Record<string, number>)[typeName + 'Boost'] ?? 0)
        }
        hitScalingMult = roundMultiplier(1 + totalPct / 100)
      } else if (hitScalingStr === 'Same as weapon') {
        hitScalingMult = _scalingMult
      }

      const effectiveMult = hitScalingMult * _waCombatMult

      const dtFinal = (() => {
        const base = _resolveHitDmgTypes(dtStr, _weaponDmgTypes, _waDmgTypeBonuses)
        let result = dtStr === 'Same as weapon' && _emotionalHexBonus > 0
          ? { ...base, hex: Math.round(((base.hex ?? 0) + _emotionalHexBonus) * 10000) / 10000 }
          : base
        result = applyAirToMagicConversion(result, _spiritWindsConversionRate, _darkMagicHexBonus)
        return result
      })()
      const types: DamageDisplayType[] = Object.entries(dtFinal).map(([k, mult]) => ({
        label: k.charAt(0).toUpperCase() + k.slice(1),
        rawVal: Math.round(base * 10000) / 10000,
        val: Math.round(base * (mult as number) * 10000) / 10000,
        scalingMult: effectiveMult,
        color: DMG_TYPE_COLORS[k] ?? '#e8e4da',
      }))
      return { base, count, types }
    })
  }

  return seqWithTypes(seq, _waDmgTypes, 1, 1, new Set(), 1)
})()

  $: _waAvgTotal = (() => {
    if (!selectedWA.avgTotalHits || !_waTyped || _waTyped.length === 0) return null
    const starsPerType = selectedWA.avgTotalHits / _waTyped.length
    const baseTotal = _waTyped.reduce((sum, hit) => {
      const hitTypeSum = hit.types.reduce((s, t) => s + t.val, 0)
      return sum + hitTypeSum * starsPerType * hit.count
    }, 0)
    return {
      starsPerType: Math.round(starsPerType * 10000) / 10000,
      total: selectedWA.avgTotalHits,
      baseTotal: Math.round(baseTotal * 10000) / 10000,
    }
  })()

  $: _waScalingDiffers = _waScalingMult !== _scalingMult
  $: _showWACol = !!_waHitsSeq || !!selectedWA.baseDamage || !!_waSummonDef


  function parseRangeDamage(s: string): { min: number; minLabel: string; max: number; maxLabel: string } | null {
    const m = s.match(/([\d.]+)\s*(?:\(([^)]+)\))?\s*[–—]\s*([\d.]+)\s*(?:\(([^)]+)\))?/)
    if (!m) return null
    return { min: parseFloat(m[1]), minLabel: m[2] ?? '', max: parseFloat(m[3]), maxLabel: m[4] ?? '' }
  }

  $: _waRangeDamage = (() => {
    if (_waHitsSeq !== null || !selectedWA.baseDamage) return null
    return parseRangeDamage(selectedWA.baseDamage)
  })()

  interface RangeEnd { label: string; val: number; color: string; rageApplied?: boolean; }

  $: _waRangeTyped = (() => {
    if (!_waRangeDamage || Object.keys(_waDmgTypes).length === 0) return null
    const { min, minLabel, max, maxLabel } = _waRangeDamage
    const toEnds = (base: number): RangeEnd[] =>
      Object.entries(_waDmgTypes).map(([k, mult]) => ({
        label: k.charAt(0).toUpperCase() + k.slice(1),
        val: Math.round(base * mult * 10000) / 10000,
        color: DMG_TYPE_COLORS[k] ?? '#e8e4da',
      }))
    return { minEnds: toEnds(min), minLabel, maxEnds: toEnds(max), maxLabel }
  })()

  let weaponCharge = 100

  $: selectedWeaponData = WEAPON_BASE_DMG.find(w => w.type === (_gunOverlay?.type ?? _baseWeaponType))

  function applyWeaponCharge(dmg: number) {
    if (!selectedWeaponData?.m2Charge?.enabled) {
      return dmg
    }
    return selectedWeaponData.m2Charge.formula(dmg, weaponCharge)
  }

  $: maxSummons = calcMaxSummonCount(perks);
  $: _activeRuneDmgDef = RUNE_DMG_DEFS.find(d => d.runeName === $build.rune) ?? null
  $: runePotency = _activeRuneDmgDef?.maxPotency ?? 0
  $: _runeSliderVal = _activeRuneDmgDef?.slider
    ? ((($build as any)[_activeRuneDmgDef.slider.buildKey] ?? 0) as number)
    : 0
    
  $: _runeSliderMax = _activeRuneDmgDef?.slider
    ? (_activeRuneDmgDef.slider.getMax ? _activeRuneDmgDef.slider.getMax({ perks }) : _activeRuneDmgDef.slider.max)
    : 0
    
  $: if (_activeRuneDmgDef?.slider && _runeSliderVal > _runeSliderMax) {
    const sliderDef = _activeRuneDmgDef.slider
    build.update(s => ({ ...s, [sliderDef.buildKey]: _runeSliderMax }) as any)
  }

  // ── Mount Runes (override M1 + WA while riding) ──────────────────────────
  $: _activeMountRuneDef = MOUNT_RUNE_DEFS.find(d => d.runeName === $build.rune) ?? null
  let mountActive = true
  $: if (!_activeMountRuneDef && mountActive) mountActive = false
  $: if ((perks['Rider'] ?? 0) > 0) {
    const hasRider = disabledBoosts.has('Rider')
    if (!mountActive && !hasRider) {
      disabledBoosts = new Set([...disabledBoosts, 'Rider'])
    } else if (mountActive && hasRider) {
      const next = new Set(disabledBoosts)
      next.delete('Rider')
      disabledBoosts = next
    }
  }
  $: _visibleDmgEntries = _adjustedDmgEntries.filter(e =>
    (e.sourceName !== 'Rider' || mountActive) && e.sourceName !== 'Frenzy' && e.sourceName !== 'Curse Rip' && e.sourceName !== 'Reaper' && e.sourceName !== 'True Balance'
  )

  // ── Perk Base Damage ───────────────────────────────────────────────────────
  let springblastFinisherHits = 1

  /** Total hit count in the current weapon's M2 (used as finisher hits context) */
  $: _m2FinisherHits = (() => {
    if (!_displayRows.length || !_displayRows[0].m2) return 1
    return _displayRows[0].m2.reduce(
      (s: number, h: any) => s + (typeof h === 'number' ? 1 : (h.count ?? 1)), 0
    )
  })()

  /** Hit count of the last element in M1 (M1 finisher) */
  $: _m1FinisherHits = (() => {
    if (!_displayRows.length || !_displayRows[0].m1) return 1
    const m1 = _displayRows[0].m1
    const last = m1[m1.length - 1]
    return typeof last === 'number' ? 1 : (last.count ?? 1)
  })()

  function _computePerkScalingMult(scalingDef: Record<string, number>): number {
    let total = 0
    for (const [key, val] of Object.entries(scalingDef)) {
      const boostKey = SCALING_TO_BOOST[key]
      if (!boostKey) continue
      const statVal = (stats as Record<string, number>)[boostKey] ?? 0
      if (PERCENT_STATS.has(boostKey)) {
        total += val * statVal / 100
      } else {
        total += val * statVal
      }
    }
    return 1 + total
  }

  interface PerkDmgComputedEntry {
    perkName: string
    displayName: string
    perkAmount: number
    condition?: string
    hits?: number
    isM1?: boolean; isM2?: boolean; isFinisher?: boolean;     isWA?: boolean; isRune?: boolean; isRider?: boolean
    guardbreak?: boolean
    canProc?: boolean
    note?: string
    typedHits_m2:  Array<{ rawVal: number; val: number; color: string; label: string; rageApplied?: boolean }>
    typedHits_m1f: Array<{ rawVal: number; val: number; color: string; label: string; rageApplied?: boolean }>
    scalingMult: number
    combatMult: number
    resolvedDmgTypes: Record<string, number>
    baseDmgTypes: Record<string, number>
    resolvedScalings: Record<string, number>
    dmgTypeMode: 'weapon' | 'fixed' | 'dynamic'
    isActive: boolean
    secondaryEffects: Array<{ label: string; display: string; condition?: string; color: string; isActive: boolean }>
  }

  $: _activePerkDmgEntries = (() => {
    const out: PerkDmgComputedEntry[] = []
    for (const def of PERK_DMG_DEFS) {
      const perkAmount = perks[def.perkName] ?? 0
      if (perkAmount <= 0) continue
      if (def.activeIf && !def.activeIf({ draconicRuneInfusion: $build.draconicRuneInfusion, draconicColor: $build.draconicColor })) continue

      const hitType: BoostAttackType = def.isWA   ? 'wa'
                      : def.isRune ? 'rune'
                      : (def.isM2 || def.isFinisher) ? 'm2'
                      : def.isM1  ? 'm1'
                      : 'perk'
      const combatMult = _categoryMult(hitType, def.canProc !== false)

      const baseDmgTypes = def.dmgTypeMode === 'weapon'
        ? _weaponDmgTypes
        : def.dmgTypeMode === 'dynamic'
          ? (def.getDmgTypes?.({ draconicColor: $build.draconicColor }) ?? {})
          : (def.dmgTypes ?? {})

      // Apply Draconic Runes + Dragon Infusion bonuses to rune damage
      const baseResolvedDmgTypes = def.isRune
        ? _applyDmgBonuses(
            applyDraconicBonuses(baseDmgTypes, {
              draconicRunesStacks: perks['Draconic Runes'] ?? 0,
              draconicColor: $build.draconicColor || 'physical',
            }, {
              isActive: $build.draconicRuneInfusion === 'infusion',
              buffPotency: getEffectiveDraconicInfusionPotency($build.guild, $build.draconicRuneInfusion, $build.draconicColor || 'physical', perks['Draconic Blood'] ?? 0, perks),
              draconicColor: $build.draconicColor || 'physical',
            }),
            _perkDmgTypeBonuses
          )
        : _applyDmgBonuses(baseDmgTypes, _perkDmgTypeBonuses)
      const resolvedDmgTypes = applyAirToMagicConversion(baseResolvedDmgTypes, _spiritWindsConversionRate, _darkMagicHexBonus)

      // Store base damage types without Draconic Runes bonus for self damage calculation
      const baseDmgTypesForSelfDmg = def.isRune ? baseDmgTypes : baseResolvedDmgTypes

      const resolvedScalings = def.scalingMode === 'weapon'
        ? _weaponResult?.scalings ?? {}
        : def.scalingMode === 'fixed'
          ? (def.scalings ?? {})
          : def.scalingMode === 'dynamic'
            ? (def.getScalings?.({ draconicColor: $build.draconicColor, perkAmount }) ?? {})
            : {}

      const scalingMult = Object.keys(resolvedScalings).length > 0
        ? _computePerkScalingMult(resolvedScalings)
        : 1

      const buildTypedHits = (baseDmg: number) =>
      Object.entries(resolvedDmgTypes).map(([k, mult]) => ({
        rawVal: roundMultiplier(baseDmg),
        val: roundMultiplier(baseDmg * mult),
        color: DMG_TYPE_COLORS[k] ?? '#e8e4da',
        label: k.charAt(0).toUpperCase() + k.slice(1),
      }))

      const _fhM2  = def.perkName === 'Springblast' ? springblastFinisherHits : _m2FinisherHits
      const _fhM1f = def.perkName === 'Springblast' ? springblastFinisherHits : _m1FinisherHits
      const baseDmg_m2  = def.getBaseDamage({ perkAmount, finisherHits: _fhM2,  draconicColor: $build.draconicColor })
      const baseDmg_m1f = def.getBaseDamage({ perkAmount, finisherHits: _fhM1f, draconicColor: $build.draconicColor })

      const isActive = isHpGateActive(def.hpGate, _hpFillPct, perkAmount)

      const secondaryEffects = (def.secondaryEffects ?? []).filter(se => !se.showIf || se.showIf({ draconicColor: $build.draconicColor })).map(se => {
        let raw = Math.round(se.getValue({ perkAmount, draconicColor: $build.draconicColor }) * 1000) / 1000
        
        if (se.tone === 'defense') {
          let potMult = 1
          const bastionStacks = perks['Bastion Bless'] ?? 0
          if (bastionStacks > 0) {
            potMult += 0.1 * bastionStacks
          }
          const _infActive = $build.draconicRuneInfusion === 'infusion'
          const color = $build.draconicColor
          if (_infActive && color === 'holy') {
            const _infPerkAmt = perks['Draconic Blood'] ?? 0
            potMult *= 1 + _infPerkAmt * 0.05
          }
          raw = Math.round(raw * potMult * 1000) / 1000
        }
        
        return {
          label: se.label,
          display: (se.format ?? String)(raw),
          condition: se.condition,
          color: SECONDARY_TONE_COLORS[se.tone ?? 'utility'],
          isActive: isHpGateActive(se.hpGate, _hpFillPct, perkAmount),
        }
      })

      out.push({
        perkName: def.perkName,
        displayName: def.label ?? def.perkName,
        perkAmount,
        condition: def.condition,
        hits: def.getHits ? def.getHits({ perkAmount }) : def.hits,
        isM1: def.isM1, isM2: def.isM2, isFinisher: def.isFinisher,
        isWA: def.isWA, isRune: def.isRune, isRider: def.isRider, guardbreak: def.guardbreak,
        canProc: def.canProc,
        note: def.note,
        typedHits_m2: buildTypedHits(baseDmg_m2),
        typedHits_m1f: buildTypedHits(baseDmg_m1f),
        scalingMult,
        combatMult,
        resolvedDmgTypes,
        baseDmgTypes: baseDmgTypesForSelfDmg,
        resolvedScalings,
        dmgTypeMode: def.dmgTypeMode,
        isActive,
        secondaryEffects,
      })
    }
    return out
  })()
  $: _draconicBloodEntry = _activePerkDmgEntries.find(e => e.perkName === 'Draconic Blood' && !draconicInfusionDisabled) ?? null
  $: _nonDraconicPerkEntries = _activePerkDmgEntries.filter(e => e.perkName !== 'Draconic Blood')
  $: _draconicInfusionDisplay = (() => {
    const raw = getDraconicInfusionBuff($build.guild, $build.draconicRuneInfusion, $build.draconicColor, $result.perks['Draconic Blood'] ?? 0)
    if (raw.length === 0) return null
    const [modified] = applyBuffPerkModifiers(raw, $result.perks, $build.rune || undefined)
    return modified
  })()
  interface BDCHit {
    group: string
    index: number
    count: number
    base: number
    scalingMult: number
    combatMult: number
    isFinisher: boolean
    dmgTypes: Record<string, number>
    baseDmgTypes?: Record<string, number>
    label?: string
    isHeal?: boolean
    isM1?: boolean
    isM2?: boolean
    forceCrit?: boolean
    dmgTypeCombatMults?: Record<string, number>
    dmgTypeIsHeal?: Record<string, boolean>
    dmgTypeIsCritExempt?: Record<string, boolean>
    canProc?: boolean
  }

  $: _bdcWeaponHits = (() => {
    void weaponCharge
    const result: BDCHit[] = []
    const row = _displayRows[0]
    if (row && Object.keys(_weaponDmgTypes).length > 0) {
      const gunLabel = (row as any).gunLabel as string | undefined
      const m1Types = (gunLabel && !(row as any).m2Only)   ? _gunDmgTypes : _convertedWeaponDmgTypes
      const m2Types = (gunLabel && !(row as any).m2NoLock) ? _gunDmgTypes : _convertedWeaponDmgTypes
      if (row.m1 && !(_activeMountRuneDef && mountActive)) {
        row.m1.forEach((h: any, i: number) => {
          const base = typeof h === 'number' ? h : h.n
          const count = typeof h === 'number' ? 1 : h.count
          const finisherHit = isFinisher(row, 'm1', i)
          const wb = finisherHit ? _m1FinisherWeaponBoost : null
          result.push({
            group: 'M1', index: i, count, base, scalingMult: _scalingMult, combatMult: _m1CombatMult,
            isFinisher: finisherHit, dmgTypes: m1Types,
            baseDmgTypes: _weaponDmgTypesBase,
            ...(wb && wb.mult !== 1 ? { weaponBoostMult: wb.mult, weaponBoostLabel: wb.labels.join(', ') } : {}),
          })
        })
      }
      if (row.m2 && !(_activeMountRuneDef && mountActive)) {
        row.m2.forEach((h: any, i: number) => {
          const rawBase = typeof h === 'number' ? h : h.n
          const count = typeof h === 'number' ? 1 : h.count
          const base = applyWeaponCharge(rawBase)
          result.push({
            group: 'M2', index: i, count, base, scalingMult: _scalingMult, combatMult: _m2CombatMult,
            isFinisher: true, dmgTypes: m2Types,
            baseDmgTypes: _weaponDmgTypesBase,
            ...(_m2WeaponBoost.mult !== 1 ? { weaponBoostMult: _m2WeaponBoost.mult, weaponBoostLabel: _m2WeaponBoost.labels.join(', ') } : {}),
          })
        })
      }
    }
    if (_activeMountRuneDef && mountActive) {
        const m1Def = _activeMountRuneDef.m1
        const _mountM1DmgTypes = applyAirToMagicConversion(
          _applyDmgBonuses(
            applyDraconicBonuses(m1Def.getDmgTypes(), {
              draconicRunesStacks: perks['Draconic Runes'] ?? 0,
              draconicColor: $build.draconicColor || 'physical',
            }, {
              isActive: $build.draconicRuneInfusion === 'infusion',
              buffPotency: getEffectiveDraconicInfusionPotency($build.guild, $build.draconicRuneInfusion, $build.draconicColor || 'physical', perks['Draconic Blood'] ?? 0, perks),
              draconicColor: $build.draconicColor || 'physical',
            }),
            _perkDmgTypeBonuses
          ),
          _spiritWindsConversionRate,
          _darkMagicHexBonus
        )
        result.push({
          group: 'M1', index: 0, count: 1,
          base: m1Def.getBaseDamage(),
          scalingMult: _computePerkScalingMult(m1Def.getScalings()),
          combatMult: _runeCombatMult,
          isFinisher: false,
          dmgTypes: _mountM1DmgTypes,
          label: `${_activeMountRuneDef.mountLabel} (Mounted)`,
        })
        if (m1Def.healFlat) {
          result.push({
            group: 'M1', index: 1, count: 1,
            base: m1Def.healFlat,
            scalingMult: 1,
            combatMult: _healFinalMultiplierNoLevel,
            isFinisher: false,
            dmgTypes: { heal: 1.0 },
            label: `${_activeMountRuneDef.mountLabel} Heal`,
            isHeal: true,
          })
        }
    }
    if (_waHitsSeq && Object.keys(_waDmgTypes).length > 0 && !(_activeMountRuneDef && mountActive)) {
      _waHitsSeq.forEach((h, i) => {
        const hss = selectedWA.hitScalings?.[Math.min(i, (selectedWA.hitScalings?.length ?? 1) - 1)]
        let sc = _waScalingMult
        if (hss && hss !== 'Same as weapon') {
          const re = /([\d.]+)\s*(Physical|Magic|Fire|Water|Earth|Air|Hex|Holy|Dex(?:terity)?|Summon)/gi
          let t = 0, m: RegExpExecArray | null
          while ((m = re.exec(hss)) !== null)
            t += parseFloat(m[1]) * ((stats as Record<string,number>)[(/dex/i.test(m[2]) ? 'dexterity' : m[2].toLowerCase()) + 'Boost'] ?? 0)
          sc = 1 + t / 100
        } else if (hss === 'Same as weapon') sc = _scalingMult
        const hitDt = selectedWA.hitDamageTypes?.length
         ? (() => {
             const _hdt = selectedWA.hitDamageTypes[Math.min(i, selectedWA.hitDamageTypes.length - 1)]
             return _hdt === 'Same as weapon'
               ? _applyDmgBonuses({ ..._convertedWeaponDmgTypes }, _waOnlyBonuses)
               : applyAirToMagicConversion(_resolveHitDmgTypes(_hdt, _weaponDmgTypes, _waDmgTypeBonuses), _spiritWindsConversionRate, _darkMagicHexBonus)
           })()
         : _waDmgTypes
         
        const hitDtBase = selectedWA.hitDamageTypes?.length
         ? _resolveHitDmgTypesBase(selectedWA.hitDamageTypes[Math.min(i, selectedWA.hitDamageTypes.length - 1)], _weaponDmgTypesBase)
         : _waDmgTypesBase
         
        result.push({
          group: 'WA', index: i, count: h.count, base: h.n, scalingMult: sc, combatMult: _waCombatMult,
          isFinisher: selectedWA.hits?.[i]?.isFinisher ?? false, dmgTypes: hitDt,
          baseDmgTypes: hitDtBase, label: selectedWA.name,
          ...(selectedWA.hits?.[i]?.isCrit ? { forceCrit: true } : {}),
        })
      })
    }
    if (_waHealSeq && !(_activeMountRuneDef && mountActive)) {
      _waHealSeq.forEach((h) => {
        result.push({
          group: 'WA',
          index: result.length,
          count: h.count,
          base: h.n,
          scalingMult: _waScalingMult,
          combatMult: _healFinalMultiplier,
          isFinisher: false,
          dmgTypes: { heal: 1.0 },
          label: selectedWA.name,
          isHeal: true,
        })
      })
    }

    if (_activeMountRuneDef && mountActive) {
      const waDef = _activeMountRuneDef.wa
      const waScalingMult = _computePerkScalingMult(waDef.getScalings())
      const baseWaDmgTypes = _applyDmgBonuses(
        applyDraconicBonuses(waDef.getDmgTypes(), {
          draconicRunesStacks: perks['Draconic Runes'] ?? 0,
          draconicColor: $build.draconicColor || 'physical',
        }, {
          isActive: $build.draconicRuneInfusion === 'infusion',
          buffPotency: getEffectiveDraconicInfusionPotency($build.guild, $build.draconicRuneInfusion, $build.draconicColor || 'physical', perks['Draconic Blood'] ?? 0, perks),
          draconicColor: $build.draconicColor || 'physical',
        }),
        _perkDmgTypeBonuses
      )
      const waDmgTypes = applyAirToMagicConversion(
        _emotionalHexBonus > 0
          ? { ...baseWaDmgTypes, hex: Math.round(((baseWaDmgTypes.hex ?? 0) + _emotionalHexBonus) * 10000) / 10000 }
          : baseWaDmgTypes,
        _spiritWindsConversionRate,
        _darkMagicHexBonus
      )
      for (const h of waDef.getHits()) {
        const base = typeof h === 'number' ? h : h.n
        const count = typeof h === 'number' ? 1 : h.count
        result.push({
          group: 'WA', index: result.length, count,
          base,
          scalingMult: waScalingMult,
          combatMult: _waCombatMult,
          isFinisher: false,
          dmgTypes: waDmgTypes,
          label: `${_activeMountRuneDef.mountLabel} WA (Mounted)`,
        })
      }
    }

    for (const entry of _activePerkDmgEntries) {
      if (!entry.isActive) continue 
      if (entry.isRider) continue 

      // Check for heal effects from Draconic Blood abilities
      if (entry.perkName === 'Draconic Blood') {
         const _color = $build.draconicColor
         const healSe = (PERK_DMG_DEFS.find(d => d.perkName === 'Draconic Blood' && d.label === entry.displayName)
           ?.secondaryEffects ?? []).find(se =>
             (_color === 'holy'  && se.label === 'Base Heal (Holy)') ||
             (_color === 'water' && se.label === 'Base Heal (Water)')
           )
         
         if (healSe) {
           const baseHeal = healSe.getValue({ perkAmount: entry.perkAmount, draconicColor: _color })
           const colorScaling = _computePerkScalingMult({ [_color]: 1.0 })
           
           result.push({
             group: 'Rune',
             index: result.length,
             count: 1,
             base: baseHeal,
             scalingMult: colorScaling,
             combatMult: _healFinalMultiplier,
             isFinisher: false,
             dmgTypes: { heal: 1.0 },
             label: `${entry.displayName} Heal`,
             isHeal: true,
           })
         }
      }

      // Add damage if available
      if (entry.typedHits_m2.length === 0) continue
      
      const _colorMult = entry.perkName === 'Draconic Blood'
        ? getDraconicColorDmgMultiplier($build.draconicColor)
        : 1
      const _rawBase = entry.typedHits_m2[0].rawVal
      const _preColorBase = _rawBase

      result.push({
        group: entry.perkName === 'Draconic Blood' ? 'Rune' : 'Perk',
        index: result.length,
        count: entry.perkName === 'Springblast' ? springblastFinisherHits : (entry.hits ?? 1),
        base: _preColorBase,
        scalingMult: entry.scalingMult,
        combatMult: entry.combatMult,
        isFinisher: entry.isFinisher ?? false,
        dmgTypes: entry.resolvedDmgTypes,
        baseDmgTypes: entry.baseDmgTypes,
        label: entry.displayName,
        isM1: entry.isM1,
        isM2: entry.isM2,
        canProc: entry.canProc,
        ...(_colorMult !== 1 ? {
          weaponBoostMult: _colorMult,
          weaponBoostLabel: `${$build.draconicColor.charAt(0).toUpperCase()}${$build.draconicColor.slice(1)} Color Bonus`,
        } : {}),
      })
    }

    if (_activeRuneDmgDef && Object.keys(_activeRuneDmgDef.dmgTypes).length > 0) {
      const _runeIsHeal = _activeRuneDmgDef.isHealOnly ?? false
      const _runeDmgTypesWithBonus = _runeIsHeal
        ? _activeRuneDmgDef.dmgTypes
        : applyAirToMagicConversion(
            _applyDmgBonuses(
              applyDraconicBonuses(_activeRuneDmgDef.dmgTypes, {
                draconicRunesStacks: perks['Draconic Runes'] ?? 0,
                draconicColor: $build.draconicColor || 'physical',
              }, {
                isActive: $build.draconicRuneInfusion === 'infusion',
                buffPotency: getEffectiveDraconicInfusionPotency($build.guild, $build.draconicRuneInfusion, $build.draconicColor || 'physical', perks['Draconic Blood'] ?? 0, perks),
                draconicColor: $build.draconicColor || 'physical',
              }),
              _perkDmgTypeBonuses
            ),
            _spiritWindsConversionRate,
            _darkMagicHexBonus
          )
      result.push({
        group: 'Rune',
        index: result.length,
        count: _activeRuneDmgDef.getHits
          ? _activeRuneDmgDef.getHits({ potency: runePotency, sliderVal: _runeSliderVal, stats, perks, selfDamage: _runeSelfDamagePerHit })
          : (_activeRuneDmgDef.hits ?? 1),
        base: _activeRuneDmgDef.getBaseDamage({ potency: runePotency, sliderVal: _runeSliderVal }),
        scalingMult: _computePerkScalingMult(_activeRuneDmgDef.scalings),
        dmgTypes: _runeDmgTypesWithBonus,
        combatMult: _runeIsHeal ? _healFinalMultiplier : _runeCombatMult,
        isFinisher: false,
        label: _activeRuneDmgDef.runeName,
        isHeal: _runeIsHeal,
      })
    }

    // Water draconic color pulse heal (Dragon Infusion)
    if ($build.draconicRuneInfusion === 'infusion' && $build.draconicColor === 'water' && (perks['Draconic Blood'] ?? 0) > 0) {
      const perkAmount = perks['Draconic Blood'] ?? 0
      const pulseInterval = Math.max(1, 8 - perkAmount)
      const waterScaling = _computePerkScalingMult({ water: 1.0 })
      result.push({
        group: 'Rune',
        index: result.length,
        count: 1,
        base: 0.1,
        scalingMult: waterScaling,
        dmgTypes: { heal: 1.0 },
        combatMult: _healFinalMultiplier,
        isFinisher: false,
        label: `Water Pulse (every ${pulseInterval}s)`,
        isHeal: true,
      })
    }
    if (_waveRiderAmt > 0) {
      const wrScaling = _computePerkScalingMult({ water: 1.0 })
      result.push({
        group: 'Perk', index: result.length, count: 1, base: 40, scalingMult: wrScaling, combatMult: _perkCombatMult,
        isFinisher: false, dmgTypes: { water: 1.0, heal: 0.2 }, baseDmgTypes: { water: 1.0 },
        dmgTypeCombatMults: { heal: _healFinalMultiplier },
        dmgTypeIsHeal: { heal: true },
        dmgTypeIsCritExempt: { heal: true },
        label: 'Wave Rider (M2)',
      })
      result.push({
        group: 'Perk', index: result.length, count: 1, base: 35, scalingMult: wrScaling, combatMult: _perkCombatMult,
        isFinisher: false, dmgTypes: { water: 1.0, heal: 0.2 }, baseDmgTypes: { water: 1.0 },
        dmgTypeCombatMults: { heal: _healFinalMultiplier },
        dmgTypeIsHeal: { heal: true },
        dmgTypeIsCritExempt: { heal: true },
        label: 'Wave Rider (WA)',
      })
    }
    if (_oceanSongAmt > 0) {
      const osScaling = _computePerkScalingMult({ water: 1.0, dexterity: 1.0 })
      const baseHeal = (1 + 0.1 * _oceanSongAmt) * (1 + selectedWA.cooldown / 30)
      result.push({
        group: 'Perk', index: result.length, count: 1, base: baseHeal, scalingMult: osScaling, combatMult: _healFinalMultiplier,
        isFinisher: false, dmgTypes: { heal: 1.0 }, label: 'Ocean Song', isHeal: true,
      })
    }
    return result
  })()

  const SELF_DAMAGE_APPLIES_TO_GROUP: Record<string, 'WA' | 'Rune'> = { wa: 'WA', rune: 'Rune' }

  let enemiesHit = 1
  $: if (!Number.isFinite(enemiesHit) || enemiesHit < 1) enemiesHit = 1

  function _sumPreBoostHitDamage(hits: BDCHit[], group: 'WA' | 'Rune', label?: string): number {
    return hits
      .filter(h => h.group === group && !h.isHeal && (label === undefined || h.label === label))
      .reduce((sum, h) => {
        const dmgTypesForCalc = h.baseDmgTypes ?? h.dmgTypes
        const typeMultSum = Object.values(dmgTypesForCalc).reduce((s, m) => s + m, 0)
        return sum + h.base * typeMultSum * h.scalingMult * _levelMult * h.count
      }, 0)
  }

  $: _defenseMultipliers = (() => {
    const mults: Record<string, number> = {}
    for (const row of _defenseRows) {
      mults[row.type] = row.finalMultiplier
    }
    return mults
  })()
  $: _defenseMultipliersNoBark = (() => {
    const mults: Record<string, number> = {}
    for (const row of _defenseRows) {
      let mult = row.finalMultiplier
      for (const s of row.percentSources) {
        if (s.name === 'Cursed Bark') mult /= s.mult
      }
      for (const s of row.flatSources) {
        if (s.name === 'Cursed Bark') mult /= s.mult
      }
      mults[row.type] = roundMultiplier(mult)
    }
    return mults
  })()

  $: _runeSelfDamagePerHit = (() => {
    const undeadMightAmt = perks['Undead Might'] ?? 0
    if (undeadMightAmt <= 0 || !_activeRuneDmgDef) return 0

    const base = _activeRuneDmgDef.getBaseDamage({ potency: runePotency, sliderVal: _runeSliderVal })
    const scalingMult = _computePerkScalingMult(_activeRuneDmgDef.scalings)
    const typeMultSum = Object.values(_activeRuneDmgDef.dmgTypes).reduce((s, m) => s + m, 0)
    const perHitDmg = base * typeMultSum * scalingMult * _levelMult

    const selfDmgPct = 1 / 15
    const drMult = 1 / (1 + (15 * undeadMightAmt) / 100)

    let harmonic = 0
    for (let i = 1; i <= enemiesHit; i++) {
      harmonic += 1 / i
    }

    const sDef = SELF_DAMAGE_PERK_DEFS.find(d => d.perkName === 'Undead Might')
    let defMult = 0
    if (sDef) {
      for (const [type, mult] of Object.entries(sDef.dmgTypes)) {
        defMult += mult * (_defenseMultipliersNoBark[type] ?? 1)
      }
    }
    return perHitDmg * selfDmgPct * drMult * harmonic * defMult
  })()

  interface SelfDamageSourceEntry {
    def: SelfDamagePerkDef
    amount: number
    group: 'WA' | 'Rune'
    label: string
    result: { total: number; byType: Record<string, number> }
  }

  $: _selfDamageSources = (() => {
    const sources: SelfDamageSourceEntry[] = []
    for (const def of SELF_DAMAGE_PERK_DEFS) {
      const amount = perks[def.perkName] ?? 0
      if (amount <= 0) continue

      for (const key of def.appliesTo) {
        const group = SELF_DAMAGE_APPLIES_TO_GROUP[key]
        if (!group) continue

        if (group === 'WA') {
          const waLabels = [
            ...new Set(
              _bdcWeaponHits
                .filter(h => h.group === 'WA' && !h.isHeal)
                .map(h => h.label ?? selectedWA.name)
            )
          ]
          for (const label of waLabels) {
            const preBoostDmg = _sumPreBoostHitDamage(_bdcWeaponHits, 'WA', label)
            if (preBoostDmg <= 0) continue
            const result = calcSelfDamage(def, amount, preBoostDmg, enemiesHit, _defenseMultipliersNoBark)
            sources.push({ def, amount, group, label, result })
          }
        } else if (group === 'Rune') {
          const mountM1Dmg = (_activeMountRuneDef && mountActive)
            ? _bdcWeaponHits
                .filter(h => h.group === 'M1' && !h.isHeal)
                .reduce((sum, h) => {
                  const dmgTypesForCalc = h.baseDmgTypes ?? h.dmgTypes
                  const typeMultSum = Object.values(dmgTypesForCalc).reduce((s, m) => s + m, 0)
                  return sum + h.base * typeMultSum * h.scalingMult * _levelMult * h.count
                }, 0)
            : 0
          if (mountM1Dmg > 0) {
            const result = calcSelfDamage(def, amount, mountM1Dmg, enemiesHit, _defenseMultipliersNoBark)
            sources.push({ def, amount, group, label: `${_activeMountRuneDef!.mountLabel} M1 (Mounted)`, result })
          }
          const runeLabels = [...new Set(_bdcWeaponHits.filter(h => h.group === 'Rune' && !h.isHeal).map(h => h.label))]
          for (const label of runeLabels) {
            const preBoostDmg = _sumPreBoostHitDamage(_bdcWeaponHits, 'Rune', label)
            if (preBoostDmg <= 0) continue
            const result = calcSelfDamage(def, amount, preBoostDmg, enemiesHit, _defenseMultipliersNoBark)
            sources.push({ def, amount, group, label: label ?? 'Rune', result })
          }
        }
      }
    }
    return sources
  })()

</script>

<div class="da-root">
  <!-- ══════════════════ TOP ROW: CRIT + APEN ══════════════════ -->
  <div class="da-top-row">

    <!-- Crit column -->
    <div class="da-section da-section--crit">
      <div class="da-section-title"><CritIcon size={13}/> Crit Statistics</div>
      <div class="da-crit-grid">

        <div class="da-stat-card da-stat-card--crit">
          <div class="da-stat-label"><CritIcon size={12}/> Crit Chance</div>
          <div class="da-stat-val" style="color:#e2b203">{crit.effectiveCritChance.toFixed(1)}%</div>
          {#if allCritSources.length > 0}
            <div class="da-sources">
              {#each allCritSources as s}
                <div class="da-source-row">
                  <span class="da-source-name">{s.source}</span>
                  <span class="da-source-val" style="color:{s.isExtra ? '#f59e0b' : '#e2b203'}">
                    +{s.amount.toFixed(2)}%
                  </span>
                </div>
              {/each}
              {#if crit.critFormula}
                <div class="da-source-formula">{crit.critFormula}</div>
              {/if}
            </div>
          {:else}
            <div class="da-empty-hint">No crit sources</div>
          {/if}
        </div>

        <div class="da-stat-card da-stat-card--critdmg">
          <div class="da-stat-label">Crit Damage Multiplier</div>
          <div class="da-stat-val" style="color:#a78bfa">{crit.critDamageMultiplier.toFixed(1)}%</div>
          <div class="da-sources">
            {#each critDmgSources as s}
              <div class="da-source-row">
                <span class="da-source-name">{s.source}</span>
                <span class="da-source-val" style="color:{s.amount < 0 ? '#f87171' : '#a78bfa'}">
                  {s.source === 'Base' ? '' : s.amount >= 0 ? '+' : ''}{s.amount.toFixed(s.source === 'Base' ? 0 : 2)}%
                </span>
              </div>
            {/each}
          </div>
        </div>

      </div>
    </div>

    <!-- Armor Pen column -->
    {#if (stats as Record<string, number>).armorPenetration}
      <div class="da-section da-section--apen">
        <div class="da-section-title">🛡 Armor Penetration</div>
        <div class="da-apen-inner">
          <span class="da-apen-val">{Math.round((stats as Record<string, number>).armorPenetration * 100) / 100}</span>
        </div>
      </div>
    {/if}

  </div>

<!-- ══════════════════ COMBAT MULTIPLIERS ══════════════════ -->
<div class="da-section">
  <div class="da-section-title">⚔ Combat Multipliers</div>
    {#if !_hasSpecificBoosts}
      <div class="da-boost-row">
        {#each [..._visibleDmgEntries, ..._syntheticDmgBoostEntries] as entry}
          {@const _venomEaterDisabled = entry.sourceName === 'Venom Eater' && (!showCritValues || !_dummyHasPoisonActive)}
          {@const disabled = disabledBoosts.has(entry.sourceName) || (entry.sourceName === 'Spirit Winds' && _effectiveTailwindPotency <= 0) || (entry.sourceName === 'Curse Rip' && disableCurseRip) || (entry.sourceName === 'Reaper' && disableReaper) || _venomEaterDisabled}
          {@const effectiveMultiplier = disabled ? 1 : entry.rawMultiplier}
          <button
            class="da-boost-chip"
            class:da-boost-chip--lvl={entry.sourceName === 'Level Damage'}
            class:da-boost-chip--off={disabled}
            title={entry.condition ?? ''}
            on:click={() => {
              if (entry.sourceName === 'Spirit Winds' && _effectiveTailwindPotency <= 0) return
              if (_venomEaterDisabled) return
              if (entry.sourceName === 'Curse Rip') disableCurseRip = !disableCurseRip
              else if (entry.sourceName === 'Reaper') disableReaper = !disableReaper
              else toggleBoost(entry.sourceName)
            }}
          >
            <span class="da-bc-name">
              {entry.sourceName === 'Level Damage' ? `LV${$build.level ?? 80}` : entry.sourceName}
            </span>
            <span class="da-bc-val">{disabled ? '—' : `×${+entry.rawMultiplier.toFixed(4)}`}</span>
            {#if entry.condition}<span class="da-bc-cond">{entry.condition}</span>{/if}
            <span class="da-bc-toggle">{disabled ? 'OFF' : 'ON'}</span>
          </button>
          <span class="da-chain-op">×</span>
        {/each}
        <span class="da-chain-result" class:da-chain-result--dimmed={hasDisabledVisible}>
          = ×{+activeFinalMultRounded.toFixed(4)}
          {#if hasDisabledVisible}
            <span class="da-chain-orig">/{+boosts.dmgFinalMultiplier.toFixed(4)}</span>
          {/if}
        </span>
      </div>
    {:else}
      <div class="da-boost-split">
        <div class="da-boost-universal">
          {#each _allUniversalChips as entry}
            {@const _venomEaterDisabled = entry.sourceName === 'Venom Eater' && (!showCritValues || !_dummyHasPoisonActive)}
            {@const disabled = disabledBoosts.has(entry.sourceName) || (entry.sourceName === 'Spirit Winds' && _effectiveTailwindPotency <= 0) || (entry.sourceName === 'Curse Rip' && disableCurseRip) || (entry.sourceName === 'Reaper' && disableReaper) || _venomEaterDisabled}
            <button
              class="da-boost-chip"
              class:da-boost-chip--lvl={entry.sourceName === 'Level Damage'}
              class:da-boost-chip--off={disabled}
              title={entry.condition ?? ''}
              on:click={() => {
                if (entry.sourceName === 'Spirit Winds' && _effectiveTailwindPotency <= 0) return
                if (_venomEaterDisabled) return
                if (entry.sourceName === 'Curse Rip') disableCurseRip = !disableCurseRip
                else if (entry.sourceName === 'Reaper') disableReaper = !disableReaper
                else toggleBoost(entry.sourceName)
              }}
            >
              <span class="da-bc-name">
                {entry.sourceName === 'Level Damage' ? `LV${$build.level ?? 80}` : entry.sourceName}
              </span>
              <span class="da-bc-val">{disabled ? '—' : `×${+entry.rawMultiplier.toFixed(4)}`}</span>
              {#if entry.condition}<span class="da-bc-cond">{entry.condition}</span>{/if}
              <span class="da-bc-toggle">{disabled ? 'OFF' : 'ON'}</span>
            </button>
            <span class="da-chain-op">×</span>
          {/each}
        </div>
        <div class="da-boost-cats">
          {#each _catGroups as grp, gi}
            <div class="da-boost-cat-row">
              <span class="da-tree-line" class:da-tree-line--last={gi === _catGroups.length - 1}></span>
              <div class="da-cat-labels">
                {#each grp.labels as lbl}
                  <span class="da-cat-lbl da-cat-lbl--{lbl.toLowerCase()}">{lbl}</span>
                {/each}
              </div>

              {#if grp.allChips.length > 0}
                {#each grp.allChips as entry}
                  {@const _venomEaterDisabled = entry.sourceName === 'Venom Eater' && (!showCritValues || !_dummyHasPoisonActive)}
                  {@const disabled = disabledBoosts.has(entry.sourceName) || (entry.sourceName === 'Spirit Winds' && _effectiveTailwindPotency <= 0) || _venomEaterDisabled}
                  <button
                    class="da-boost-chip da-boost-chip--sm"
                    class:da-boost-chip--off={disabled}
                    title={entry.condition ?? ''}
                    on:click={() => { if (entry.sourceName === 'Spirit Winds' && _effectiveTailwindPotency <= 0) return; if (_venomEaterDisabled) return; toggleBoost(entry.sourceName) }}
                  >
                    <span class="da-bc-name">{entry.sourceName}</span>
                    <span class="da-bc-val">{disabled ? '—' : `×${+entry.rawMultiplier.toFixed(4)}`}</span>
                    <span class="da-bc-toggle">{disabled ? 'OFF' : 'ON'}</span>
                  </button>
                  <span class="da-chain-op">×</span>
                {/each}
              {:else}
                <span class="da-cat-nospec">no modifier</span>
                <span class="da-chain-op">×</span>
              {/if}

              <span class="da-cat-total">= ×{+grp.totalMult.toFixed(4)}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

      {#if _ragePotency > 0 || _glyphConduitEntry || _vampireStacks > 0 || _photosynthesisStacks > 0 || (perks['Extinguish'] ?? 0) > 0 || _lightningCloakActive || _stormRendAmt > 0 || _draconicInfusionDisplay || _allActiveBuffsRaw.some(b => !HANDLED_BUFF_NAMES.has(b.buffName))}
        <div class="da-buff-list" style="margin-top: 8px;">
          {#if _ragePotency > 0 || _glyphConduitEntry || (perks['Extinguish'] ?? 0) > 0 || _lightningCloakActive || _stormRendAmt > 0 || _allActiveBuffsRaw.some(b => !HANDLED_BUFF_NAMES.has(b.buffName) && !BUFF_DEFS[b.buffName]?.isDebuff && !BUFF_DEFS[b.buffName]?.isNeutral)}
            <span class="da-buff-divider da-buff-divider--buff">Buffs</span>
          {/if}
          {#if _ragePotency > 0}
            <span class="da-buff">
              <button
                class="da-boost-chip"
                class:da-boost-chip--off={rageDisabled}
                style="background:rgba(247,2,1,.08);border-color:rgba(247,2,1,.2)"
                on:click={() => rageDisabled = !rageDisabled}
              >
                <span class="da-bc-name">Rage</span>
                <span class="da-bc-val" style="color:#f70201">{rageDisabled ? '—' : `×${+_rageMult.toFixed(4)}`}</span>
                <span class="da-bc-cond">{[..._rageAffectedTypes].map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' · ')}</span>
                <span class="da-bc-toggle" style={rageDisabled ? '' : 'background:rgba(247,2,1,.15);color:#f70201'}>{rageDisabled ? 'OFF' : 'ON'}</span>
                <span class="da-buff-sources">{_activeRageBuffs.toSorted((a,b) => b.potency - a.potency).slice(0,1).map(b => `${b.sourceName} (${b.potency})`)}</span>
              </button>
            </span>
          {/if}
          {#if _glyphConduitEntry}
            <span class="da-buff">
              <button
                class="da-boost-chip"
                class:da-boost-chip--off={glyphConduitDisabled}
                style="background:rgba(23,179,254,.08);border-color:rgba(23,179,254,.2)"
                on:click={() => glyphConduitDisabled = !glyphConduitDisabled}
              >
                <span class="da-bc-name">Glyph Conduit</span>
                <span class="da-bc-val" style="color:#17b3fe">{glyphConduitDisabled ? '—' : `×${+_glyphConduitMult.toFixed(4)}`}</span>
                <span class="da-bc-cond">Magic</span>
                <span class="da-bc-toggle" style={glyphConduitDisabled ? '' : 'background:rgba(23,179,254,.15);color:#17b3fe'}>{glyphConduitDisabled ? 'OFF' : 'ON'}</span>
                <span class="da-buff-sources">{_activeGlyphConduitBuffs.toSorted((a,b) => b.potency - a.potency).slice(0,1).map(b => `${b.sourceName} (${b.potency})`)}</span>
              </button>
            </span>
          {/if}
          {#if (perks['Extinguish'] ?? 0) > 0}
            <span class="da-buff">
              <button
                class="da-boost-chip"
                class:da-boost-chip--off={extinguishDisabled}
                style="background:rgba(14,165,233,.08);border-color:rgba(14,165,233,.2)"
                on:click={() => extinguishDisabled = !extinguishDisabled}
              >
                <span class="da-bc-name">Extinguish</span>
                <span class="da-bc-val" style="color:#0ea5e9">{extinguishDisabled ? '—' : `×${+(1 + 0.5 * (perks['Extinguish'] ?? 0)).toFixed(4)}`}</span>
                <span class="da-bc-cond">Water · vs Burning</span>
                <span class="da-bc-toggle" style={extinguishDisabled ? '' : 'background:rgba(14,165,233,.15);color:#0ea5e9'}>{extinguishDisabled ? 'OFF' : 'ON'}</span>
              </button>
            </span>
          {/if}
          {#if _lightningCloakActive}
            <span class="da-buff">
              <button
                class="da-boost-chip"
                class:da-boost-chip--off={disableLightningCloak}
                style="background:rgba(170,255,219,.08);border-color:rgba(170,255,219,.2)"
                on:click={() => disableLightningCloak = !disableLightningCloak}
              >
                <span class="da-bc-name">Lightning Cloak</span>
                <span class="da-bc-val" style="color:#aaffdb">{disableLightningCloak ? '—' : '1/3'}</span>
                <span class="da-bc-cond">Air + Magic</span>
                <span class="da-bc-toggle" style={disableLightningCloak ? '' : 'background:rgba(170,255,219,.15);color:#aaffdb'}>{disableLightningCloak ? 'OFF' : 'ON'}</span>
                <span class="da-buff-sources">{_activeLightningCloakBuffs.toSorted((a,b) => b.potency - a.potency).slice(0,1).map(b => `${b.sourceName} (${b.potency})`)}</span>
              </button>
            </span>
          {/if}
          {#if _stormRendAmt > 0}
            <span class="da-buff">
              <button
                class="da-boost-chip"
                class:da-boost-chip--off={disableStormRend}
                style="background:rgba(255,242,122,.08);border-color:rgba(255,242,122,.2)"
                on:click={() => disableStormRend = !disableStormRend}
              >
                <span class="da-bc-name">Storm Rend</span>
                <span class="da-bc-val" style="color:#fff27a">{disableStormRend ? '—' : '1/3'}</span>
                <span class="da-bc-cond">Lightning Cloak</span>
                <span class="da-bc-toggle" style={disableStormRend ? '' : 'background:rgba(255,242,122,.15);color:#fff27a'}>{disableStormRend ? 'OFF' : 'ON'}</span>
                <span class="da-buff-sources">Perk ({_stormRendAmt})</span>
              </button>
            </span>
          {/if}
          {#if _draconicInfusionDisplay}
            {@const def = BUFF_DEFS['Draconic Infusion']}
            <span class="da-buff">
              <button class="da-boost-chip" class:da-boost-chip--off={draconicInfusionDisabled}
                style="background:color-mix(in srgb,{def.color} 10%,transparent);border-color:color-mix(in srgb,{def.color} 35%,transparent)"
                on:click={() => draconicInfusionDisabled = !draconicInfusionDisabled}>
                <span class="da-bc-name">Draconic Infusion</span>
                <span class="da-bc-val" style="color:{def.color}">{draconicInfusionDisabled ? '—' : _draconicInfusionDisplay.potency}</span>
                <span class="da-bc-cond">{getBuffDescription('Draconic Infusion', $result.perks, _draconicInfusionDisplay.potency)}</span>
                <span class="da-bc-toggle" style={draconicInfusionDisabled ? '' : `background:color-mix(in srgb,${def.color} 25%,transparent);color:${def.color}`}>{draconicInfusionDisabled ? 'OFF' : 'ON'}</span>
                <span class="da-buff-sources">{_draconicInfusionDisplay.sourceName}</span>
              </button>
            </span>
          {/if}
          {#each _allActiveBuffsRaw.filter(b => !HANDLED_BUFF_NAMES.has(b.buffName) && !BUFF_DEFS[b.buffName]?.isDebuff && !BUFF_DEFS[b.buffName]?.isNeutral) as buff, i (buff.buffName + buff.sourceName + i)}
            {@const def = BUFF_DEFS[buff.buffName]}
            {@const key = `${buff.buffName}:${buff.sourceName}`}
            {@const isOff = disabledBuffKeys.has(key)}
            {#if def}
              <span class="da-buff">
                <button class="da-boost-chip" class:da-boost-chip--off={isOff}
                  style="background:color-mix(in srgb,{def.color} 10%,transparent);border-color:color-mix(in srgb,{def.color} 35%,transparent)"
                  on:click={() => toggleBuffKey(key)}>
                  <span class="da-bc-name">{def.name}</span>
                  <span class="da-bc-val" style="color:{def.color}">{isOff ? '—' : buff.potency}</span>
                  <span class="da-bc-cond">{getBuffDescription(buff.buffName, $result.perks, buff.potency)}</span>
                  <span class="da-bc-toggle" style={isOff ? '' : `background:color-mix(in srgb,${def.color} 25%,transparent);color:${def.color}`}>{isOff ? 'OFF' : 'ON'}</span>
                  <span class="da-buff-sources">{buff.sourceName}</span>
                </button>
              </span>
            {/if}
          {/each}
          {#if _allActiveBuffsRaw.some(b => !HANDLED_BUFF_NAMES.has(b.buffName) && BUFF_DEFS[b.buffName]?.isDebuff && b.isSelfDebuff)}
            <span class="da-buff-divider da-buff-divider--debuff">Self Debuffs</span>
            {#each _allActiveBuffsRaw.filter(b => !HANDLED_BUFF_NAMES.has(b.buffName) && BUFF_DEFS[b.buffName]?.isDebuff && b.isSelfDebuff) as buff, i (buff.buffName + buff.sourceName + i)}
              {@const def = BUFF_DEFS[buff.buffName]}
              {@const key = `${buff.buffName}:${buff.sourceName}`}
              {@const isOff = disabledBuffKeys.has(key)}
              {#if def}
                <span class="da-buff">
                  <button class="da-boost-chip da-boost-chip--debuff" class:da-boost-chip--off={isOff}
                    style="background:color-mix(in srgb,{def.color} 10%,transparent);border-color:color-mix(in srgb,{def.color} 35%,transparent)"
                    on:click={() => toggleBuffKey(key)}>
                    <span class="da-bc-name">{def.name}</span>
                    <span class="da-bc-val" style="color:{def.color}">{isOff ? '—' : buff.potency}</span>
                    <span class="da-bc-cond">{getBuffDescription(buff.buffName, $result.perks, buff.potency)}</span>
                    <span class="da-bc-toggle" style={isOff ? '' : `background:color-mix(in srgb,${def.color} 25%,transparent);color:${def.color}`}>{isOff ? 'OFF' : 'ON'}</span>
                    <span class="da-buff-sources">{buff.sourceName}</span>
                  </button>
                </span>
              {/if}
            {/each}
          {/if}
          {#if _allActiveBuffsRaw.some(b => !HANDLED_BUFF_NAMES.has(b.buffName) && BUFF_DEFS[b.buffName]?.isNeutral)}
            <span class="da-buff-divider da-buff-divider--neutral">Neutral</span>
            {#each _allActiveBuffsRaw.filter(b => !HANDLED_BUFF_NAMES.has(b.buffName) && BUFF_DEFS[b.buffName]?.isNeutral) as buff, i (buff.buffName + buff.sourceName + i)}
              {@const def = BUFF_DEFS[buff.buffName]}
              {@const key = `${buff.buffName}:${buff.sourceName}`}
              {@const isOff = disabledBuffKeys.has(key)}
              {#if def}
                <span class="da-buff">
                  <button class="da-boost-chip da-boost-chip--neutral" class:da-boost-chip--off={isOff}
                    style="background:color-mix(in srgb,{def.color} 10%,transparent);border-color:color-mix(in srgb,{def.color} 35%,transparent)"
                    on:click={() => toggleBuffKey(key)}>
                    <span class="da-bc-name">{def.name}</span>
                    <span class="da-bc-val" style="color:{def.color}">{isOff ? '—' : buff.potency}</span>
                    <span class="da-bc-cond">{getBuffDescription(buff.buffName, $result.perks, buff.potency)}</span>
                    <span class="da-bc-toggle" style={isOff ? '' : `background:color-mix(in srgb,${def.color} 25%,transparent);color:${def.color}`}>{isOff ? 'OFF' : 'ON'}</span>
                    <span class="da-buff-sources">{buff.sourceName}</span>
                  </button>
                </span>
              {/if}
            {/each}
          {/if}
        </div>
        {#if _orkBuffTenacity > 0}
          <div class="da-ork-tenacity" style="margin-top: 6px; font-size: .7rem; color: var(--ink-muted); display: flex; gap: 4px; align-items: center;">
            <span>Ork Tenacity: <strong style="color: var(--accent);">{_effectiveTenacity.toFixed(2)}</strong></span>
            <span style="opacity: .6;">(base <strong>{(stats.tenacity ?? 0).toFixed(2)}</strong> + <strong>{_orkBuffTenacity.toFixed(2)}</strong> from {_orkBuffs.length} buff{_orkBuffs.length !== 1 ? 's' : ''})</span>
          </div>
        {/if}
          {#if _vampireStacks > 0 || _photosynthesisStacks > 0}
            <div class="ap-toggle-row">
              <span class="ap-toggle-label">Environment</span>
              <button
                class="ap-toggle-btn da-env-toggle"
                class:da-env-toggle--dark={$build.inDarkness}
                class:da-env-toggle--sun={!$build.inDarkness}
                on:click={() => {
                  environmentTouched = true
                  build.update(s => ({ ...s, inDarkness: !s.inDarkness }))
                }}
              >
                {_effectiveInDarkness ? '🌙 Darkness' : '☀ Sunlight'}
              </button>
            </div>
          {/if}
        {/if}
  {#if _m1FinisherWeaponBoost.mult !== 1 || _m2WeaponBoost.mult !== 1}
    <div class="da-weaponboost-row" style="margin-top: 8px;">
      {#if _m1FinisherWeaponBoost.mult !== 1}
        <span class="da-weaponboost-badge">
          M1 Finisher ×{+_m1FinisherWeaponBoost.mult.toFixed(4)}
        </span>
        <span class="da-weaponboost-sources">{_m1FinisherWeaponBoost.labels.join(', ')}</span>
      {/if}
      {#if _m2WeaponBoost.mult !== 1}
        <span class="da-weaponboost-badge">
          M2 ×{+_m2WeaponBoost.mult.toFixed(4)}
        </span>
        <span class="da-weaponboost-sources">{_m2WeaponBoost.labels.join(', ')}</span>
      {/if}
    </div>
  {/if}
  {#if _allHealEntriesForDisplay.length > 0}
    <div class="da-boost-row" style="margin-top:8px">
      <span class="da-heal-label">✦ Heal</span>
      {#each _allHealEntriesForDisplay as entry}
        {@const isDisabled = disabledHealBoosts.has(entry.sourceName)}
        <button
          class="da-boost-chip da-boost-chip--heal"
          class:da-boost-chip--off={isDisabled}
          title={entry.condition ?? ''}
          on:click={() => toggleHealBoost(entry.sourceName)}
        >
          <span class="da-bc-name">{entry.sourceName}</span>
          <span class="da-bc-val" style="color:#4ade80">×{+entry.rawMultiplier.toFixed(4)}</span>
          <span class="da-bc-cond">{entry.condition ?? ''}</span>
          <span class="da-bc-toggle">{isDisabled ? 'OFF' : 'ON'}</span>
        </button>
        <span class="da-chain-op">×</span>
      {/each}
      <span class="da-chain-result" style="color:#4ade80">= ×{+_healFinalMultiplier.toFixed(4)}</span>
    </div>

  {/if}
</div>

<!-- ══════════════════ DEFENSE ══════════════════ -->
<div class="da-section da-section--defense">
  <div class="da-section-title">Damage Taken</div>

  {#if (perks['Adaptive Plate'] ?? 0) > 0}
    <div class="ap-toggle-row">
      <span class="ap-toggle-label">Adaptive Plate</span>
      <button
        class="ap-toggle-btn"
        class:ap-toggle-btn--on={_adaptivePlateTriggered}
        on:click={() => _adaptivePlateTriggered = !_adaptivePlateTriggered}
      >
        {_adaptivePlateTriggered ? 'Triggered' : 'Idle'}
      </button>
    </div>
  {/if}

  <div class="ds-formula-hint">
    Defense: dmgTaken = 1 / (1 + def%) &nbsp;·&nbsp; Each +1% Defense = +1% EHP (linear, no diminishing returns)
  </div>

  <ul class="def-rules">
    <li>Positive Defense decreases incoming damage · negative Defense increases it.</li>
    <li>Every <strong>unique source</strong> is multiplicative — Defense sources multiply with Flat DR sources.</li>
    <li>Defense <strong>stats</strong> within the same source are additive — e.g. Physical + Air Defense both apply when taking Air damage.</li>
    <li>Flat DR (e.g. Stoneskin, Lithic Veil) applies <strong>after</strong> all Defense sources and is more efficient per % the higher it stacks.</li>
  </ul>

  {#if _defenseRows.length > 0}
    <div class="def-type-grid">
      {#each _defenseRows as row}
        <div class="def-type-card" style="--tc:{row.color}">
          <div class="def-type-head">
            <span class="def-type-dot" style="background:{row.color}"></span>
            <span class="def-type-name">{row.type.charAt(0).toUpperCase() + row.type.slice(1)}</span>
            <span class="def-type-final">×{row.finalMultiplier}</span>
          </div>
          {#each row.percentSources as s}
            <div class="def-source-row" title={s.condition ?? ''}>
              <span class="def-source-name">{s.name}</span>
              <span class="def-source-raw" class:def-source-dr--neg={s.defPct < 0}>
                {s.defPct >= 0 ? '+' : ''}{s.defPct}% Defense
              </span>

              {#if s.condition}
                <span class="def-source-note">{s.condition}</span>
              {/if}
            </div>
          {/each}
          {#each row.flatSources as s}
            <div class="def-source-row def-source-row--flat" title={s.condition ?? ''}>
              <span class="def-source-name">{s.name}</span>
              <span class="def-source-dr def-source-dr--flat">{s.trueDrPct}% Damage Reduction</span>
            </div>
          {/each}
        </div>
      {/each}
    </div>
    <!--<p class="da-empty-hint">Additional defense sources (flat-DR buffs, etc.) will stack here as separate multiplicative layers once added.</p>-->
  {:else}
    <p class="da-empty-hint">No defense stats equipped — incoming damage is currently unmitigated.</p>
  {/if}
</div>

<div class="da-main-row">
<!-- ══════════════════ WEAPON BASE DAMAGE + PERK BASE DAMAGE ══════════════════ -->
<div class="da-wbd-outer" class:da-wbd-outer--expanded={showAllWeapons}>

<!-- Weapon Base Damage -->
<div class="da-section da-section--wbd da-section--wbd-inner">
  <div class="da-section-title-row">
    <span class="da-section-title">Base Damage</span>
    <div class="da-wbd-controls">
      {#if _currentLabel}
        <span class="da-wbd-current-badge">{_currentLabel}</span>
      {/if}
      {#if showAllWeapons}
        <button class="da-wbd-toggle da-wbd-toggle--open" on:click={() => showAllWeapons = false}>
          <span class="da-wbd-toggle-arr">▼</span>
          <span class="da-wbd-toggle-lbl">All Weapons</span>
          <span class="da-wbd-toggle-cnt">{WEAPON_BASE_DMG.length}</span>
        </button>
      {:else}
        <button class="da-wbd-toggle" on:click={() => showAllWeapons = true}>
          <span class="da-wbd-toggle-arr">▶</span>
          <span class="da-wbd-toggle-lbl">All Weapons</span>
          <span class="da-wbd-toggle-cnt">{WEAPON_BASE_DMG.length}</span>
        </button>
      {/if}
      {#if showAllWeapons}
<div class="da-wbd-cards da-wbd-cards--dropdown">
  {#each WEAPON_BASE_DMG as row}
    {@const isActive   = _currentLabel && row.type === _baseWeaponType}
    {@const isGunActive = !!_gunOverlay && row.type === _gunOverlay.type}
    {@const gunLabel = (row as any).gunLabel as string | undefined}
    {@const m2Only = (row as any).m2Only as boolean | undefined}
    {@const hasDmgTypes = isActive && Object.keys(_weaponDmgTypes).length > 0}
    {@const m1DmgTypes = (isActive && gunLabel && !m2Only) ? _gunDmgTypes : _convertedWeaponDmgTypes}
    {@const m2DmgTypes = (isActive && gunLabel && !(row as any).m2NoLock) ? _gunDmgTypes : _convertedWeaponDmgTypes}
    {@const m1Typed = hasDmgTypes && row.m1 ? seqWithTypes(row.m1, m1DmgTypes, 1, 1, new Set(), 1) : null}
    {@const m2Typed = hasDmgTypes && row.m2 ? seqWithTypes(row.m2, m2DmgTypes, 1, 1, new Set(), 1) : null}
    <div class="da-wbd-card" class:da-wbd-card--active={isActive || isGunActive} class:da-wbd-card--gun={isGunActive}>

      <div class="da-wbd-card-head">
        {#if isActive}<span class="da-wbd-dot" class:da-wbd-dot--gun={!!gunLabel}></span>{/if}
        {#if isGunActive}<span class="da-wbd-dot da-wbd-dot--gun"></span>{/if}

        <span class="da-wbd-card-name">{row.type}</span>
        {#if gunLabel}<span class="da-wbd-gun-badge">{gunLabel}</span>{/if}

        {#if showAllWeapons && isActive}
          <span class="da-wbd-equipped-badge">✦ Equipped</span>
        {/if}
        {#if isGunActive}
          <span class="da-wbd-gun-active-badge">✦ Active Gun</span>
        {/if}
      </div>
      <div class="da-wbd-card-divider"></div>
      <div class="da-wbd-sections">

      <div class="da-wbd-section">
        <div class="da-wbd-row-label da-wbd-row-label--m1">
          <span class="da-wbd-lbl-badge da-wbd-lbl-badge--m1">M1</span>
          <span class="da-wbd-lbl-text">Combo</span>
        </div>
        <div class="da-hits-row">
          {#if m1Typed}
            {#each m1Typed as hit, hi}
              {#if hi > 0}<span class="da-hit-divider">›</span>{/if}
              {@const finisher = isFinisher(row, 'm1', hi)}
              <div class="da-hit-wrapper">
                <div class="da-hit-card" class:da-hit-card--finisher={finisher}>
                  {#each hit.types as t, ti}
                    {#if ti > 0}<span class="da-hit-plus">+</span>{/if}
                    <div class="da-hit-chunk" style="--tc:{t.color}">
                      <span class="da-hit-num" style="--tc:{t.color}">{fmtNum(t.val)}</span>
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          {:else if (row as any).noM1}
            <div class="da-hits-row">
              <span class="da-wbd-na">N/A</span>
            </div>
          {:else if row.m1}
            {#each row.m1 as hit, hi}
              {#if hi > 0}<span class="da-hit-divider">›</span>{/if}
              <div class="da-plain-pill">
                <span class="da-plain-num">{typeof hit === 'number' ? hit : hit.n}</span>
                {#if typeof hit !== 'number' && hit.count > 1}
                  <span class="da-plain-count">×{hit.count}</span>
                {/if}
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <div class="da-wbd-section">
        <div class="da-wbd-row-label da-wbd-row-label--m2">
          <span class="da-wbd-lbl-badge da-wbd-lbl-badge--m2">M2</span>
          <span class="da-wbd-lbl-text">Heavy
            {#if !m2Only && gunLabel}
              <span class="da-wbd-gun-lbl">(Gun)</span>
            {/if}
          </span>
        </div>
        <div class="da-hits-row">
          {#if (row as any).noM2}
            <span class="da-wbd-na">N/A</span>
          {:else if m2Typed}
            {#each m2Typed as hit, hi}
              {#if hi > 0}<span class="da-hit-divider">›</span>{/if}
              <div class="da-hit-wrapper">
                <div class="da-hit-card da-hit-card--finisher">
                  {#each hit.types as t, ti}
                    {#if ti > 0}<span class="da-hit-plus">+</span>{/if}
                    <div class="da-hit-chunk" style="--tc:{t.color}">
                      <span class="da-hit-num" style="--tc:{t.color}">{fmtNum(t.val)}</span>
                    </div>
                  {/each}
                  <span class="da-finisher-crown">✦</span>
                </div>
              </div>
              {#if hit.count > 1}
                <span class="da-hit-repeat">×{hit.count}<span class="da-hit-repeat-label">hits</span></span>
              {/if}
            {/each}
          {:else if row.m2}
            {#each row.m2 as hit, hi}
              {#if hi > 0}<span class="da-hit-divider">›</span>{/if}
              <div class="da-plain-pill">
                <span class="da-plain-num">{typeof hit === 'number' ? hit : hit.n}</span>
                {#if typeof hit !== 'number' && hit.count > 1}
                  <span class="da-plain-count">×{hit.count}</span>
                {/if}
              </div>
            {/each}
          {:else}
            <span class="da-wbd-na">N/A</span>
          {/if}
          {#if gunLabel && !m2Only}
            <span class="da-wbd-m2-src">from {gunLabel}</span>
          {/if}
        </div>
      </div>

      {#if isActive && _showWACol}
      <div class="da-wbd-section">
        <div class="da-wbd-row-label da-wbd-row-label--wa">
          <span class="da-wbd-lbl-badge da-wbd-lbl-badge--wa">WA</span>
          <span class="da-wbd-lbl-text da-wbd-lbl-text--wa">{selectedWA.name}</span>
        </div>
        <div class="da-hits-row">
          <span class="da-wbd-na">N/A</span>
        </div>
      </div>
       {/if}
     </div>
     </div>
   {/each}
 </div>
 {/if}
     </div>
   </div>

  <div class="da-wbd-body">
  {#if !_currentLabel && !showAllWeapons}
    <p class="da-empty-hint">No weapon selected. <button class="da-wbd-toggle" on:click={() => showAllWeapons = true}><span class="da-wbd-toggle-arr">▶</span><span class="da-wbd-toggle-lbl">All Weapons</span><span class="da-wbd-toggle-cnt">{WEAPON_BASE_DMG.length}</span></button></p>
  {:else}
    {#if _currentLabel}
      {@const rows2 = _displayRows}
<div class="da-wbd-cards">
  {#each rows2 as row}
    {@const isActive   = true}
    {@const isGunActive = false}
    {@const gunLabel = (row as any).gunLabel as string | undefined}
    {@const m2Only = (row as any).m2Only as boolean | undefined}
    {@const hasDmgTypes = Object.keys(_weaponDmgTypes).length > 0}
    {@const m1DmgTypes = (gunLabel && !m2Only) ? _gunDmgTypes : _convertedWeaponDmgTypes}
    {@const m2DmgTypes = (gunLabel && !(row as any).m2NoLock) ? _gunDmgTypes : _convertedWeaponDmgTypes}
    {@const m1Typed = hasDmgTypes && row.m1 ? seqWithTypes(row.m1, m1DmgTypes, 1, 1, new Set(), 1) : null}
    {@const m2Typed = hasDmgTypes && row.m2 ? seqWithTypes(row.m2, m2DmgTypes, 1, 1, new Set(), 1) : null}  
    <div class="da-wbd-card da-wbd-card--active">

      <div class="da-wbd-card-head">
        {#if isActive}<span class="da-wbd-dot" class:da-wbd-dot--gun={!!gunLabel}></span>{/if}
        {#if isGunActive}<span class="da-wbd-dot da-wbd-dot--gun"></span>{/if}

        <span class="da-wbd-card-name">{row.type}</span>
        {#if gunLabel}<span class="da-wbd-gun-badge">{gunLabel}</span>{/if}

        {#if isGunActive}
          <span class="da-wbd-gun-active-badge">✦ Active Gun</span>
        {/if}
      </div>
      <div class="da-wbd-card-divider"></div>
      <div class="da-wbd-sections">

      <div class="da-wbd-section">
        <div class="da-wbd-row-label da-wbd-row-label--m1">
          <span class="da-wbd-lbl-badge da-wbd-lbl-badge--m1">M1</span>
          <span class="da-wbd-lbl-text">Combo</span>
        </div>
        <div class="da-hits-row">
          {#if m1Typed}
            {#each m1Typed as hit, hi}
              {#if hi > 0}<span class="da-hit-divider">›</span>{/if}
              {@const finisher = isFinisher(row, 'm1', hi)}
              <div class="da-hit-wrapper">
                <div class="da-hit-card" class:da-hit-card--finisher={finisher}>
                  {#each hit.types as t, ti}
                    {#if ti > 0}<span class="da-hit-plus">+</span>{/if}
                    <div class="da-hit-chunk" style="--tc:{t.color}">
                      <span class="da-hit-num" style="--tc:{t.color}">{fmtNum(t.val)}</span>
                      <span class="da-hit-type">{t.label}</span>
                    </div>
                    {#if hit.count > 1}
                      <div class="da-hit-repeat">×{hit.count}<span>Hits</span></div>
                    {/if}
                  {/each}
                  {#if finisher}<span class="da-finisher-crown">✦</span>{/if}
                </div>
              </div>
            {/each}
          {:else if row.m1}
            {#each row.m1 as hit, hi}
              {@const finisher = isFinisher(row, 'm1', hi)}
              {#if hi > 0}<span class="da-hit-divider">›</span>{/if}
              
              <div class="da-plain-pill" class:da-plain-pill--finisher={finisher}>
                <span class="da-plain-num">{typeof hit === 'number' ? hit : hit.n}</span>
                {#if typeof hit !== 'number' && hit.count > 1}
                  <span class="da-plain-count">×{hit.count}</span>
                {/if}
                {#if finisher}
                  <span class="da-finisher-badge-mini">F</span>
                {/if}
              </div>
            {/each}
          {:else}
            <span class="da-wbd-na">N/A</span>
          {/if}
        </div>
      </div>

      <div class="da-wbd-section">
        <div class="da-wbd-row-label da-wbd-row-label--m2">
          <span class="da-wbd-lbl-badge da-wbd-lbl-badge--m2">M2</span>
          <span class="da-wbd-lbl-text">Heavy</span>
        </div>
        <div class="da-hits-row">
          {#if m2Typed}
            {#each m2Typed as hit, hi}
              {#if hi > 0}<span class="da-hit-divider">›</span>{/if}
              <div class="da-hit-wrapper">
                <div class="da-hit-card da-hit-card--finisher">
                  {#each hit.types as t, ti}
                    {#if ti > 0}<span class="da-hit-plus">+</span>{/if}
                    {@const finalVal = selectedWeaponData?.m2Charge?.enabled
                      ? selectedWeaponData.m2Charge.formula(t.val, weaponCharge)
                      : t.val}
                    <div class="da-hit-chunk" style="--tc:{t.color}">
                      <span class="da-hit-num" style="--tc:{t.color}">{fmtNum(finalVal)}</span>
                      <span class="da-hit-type">{t.label}</span>
                    </div>
                  {/each}
                  <span class="da-finisher-crown">✦</span>
                </div>
              </div>
              {#if hit.count > 1}
                <span class="da-hit-repeat">×{hit.count}<span class="da-hit-repeat-label">hits</span></span>
              {/if}
            {/each}
          {:else if row.m2}
            {#each row.m2 as hit, hi}
              {#if hi > 0}<span class="da-hit-divider">›</span>{/if}
              <div class="da-plain-pill">
                <span class="da-plain-num">{typeof hit === 'number' ? hit : hit.n}</span>
                {#if typeof hit !== 'number' && hit.count > 1}
                  <span class="da-plain-count">×{hit.count}</span>
                {/if}
              </div>
            {/each}
          {:else}
            <span class="da-wbd-na">N/A</span>
          {/if}
          {#if gunLabel && !m2Only}
            <span class="da-wbd-m2-src">from {gunLabel}</span>
            {#if selectedWeaponData?.m2Charge?.enabled}
              <div class="da-rifle-charge-wrap">
                <div class="da-rifle-charge-label">
                  <span class="da-rcl-name">{selectedWeaponData.m2Charge.label}</span>
                  <span class="da-rcl-pct">{weaponCharge}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={selectedWeaponData.m2Charge.max}
                  step="1"
                  bind:value={weaponCharge}
                  class="da-rifle-charge-slider"
                  style="--fill:{weaponCharge}%"
                />
                <div class="da-rifle-marks">
                  <span>0</span><span>25</span><span>50</span><span>75</span><span>100%</span>
                </div>
              </div>
            {/if}
          {/if}
        </div>
      </div>

      {#if _showWACol && isActive}
        <div class="da-wbd-section">
          <div class="da-wbd-row-label da-wbd-row-label--wa">
            <span class="da-wbd-lbl-badge da-wbd-lbl-badge--wa">WA</span>
            <span class="da-wbd-lbl-text da-wbd-lbl-text--wa">{selectedWA.name}</span>
          </div>
          <div class="da-hits-row">
          {#if _waTyped}
            {#each _waTyped as hit, hi}
              {#if hi > 0}<span class="da-hit-divider">›</span>{/if}
              <div class="da-hit-card"
                class:da-hit-card--finisher={selectedWA.hits?.[hi]?.isFinisher}
                class:da-hit-card--crit={selectedWA.hits?.[hi]?.isCrit}>
                {#each hit.types as t, ti}
                  {#if ti > 0}<span class="da-hit-plus">+</span>{/if}
                  <div class="da-hit-chunk" style="--tc:{t.color}">
                    {#if selectedWA.hits?.[hi]?.isCrit}
                      <span class="da-hit-num da-hit-num--gcrit-base" style="--tc:{t.color}">{fmtNum(t.val)}</span>
                      <span class="da-hit-num da-hit-num--gcrit" style="--tc:{t.color}">
                        {fmtNum(Math.round(t.val * _critMult * 10000) / 10000)}
                      </span>
                      <span class="da-hit-type da-hit-type--gcrit" style="--tc:{t.color}">✦ Crit · {t.label}</span>
                    {:else}
                      <span class="da-hit-num" style="--tc:{t.color}">{fmtNum(t.val)}</span>
                      <span class="da-hit-type">{t.label}</span>
                    {/if}
                  </div>
                {/each}
                {#if selectedWA.hits?.[hi]?.isCrit}<CritIcon size={12}/>{/if}
                {#if selectedWA.hits?.[hi]?.isFinisher}<span class="da-finisher-crown">✦</span>{/if}
                {#if hit.count > 1}
                  <span class="da-hit-repeat">×{hit.count}<span class="da-hit-repeat-label">hits</span></span>
                {/if}
              </div>
            {/each}
          {:else if _waHitsSeq}
            {_waHitsSeq.map(h => h.count > 1 ? `${h.n}×${h.count}` : String(h.n)).join(', ')}

          {:else if _waRangeTyped}
            <div class="da-range-row">
              <div class="da-hit-card">
                <div class="da-range-end">
                  {#each _waRangeTyped.minEnds as t, ti}
                    {#if ti > 0}
                      <span class="da-hit-plus">+</span>
                    {/if}

                    <div class="da-hit-chunk" style="--tc:{t.color}" class:da-hit-chunk--rage={t.rageApplied}>
                      <span class="da-hit-num" class:da-hit-num--crit={showCritValues} style="--tc:{t.color}">
                        {fmtNum(showCritValues ? Math.round(t.val * _critMult * 10000) / 10000 : t.val)}
                      </span>
                      <span class="da-hit-type">{t.label}</span>
                    </div>
                  {/each}

                  {#if _waRangeTyped.minLabel}
                    <span class="da-range-label">
                      ({_waRangeTyped.minLabel})
                    </span>
                  {/if}
                </div>
              </div>

              <span class="da-range-arrow">→</span>

              <div class="da-hit-card">
                <div class="da-range-end">
                  {#each _waRangeTyped.maxEnds as t, ti}
                    {#if ti > 0}
                      <span class="da-hit-plus">+</span>
                    {/if}

                    <div class="da-hit-chunk" style="--tc:{t.color}" class:da-hit-chunk--rage={t.rageApplied}>
                      <span class="da-hit-num" class:da-hit-num--crit={showCritValues} style="--tc:{t.color}">
                        {fmtNum(showCritValues ? Math.round(t.val * _critMult * 10000) / 10000 : t.val)}
                      </span>
                      <span class="da-hit-type">{t.label}</span>
                    </div>
                  {/each}

                  {#if _waRangeTyped.maxLabel}
                    <span class="da-range-label da-range-label--max">
                      ({_waRangeTyped.maxLabel})
                    </span>
                  {/if}
                </div>
              </div>

              {#if selectedWA.scaling && selectedWA.scaling !== 'Same as weapon'}
                <span class="da-range-scl">
                  {selectedWA.scaling === 'None'
                    ? 'No Scaling'
                    : `Scaling: ${selectedWA.scaling}`}
                </span>
              {/if}
            </div>

          {:else if selectedWA.baseDamage && _waAllHits.dmg.length > 0}
            <div class="da-range-row">
              <span class="da-wbd-range">{selectedWA.baseDamage}</span>
              {#if Object.keys(_waDmgTypes).length > 0}
                {#each Object.entries(_waDmgTypes) as [k, v]}
                  <div class="da-hit-chunk da-hit-chunk--sm" style="--tc:{DMG_TYPE_COLORS[k] ?? '#e8e4da'}">
                    <span class="da-hit-num">{v}×</span>
                    <span class="da-hit-type">{k.charAt(0).toUpperCase() + k.slice(1)}</span>
                  </div>
                {/each}
              {/if}
              {#if (_waOnlyBonuses.air ?? 0) > 0}
                <span class="da-ww-badge" title="+{_waOnlyBonuses.air.toFixed(2)} Air from WA-specific bonuses while Tailwind is active">
                  <span class="da-ww-air">+{_waOnlyBonuses.air.toFixed(2)} Air</span>
                  <span class="da-ww-label">WA+</span>
                </span>
              {/if}
              {#if selectedWA.scaling && selectedWA.scaling !== 'Same as weapon'}
                <span class="da-range-scl">{selectedWA.scaling === 'None' ? 'No Scaling' : `Scaling: ${selectedWA.scaling}`}</span>
              {/if}
            </div>

          {:else if _waSummonDef}
            <div class="da-range-row" style="gap: 8px; align-items: center;">
              <div class="da-hit-card">
                {#if _waSummonDef.scaledAttacks}
                  {#each _waSummonDef.scaledAttacks as atk, ai}
                    {#if ai > 0}<span class="da-hit-plus">+</span>{/if}
                    <div class="da-hit-chunk" style="--tc:#c084fc">
                      <span class="da-hit-num" style="--tc:#c084fc">{atk.baseDmg}</span>
                      <span class="da-hit-type">{atk.label}</span>
                    </div>
                    {#if atk.guardbreak}<span class="da-pbd-badge da-pbd-badge--gb" style="align-self:center">GB</span>{/if}
                  {/each}
                {:else}
                  <div class="da-hit-chunk" style="--tc:#c084fc">
                    <span class="da-hit-num" style="--tc:#c084fc">{_waSummonDef.baseDmg}</span>
                    <span class="da-hit-type">{_waSummonDef.dmgType}</span>
                  </div>
                {/if}
                <span class="da-hit-repeat" style="background:rgba(192,132,252,.12);border-color:rgba(192,132,252,.3);color:#c084fc">
                  ×{_waSummonDef.count}<span class="da-hit-repeat-label">summons</span>
                </span>
              </div>
            </div>
          {:else}
            <span class="da-wbd-na">—</span>
          {/if}

          {#if _waHealSeq}
            <div class="da-heal-hits-row">
              {#each _waHealSeq as h, hi}
                {#if hi > 0}<span class="da-hit-divider">›</span>{/if}
                <div class="da-hit-card da-hit-card--heal">
                  <div class="da-hit-chunk" style="--tc:#4ade80">
                    <span class="da-hit-num" style="--tc:#4ade80">{fmtNum(h.n)}</span>
                    <span class="da-heal-badge">✦ Heal</span>
                  </div>
                  {#if h.count > 1}<span class="da-hit-repeat">×{h.count}</span>{/if}
                </div>
              {/each}
            </div>
          {/if}

          {#if _waAvgTotal}
            <div class="wa-avg-total-box">
              <div class="wa-atb-left">
                <span class="wa-atb-label">Avg Total</span>
                <span class="wa-atb-hint">~{_waAvgTotal.total} stars · {_waAvgTotal.starsPerType}/type</span>
              </div>
              <span class="wa-atb-base">{fmtNum(_waAvgTotal.baseTotal)}</span>
            </div>
          {/if}
          {#if _wildBoltAmt > 0 && selectedWA.name === 'Laser'}
            <div class="da-wild-bolt-box">
              <div class="da-wb-row">
                <span class="da-wb-header">Wild Bolt ×{_wildBoltAmt}</span>
                <button class="da-wb-btn" on:click={cycleWildBoltElem} title="Cycle element">↻</button>
                <button class="da-wb-btn" on:click={randomWildBoltElem} title="Randomize">🎲</button>
              </div>
              <div class="da-wb-line">Base 19.5 → 18.75 · +{_wildBoltAmt * 25}% Dmg</div>
              <div class="da-wb-line">
                Element:
                <span class="da-wb-elem" style="color:{DMG_TYPE_COLORS[_wildBoltElement!]}">
                  {_wildBoltElement!.charAt(0).toUpperCase() + _wildBoltElement!.slice(1)}
                </span>
                ({_wildBoltElemIdx + 1}/{_wildBoltElements.length})
              </div>
              <div class="da-wb-line">Debuff (5s, 1 of 6): Bleed · Burn · Poison · Shatter · Slowness · Weakness</div>
            </div>
          {/if}
          </div>
        </div>
      {/if}
      {#if _activeRuneDmgDef && isActive}
        {@const _runeHits = _activeRuneDmgDef.getHits
          ? _activeRuneDmgDef.getHits({ potency: runePotency, sliderVal: _runeSliderVal, stats, perks, selfDamage: _runeSelfDamagePerHit })
          : (_activeRuneDmgDef.hits ?? 1)}
        {@const _runeBase = _activeRuneDmgDef.getBaseDamage({ potency: runePotency, sliderVal: _runeSliderVal })}
        {@const _runeScalingMult = _computePerkScalingMult(_activeRuneDmgDef.scalings)}
        {@const _runeIsHeal = _activeRuneDmgDef.isHealOnly ?? false}
        {@const _draconicRunesStacks = perks['Draconic Runes'] ?? 0}
        {@const _draconicColor = $build.draconicColor || 'physical'}
        {@const _dragonInfusionActive = $build.draconicRuneInfusion === 'infusion'}
        {@const _dragonInfusionPotency = getEffectiveDraconicInfusionPotency($build.guild, $build.draconicRuneInfusion, _draconicColor, perks['Draconic Blood'] ?? 0, perks)}
        {@const _draconicBonuses = getDraconicBonuses({
          draconicRunesStacks: _draconicRunesStacks,
          draconicColor: _draconicColor,
        }, {
          isActive: _dragonInfusionActive,
          buffPotency: _dragonInfusionPotency,
          draconicColor: _draconicColor,
        })}
        {@const _runeDmgTypesWithBonus = _runeIsHeal
          ? _activeRuneDmgDef.dmgTypes
          : (() => {
              const base = applyDraconicBonuses(_activeRuneDmgDef.dmgTypes, {
                draconicRunesStacks: _draconicRunesStacks,
                draconicColor: _draconicColor,
              }, {
                isActive: _dragonInfusionActive,
                buffPotency: _dragonInfusionPotency,
                draconicColor: _draconicColor,
              })
              const bonusEntries = Object.entries(_perkDmgTypeBonuses).filter(([, v]) => v > 0)
              const resolved = bonusEntries.length > 0 ? resolveDamageTypes(base, _perkDmgTypeBonuses) : base
              return applyAirToMagicConversion(resolved, _spiritWindsConversionRate, _darkMagicHexBonus)
            })()}
        
        <div class="da-wbd-section">
          {#if _activeRuneDmgDef.slider}
            <div class="da-sb-slider-wrap" style="margin-bottom:6px">
              <span class="da-sb-slider-label">{_activeRuneDmgDef.slider.label}</span>
              <input
                type="range"
                min={_activeRuneDmgDef.slider.min}
                max={_runeSliderMax}
                step={_activeRuneDmgDef.slider.step ?? 1}
                value={_runeSliderVal}
                on:input={(e) => {
                  const sliderDef = _activeRuneDmgDef?.slider
                  if (!sliderDef) return
                  const val = +(e.target as HTMLInputElement).value
                  build.update(s => ({ ...s, [sliderDef.buildKey]: val }) as any)
                }}
                class="da-sb-slider"
                style="--fill:{((_runeSliderVal - _activeRuneDmgDef.slider.min) / (_runeSliderMax - _activeRuneDmgDef.slider.min || 1)) * 100}%"
              />
              <span class="da-sb-slider-val">{_runeSliderVal}</span>
            </div>
          {/if}
          <div class="da-wbd-row-label da-wbd-row-label--rune">
            <span class="da-wbd-lbl-badge da-wbd-lbl-badge--rune">Rune</span>
            <span class="da-wbd-lbl-text">{_activeRuneDmgDef.runeName}</span>
            {#if !_runeIsHeal && Object.keys(_draconicBonuses).length > 0}
              {@const totalBonus = Object.values(_draconicBonuses).reduce((a, b) => a + b, 0)}
              {@const bonusTypes = Object.keys(_draconicBonuses).map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' + ')}
              <span class="da-wbd-scaling-badge" style="background:rgba(192,132,252,.12);border-color:rgba(192,132,252,.3);color:#c084fc">{+totalBonus.toFixed(4)} {bonusTypes}</span>
            {/if}
          </div>
          <div class="da-hits-row">
            <div class="da-hit-card">
              {#each Object.entries(_runeDmgTypesWithBonus) as [type, mult], ti}
                {#if ti > 0}<span class="da-hit-plus">+</span>{/if}
                <div class="da-hit-chunk" style="--tc:{DMG_TYPE_COLORS[type] ?? '#e8e4da'}">
                  <span class="da-hit-num" style="--tc:{DMG_TYPE_COLORS[type] ?? '#e8e4da'}">{fmtNum(_runeBase * mult)}</span>
                  <span class="da-hit-type">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                </div>
              {/each}
              {#if _runeHits > 1}
                <span class="da-hit-repeat">×{_runeHits}<span class="da-hit-repeat-label">hits</span></span>
              {/if}
            </div>
          </div>
        </div>
         {/if}
     </div>
     </div>
   {/each}
   {#if _draconicBloodEntry}
    <div class="da-wbd-card da-wbd-card--active da-wbd-card--gun">
      <div class="da-wbd-card-head">
        <span class="da-wbd-dot da-wbd-dot--gun"></span>
        <span class="da-wbd-card-name">{_draconicBloodEntry.displayName}</span>
        <span class="da-wbd-gun-badge" style="background:rgba(56,189,248,.1);border-color:rgba(56,189,248,.25);color:#38bdf8">Rune</span>
      </div>
      <div class="da-wbd-card-divider"></div>
      <div class="da-wbd-section">
        <div class="da-hits-row">
          <div class="da-hit-card">
            {#each _draconicBloodEntry.typedHits_m2 as t, ti}
              {#if ti > 0}<span class="da-hit-plus">+</span>{/if}
              <div class="da-hit-chunk" style="--tc:{t.color}">
                <span class="da-hit-num" style="--tc:{t.color}">{fmtNum(t.val)}</span>
                <span class="da-hit-type">{t.label}</span>
              </div>
            {/each}
            {#if _draconicBloodEntry.guardbreak}<span class="da-pbd-badge da-pbd-badge--gb" style="align-self:center">GB</span>{/if}
          </div>
        </div>
      </div>
      {#if _draconicBloodEntry.secondaryEffects.length > 0}
        <div class="da-pbd-secondary-list" style="margin-top:6px">
          {#each _draconicBloodEntry.secondaryEffects as se}
            <div class="da-pbd-secondary" class:da-pbd-secondary--inactive={!se.isActive} style="--sc:{se.color}">
              <span class="da-pbd-secondary-label">{se.label}</span>
              <span class="da-pbd-secondary-val">{se.display}</span>
              {#if se.condition}<span class="da-pbd-secondary-cond">{se.condition}</span>{/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div><!-- end da-wbd-cards (current weapon) -->
{/if}



{#if _currentLabel}
  <p class="da-wbd-note">M1 = light attack combo · M2 = heavy attack · × = repeated hits</p>
{/if}
{/if}
</div><!-- end da-wbd-body -->
</div><!-- end da-section--wbd -->

<!-- ── Perk Base Damage ── -->
{#if _nonDraconicPerkEntries.length > 0}
<div class="da-section da-section--pbd">
  <div class="da-section-title-row">
    <span class="da-section-title">Perk Base Damage</span>
  </div>
  <div class="da-pbd-list">
    {#each _nonDraconicPerkEntries as entry}
      <div class="da-pbd-card">
        <!-- Header row -->
        <div class="da-pbd-head">
          <span class="da-pbd-name">{entry.displayName}</span>
          <span class="da-pbd-amt">+{Math.round(entry.perkAmount * 1000) / 1000}</span>
        </div>
        <!-- Badges -->
        <div class="da-pbd-badges">
          {#if entry.isFinisher}<span class="da-pbd-badge da-pbd-badge--finisher">Finisher</span>{/if}
          {#if entry.isM1}<span class="da-pbd-badge da-pbd-badge--m1">M1</span>{/if}
          {#if entry.isM2}<span class="da-pbd-badge da-pbd-badge--m2">M2</span>{/if}
          {#if entry.isWA}<span class="da-pbd-badge da-pbd-badge--wa">WA</span>{/if}
          {#if entry.isRune}<span class="da-pbd-badge da-pbd-badge--rune">Rune</span>{/if}
          {#if entry.guardbreak}<span class="da-pbd-badge da-pbd-badge--gb">Guardbreak</span>{/if}
          {#if entry.dmgTypeMode === 'weapon'}<span class="da-pbd-badge da-pbd-badge--weapon">Weapon Type</span>{/if}
        </div>
        <!-- Condition -->
        {#if entry.condition}
          <div class="da-pbd-condition">{entry.condition}</div>
        {/if}
        <!-- Springblast: finisher hit count slider -->
        {#if entry.perkName === 'Springblast'}
          <div class="da-sb-slider-wrap">
            <span class="da-sb-slider-label">Finisher hits</span>
            <input
              type="range" min="1" max="20" step="1"
              bind:value={springblastFinisherHits}
              class="da-sb-slider"
              style="--fill:{((springblastFinisherHits - 1) / 19) * 100}%"
            />
            <span class="da-sb-slider-val">{springblastFinisherHits}</span>
          </div>
        {/if}
        <!-- Typed damage: M2/main finisher -->
        <div class="da-pbd-dmg-row" class:da-pbd-dmg-row--inactive={!entry.isActive}>
          {#if entry.isFinisher && _m2FinisherHits > 1}
            <span class="da-pbd-ctx-label">M2 ({_m2FinisherHits} hits)</span>
          {/if}
          {#if !entry.isActive}
            <span class="da-pbd-inactive-badge">Inactive</span>
          {/if}
          <div class="da-hits-row">
            <div class="da-hit-card" class:da-hit-card--finisher={entry.isFinisher}>
              {#each entry.typedHits_m2 as t, ti}
                {#if ti > 0}<span class="da-hit-plus">+</span>{/if}
                <div class="da-hit-chunk" style="--tc:{t.color}" class:da-hit-chunk--rage={t.rageApplied}>
                  {#if t.val !== t.rawVal}
                    <span class="da-hit-raw">{fmtNum(t.rawVal)}</span>
                    <span class="da-hit-arrow">→</span>
                  {/if}
                  <span class="da-hit-num" style="--tc:{t.color}">
                    {fmtNum(t.val)}
                  </span>
                  <span class="da-hit-type">{t.label}</span>
                </div>
              {/each}
              {#if entry.hits && entry.hits > 1}
                <span class="da-hit-repeat">×{entry.hits}<span class="da-hit-repeat-label">hits</span></span>
              {/if}
              {#if entry.isFinisher}
                <span class="da-finisher-crown">✦</span>
              {/if}
            </div>
          </div>
        </div>
        <!-- M1 finisher context (only when different from M2) -->
        {#if entry.isFinisher && !entry.isM2 && Number(_m1FinisherHits) !== Number(_m2FinisherHits)}
          <div class="da-pbd-dmg-row">
            <span class="da-pbd-ctx-label">M1 fin ({_m1FinisherHits} hit{_m1FinisherHits > 1 ? 's' : ''})</span>
            <div class="da-hits-row">
              <div class="da-hit-card da-hit-card--finisher">
                {#each entry.typedHits_m1f as t, ti}
                  {#if ti > 0}<span class="da-hit-plus">+</span>{/if}
                  <div class="da-hit-chunk" style="--tc:{t.color}" class:da-hit-chunk--rage={t.rageApplied}>
                    {#if t.val !== t.rawVal}
                      <span class="da-hit-raw">{fmtNum(t.rawVal)}</span>
                      <span class="da-hit-arrow">→</span>
                    {/if}
                    <span class="da-hit-num" style="--tc:{t.color}">
                      {fmtNum(t.val)}
                    </span>
                    <span class="da-hit-type">{t.label}</span>
                  </div>
                {/each}
                <span class="da-finisher-crown">✦</span>
              </div>
            </div>
          </div>
        {/if}
        <!-- Springblast: total damage across all finisher hits -->
        {#if entry.perkName === 'Springblast' && springblastFinisherHits > 1}
          <div class="da-pbd-dmg-row">
            <span class="da-pbd-ctx-label">Total (×{springblastFinisherHits} hits)</span>
            <div class="da-hits-row">
              <div class="da-hit-card">
                {#each entry.typedHits_m2 as t, ti}
                  {#if ti > 0}<span class="da-hit-plus">+</span>{/if}
                  <div class="da-hit-chunk" style="--tc:{t.color}">
                    <span class="da-hit-num" style="--tc:{t.color}">
                      {fmtNum(Math.round(t.val * springblastFinisherHits * 10000) / 10000)}
                    </span>
                    <span class="da-hit-type">{t.label}</span>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        {/if}
        {#if entry.secondaryEffects.length > 0}
          <div class="da-pbd-secondary-list">
            {#each entry.secondaryEffects as se}
              <div class="da-pbd-secondary" class:da-pbd-secondary--inactive={!se.isActive} style="--sc:{se.color}">
                <span class="da-pbd-secondary-label">{se.label}</span>
                <span class="da-pbd-secondary-val">{se.display}</span>
                {#if !se.isActive}<span class="da-pbd-secondary-inactive">inactive</span>{/if}
                {#if se.condition}
                  <span class="da-pbd-secondary-cond">{se.condition}</span>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
        <!-- Note -->
        {#if entry.note}
          <div class="da-pbd-note">{entry.note}</div>
        {/if}
      </div>
    {/each}
  </div>
</div>
{/if}

</div><!-- end da-wbd-outer -->

<div class="da-right-col" class:da-right-col--collapsed={showAllWeapons}>
{#if _selfDamageSources.length > 0}
<div class="da-section da-section--selfdmg">
  <div class="da-section-title">Self Damage</div>

  <div class="da-selfdmg-row">
    <span class="da-selfdmg-label">Enemies Hit</span>
    <input
      type="number"
      min="1"
      step="1"
      bind:value={enemiesHit}
      class="da-selfdmg-input"
      aria-label="Enemies Hit"
    />
  </div>

  <div class="da-pbd-list">
    {#each _selfDamageSources as src (src.def.perkName + ':' + src.group + ':' + src.label)}
      <div class="da-pbd-card">
        <div class="da-pbd-head">
          <span class="da-pbd-name">{src.def.label}</span>
          <span class="da-pbd-amt">+{fmtNum(src.amount)}</span>
        </div>
        <div class="da-pbd-badges">
          <span class="da-pbd-badge" class:da-pbd-badge--wa={src.group === 'WA'} class:da-pbd-badge--rune={src.group === 'Rune'}>
            {src.group}
          </span>
        </div>
        <div class="da-pbd-condition">
          From {src.label}{enemiesHit > 1 ? ` · split across ${enemiesHit} enemies hit` : ''}
        </div>

        <div class="da-pbd-dmg-row">
          <span class="da-pbd-ctx-label">Total Self Damage</span>
          <div class="da-hits-row">
            <div class="da-hit-card">
              <div class="da-hit-chunk" style="--tc:var(--neg, #f87171)">
                <span class="da-hit-num" style="--tc:var(--neg, #f87171)">{fmtNum(src.result.total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="da-hits-row">
          {#each Object.entries(src.result.byType) as [type, val], i}
            <div class="da-hit-chunk" style="--tc:{DMG_TYPE_COLORS[type] ?? '#e8e4da'}">
              <span class="da-hit-num" style="--tc:{DMG_TYPE_COLORS[type] ?? '#e8e4da'}">{fmtNum(val)}</span>
              <span class="da-hit-type">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
            </div>
            {#if i < Object.entries(src.result.byType).length - 1}<span class="da-hit-plus">+</span>{/if}
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>
{/if}
<!-- ══════════════════ DAMAGE SCALING ══════════════════ -->
{#if _weaponResult && scalingBreakdown.rows.length > 0}
<div class="da-section da-section--scaling">
  <div class="da-section-title">📐 Damage Scaling</div>

  <div class="ds-formula-hint">
    Effective Boost = Σ (Scaling × Boost%) → adds to base as ×(1 + Effective%)
  </div>

  <div class="ds-table">
    <div class="ds-head">
      <div class="ds-col ds-col--type">Scaling</div>
      <div class="ds-col ds-col--val">Scaling Val</div>
      <div class="ds-col ds-col--op"></div>
      <div class="ds-col ds-col--boost">Your Boost</div>
      <div class="ds-col ds-col--op"></div>
      <div class="ds-col ds-col--contrib">Contribution</div>
    </div>

    {#each scalingBreakdown.rows as row}
      <div class="ds-row">
        <div class="ds-col ds-col--type">
          <span class="ds-dot" style="background:{row.color}"></span>
          <span style="color:{row.color}">{row.label ??(row.key.charAt(0).toUpperCase()+ row.key.slice(1))}</span>
        </div>
        <div class="ds-col ds-col--val">
          <span class="ds-num" style="color:{row.color}">{roundMultiplier(row.scalingVal)}</span>
        </div>
        <div class="ds-col ds-col--op">×</div>
        <div class="ds-col ds-col--boost">
          {#if row.boostPct !== 0}
            <span class="ds-boost" style={row.boostPct < 0 ? 'color: #cf6679;' : ''} class:ds-boost--zero={row.boostPct === 0}>
              {row.boostPct > 0 ? '+' : ''}{roundMultiplier(row.boostPct)}%
            </span>
          {:else}
            <span class="ds-boost ds-boost--zero">+0%</span>
          {/if}
        </div>
        <div class="ds-col ds-col--op">=</div>
        <div class="ds-col ds-col--contrib">
          <span class="ds-contrib" 
                class:ds-contrib--zero={row.contribution === 0} 
                style={row.contribution > 0 ? `color:${row.color}` : row.contribution < 0 ? 'color: #cf6679;' : ''}>
            {row.contribution > 0 ? '+' : ''}{row.contribution}%
          </span>
        </div>
      </div>
    {/each}

    <!-- Total row -->
    <div class="ds-row ds-row--total">
      <div class="ds-col ds-col--type ds-total-label">Total Effective Boost</div>
      <div class="ds-col ds-col--val"></div>
      <div class="ds-col ds-col--op"></div>
      <div class="ds-col ds-col--boost"></div>
      <div class="ds-col ds-col--op">=</div>
      <div class="ds-col ds-col--contrib">
        <span class="ds-total-pct">+{scalingBreakdown.totalEffectivePct}%</span>
      </div>
    </div>
  </div>

  <!-- Multiplier result -->
  <div class="ds-result-row">
    <div style="display:flex;flex-direction:column;gap:2px;flex:1;">
      <span class="ds-result-label">Scaling Multiplier</span>
      <span class="ds-applies-to">{waScalingSameAsWeapon ? 'M1 · M2 · Weapon Art' : 'M1 · M2'}</span>
    </div>
    <span class="ds-result-eq">1 + {scalingBreakdown.totalEffectivePct}% =</span>
    <span class="ds-result-val">×{+scalingBreakdown.multiplier.toFixed(4)}</span>
  </div>

  {#if scalingBreakdown.rows.some(r => r.boostPct === 0)}
    <p class="ds-warn">⚠ Some scalings have no matching boost stat — those contribute 0%</p>
  {/if}

  <!-- WA-specific scaling subsection (only when WA has its own formula) -->
  {#if waScalingBreakdown && !waScalingIsHealOnly}
    <div class="ds-wa-subsection">
      <div class="ds-wa-header">
        <span class="ds-sub-badge">WA</span>
        <span class="ds-wa-name">{selectedWA.name}</span>
      </div>
      <div class="ds-table">
        <div class="ds-head">
          <div class="ds-col ds-col--type">Scaling</div>
          <div class="ds-col ds-col--val">Scaling Val</div>
          <div class="ds-col ds-col--op"></div>
          <div class="ds-col ds-col--boost">Your Boost</div>
          <div class="ds-col ds-col--op"></div>
          <div class="ds-col ds-col--contrib">Contribution</div>
        </div>
        {#each waScalingBreakdown.rows as row}
          <div class="ds-row">
            <div class="ds-col ds-col--type">
              <span class="ds-dot" style="background:{row.color}"></span>
              <span style="color:{row.color}">{(row as any).label ?? (row.key.charAt(0).toUpperCase() + row.key.slice(1))}</span>
            </div>
            <div class="ds-col ds-col--val">
              <span class="ds-num" style="color:{row.color}">{roundMultiplier(row.scalingVal)}</span>
            </div>
            <div class="ds-col ds-col--op">×</div>
            <div class="ds-col ds-col--boost">
              {#if row.boostPct !== 0}
                <span class="ds-boost" style={row.boostPct < 0 ? 'color: #cf6679;' : ''}>
                  {row.boostPct > 0 ? '+' : ''}{roundMultiplier(row.boostPct)}%
                </span>
              {:else}
                <span class="ds-boost ds-boost--zero">+0%</span>
              {/if}
            </div>
            <div class="ds-col ds-col--op">=</div>
            <div class="ds-col ds-col--contrib">
              <span class="ds-contrib" 
                    class:ds-contrib--zero={row.contribution === 0}
                    style={row.contribution > 0 ? `color:${row.color}` : row.contribution < 0 ? 'color: #cf6679;' : ''}>
                {row.contribution > 0 ? '+' : ''}{row.contribution}%
              </span>
            </div>
          </div>
        {/each}
        <div class="ds-row ds-row--total">
          <div class="ds-col ds-col--type ds-total-label">Total</div>
          <div class="ds-col ds-col--val"></div>
          <div class="ds-col ds-col--op"></div>
          <div class="ds-col ds-col--boost"></div>
          <div class="ds-col ds-col--op">=</div>
          <div class="ds-col ds-col--contrib">
            <span class="ds-total-pct">+{waScalingBreakdown.totalEffectivePct}%</span>
          </div>
        </div>
      </div>
      
    </div>
      <div class="ds-result-row"
        style={waScalingIsHealOnly ? 'border-color:rgba(74,222,128,.2);background:rgba(74,222,128,.06)' : ''}>
        <div style="display:flex;flex-direction:column;gap:2px;flex:1;">
          <span class="ds-result-label" style={waScalingIsHealOnly ? 'color:#4ade80' : ''}>
            {waScalingIsHealOnly ? 'Heal Multiplier' : 'Scaling Multiplier'}
          </span>
          <span class="ds-applies-to">Weapon Art</span>
        </div>
        <span class="ds-result-eq">1 + {waScalingBreakdown.totalEffectivePct}% =</span>
        <span class="ds-result-val"
          style={waScalingIsHealOnly ? 'color:#4ade80;text-shadow:0 0 12px rgba(74,222,128,.4)' : ''}>
          ×{+waScalingBreakdown.multiplier.toFixed(4)}
        </span>
      </div>
      {#if waScalingBreakdown.rows.some(r => r.boostPct === 0)}
        <p class="ds-warn">⚠ Some WA scalings have no matching boost stat — those contribute 0%</p>
      {/if}
  {/if}
</div>
{:else if _weaponResult && Object.keys(_weaponResult.scalings).length > 0}
<div class="da-section da-section--scaling">
  <div class="da-section-title">
    📐 Damage Scaling
  </div>
  <p class="da-empty-hint">Weapon has scalings but no matching boost stats equipped — all contributions are 0%.</p>
  {#if waScalingBreakdown}
    {#if waScalingBreakdown.isPerHit}
      <div class="ds-result-row"style="background:rgba(167,139,250,.06);border-color:rgba(167,139,250,.2);">
        <span class="ds-result-label">Per-hit scaling</span>
        <span class="ds-result-val">see rows above</span>
      </div>
    {:else}
      <div class="ds-result-row">Scaling Multiplier×{waScalingBreakdown.multiplier.toFixed(4)}</div>
    {/if}
  {/if}
</div>
{/if}
{#if _weaponResult && scalingBreakdown.rows.length > 0
  && _nonDraconicPerkEntries.some(e =>(e.dmgTypeMode === 'fixed' ||e.dmgTypeMode === 'dynamic')&& Object.keys(e.resolvedScalings ?? {}).length > 0|| e.dmgTypeMode === 'weapon')}
  <div class="da-section da-section--scaling">
    <div class="da-section-title">📐 Damage Scaling</div>
    <div class="ds-formula-hint">Effective Boost = Σ (Scaling × Boost%) → adds to base as ×(1 + Effective%)</div>
    
    <div class="ds-table">
      <div class="ds-head">
        <div class="ds-col ds-col--type">Scaling</div>
        <div class="ds-col ds-col--val">Scaling Val</div>
        <div class="ds-col ds-col--op"></div>
        <div class="ds-col ds-col--boost">Your Boost</div>
        <div class="ds-col ds-col--op"></div>
        <div class="ds-col ds-col--contrib">Contribution</div>
      </div>

      {#each _nonDraconicPerkEntries as entry}
        {#if Object.keys(entry.resolvedScalings ?? {}).length > 0}
          <div class="da-perk-scaling-divider">
            <span class="da-perk-scaling-label">{entry.perkName}</span>
          </div>

          <div class="ds-table ds-table--perk" style="margin-top: 5px; font-size: 0.75rem; opacity: 0.9;">
            {#each Object.entries(entry.resolvedScalings ?? {}) as [key, scalingVal]}
              {@const boostKey = SCALING_TO_BOOST[key]}
              {@const boostVal = boostKey ? (stats[boostKey as keyof typeof stats] ?? 0) : 0}
              {@const isPct = boostKey ? PERCENT_STATS.has(boostKey) : true}
              {@const contrib = Math.round(scalingVal * boostVal * 1000) / 1000}
              
              <div class="ds-row">
                <div class="ds-col ds-col--type">
                  <span class="ds-dot" style="background: {SCALING_COLORS[key] ?? '#e8e4da'}"></span>
                  <span style="color: {SCALING_COLORS[key] ?? '#e8e4da'}">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                </div>
                <div class="ds-col ds-col--val">
                  <span class="ds-num" style="color: {SCALING_COLORS[key] ?? '#e8e4da'}">{scalingVal % 1 === 0 ? scalingVal.toFixed(1) : scalingVal.toFixed(4).replace(/\.?0+$/, '')}</span>
                </div>
                <div class="ds-col ds-col--op">×</div>
                
                <div class="ds-col ds-col--boost">
                  <span class="ds-boost" style={boostVal < 0 ? 'color: #cf6679;' : ''}>
                    {boostVal > 0 ? '+' : ''}{roundMultiplier(boostVal)}{isPct ? '%' : ''}
                  </span>
                </div>
                
                <div class="ds-col ds-col--op">=</div>
                
                <div class="ds-col ds-col--contrib">
                  <span class="ds-contrib" style="color: {contrib < 0 ? '#cf6679' : (SCALING_COLORS[key] ?? '#e8e4da')}">
                    {contrib > 0 ? '+' : ''}{contrib}{isPct ? '%' : ''}
                  </span>
                </div>
              </div>
            {/each} 
          </div>

          <div class="ds-result-row ds-result-row--perk" style="background: rgba(251, 146, 60, 0.05); border-color: rgba(251, 146, 60, 0.15);">
            <div style="display:flex;flex-direction:column;gap:2px;flex:1;">
              <span class="ds-result-label" style="color: #fb923c;">Perk: {entry.perkName} Scaling</span>
              {#if entry.dmgTypeMode === 'weapon'}
                <span class="ds-applies-to" style="opacity:.5;font-size:.58rem;">Same as weapon</span>
              {/if}
            </div>
            <span class="ds-result-eq">Multiplier =</span>
            <span class="ds-result-val">×{+entry.scalingMult.toFixed(4)}</span>
          </div>

        {:else if entry.dmgTypeMode === 'weapon'}
          <div class="da-perk-scaling-divider">
            <span class="da-perk-scaling-label">{entry.perkName}</span>
          </div>
          <div class="ds-result-row ds-result-row--perk" style="background: rgba(251, 146, 60, 0.05); border-color: rgba(251, 146, 60, 0.15);">
            <div style="display:flex;flex-direction:column;gap:2px;flex:1;">
              <span class="ds-result-label" style="color: #fb923c;">Perk: {entry.perkName} Scaling</span>
              <span class="ds-applies-to" style="opacity:.5;font-size:.58rem;">Same as weapon</span>
            </div>
            <span class="ds-result-eq">Multiplier =</span>
            <span class="ds-result-val">×{+entry.scalingMult.toFixed(4)}</span>
          </div>
        {/if}
      {/each}
    </div>
  </div>
{/if}

{#if runeScalingBreakdown || _draconicScalingBreakdown || _mountRuneScalingBreakdown}
<div class="da-section da-section--scaling">
  <div class="da-section-title">📐 Rune Damage Scaling</div>

  {#if runeScalingBreakdown}
    <div class="ds-wa-subsection" style="margin-top:0">
      <div class="ds-wa-header">
        <span class="ds-sub-badge" style="background:rgba(56,189,248,.16);border-color:rgba(56,189,248,.35);color:#38bdf8">Rune</span>
        <span class="ds-wa-name" style="color:#38bdf8">{_activeRuneDmgDef?.runeName}</span>
      </div>
      <div class="ds-table">
        <div class="ds-head">
          <div class="ds-col ds-col--type">Scaling</div>
          <div class="ds-col ds-col--val">Scaling Val</div>
          <div class="ds-col ds-col--op"></div>
          <div class="ds-col ds-col--boost">Your Boost</div>
          <div class="ds-col ds-col--op"></div>
          <div class="ds-col ds-col--contrib">Contribution</div>
        </div>
        {#each runeScalingBreakdown.rows as row}
          {@const isPct = row.boostKey ? PERCENT_STATS.has(row.boostKey) : true}
          <div class="ds-row">
            <div class="ds-col ds-col--type">
              <span class="ds-dot" style="background:{row.color}"></span>
              <span style="color:{row.color}">{row.key.charAt(0).toUpperCase() + row.key.slice(1)}</span>
            </div>
            <div class="ds-col ds-col--val">
              <span class="ds-num" style="color:{row.color}">{roundMultiplier(row.scalingVal)}</span>
            </div>
            <div class="ds-col ds-col--op">×</div>
            <div class="ds-col ds-col--boost">
              <span class="ds-boost" style={row.boostPct < 0 ? 'color: #cf6679;' : ''}>
                {row.boostPct > 0 ? '+' : ''}{roundMultiplier(row.boostPct)}{isPct ? '%' : ''}
              </span>
            </div>
            <div class="ds-col ds-col--op">=</div>
            <div class="ds-col ds-col--contrib">
              <span class="ds-contrib" style={row.contribution > 0 ? `color:${row.color}` : row.contribution < 0 ? 'color: #cf6679;' : ''}>
                {row.contribution > 0 ? '+' : ''}{roundMultiplier(isPct ? row.contribution : row.contribution * 100)}%
              </span>
            </div>
          </div>
        {/each}
        <div class="ds-row ds-row--total">
          <div class="ds-col ds-col--type ds-total-label">Total</div>
          <div class="ds-col ds-col--val"></div><div class="ds-col ds-col--op"></div><div class="ds-col ds-col--boost"></div>
          <div class="ds-col ds-col--op">=</div>
          <div class="ds-col ds-col--contrib">
            <span class="ds-total-pct">+{runeScalingBreakdown.totalEffectivePct}%</span>
          </div>
        </div>
      </div>
    </div>

    <div class="ds-result-row" style={_activeRuneDmgDef?.isHealOnly ? 'border-color:rgba(74,222,128,.2);background:rgba(74,222,128,.06)' : ''}>
      <div style="display:flex;flex-direction:column;gap:2px;flex:1;">
        <span class="ds-result-label" style={_activeRuneDmgDef?.isHealOnly ? 'color:#4ade80' : ''}>
          {_activeRuneDmgDef?.isHealOnly ? 'Heal Multiplier' : 'Scaling Multiplier'}
        </span>
        <span class="ds-applies-to">Rune</span>
      </div>
      <span class="ds-result-eq">1 + {runeScalingBreakdown.totalEffectivePct}% =</span>
      <span class="ds-result-val" style={_activeRuneDmgDef?.isHealOnly ? 'color:#4ade80;text-shadow:0 0 12px rgba(74,222,128,.4)' : ''}>
        ×{+runeScalingBreakdown.multiplier.toFixed(4)}
      </span>
    </div>
    {#if runeScalingBreakdown.rows.some(r => r.boostPct === 0)}
      <p class="ds-warn">⚠ Some Rune scalings have no matching boost stat — those contribute 0%</p>
    {/if}
  {/if}

  {#if _draconicScalingBreakdown}
    <div class="ds-wa-subsection" style="margin-top:{runeScalingBreakdown ? '12px' : '0'}">
      <div class="ds-wa-header">
        <span class="ds-sub-badge" style="background:rgba(56,189,248,.16);border-color:rgba(56,189,248,.35);color:#38bdf8">Rune</span>
        <span class="ds-wa-name" style="color:#38bdf8">{_draconicBloodEntry?.displayName}</span>
      </div>
      <div class="ds-table">
        <div class="ds-head">
          <div class="ds-col ds-col--type">Scaling</div>
          <div class="ds-col ds-col--val">Scaling Val</div>
          <div class="ds-col ds-col--op"></div>
          <div class="ds-col ds-col--boost">Your Boost</div>
          <div class="ds-col ds-col--op"></div>
          <div class="ds-col ds-col--contrib">Contribution</div>
        </div>
        {#each _draconicScalingBreakdown.rows as row}
          <ScalingBreakdownRow {row} />
        {/each}
        <div class="ds-row ds-row--total">
          <div class="ds-col ds-col--type ds-total-label">Total</div>
          <div class="ds-col ds-col--val"></div><div class="ds-col ds-col--op"></div><div class="ds-col ds-col--boost"></div>
          <div class="ds-col ds-col--op">=</div>
          <div class="ds-col ds-col--contrib">
            <span class="ds-total-pct">+{_draconicScalingBreakdown.totalEffectivePct}%</span>
          </div>
        </div>
      </div>
    </div>
    <div class="ds-result-row">
      <div style="display:flex;flex-direction:column;gap:2px;flex:1;">
        <span class="ds-result-label">Scaling Multiplier</span>
        <span class="ds-applies-to">Rune</span>
      </div>
      <span class="ds-result-eq">1 + {_draconicScalingBreakdown.totalEffectivePct}% =</span>
      <span class="ds-result-val">×{+_draconicScalingBreakdown.multiplier.toFixed(4)}</span>
    </div>
  {/if}
  {#if _mountRuneScalingBreakdown}
    <div class="ds-wa-subsection" style="margin-top:{(runeScalingBreakdown || _draconicScalingBreakdown) ? '12px' : '0'}">
      <div class="ds-wa-header">
        <span class="ds-sub-badge" style="background:rgba(251,146,60,.16);border-color:rgba(251,146,60,.35);color:#fb923c">Mount</span>
        <span class="ds-wa-name" style="color:#fb923c">{_activeMountRuneDef?.mountLabel} (M1 · WA)</span>
      </div>
      <div class="ds-table">
        <div class="ds-head">
          <div class="ds-col ds-col--type">Scaling</div>
          <div class="ds-col ds-col--val">Scaling Val</div>
          <div class="ds-col ds-col--op"></div>
          <div class="ds-col ds-col--boost">Your Boost</div>
          <div class="ds-col ds-col--op"></div>
          <div class="ds-col ds-col--contrib">Contribution</div>
        </div>
        {#each _mountRuneScalingBreakdown.rows as row}
          <ScalingBreakdownRow {row} />
        {/each}
        <div class="ds-row ds-row--total">
          <div class="ds-col ds-col--type ds-total-label">Total</div>
          <div class="ds-col ds-col--val"></div><div class="ds-col ds-col--op"></div><div class="ds-col ds-col--boost"></div>
          <div class="ds-col ds-col--op">=</div>
          <div class="ds-col ds-col--contrib">
            <span class="ds-total-pct">+{_mountRuneScalingBreakdown.totalEffectivePct}%</span>
          </div>
        </div>
      </div>
    </div>
    <div class="ds-result-row">
      <div style="display:flex;flex-direction:column;gap:2px;flex:1;">
        <span class="ds-result-label">Scaling Multiplier</span>
        <span class="ds-applies-to">Mount M1 · Mount WA</span>
      </div>
      <span class="ds-result-eq">1 + {_mountRuneScalingBreakdown.totalEffectivePct}% =</span>
      <span class="ds-result-val">×{+_mountRuneScalingBreakdown.multiplier.toFixed(4)}</span>
    </div>
  {/if}
</div>
{/if}

{#if _waHealScalingBreakdown || _perkHealScalingBreakdown}
<div class="da-section da-section--scaling" style="border-color:rgba(74,222,128,.2);background:linear-gradient(160deg,var(--surface,#141715) 60%,rgba(74,222,128,.03) 100%)">
  <div class="da-section-title" style="color:#4ade80">✦ Heal Scaling</div>

  <!-- WA heal scaling subsection (khi WA là heal-only) -->
  {#if _waHealScalingBreakdown}
    <div class="ds-wa-subsection" style="margin-top:12px">
      <div class="ds-wa-header">
        <span class="ds-sub-badge" style="background:rgba(74,222,128,.16);border-color:rgba(74,222,128,.35);color:#4ade80">WA</span>
        <span class="ds-wa-name" style="color:#4ade80">{selectedWA.name}</span>
      </div>
      <div class="ds-table">
        <div class="ds-head">
          <div class="ds-col ds-col--type">Scaling</div>
          <div class="ds-col ds-col--val">Scaling Val</div>
          <div class="ds-col ds-col--op"></div>
          <div class="ds-col ds-col--boost">Your Boost</div>
          <div class="ds-col ds-col--op"></div>
          <div class="ds-col ds-col--contrib">Contribution</div>
        </div>
        {#each _waHealScalingBreakdown.rows as row}
          <ScalingBreakdownRow {row} useRoundMultiplier={true} showZeroBoost={true} />
        {/each}
        <div class="ds-row ds-row--total" style="background:rgba(74,222,128,.07);border-color:rgba(74,222,128,.18)">
          <div class="ds-col ds-col--type ds-total-label" style="color:#4ade80">Total</div>
          <div class="ds-col ds-col--val"></div>
          <div class="ds-col ds-col--op"></div>
          <div class="ds-col ds-col--boost"></div>
          <div class="ds-col ds-col--op">=</div>
          <div class="ds-col ds-col--contrib">
            <span class="ds-total-pct" style="color:#4ade80;text-shadow:0 0 10px rgba(74,222,128,.4)">×{+_waHealScalingBreakdown.multiplier.toFixed(4)}</span>
          </div>
        </div>
      </div>
    </div>
    {#if _waHealScalingBreakdown.rows.some(r => r.boostPct === 0)}
      <p class="ds-warn">⚠ Some WA heal scalings have no matching boost stat — those contribute 0%</p>
    {/if}
  {/if}

  <!-- Perk heal scaling subsection (e.g., Dragon Claw Heal) -->
  {#if _perkHealScalingBreakdown}
    <div class="ds-wa-subsection" style="margin-top:{_waHealScalingBreakdown ? '12px' : '0'}">
      <div class="ds-wa-header">
        <span class="ds-sub-badge" style="background:rgba(56,189,248,.16);border-color:rgba(56,189,248,.35);color:#38bdf8">Perk</span>
        <span class="ds-wa-name" style="color:#38bdf8">{_perkHealScalingBreakdown.label}</span>
      </div>
      <div class="ds-table">
        <div class="ds-head">
          <div class="ds-col ds-col--type">Scaling</div>
          <div class="ds-col ds-col--val">Scaling Val</div>
          <div class="ds-col ds-col--op"></div>
          <div class="ds-col ds-col--boost">Your Boost</div>
          <div class="ds-col ds-col--op"></div>
          <div class="ds-col ds-col--contrib">Contribution</div>
        </div>
        {#each _perkHealScalingBreakdown.rows as row}
          <ScalingBreakdownRow {row} useRoundMultiplier={true} showZeroBoost={true} />
        {/each}
        <div class="ds-row ds-row--total" style="background:rgba(56,189,248,.07);border-color:rgba(56,189,248,.18)">
          <div class="ds-col ds-col--type ds-total-label" style="color:#38bdf8">Total</div>
          <div class="ds-col ds-col--val"></div>
          <div class="ds-col ds-col--op"></div>
          <div class="ds-col ds-col--boost"></div>
          <div class="ds-col ds-col--op">=</div>
          <div class="ds-col ds-col--contrib">
            <span class="ds-total-pct" style="color:#38bdf8;text-shadow:0 0 10px rgba(56,189,248,.4)">×{+_perkHealScalingBreakdown.multiplier.toFixed(4)}</span>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
{/if}

</div><!-- end da-right-col -->
</div><!-- end da-main-row -->

{#if _activeMountRuneDef}
  <div class="da-section da-section--mount">
    <div class="da-section-title">{_activeMountRuneDef.mountLabel} Mount</div>
    <div class="ap-toggle-row">
      <span class="ap-toggle-label">{_activeMountRuneDef.mountLabel}</span>
      <button class="ap-toggle-btn" class:ap-toggle-btn--on={mountActive}
        on:click={() => mountActive = !mountActive}>
        {mountActive ? 'Mounted' : 'On Foot'}
      </button>
    </div>
    {#if mountActive}
      <p class="da-empty-hint">
        WA Guardbreaks · applies {_activeMountRuneDef.wa.secondaryEffects?.[0]?.display ?? ''} Shatter · sets WA CD to {_activeMountRuneDef.wa.setCooldown}s (CD override not wired into CDR system yet)
      </p>
    {/if}
  </div>
{/if}

<BaseDamageCalc {boosts} {crit} {stats} {disabledBoosts} {activeFinalMult}
  weaponHits={_bdcWeaponHits}
  perkDmgTypeBonuses={_perkDmgTypeBonuses}
  typedBoostEntries={_typedBoostEntries}
  luminescentPct={_luminescentPct}
  selfDebuffDamageMult={_selfDebuffDamageMult}
  antiHealSelfMult={_antiHealSelfMult}
  lightningCloakPct={_lightningCloakPct}
  stormRendPct={_stormRendPct}
  explosiveChargePct={_explosiveChargePct}
  blubBlubAmt={_blubBlubAmt}
  dragonStateBaseDmg={_dragonStateHpGateActive ? _dragonStateBaseDmg : 0}
  dragonStateScalingMult={_dragonStateScalingMult}
  dragonStateCombatMult={_dragonStateCombatMult}
  dragonStateTotalDmg={_dragonStateTotalDmg}
  darkMagicHexBonus={_darkMagicHexBonus}
  perkOnHitDamages={_perkOnHitDamages}
  waArmorPenetration={_waArmorPenetration}
  m1Label={_activeMountRuneDef && mountActive ? 'M1/M2' : 'M1'}
  draconicRunesBonus={getDraconicBonuses({
    draconicRunesStacks: perks['Draconic Runes'] ?? 0,
    draconicColor: $build.draconicColor || 'physical',
  }, {
    isActive: $build.draconicRuneInfusion === 'infusion',
    buffPotency: getEffectiveDraconicInfusionPotency($build.guild, $build.draconicRuneInfusion, $build.draconicColor || 'physical', perks['Draconic Blood'] ?? 0, perks),
    draconicColor: $build.draconicColor || 'physical',
  })}
  showCritToggle={_showCrit}
  appliedDebuffs={_dummyDebuffs}
  curseRipPerkAmount={_curseRipPerkAmount}
  curseRipActiveDebuffCount={_curseRipActiveDebuffCount}
  curseRipHealMult={_curseRipHealMult}
  healCritDmgMult={_healCritDmgMult}
  venomEaterStacks={perks['Venom Eater'] ?? 0}
  bind:disabledDebuffs
  bind:showCritValues
/>
</div>

<style>
  .da-root {
    display: flex;
    flex-direction: column;
    gap: 16px;
    font-family: var(--font-body, 'Trebuchet MS', sans-serif);
  }
  .da-main-row {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }
  .da-wbd-outer--expanded {
    flex: 0 0 360px;
  }
  .da-right-col {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .da-right-col--collapsed {
    display: flex;
  }
  @media (max-width: 768px) {
    .da-main-row {
      flex-direction: column;
    }
    .da-wbd-outer {
      flex: none !important;
      width: 100% !important;
      order: 0 !important;
    }
    .da-right-col {
      flex: none !important;
      width: 100% !important;
    }
  }

  /* ── Section ── */
  .da-section {
    background: var(--surface, #141715);
    border: 1px solid var(--border, rgba(255,255,255,.06));
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .da-section-title {
    font-size: .65rem;
    text-transform: uppercase;
    letter-spacing: .18em;
    font-weight: 800;
    color: var(--ink-muted, #8a8d85);
    border-bottom: 1px solid var(--border, rgba(255,255,255,.06));
    padding-bottom: 8px;
  }

  /* ── Crit grid ── */
  .da-crit-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 10px;
  }
  .da-stat-card {
    background: var(--surface2, #1a1d1b);
    border: 1px solid var(--border, rgba(255,255,255,.06));
    border-radius: 8px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .da-stat-card--crit    { border-color: rgba(226,178,3,.2); }
  .da-stat-card--critdmg { border-color: rgba(167,139,250,.2); }

  .da-stat-label {
    font-size: .62rem;
    text-transform: uppercase;
    letter-spacing: .12em;
    font-weight: 700;
    color: var(--ink-muted, #8a8d85);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .da-stat-val {
    font-size: 1.6rem;
    font-weight: 900;
    line-height: 1;
    font-family: 'Courier New', monospace;
  }
  .da-sources {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-top: 2px;
  }
  .da-source-row {
    display: flex;
    justify-content: space-between;
    font-size: .72rem;
    padding: 3px 6px;
    border-radius: 5px;
    background: var(--surface3, #212420);
  }
  .da-source-name { color: var(--ink-muted, #8a8d85); display: flex; align-items: center; gap: 5px; }
  .da-source-val  { font-weight: 700; }
  .da-source-formula {
    font-size: .6rem;
    color: var(--ink-muted, #8a8d85);
    opacity: .45;
    font-style: italic;
    padding-top: 4px;
    border-top: 1px solid rgba(255,255,255,.05);
    margin-top: 2px;
  }
  .da-empty-hint {
    font-size: .68rem;
    color: var(--ink-muted, #8a8d85);
    opacity: .45;
    font-style: italic;
  }

  /* ── Boost row ── */
  .da-boost-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 5px;
  }
  .da-boost-chip {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 5px 10px;
    border-radius: 8px;
    background: rgba(251,146,60,.08);
    border: 1px solid rgba(251,146,60,.2);
    cursor: pointer;
  }
  .da-boost-chip--lvl {
    background: rgba(251,191,36,.08);
    border-color: rgba(251,191,36,.2);
  }
  .da-boost-chip--heal {
    background: rgba(74,222,128,.08);
    border-color: rgba(74,222,128,.2);
  }
  .da-bc-name { font-size: .68rem; font-weight: 700; color: var(--ink, #e8e4da); }
  .da-bc-val  { font-size: .82rem; font-weight: 800; color: #fb923c; }
  .da-boost-chip--lvl .da-bc-val { color: #fbbf24; }
  .da-bc-cond { font-size: .55rem; color: var(--ink-muted, #8a8d85); opacity: .6; font-style: italic; text-align: center; max-width: 80px; }
  .da-chain-op { font-size: .8rem; color: var(--ink-muted, #8a8d85); opacity: .5; font-weight: 700; }
  .da-chain-result { font-size: 1rem; font-weight: 900; color: #fb923c; background: rgba(251,146,60,.1); padding: 4px 10px; border-radius: 8px; }
  .da-heal-label { font-size: .62rem; font-weight: 700; color: #4ade80; text-transform: uppercase; letter-spacing: .1em; padding: 4px 8px; background: rgba(74,222,128,.08); border-radius: 6px; border: 1px solid rgba(74,222,128,.2); flex-shrink: 0; }
.da-boost-chip--off {
  opacity: 0.4;
  filter: grayscale(0.7);
  border-style: dashed;
}
.da-boost-chip--off .da-bc-val {
  color: var(--ink-muted, #8a8d85);
  text-decoration: line-through;
}

.da-bc-toggle {
  font-size: .48rem;
  font-weight: 800;
  letter-spacing: .1em;
  padding: 1px 4px;
  border-radius: 3px;
  margin-top: 2px;
  background: rgba(74,222,128,.15);
  color: #4ade80;
}
.da-boost-chip--off .da-bc-toggle {
  background: rgba(248,113,113,.12);
  color: #f87171;
}



.da-chain-result--dimmed {
  color: #fb923c;
  background: rgba(251,146,60,.18);
}
.da-chain-orig {
  font-size: .65rem;
  opacity: .4;
  font-weight: 500;
  margin-left: 4px;
  text-decoration: line-through;
}

/* ── Top row: 2 columns ── */
.da-top-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: start;
}
@media (max-width: 560px) {
  .da-top-row {
    grid-template-columns: 1fr;
  }
}

.da-section--apen {
  border-color: rgba(229,229,229,.18);
  background: linear-gradient(160deg, var(--surface, #141715) 60%, rgba(229,229,229,.03) 100%);
  min-width: 130px;
  height: 100%;
  text-align: center;
}
.da-apen-inner {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.da-apen-val {
  font-size: 2rem;
  font-weight: 900;
  color: #e5e5e5;
  font-family: 'Courier New', monospace;
  line-height: 1;
}

/* ── Weapon Base Damage ── */
.da-section--wbd {
  border-color: rgba(251,146,60,.15);
}
.da-section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  border-bottom: 1px solid var(--border, rgba(255,255,255,.06));
  padding-bottom: 8px;
}
.da-section-title-row .da-section-title {
  border-bottom: none;
  padding-bottom: 0;
}
.da-wbd-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}
.da-wbd-current-badge {
  font-size: .65rem;
  font-weight: 700;
  padding: 2px 9px;
  border-radius: 999px;
  background: rgba(251,146,60,.14);
  border: 1px solid rgba(251,146,60,.3);
  color: #fb923c;
}
.da-wbd-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 6px;
  border: 1px solid rgba(251,146,60,.18);
  background: rgba(251,146,60,.07);
  color: #fb923c;
  cursor: pointer;
  font-family: inherit;
  transition: all .12s;
  font-size: .72rem;
  font-weight: 700;
}
.da-wbd-toggle:hover {
  background: rgba(251,146,60,.13);
  border-color: rgba(251,146,60,.35);
}
.da-wbd-toggle--open {
  background: rgba(251,146,60,.11);
  border-color: rgba(251,146,60,.25);
}
.da-wbd-toggle-arr {
  font-size: .55rem;
  opacity: .6;
}
.da-wbd-toggle-lbl {
  letter-spacing: .04em;
}
.da-wbd-toggle-cnt {
  font-size: .6rem;
  background: rgba(251,146,60,.15);
  border: 1px solid rgba(251,146,60,.25);
  border-radius: 999px;
  padding: 1px 6px;
  font-weight: 800;
}
/* Table */

.da-wbd-na {
  color: var(--ink-muted, #8a8d85);
  opacity: .3;
  font-style: italic;
  font-family: var(--font-body, 'Trebuchet MS', sans-serif);
  font-size: .65rem;
}
.da-wbd-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fb923c;
  flex-shrink: 0;
  box-shadow: 0 0 5px rgba(251,146,60,.6);
}
.da-wbd-dot--gun {
  background: linear-gradient(135deg, #fb923c, #38bdf8);
  box-shadow: 0 0 5px rgba(56,189,248,.5);
}
.da-wbd-gun-badge {
  font-size: .6rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(56,189,248,.1);
  border: 1px solid rgba(56,189,248,.25);
  color: #38bdf8;
  font-family: var(--font-body, 'Trebuchet MS', sans-serif);
  flex-shrink: 0;
}
.da-wbd-m2-src {
  font-size: .58rem;
  color: #38bdf8;
  opacity: .6;
  font-style: italic;
  font-family: var(--font-body, 'Trebuchet MS', sans-serif);
  flex-shrink: 0;
}
.da-wbd-note {
  font-size: .62rem;
  color: var(--ink-muted, #8a8d85);
  opacity: .45;
  font-style: italic;
  margin-top: 2px;
}

/* ── Typed hits — pill card design ── */
.da-hits-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.da-hit-divider {
  font-size: .65rem;
  color: var(--ink-muted, #8a8d85);
  opacity: .3;
  flex-shrink: 0;
  user-select: none;
}

.da-hit-card {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 7px;
  padding: 3px 7px 3px 6px;
  position: relative;
}

.da-hit-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.da-hit-repeat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(251,191,36,.1);
  border: 1px solid rgba(251,191,36,.3);
  font-weight: 900;
  font-size: .78rem;
  color: #fbbf24;
  white-space: nowrap;
  flex-shrink: 0;
  letter-spacing: .02em;
}
.da-hit-repeat span,
.da-hit-repeat-label {
  font-size: .56rem;
  font-weight: 700;
  opacity: .6;
  text-transform: uppercase;
  letter-spacing: .12em;
}

.da-hit-plus {
  font-size: .6rem;
  color: var(--ink-muted, #8a8d85);
  opacity: .3;
  margin: 0 1px;
  font-family: var(--font-body, 'Trebuchet MS', sans-serif);
}

.da-hit-chunk {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
  gap: 1px;
}

.da-hit-raw {
  font-size: .7rem;
  font-weight: 500;
  color: var(--ink-muted, #8a8d85);
  opacity: .45;
  text-decoration: line-through;
  font-family: 'Courier New', monospace;
  letter-spacing: -.01em;
}

.da-hit-arrow {
  font-size: .55rem;
  color: var(--ink-muted, #8a8d85);
  opacity: .3;
  margin: 0 1px;
  user-select: none;
}

.da-wbd-scaling-badge {
  font-size: .62rem;
  font-weight: 700;
  padding: 2px 9px;
  border-radius: 999px;
  background: rgba(52,211,153,.12);
  border: 1px solid rgba(52,211,153,.3);
  color: #34d399;
  white-space: nowrap;
}

.da-hit-num {
  font-size: .88rem;
  font-weight: 800;
  color: var(--tc, #e8e4da);
  font-family: 'Courier New', monospace;
  letter-spacing: -.01em;
  text-shadow: 0 0 10px color-mix(in srgb, var(--tc, #e8e4da) 50%, transparent);
}

.da-hit-type {
  font-size: .5rem;
  font-weight: 700;
  color: var(--tc, #e8e4da);
  opacity: .6;
  text-transform: uppercase;
  letter-spacing: .1em;
  font-family: var(--font-body, 'Trebuchet MS', sans-serif);
}
/* ── Damage Scaling section ── */
.da-section--scaling {
  border-color: rgba(52,211,153,.18);
  background: linear-gradient(160deg, var(--surface, #141715) 60%, rgba(52,211,153,.03) 100%);
}

.ds-formula-hint {
  font-size: .65rem;
  color: var(--ink-muted, #8a8d85);
  font-style: italic;
  opacity: .6;
  padding: 4px 8px;
  background: rgba(255,255,255,.02);
  border-radius: 5px;
  border: 1px solid rgba(255,255,255,.04);
}

.ds-table {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ds-head {
  display: grid;
  grid-template-columns: 120px 80px 20px 90px 20px 100px;
  gap: 4px;
  padding: 4px 8px;
  font-size: .55rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .13em;
  color: var(--ink-muted, #8a8d85);
  opacity: .6;
}

.ds-row {
  display: grid;
  grid-template-columns: 120px 80px 20px 90px 20px 100px;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--surface2, #1a1d1b);
  align-items: center;
  border: 1px solid transparent;
  transition: background .1s;
}
.ds-row:hover { background: var(--surface3, #212420); }

.ds-row--total {
  background: rgba(52,211,153,.06);
  border-color: rgba(52,211,153,.15);
  margin-top: 4px;
}

.ds-col {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: .78rem;
}
.ds-col--op {
  justify-content: center;
  font-size: .7rem;
  color: var(--ink-muted, #8a8d85);
  opacity: .4;
  font-weight: 700;
}
.ds-col--val { justify-content: flex-end; }
.ds-col--contrib { justify-content: flex-end; }
.ds-col--boost { justify-content: flex-end; }

.ds-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ds-num {
  font-family: 'Courier New', monospace;
  font-weight: 800;
  font-size: .88rem;
}

.ds-boost {
  font-family: 'Courier New', monospace;
  font-weight: 700;
  font-size: .82rem;
  color: #4ade80;
}
.ds-boost--zero { color: var(--ink-muted, #8a8d85); opacity: .35; }

.ds-contrib {
  font-family: 'Courier New', monospace;
  font-weight: 800;
  font-size: .88rem;
}
.ds-contrib--zero { color: var(--ink-muted, #8a8d85); opacity: .35; }

.ds-total-label {
  font-size: .65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: #34d399;
  opacity: .8;
  grid-column: 1 / 5;
}

.ds-total-pct {
  font-family: 'Courier New', monospace;
  font-weight: 900;
  font-size: 1rem;
  color: #34d399;
}

.ds-result-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 7px;
  background: rgba(52,211,153,.08);
  border: 1px solid rgba(52,211,153,.2);
  flex-wrap: wrap;
}
.ds-result-label {
  font-size: .62rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .14em;
  color: #34d399;
  opacity: .7;
  flex: 1;
}
.ds-result-eq {
  font-size: .75rem;
  color: var(--ink-muted, #8a8d85);
}
.ds-result-val {
  font-family: 'Courier New', monospace;
  font-size: 1.2rem;
  font-weight: 900;
  color: #34d399;
  text-shadow: 0 0 12px rgba(52,211,153,.4);
}

.ds-warn {
  font-size: .68rem;
  color: #f59e0b;
  padding: 5px 8px;
  background: rgba(245,158,11,.08);
  border: 1px solid rgba(245,158,11,.2);
  border-radius: 5px;
}

@media (max-width: 480px) {
  .da-section {
    padding: 10px 12px;
  }
  .ds-head,
  .ds-row {
    grid-template-columns: minmax(65px,1fr) 45px 14px 55px 14px 65px;
    gap: 3px;
    padding: 5px 6px;
    font-size: .62rem;
  }
  .ds-col {
    font-size: .65rem;
    gap: 4px;
  }
  .ds-col--op {
    font-size: .6rem;
  }
  .ds-num, .ds-boost, .ds-contrib {
    font-size: .7rem;
  }
  .ds-result-val {
    font-size: 1rem;
  }
  .ds-formula-hint {
    font-size: .55rem;
    line-height: 1.35;
  }
  .ds-total-pct {
    font-size: .85rem;
  }
  .ds-total-label {
    font-size: .58rem;
  }
}

.da-wbd-body {
  position: relative;
}
.da-wbd-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 8px;
}
.da-wbd-cards--dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 100;
  width: auto;
  min-width: 360px;
  max-height: 60vh;
  overflow-y: auto;
   background: #18181b;
  border: 1px solid rgba(251,146,60,.25);
  border-radius: 10px;
  padding: 8px;
  scrollbar-width: thin;
  scrollbar-color: rgba(251,146,60,.25) transparent;
  box-shadow: 0 8px 32px rgba(0,0,0,.55), 0 2px 8px rgba(0,0,0,.3);
  animation: daFadeIn .15s ease-out;
}
.da-wbd-cards--dropdown::-webkit-scrollbar {
  width: 5px;
}
.da-wbd-cards--dropdown::-webkit-scrollbar-track {
  background: transparent;
}
.da-wbd-cards--dropdown::-webkit-scrollbar-thumb {
  background: rgba(251,146,60,.2);
  border-radius: 999px;
}
.da-wbd-cards--dropdown::-webkit-scrollbar-thumb:hover {
  background: rgba(251,146,60,.35);
}
@keyframes daFadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.da-wbd-card {
  background: var(--surface2, #1a1d1b);
  border: 1px solid rgba(255,255,255,.06);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: background .12s, border-color .12s;
}

.da-wbd-card--active {
  border-color: rgba(251,146,60,.25);
  background: linear-gradient(160deg, rgba(251,146,60,.05) 0%, var(--surface2, #1a1d1b) 60%);
  box-shadow: 0 0 0 1px rgba(251,146,60,.08) inset;
}

.da-wbd-card--gun {
  border-color: rgba(56,189,248,.2);
  background: linear-gradient(
    160deg,
    rgba(251,146,60,.04),
    rgba(56,189,248,.04)
  );
}
.da-wbd-card-head {
  display: flex;
  align-items: center;
  gap: 5px;
}
.da-wbd-card-name {
  font-size: .88rem;
  font-weight: 700;
  color: var(--ink, #e8e4da);
  flex: 1;
}
.da-wbd-card-divider {
  height: 1px;
  background: rgba(255,255,255,.06);
  margin: 1px 0;
}
.da-plain-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: 7px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.09);
}
.da-plain-num {
  font-weight: 800;
  font-size: .84rem;
  color: var(--ink, #e8e4da);
  font-family: 'Courier New', monospace;
  letter-spacing: -.01em;
}
.da-plain-count {
  font-size: .62rem;
  color: rgba(251,191,36,.75);
  font-weight: 700;
  font-family: 'Courier New', monospace;
}
.da-wbd-section + .da-wbd-section {
  padding-top: 6px;
  border-top: 1px dashed rgba(255,255,255,.05);
}

/* Row label — badge + text side by side */
.da-wbd-row-label {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 5px;
  flex-wrap: wrap;
}
.da-wbd-row-label--rune .da-wbd-lbl-text {
  color: #38bdf8;
  opacity: 0.7;
}
.da-wbd-lbl-badge {
  font-size: .58rem;
  font-weight: 900;
  letter-spacing: .1em;
  padding: 2px 7px;
  border-radius: 4px;
  text-transform: uppercase;
  flex-shrink: 0;
}
.da-wbd-lbl-badge--m1 {
  background: rgba(251,146,60,.18);
  border: 1px solid rgba(251,146,60,.35);
  color: #fb923c;
}
.da-wbd-lbl-badge--m2 {
  background: rgba(251,191,36,.14);
  border: 1px solid rgba(251,191,36,.3);
  color: #fbbf24;
}
.da-wbd-lbl-badge--wa {
  background: rgba(167,139,250,.16);
  border: 1px solid rgba(167,139,250,.35);
  color: var(--accent3);
}
.da-wbd-lbl-badge--rune {
  background: rgba(56,189,248,.16);
  border: 1px solid rgba(56,189,248,.35);
  color: #38bdf8;
}
.da-wbd-lbl-text {
  font-size: .6rem;
  font-weight: 600;
  color: var(--ink-muted);
  opacity: .55;
  text-transform: uppercase;
  letter-spacing: .1em;
}
.da-wbd-lbl-text--wa {
  color: var(--accent3);
  opacity: .75;
  font-weight: 700;
  text-transform: none;
  letter-spacing: 0;
  font-size: .72rem;
}

/* Range damage display */
.da-range-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.da-range-end {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.da-range-arrow {
  font-size: .75rem;
  color: var(--ink-muted);
  opacity: .4;
  font-weight: 700;
  flex-shrink: 0;
}
.da-range-label {
  font-size: .6rem;
  color: var(--ink-muted);
  opacity: .5;
  font-style: italic;
  font-weight: 600;
  white-space: nowrap;
}
.da-range-label--max {
  color: var(--accent3);
  opacity: .7;
}
.da-hit-chunk--sm .da-hit-num { font-size: .78rem; }
.da-hit-chunk--sm .da-hit-type { font-size: .48rem; }
.da-range-scl {
  font-size: .62rem;
  color: var(--ink-muted);
  font-style: italic;
  padding: 2px 8px;
  background: rgba(255,255,255,.03);
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.07);
}
.da-ww-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: .6rem; padding: 1px 6px;
  background: rgba(170,255,219,.1); border: 1px solid rgba(170,255,219,.25);
  border-radius: 999px;
}
.da-ww-air { color: #AAFFDB; font-weight: 700; }
.da-ww-label { color: rgba(170,255,219,.6); font-size: .52rem; }
.da-heal-hits-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px dashed rgba(74,222,128,.15);
}
.da-heal-badge {
  font-size: .58rem;
  font-weight: 800;
  color: #4ade80;
  padding: 1px 6px;
  background: rgba(74,222,128,.1);
  border: 1px solid rgba(74,222,128,.2);
  border-radius: 999px;
  flex-shrink: 0;
}
.da-hit-card--heal {
  border-color: rgba(74,222,128,.2);
  background: rgba(74,222,128,.06);
}
.da-rifle-charge-wrap {
  margin-top: 10px;
  padding: 10px 13px 8px;
  border-radius: 10px;
  background: rgba(251,191,36,.06);
  border: 1px solid rgba(251,191,36,.22);
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 170px;
}
.da-rifle-charge-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.da-rcl-name {
  font-size: .57rem;
  font-weight: 800;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: #d97706;
}
.da-rcl-pct {
  font-size: .85rem;
  font-weight: 900;
  color: #fbbf24;
  font-family: 'Courier New', monospace;
  line-height: 1;
}
.da-rifle-charge-slider {
  width: 100%;
  appearance: none;
  height: 6px;
  border-radius: 999px;
  outline: none;
  cursor: pointer;
  background: linear-gradient(
    90deg,
    #fb923c var(--fill, 100%),
    rgba(255,255,255,.1) var(--fill, 100%)
  );
}
.da-rifle-charge-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fbbf24;
  border: 2.5px solid rgba(0,0,0,.55);
  cursor: grab;
  box-shadow: 0 0 0 3px rgba(251,191,36,.18);
  transition: transform .1s, box-shadow .1s;
}
.da-rifle-charge-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 0 0 5px rgba(251,191,36,.28);
}
.da-rifle-charge-slider::-webkit-slider-thumb:active {
  cursor: grabbing;
  transform: scale(1.08);
}
.da-rifle-charge-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fbbf24;
  border: 2px solid rgba(0,0,0,.5);
  cursor: grab;
}
.da-rifle-marks {
  display: flex;
  justify-content: space-between;
  padding: 0 1px;
}
.da-rifle-marks span {
  font-size: .52rem;
  color: rgba(251,191,36,.38);
  font-weight: 700;
  font-family: 'Courier New', monospace;
  letter-spacing: .02em;
}
.da-wbd-equipped-badge {
  font-size: .55rem;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(251,146,60,.18);
  border: 1px solid rgba(251,146,60,.4);
  color: #fb923c;
  letter-spacing: .1em;
  text-transform: uppercase;
  animation: da-pulse 2s ease-in-out infinite;
}

@keyframes da-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251,146,60,.4); }
  50%       { box-shadow: 0 0 0 4px rgba(251,146,60,.0); }
}
.da-wbd-gun-active-badge {
  font-size: .55rem;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(56,189,248,.18);
  border: 1px solid rgba(56,189,248,.4);
  color: #38bdf8;
  letter-spacing: .1em;
  text-transform: uppercase;
  animation: da-pulse-gun 2s ease-in-out infinite;
}

@keyframes da-pulse-gun {
  0%, 100% { box-shadow: 0 0 0 0 rgba(56,189,248,.4); }
  50%       { box-shadow: 0 0 0 4px rgba(56,189,248,.0); }
}
.da-summon-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: rgba(192,132,252,.08);
  border: 1px solid rgba(192,132,252,.22);
  border-radius: 7px;
  width: fit-content;
}
.da-summon-label {
  font-size: .62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: #c084fc;
  opacity: .8;
}
.da-summon-input {
  font-family: 'Courier New', monospace;
  font-size: .9rem;
  font-weight: 800;
  color: #c084fc;
  background: none;
  border: none;
  outline: none;
  width: 36px;
  text-align: center;
  -moz-appearance: textfield;
  appearance: textfield;
}
.da-summon-input::-webkit-inner-spin-button,
.da-summon-input::-webkit-outer-spin-button { -webkit-appearance: none; }
.da-summon-max {
  font-size: .62rem;
  color: #c084fc;
  opacity: .45;
  font-family: 'Courier New', monospace;
}
.da-hit-chunk--rage .da-hit-num {
  text-shadow: 0 0 14px color-mix(in srgb, var(--tc) 80%, #f70201);
}
.da-rage-badge {
  font-size: .75rem; font-weight: 800;
  color: #f70201; font-family: 'Courier New', monospace;
}
.da-rage-types { font-size: .68rem; color: var(--ink-muted); }
.da-buff-sources { font-size: .55rem; color: var(--ink-muted); opacity: .45; margin-left: 4px; }

.da-hit-card--finisher {
  position: relative;
  border: 1.5px solid rgba(250, 204, 21, 0.75) !important;
  background: linear-gradient(135deg, rgba(20, 20, 20, 0.85) 0%, rgba(250, 204, 21, 0.12) 100%) !important;
  box-shadow: 0 0 12px rgba(250, 204, 21, 0.35), inset 0 0 8px rgba(250, 204, 21, 0.1) !important;
  overflow: visible;
  animation: finisherPulse 3s infinite ease-in-out;
}

@keyframes finisherPulse {
  0%, 100% {
    box-shadow: 0 0 10px rgba(250, 204, 21, 0.25), inset 0 0 6px rgba(250, 204, 21, 0.05);
    border-color: rgba(250, 204, 21, 0.6);
  }
  50% {
    box-shadow: 0 0 16px rgba(250, 204, 21, 0.5), inset 0 0 12px rgba(250, 204, 21, 0.2);
    border-color: rgba(250, 204, 21, 1);
  }
}

.da-finisher-crown {
  position: absolute;
  top: -8px;
  right: -4px;
  font-size: 0.9rem;
  color: #facc15;
  text-shadow: 0 0 6px #facc15, 0 0 2px #000;
  z-index: 10;
  transform: rotate(15deg);
  font-weight: bold;
}

.da-plain-pill--finisher {
  position: relative;
  border: 1px solid #facc15 !important;
  background: rgba(250, 204, 21, 0.1) !important;
  box-shadow: 0 0 8px rgba(250, 204, 21, 0.2);
}

.da-finisher-badge-mini {
  background: #facc15 !important;
  color: #111 !important;
  font-weight: 900 !important;
  padding: 1px 4px !important;
  border-radius: 3px !important;
  font-size: 0.6rem !important;
}

/* ── WBD outer: fixed 360px right column ── */
.da-wbd-outer {
  flex: 0 0 360px;
  order: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.da-section--wbd-inner {
  min-width: 0;
}

/* ── Perk Base Damage section ── */
.da-section--pbd {
  width: 100%;
  border-color: rgba(167,139,250,.2);
  background: linear-gradient(160deg, var(--surface, #141715) 60%, rgba(167,139,250,.04) 100%);
}

.da-pbd-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.da-pbd-card {
  background: var(--surface2, #1a1d1b);
  border: 1px solid rgba(167,139,250,.14);
  border-left: 3px solid rgba(167,139,250,.18);
  border-radius: 8px;
  padding: 11px 13px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.da-pbd-head {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}
.da-pbd-name {
  font-size: .88rem;
  font-weight: 800;
  color: var(--accent3, #a78bfa);
  line-height: 1;
}
.da-pbd-amt {
  font-size: .65rem;
  font-weight: 700;
  color: var(--accent2, #f59e0b);
  font-family: 'Courier New', monospace;
  background: rgba(245,158,11,.1);
  border: 1px solid rgba(245,158,11,.22);
  padding: 1px 5px;
  border-radius: 999px;
}

.da-pbd-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}
.da-pbd-badge {
  font-size: .52rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .1em;
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid;
}
.da-pbd-badge--finisher { color: #facc15; background: rgba(250,204,21,.1); border-color: rgba(250,204,21,.3); }
.da-pbd-badge--m1      { color: #fb923c; background: rgba(251,146,60,.1); border-color: rgba(251,146,60,.28); }
.da-pbd-badge--m2      { color: #fbbf24; background: rgba(251,191,36,.1); border-color: rgba(251,191,36,.28); }
.da-pbd-badge--wa      { color: #a78bfa; background: rgba(167,139,250,.1); border-color: rgba(167,139,250,.28); }
.da-pbd-badge--rune    { color: #38bdf8; background: rgba(56,189,248,.1); border-color: rgba(56,189,248,.28); }
.da-pbd-badge--gb      { color: #f87171; background: rgba(248,113,113,.08); border-color: rgba(248,113,113,.25); }
.da-pbd-badge--weapon  { color: #34d399; background: rgba(52,211,153,.08); border-color: rgba(52,211,153,.22); }

.da-pbd-condition {
  font-size: .62rem;
  color: var(--ink-muted, #8a8d85);
  font-style: italic;
  padding: 3px 7px;
  background: rgba(255,255,255,.02);
  border-radius: 4px;
  line-height: 1.4;
}

.da-pbd-dmg-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.da-pbd-ctx-label {
  font-size: .55rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: var(--ink-muted, #8a8d85);
  opacity: .55;
}

.da-pbd-note {
  font-size: .62rem;
  color: var(--ink-muted, #8a8d85);
  opacity: .65;
  font-style: italic;
  line-height: 1.4;
  padding-top: 5px;
  margin-top: 2px;
  border-top: 1px solid rgba(255,255,255,.04);
}

/* ── Springblast finisher hits slider ── */
.da-sb-slider-wrap {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 8px;
  border-radius: 6px;
  background: rgba(251,146,60,.05);
  border: 1px solid rgba(251,146,60,.18);
  min-width: 0;
  overflow: hidden;
}
.da-sb-slider-label {
  font-size: .55rem;
  font-weight: 800;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #fb923c;
  opacity: .75;
  white-space: nowrap;
  flex-shrink: 0;
}
.da-sb-slider {
  flex: 1;
  min-width: 0;
  width: 0;
  appearance: none;
  height: 5px;
  border-radius: 999px;
  outline: none;
  cursor: pointer;
  background: linear-gradient(
    90deg,
    #fb923c var(--fill, 0%),
    rgba(255,255,255,.1) var(--fill, 0%)
  );
}
.da-sb-slider::-webkit-slider-thumb {
  appearance: none;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: #fbbf24;
  border: 2px solid rgba(0,0,0,.5);
  cursor: grab;
  box-shadow: 0 0 0 3px rgba(251,191,36,.2);
}
.da-sb-slider::-webkit-slider-thumb:active { cursor: grabbing; }
.da-sb-slider-val {
  font-family: 'Courier New', monospace;
  font-size: .82rem;
  font-weight: 800;
  color: #fbbf24;
  min-width: 16px;
  text-align: right;
  flex-shrink: 0;
}

@media (max-width: 700px) {
  .da-wbd-outer {
    flex-direction: column;
  }
  .da-section--pbd {
    flex: none;
    width: 100%;
  }
}
/* ── Perk scaling section ── */
.ds-heal-subsection {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed rgba(74,222,128,.18);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ds-heal-final-badge {
  font-family: 'Courier New', monospace;
  font-size: .82rem;
  font-weight: 900;
  color: #4ade80;
  margin-left: auto;
  background: rgba(74,222,128,.1);
  border: 1px solid rgba(74,222,128,.25);
  border-radius: 6px;
  padding: 2px 10px;
}
.ds-heal-rows {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.ds-heal-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border-radius: 6px;
  background: rgba(74,222,128,.05);
  border: 1px solid rgba(74,222,128,.1);
  flex-wrap: wrap;
}
.ds-heal-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #4ade80;
  flex-shrink: 0;
  box-shadow: 0 0 5px rgba(74,222,128,.5);
}
.ds-heal-source {
  font-size: .75rem;
  font-weight: 700;
  color: #4ade80;
  flex: 1;
  min-width: 80px;
}
.ds-heal-mult {
  font-family: 'Courier New', monospace;
  font-size: .88rem;
  font-weight: 900;
  color: #4ade80;
  text-shadow: 0 0 8px rgba(74,222,128,.3);
  flex-shrink: 0;
}
.ds-heal-cond {
  font-size: .6rem;
  color: #4ade80;
  opacity: .55;
  font-style: italic;
  flex-basis: 100%;
  padding-left: 14px;
}
.da-perk-scaling-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0 8px;
}
.da-perk-scaling-divider::before,
.da-perk-scaling-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(245,158,11,.2);
}
.da-perk-scaling-label {
  font-size: .55rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .16em;
  color: var(--accent2);
  opacity: .7;
  white-space: nowrap;
  padding: 0 4px;
}

/* Perk scaling rows — tinted amber */
.ds-table--perk .ds-row {
  background: rgba(245,158,11,.04);
  border-radius: 5px;
  margin-bottom: 2px;
}

/* Perk result row */
.ds-result-row--perk {
  background: rgba(245,158,11,.07) !important;
  border-color: rgba(245,158,11,.22) !important;
}
.ds-result-row--perk .ds-result-label {
  color: var(--accent2) !important;
  font-size: .65rem;
  font-weight: 800;
  letter-spacing: .04em;
}
.ds-result-row--perk .ds-result-val {
  color: var(--accent2) !important;
}
.da-hit-card--crit {
  border-color: rgba(226,178,3,.6) !important;
  background: linear-gradient(135deg, rgba(20,20,20,.85) 0%, rgba(226,178,3,.1) 100%) !important;
}
.da-crit-toggle {
  font-size: .62rem; 
  font-weight: 800;
  padding: 3px 10px; 
  border-radius: 6px;
  border: 1px solid rgba(226,178,3,.25);
  background: var(--surface2, #1a1d1b);
  color: var(--ink-muted, #8a8d85);
  cursor: pointer; 
  font-family: inherit;
  transition: all .12s;
}

.da-crit-toggle--on {
  border-color: rgba(226,178,3,.6);
  background: rgba(226,178,3,.12);
  color: #e2b203;
  box-shadow: 0 0 8px rgba(226,178,3,.2);
}

.da-hit-num--crit {
  filter: brightness(1.5) saturate(2) !important;
  text-shadow: 0 0 16px color-mix(in srgb, var(--tc) 90%, white) !important;
}
.da-hit-num--gcrit-base {
  font-size: .65rem;
  opacity: .35;
}
.da-hit-num--gcrit {
  color: var(--tc);
  filter: brightness(1.4) saturate(1.9);
  text-shadow: 0 0 14px var(--tc);
}
.da-hit-type--gcrit {
  color: var(--tc);
  filter: brightness(1.2) saturate(1.5);
  opacity: .85;
}
.da-summon-formula {
  font-size: 0.58rem;
  font-family: 'Courier New', monospace;
  color: #c084fc;
  opacity: 0.5;
  white-space: nowrap;
}
.da-crit-mini-badge {
  position: absolute;
  top: 10px;
  right: -4px;
  display: flex;
  align-items: center;
  pointer-events: none;
  z-index: 10;
}
.da-bc-scope {
  font-size: .46rem;
  font-weight: 800;
  letter-spacing: .08em;
  color: #38bdf8;
  background: rgba(56,189,248,.1);
  border: 1px solid rgba(56,189,248,.2);
  border-radius: 3px;
  padding: 1px 4px;
  margin-top: 1px;
}

.da-chain-result-multi {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.da-chain-result-group {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 7px;
  background: rgba(251,146,60,.1);
  border: 1px solid rgba(251,146,60,.2);
  white-space: nowrap;
}

.da-crg-scope {
  font-size: .52rem;
  font-weight: 800;
  letter-spacing: .1em;
  color: var(--ink-muted, #8a8d85);
  opacity: .7;
  text-transform: uppercase;
}

.da-crg-val {
  font-size: .95rem;
  font-weight: 900;
  color: #fb923c;
  font-family: 'Courier New', monospace;
}
.da-boost-split {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  flex-wrap: wrap;
}

.da-boost-universal {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

.da-boost-cats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 14px;
  border-left: 2px solid rgba(255,255,255,.07);
  margin-left: 2px;
  position: relative;
}

.da-boost-cat-row {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  position: relative;
}

.da-tree-line {
  position: absolute;
  left: -14px;
  top: 50%;
  width: 10px;
  height: 1px;
  background: rgba(255,255,255,.12);
}
.da-tree-line::before {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 1px;
  height: 50px;
  background: rgba(255,255,255,.12);
}
.da-tree-line--last::before {
  display: none;
}

.da-cat-labels {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  min-width: 90px;
}

.da-cat-lbl {
  font-size: .55rem;
  font-weight: 900;
  letter-spacing: .1em;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  border: 1px solid;
}

.da-cat-lbl--m1, .da-cat-lbl--m2 {
  color: #fb923c;
  background: rgba(251,146,60,.12);
  border-color: rgba(251,146,60,.3);
}
.da-cat-lbl--wa {
  color: #a78bfa;
  background: rgba(167,139,250,.12);
  border-color: rgba(167,139,250,.3);
}
.da-cat-lbl--rune {
  color: #38bdf8;
  background: rgba(56,189,248,.12);
  border-color: rgba(56,189,248,.3);
}
.da-cat-lbl--perk {
  color: #34d399;
  background: rgba(52,211,153,.12);
  border-color: rgba(52,211,153,.3);
}

.da-boost-chip--sm {
  padding: 3px 8px;
}
.da-boost-chip--sm .da-bc-name { font-size: .62rem; }
.da-boost-chip--sm .da-bc-val  { font-size: .75rem; }

.da-cat-nospec {
  font-size: .62rem;
  color: var(--ink-muted, #8a8d85);
  opacity: .3;
  font-style: italic;
}

.da-cat-total {
  font-size: .95rem;
  font-weight: 900;
  color: #fb923c;
  font-family: 'Courier New', monospace;
  background: rgba(251,146,60,.1);
  border: 1px solid rgba(251,146,60,.2);
  padding: 3px 10px;
  border-radius: 7px;
  white-space: nowrap;
}
.da-pbd-secondary-list { display:flex; flex-direction:column; gap:4px; }
.da-pbd-secondary {
  display:flex; align-items:center; flex-wrap:wrap; gap:6px;
  padding:5px 8px; border-radius:6px;
  background: color-mix(in srgb, var(--sc) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--sc) 22%, transparent);
}
.da-pbd-secondary-label { font-size:.58rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:var(--sc); opacity:.85; }
.da-pbd-secondary-val { font-family:'Courier New',monospace; font-size:.85rem; font-weight:800; color:var(--sc); }
.da-pbd-secondary-cond { font-size:.58rem; color:var(--ink-muted,#8a8d85); opacity:.55; font-style:italic; flex-basis:100%; }
.da-pbd-dmg-row--inactive { opacity: .35; filter: grayscale(.5); }
.da-pbd-inactive-badge {
  font-size: .55rem; font-weight: 800; text-transform: uppercase; letter-spacing: .08em;
  color: var(--ink-muted, #8a8d85); padding: 1px 6px; border-radius: 4px;
  background: rgba(255,255,255,.05); border: 1px dashed rgba(255,255,255,.15);
}
.da-pbd-secondary--inactive { opacity: .35; filter: grayscale(.5); }
.da-pbd-secondary-inactive {
  font-size: .55rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;
  color: var(--ink-muted, #8a8d85); opacity: .8;
}

.da-section--defense {
  border-color: rgba(248,113,113,.18);
  background: linear-gradient(160deg, var(--surface, #141715) 60%, rgba(248,113,113,.03) 100%);
}
.def-rules {
  margin: 0; padding-left: 18px;
  display: flex; flex-direction: column; gap: 4px;
  font-size: .72rem; color: var(--ink-muted, #8a8d85); line-height: 1.45;
}
.def-rules strong { color: var(--ink, #e8e4da); font-weight: 700; }
.def-type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 8px;
}
.def-type-card {
  background: var(--surface2, #1a1d1b);
  border: 1px solid color-mix(in srgb, var(--tc) 22%, transparent);
  border-radius: 9px; padding: 9px 11px;
  display: flex; flex-direction: column; gap: 5px;
}
.def-type-head { display: flex; align-items: center; gap: 6px; }
.def-type-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.def-type-name { font-size: .8rem; font-weight: 700; color: var(--tc); flex: 1; }
.def-type-final { font-family: 'Courier New', monospace; font-size: .82rem; font-weight: 800; color: var(--tc); }
.def-source-row { display: flex; align-items: center; gap: 5px; font-size: .68rem; padding: 2px 0; }
.def-source-name { color: var(--ink-muted, #8a8d85); flex: 1; }
.def-source-raw { font-family: 'Courier New', monospace; font-weight: 700; color: #4ade80; }
.def-source-dr { font-family: 'Courier New', monospace; font-weight: 700; color: #4ade80; }
.def-source-dr--neg { color: #f87171; }
.def-source-dr--flat { color: #f59e0b; }
.def-source-row--flat { border-top: 1px dashed rgba(255,255,255,.08); padding-top: 4px; margin-top: 2px; }
.def-flat-badge {
  font-size: .5rem; font-weight: 800; letter-spacing: .08em;
  padding: 0 4px; border-radius: 3px;
  background: rgba(245,158,11,.12); border: 1px solid rgba(245,158,11,.28);
  color: var(--accent2, #f59e0b); margin-left: 4px;
}
.ap-toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ap-toggle-label {
  font-size: .62rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: var(--ink-muted, #8a8d85);
  opacity: .6;
}
.ap-toggle-btn {
  font-size: .68rem;
  font-weight: 700;
  padding: 4px 11px;
  border-radius: 999px;
  border: 1px solid rgba(248,113,113,.2);
  background: var(--surface2, #1a1d1b);
  color: var(--ink-muted, #8a8d85);
  cursor: pointer;
  font-family: inherit;
  transition: all .12s;
}
.ap-toggle-btn--on {
  border-color: rgba(248,113,113,.55);
  background: rgba(248,113,113,.1);
  color: #f87171;
  box-shadow: 0 0 8px rgba(248,113,113,.18);
}
.da-env-toggle {
  font-weight: 800;
}
.da-env-toggle--sun {
  border-color: rgba(251,191,36,.55);
  background: linear-gradient(160deg, rgba(251,191,36,.18), rgba(251,146,60,.08));
  color: #fbbf24;
  text-shadow: 0 0 8px rgba(251,191,36,.5);
  box-shadow: 0 0 10px rgba(251,191,36,.3);
}
.da-env-toggle--sun:hover {
  box-shadow: 0 0 14px rgba(251,191,36,.45);
}
.da-env-toggle--dark {
  border-color: rgba(129,140,248,.5);
  background: linear-gradient(160deg, rgba(30,27,75,.55), rgba(15,14,38,.5));
  color: #a5b4fc;
  text-shadow: 0 0 8px rgba(129,140,248,.5);
  box-shadow: 0 0 10px rgba(67,56,202,.35) inset, 0 0 8px rgba(129,140,248,.25);
}
.da-env-toggle--dark:hover {
  box-shadow: 0 0 14px rgba(67,56,202,.5) inset, 0 0 12px rgba(129,140,248,.35);
}
.da-weaponboost-row {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 5px 10px; border-radius: 6px;
  background: rgba(251,191,36,.06); border: 1px solid rgba(251,191,36,.2);
}
.da-weaponboost-badge {
  font-size: .75rem; font-weight: 800;
  color: #fbbf24; font-family: 'Courier New', monospace;
}

.da-weaponboost-sources {
  font-size: .6rem; color: var(--ink-muted); opacity: .5; font-style: italic;
}

.da-section--selfdmg {
  border-color: rgba(248,113,113,.18);
  background: linear-gradient(160deg, var(--surface, #141715) 60%, rgba(248,113,113,.03) 100%);
}
.da-selfdmg-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: rgba(248,113,113,.08);
  border: 1px solid rgba(248,113,113,.22);
  border-radius: 7px;
  width: fit-content;
}
.da-selfdmg-label {
  font-size: .62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--neg, #f87171);
  opacity: .8;
}
.da-selfdmg-input {
  font-family: 'Courier New', monospace;
  font-size: .9rem;
  font-weight: 800;
  color: var(--neg, #f87171);
  background: none;
  border: none;
  outline: none;
  width: 40px;
  text-align: center;
  -moz-appearance: textfield;
  appearance: textfield;
}
.da-selfdmg-input::-webkit-inner-spin-button,
.da-selfdmg-input::-webkit-outer-spin-button { -webkit-appearance: none; }
.da-buff-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.da-buff {
  display: inline-flex;
}
.da-buff-divider {
  width: 100%;
  font-size: .6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .12em;
  padding: 3px 0 2px;
  margin: 6px 0 2px;
}
.da-buff-divider--buff {
  color: #4ade80;
  border-top: 1px solid rgba(74,222,128,.25);
}
.da-buff-divider--debuff {
  color: #f87171;
  border-top: 1px solid rgba(248,113,113,.25);
}
.da-buff-divider--neutral {
  color: #818cf8;
  border-top: 1px solid rgba(129,140,248,.25);
}
.da-boost-chip--debuff {
  border-style: dashed;
}
.da-boost-chip--neutral {
  border-style: dotted;
}
</style>