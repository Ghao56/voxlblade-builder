<script lang="ts">
  import { build, result } from './lib/store'
  import {
    BUFF_DEFS,
    getActiveBuildBuffs,
    getPerkBuffs,
    applyBuffPerkModifiers,
    calcBuffEffect,
    getBuffDescription,
    getTrueBalanceBuffs,
    getWeaponArtBuffs,
    convertTailwindToWhirlwind,
    applyToxinTransferDuration,
    type GrantedBuff,
  } from './data/BuffData'
  import { getDraconicInfusionBuff, getDraconicHexDebuffs } from './data/draconicBuffs'
  import { WEAPON_ARTS } from './data/weaponArts'
  import { UI_COLORS, SOURCE_LABELS } from './lib/uiConstants'


  $: wardingPct = ($result.stats.warding ?? 0) / 100
  $: wardingDebuffMult = Math.max(0, 1 - wardingPct)
  $: itemBuffs = getActiveBuildBuffs({
    rune: $build.rune,
    ring: $build.ring,
    infusionRing: $build.infusionRing,
    helmet: $build.helmet,
    chestplate: $build.chestplate,
    leggings: $build.leggings,
    weaponBlade: $build.weaponBlade,
    weaponHandle: $build.weaponHandle,
    monkGlove: $build.monkGlove,
    race: $build.race,
  })

  $: perkBuffs = (() => {
    const buffs = getPerkBuffs($result.perks)
    const idx = buffs.findIndex(b => b.buffName === 'Exhaust')
    if (idx !== -1) {
      const wa = WEAPON_ARTS.find(wa => wa.name === $build.selectedWeaponArt)
      if (wa?.cooldown) {
        buffs[idx] = { ...buffs[idx], duration: wa.cooldown / 2 }
      }
    }
    if ($build.selectedWeaponArt !== 'Laser') {
      return buffs.filter(b => b.sourceName !== 'Wild Bolt')
    }
    return buffs
  })()

  $: weaponArtBuffs = getWeaponArtBuffs($build.selectedWeaponArt)

    $: baseActiveBuffs = (() => {
    const modified = applyToxinTransferDuration(convertTailwindToWhirlwind(applyBuffPerkModifiers(
      [...itemBuffs, ...perkBuffs, ...weaponArtBuffs],
      $result.perks,
      $build.rune || undefined
    ), $result.perks), $result.perks)

    const _minionAbsAmt = $result.perks['Minion Absorption'] ?? 0
    const _minionAbsSB  = ($result.stats as Record<string, number>).summonBoost ?? 0
    if (_minionAbsAmt > 0 && _minionAbsSB > 0) {
      const _minionAbsPotency = Math.round(0.2 * (_minionAbsSB / 100) * _minionAbsAmt * 10000) / 10000
      for (let i = 0; i < modified.length; i++) {
        if (modified[i].buffName === 'Minion Absorbed') {
          modified[i] = { ...modified[i], potency: _minionAbsPotency }
        }
      }
    }

    const _hasExhaust = modified.some(b => b.buffName === 'Exhaust')
    const _hasBurn = modified.some(b => b.buffName === 'Burn')
    if (_hasExhaust && !_hasBurn) {
      modified.push({
        buffName: 'Burn',
        potency: 0,
        duration: 5,
        condition: 'On hit during Exhaust',
        sourceName: 'Exhaust',
        sourceType: 'perk',
      })
    }

    return modified
  })()

  $: activeDebuffs = baseActiveBuffs.filter(b => BUFF_DEFS[b.buffName]?.isDebuff)

  $: trueBalanceBuffs = (() => {
    const buffs = getTrueBalanceBuffs(
      $result.perks['True Balance'] ?? 0,
      activeDebuffs
    )
    if (buffs.length === 0) return buffs
    return applyBuffPerkModifiers(buffs, $result.perks, $build.rune || undefined)
  })()
  
  $: rawDraconicInfusionBuff = getDraconicInfusionBuff(
    $build.guild, $build.draconicRuneInfusion, $build.draconicColor, $result.perks['Draconic Blood'] ?? 0
  )
  
  $: draconicInfusionBuff = (() => {
    if (rawDraconicInfusionBuff.length === 0) return []
    
    // Apply Bastion Bless and other modifiers
    return applyBuffPerkModifiers(rawDraconicInfusionBuff, $result.perks, $build.rune || undefined)
  })()

  $: draconicHexDebuffs = applyBuffPerkModifiers(
    getDraconicHexDebuffs(
      $build.guild, $build.draconicRuneInfusion, $build.draconicColor, $result.perks['Draconic Blood'] ?? 0
    ),
    $result.perks,
    $build.rune || undefined
  )

  $: activeBuffs = [
    ...baseActiveBuffs,
    ...trueBalanceBuffs,
    ...draconicInfusionBuff,
    ...draconicHexDebuffs,
  ]

  // Dragon Infusion color modifiers applied to display values
  $: _infPerkAmt = $result.perks['Draconic Blood'] ?? 0
  $: _infActive  = $build.draconicRuneInfusion === 'infusion'
  $: displayBuffs = (() => {
    if (!_infActive) return activeBuffs
    const color = $build.draconicColor
    if (color !== 'hex' && color !== 'holy') return activeBuffs

    return activeBuffs.map(buff => {
      const def = BUFF_DEFS[buff.buffName]
      if (!def) return buff

      const isSelfDebuff = buff.isSelfDebuff || def.isSelfDebuff
      const isDespair = buff.buffName === 'Despair'

      if (color === 'hex' && def.isDebuff && !isSelfDebuff) {
        const potMult = 1 + _infPerkAmt * 0.05
        const durMult = 1 + _infPerkAmt * 0.15
        return {
          ...buff,
          potency:  Math.round(buff.potency  * potMult * 10000) / 10000,
          duration: Math.round(buff.duration * durMult),
        }
      }
      if (color === 'hex' && def.isDebuff && isSelfDebuff && isDespair) {
        const potMult = 1 + _infPerkAmt * 0.05
        const durMult = 1 + _infPerkAmt * 0.15
        return {
          ...buff,
          potency:  Math.round(buff.potency  * potMult * 10000) / 10000,
          duration: Math.round(buff.duration * durMult),
        }
      }
      if (color === 'holy' && !def.isDebuff && !def.isNeutral && !def.potencyCapped && buff.buffName !== 'Draconic Infusion') {
        const potMult = 1 + _infPerkAmt * 0.05
        return {
          ...buff,
          potency: Math.round(buff.potency * potMult * 10000) / 10000,
          basePotency: buff.basePotency ?? buff.potency,
          bonusPotency: Math.round(buff.potency * potMult * 10000) / 10000 - (buff.basePotency ?? buff.potency),
        }
      }
      return buff
    })
  })()

  type GroupedBuff = {
    buffName: string
    isSelfDebuff: boolean
    entries: GrantedBuff[]
    strongest: GrantedBuff
    maxDuration: number
  }

$: groupedBuffs = (() => {
  const groups = displayBuffs.reduce((acc, buff) => {
    const k = `${buff.buffName}:${String(buff.isSelfDebuff ?? false)}`
    ;(acc[k] ??= []).push(buff)
    return acc
  }, {} as Record<string, GrantedBuff[]>)

  // Melting Slime overrides every sticky into Sticky
  if (($result.perks['Melting Slime'] ?? 0) > 0) {
    for (const [key, entries] of Object.entries(groups)) {
      const [bn] = key.split(':')
      if (bn.startsWith('Sticky') && bn !== 'Sticky') {
        const baseKey = `Sticky:false`
        if (!groups[baseKey]) groups[baseKey] = []
        groups[baseKey].push(...entries.map(e => ({ ...e, buffName: 'Sticky' })))
        delete groups[key]
      }
    }
  }

  return Object.values(groups).map(entries => {
    const sortedEntries = [...entries].sort(
      (a, b) => (b.potency - a.potency) || (b.duration - a.duration)
    )
    return {
      buffName: sortedEntries[0].buffName,
      isSelfDebuff: sortedEntries[0].isSelfDebuff ?? false,
      entries: sortedEntries,
      strongest: sortedEntries[0],
      maxDuration: Math.max(...sortedEntries.map(e => e.duration)),
    }
  })
})()

  $: buffs    = groupedBuffs.filter(g => !BUFF_DEFS[g.buffName]?.isDebuff && !BUFF_DEFS[g.buffName]?.isNeutral)
  $: debuffs  = groupedBuffs.filter(g =>  BUFF_DEFS[g.buffName]?.isDebuff)
  $: neutrals = groupedBuffs.filter(g =>  BUFF_DEFS[g.buffName]?.isNeutral)

  let expanded = true
  let activeTab: 'buffs' | 'debuffs' | 'neutral' = 'buffs'

  const SRC_COLOR: Record<string, string> = {
    rune:   UI_COLORS.rune,
    perk:   UI_COLORS.perk,
    weaponArt: UI_COLORS.weaponArt,
    race:      UI_COLORS.race,
    cantrip: UI_COLORS.cantrip,
  }

  const SRC_LABEL: Record<string, string> = {
    rune: SOURCE_LABELS.rune,
    perk: SOURCE_LABELS.perk,
    weaponArt: SOURCE_LABELS.weaponArt,
    race: SOURCE_LABELS.race,
    cantrip: SOURCE_LABELS.cantrip,
  }
  function fmtPotency(v: number): string {
    return String(Math.round(v * 10000) / 10000);
  }
</script>

<div class="bl-root">
  <div class="bl-header">
    <div class="bl-tabs">
      <button
        class="bl-tab"
        class:bl-tab--active={activeTab === 'buffs'}
        on:click={() => { activeTab = 'buffs'; expanded = true }}
      >
        <span class="bl-tab-dot bl-tab-dot--buff"></span>
        Buffs
        {#if buffs.length > 0}
          <span class="bl-count bl-count--buff">{buffs.length}</span>
        {/if}
      </button>
      <button
        class="bl-tab"
        class:bl-tab--active={activeTab === 'debuffs'}
        on:click={() => { activeTab = 'debuffs'; expanded = true }}
      >
        <span class="bl-tab-dot bl-tab-dot--debuff"></span>
        Debuffs Applied
        {#if debuffs.length > 0}
          <span class="bl-count bl-count--debuff">{debuffs.length}</span>
        {/if}
      </button>

      <button
        class="bl-tab"
        class:bl-tab--active={activeTab === 'neutral'}
        on:click={() => { activeTab = 'neutral'; expanded = true }}
      >
        <span class="bl-tab-dot bl-tab-dot--neutral"></span>
        Neutral
        {#if neutrals.length > 0}
          <span class="bl-count bl-count--neutral">{neutrals.length}</span>
        {/if}
      </button>
        </div>
        <button class="bl-collapse" on:click={() => expanded = !expanded}>
          {expanded ? '▲' : '▼'}
        </button>
      </div>

  {#if expanded}
    {@const list = activeTab === 'buffs' ? buffs : activeTab === 'debuffs' ? debuffs : neutrals}
    {#if list.length === 0}
      <div class="bl-empty">
        <span class="bl-empty-icon">{activeTab === 'buffs' ? 'ඞ' : '☢'}</span>
        <span class="bl-empty-text">
          No {activeTab === 'buffs' ? 'buff-granting' : 'debuff-applying'} items equipped.
        </span>
      </div>
    {:else}
      <div class="bl-list">
        {#each list as group (`${group.buffName}:${group.isSelfDebuff}`)}
          {@const def = BUFF_DEFS[group.buffName]}
          {@const isSelf = group.isSelfDebuff}
          {@const effectivePotency = isSelf && wardingDebuffMult !== 1
            ? Math.round(group.strongest.potency * wardingDebuffMult * 1000) / 1000
            : group.strongest.potency}
          {@const effect = calcBuffEffect(group.strongest.buffName, effectivePotency)}
          
          {@const topPotency = group.strongest.potency}
          
          {#if def}
            <div class="bl-card" class:bl-card--debuff={def.isDebuff} style="--c:{def.color}">
              <div class="bl-accent-bar"></div>

              <div class="bl-body">
                <div class="bl-top-row">
                  <div class="bl-name-group">
                    <span class="bl-buff-name" style="color:{def.color}">{def.name}</span>
                    
                    {#if group.strongest.isSelfDebuff}
                      <span class="bl-tag bl-tag--self">Self</span>
                    {/if}
                    
                    {#if group.maxDuration > 0}
                      <span class="bl-tag bl-tag--duration">⏱ {group.maxDuration}s</span>
                    {/if}
                  </div>

                  <div class="bl-value-box">
                    <span class="bl-value" style="color:{def.color}">
                      {effectivePotency}
                      {def.isDebuff && !group.isSelfDebuff ? ' to enemy' : ''}
                    </span>
                  </div>
                </div>

                <div class="bl-desc-row">
                  <span class="bl-desc-text">
                    {getBuffDescription(group.buffName, $result.perks, effectivePotency)}
                  </span>
                </div>

                <div class="bl-sources-label">Sources</div>
                <div class="bl-sources">
                  {#each group.entries as source}
                    {@const barW = topPotency > 0 ? Math.round((source.potency / topPotency) * 100) : 0}
                    {@const isMain = source === group.strongest}
                    <div class="bl-source-row" class:bl-source-row--main={isMain}>
                      <span
                        class="bl-src-type"
                        style="color:{SRC_COLOR[source.sourceType]};border-color:{SRC_COLOR[source.sourceType]};background:color-mix(in srgb,{SRC_COLOR[source.sourceType]} 12%,transparent)"
                      >
                        {SRC_LABEL[source.sourceType]}
                      </span>

                      <div class="bl-src-info">
                        <span class="bl-src-name">{source.sourceName}</span>
                          {#if source.condition}
                            <span class="bl-src-condition">{source.condition}</span>
                          {/if}
                          {#if source.duration > 0}
                            <span class="bl-src-dur">⏱ {source.duration}s</span>
                          {/if}
                        </div>

                      <div class="bl-src-right">
                        <div class="bl-bar-wrap">
                          <div class="bl-bar-fill" style="width:{barW}%;background:{def.color}"></div>
                        </div>

                        {#if source.bonusPotency && source.bonusPotency > 0}
                          <span class="bl-perk-badge">perk +{fmtPotency(source.bonusPotency)}</span>
                        {/if}

                        {#if isSelf && wardingDebuffMult !== 1}
                          {@const effP = Math.round(source.potency * wardingDebuffMult * 1000) / 1000}
                          <span class="bl-warding-badge">warding ×{fmtPotency(wardingDebuffMult)}</span>
                          
                          <div class="bl-potency-cell">
                            <span class="bl-base-val">{fmtPotency(source.potency)}</span>
                            <span class="bl-arrow">→</span>
                            <span class="bl-src-potency" style="color:{def.color}">{fmtPotency(effP)}</span>
                          </div>
                        {:else}
                          <div class="bl-potency-cell">
                            {#if source.bonusPotency && source.bonusPotency > 0}
                              <span class="bl-base-val">{fmtPotency(source.basePotency ?? 0)}</span>
                              <span class="bl-arrow">→</span>
                            {/if}
                            <span class="bl-src-potency" style="color:{def.color}">{fmtPotency(source.potency)}</span>
                          </div>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .bl-root {
    background: var(--surface, #141715);
    border: 1px solid rgba(255,255,255,.06);
    border-radius: 12px;
    overflow: hidden;
    font-family: var(--font-body, 'Trebuchet MS', sans-serif);
  }

  .bl-header {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid rgba(255,255,255,.06);
    background: var(--surface2, #1a1d1b);
  }
  .bl-tabs { display: flex; flex: 1; }

  .bl-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    color: var(--ink-muted, #8a8d85);
    font-size: .72rem;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all .15s;
    font-family: inherit;
  }
  .bl-tab:hover { color: var(--ink, #e8e4da); }
  .bl-tab--active {
    color: #4ade80;
    border-bottom-color: #4ade80;
    background: rgba(74,222,128,.04);
  }
  .bl-tab--active:nth-child(2) {
    color: #f87171;
    border-bottom-color: #f87171;
    background: rgba(248,113,113,.04);
  }

  .bl-tab-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .bl-tab-dot--buff   { background: #4ade80; box-shadow: 0 0 5px rgba(74,222,128,.5); }
  .bl-tab-dot--debuff { background: #f87171; box-shadow: 0 0 5px rgba(248,113,113,.5); }

  .bl-count {
    font-size: .58rem;
    font-weight: 800;
    padding: 1px 5px;
    border-radius: 999px;
  }
  .bl-count--buff   { background: rgba(74,222,128,.15); border: 1px solid rgba(74,222,128,.3); color: #4ade80; }
  .bl-count--debuff { background: rgba(248,113,113,.15); border: 1px solid rgba(248,113,113,.3); color: #f87171; }

  .bl-collapse {
    padding: 0 14px;
    background: none;
    border: none;
    color: var(--ink-muted, #8a8d85);
    font-size: .65rem;
    cursor: pointer;
    opacity: .5;
    transition: opacity .15s;
    font-family: inherit;
  }
  .bl-collapse:hover { opacity: 1; }

  .bl-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 20px;
  }
  .bl-empty-icon { font-size: 1rem; opacity: .3; }
  .bl-empty-text { font-size: .75rem; color: var(--ink-muted, #8a8d85); font-style: italic; opacity: .5; }

  .bl-list {
    display: flex;
    flex-direction: column;
  }

  .bl-card {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid rgba(255,255,255,.04);
    transition: background .12s;
  }
  .bl-card:hover { background: rgba(255,255,255,.02); }
  .bl-card:last-child { border-bottom: none; }

  .bl-accent-bar {
    width: 4px;
    flex-shrink: 0;
    background: linear-gradient(180deg, var(--c, #4ade80) 0%, color-mix(in srgb, var(--c, #4ade80) 30%, transparent) 100%);
  }
  .bl-card--debuff .bl-accent-bar {
    background: linear-gradient(180deg, var(--c, #f87171) 0%, color-mix(in srgb, var(--c, #f87171) 25%, transparent) 100%);
  }

  .bl-body {
    flex: 1;
    padding: 11px 14px 11px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .bl-top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .bl-name-group {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    min-width: 0;
  }

  .bl-buff-name {
    font-size: .9rem;
    font-weight: 800;
    letter-spacing: .02em;
    line-height: 1;
  }

  .bl-tag {
    font-size: .6rem;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 999px;
    flex-shrink: 0;
  }
  .bl-tag--duration {
    background: rgba(52,211,153,.1);
    border: 1px solid rgba(52,211,153,.22);
    color: #34d399;
  }

  .bl-value-box { flex-shrink: 0; }
  .bl-value {
    font-weight: 800;
    font-family: 'Courier New', monospace;
    font-size: 1.05rem;
    letter-spacing: -.01em;
  }

  .bl-desc-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 5px 8px;
    background: color-mix(in srgb, var(--c, #4ade80) 6%, transparent);
    border: 1px solid color-mix(in srgb, var(--c, #4ade80) 14%, transparent);
    border-radius: 5px;
  }
  .bl-desc-text {
    font-size: .72rem;
    color: var(--ink-muted, #8a8d85);
    line-height: 1.4;
  }

  .bl-sources-label {
    font-size: .55rem;
    text-transform: uppercase;
    letter-spacing: .15em;
    color: var(--ink-muted, #8a8d85);
    opacity: .4;
    font-weight: 700;
    margin-top: 2px;
  }

  .bl-sources {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .bl-source-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 8px;
    border-radius: 6px;
    background: rgba(255,255,255,.02);
    border: 1px solid rgba(255,255,255,.04);
    opacity: .5;
    transition: opacity .15s, background .15s;
  }
  .bl-source-row--main {
    opacity: 1;
    background: rgba(255,255,255,.04);
    border-color: rgba(255,255,255,.07);
  }
  .bl-source-row:hover { opacity: .9; }

  .bl-src-type {
    font-size: .55rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .12em;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid;
    flex-shrink: 0;
    line-height: 1.5;
  }

  .bl-src-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .bl-src-name {
    font-size: .74rem;
    font-weight: 600;
    color: var(--ink, #e8e4da);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bl-src-condition {
    font-size: .6rem;
    color: var(--ink-muted, #8a8d85);
    font-style: italic;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bl-src-right {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .bl-bar-wrap {
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: rgba(255,255,255,.08);
    overflow: hidden;
  }
  .bl-bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width .3s ease;
    opacity: .75;
  }
  .bl-source-row--main .bl-bar-fill { opacity: 1; }

  .bl-src-potency {
    font-size: .72rem;
    font-weight: 800;
    font-family: 'Courier New', monospace;
    line-height: 1;
  }
  .bl-potency-cell {
    display: flex;
    align-items: center;
    gap: 3px;
    flex-shrink: 0;
  }
  .bl-base-val {
    font-size: .62rem;
    color: var(--ink-muted, #8a8d85);
    font-family: 'Courier New', monospace;
    font-weight: 600;
  }
  .bl-arrow {
    font-size: .6rem;
    color: var(--ink-muted, #8a8d85);
    opacity: .5;
  }
  .bl-perk-badge {
    font-size: .52rem;
    font-weight: 700;
    font-family: 'Courier New', monospace;
    color: #4ade80;
    background: rgba(74,222,128,.12);
    border: 1px solid rgba(74,222,128,.25);
    padding: 1px 5px;
    border-radius: 3px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .bl-tag--self {
    background: rgba(148,163,184,.12);
    border: 1px solid rgba(148,163,184,.28);
    color: #94a3b8;
  }
  .bl-tab-dot--neutral { background: #6366f1; box-shadow: 0 0 5px rgba(99,102,241,.5); }
  .bl-count--neutral   { background: rgba(99,102,241,.15); border: 1px solid rgba(99,102,241,.3); color: #6366f1; }

  .bl-tab--active:nth-child(3) {
    color: #6366f1;
    border-bottom-color: #6366f1;
    background: rgba(99,102,241,.04);
  }
  .bl-src-dur {
    font-size: .58rem;
    color: #34d399;
    opacity: .7;
    font-weight: 700;
  }
  .bl-warding-badge {
  font-size: .52rem;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  color: #7eb4ad;
  background: rgba(126,180,173,.12);
  border: 1px solid rgba(126,180,173,.25);
  padding: 1px 5px;
  border-radius: 3px;
  white-space: nowrap;
  flex-shrink: 0;
}
</style>