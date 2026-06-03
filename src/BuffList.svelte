<script lang="ts">
  import { build, result } from './lib/store'

import {
  BUFF_DEFS,
  getActiveBuildBuffs,
  getPerkBuffs,
  applyBuffPerkModifiers,
  calcBuffEffect,
  getBuffDescription,
  type GrantedBuff,
} from './data/BuffData'

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
  })

  $: perkBuffs = getPerkBuffs($result.perks)

  $: activeBuffs = applyBuffPerkModifiers(
    [...itemBuffs, ...perkBuffs],
    $result.perks
  )

  type GroupedBuff = {
    buffName: string
    entries: GrantedBuff[]
    strongest: GrantedBuff
    maxDuration: number
  }

  $: groupedBuffs = Object.values(
    activeBuffs.reduce((acc, buff) => {
      (acc[buff.buffName] ??= []).push(buff)
      return acc
    }, {} as Record<string, GrantedBuff[]>)
  ).map(entries => ({
    buffName: entries[0].buffName,
    entries,
    strongest: [...entries].sort(
      (a, b) => (b.potency - a.potency) || (b.duration - a.duration)
    )[0],
    maxDuration: Math.max(...entries.map(e => e.duration)),
  }))

  $: buffs = groupedBuffs.filter(g => !BUFF_DEFS[g.buffName]?.isDebuff)
  $: debuffs = groupedBuffs.filter(g => BUFF_DEFS[g.buffName]?.isDebuff)

  let expanded = true
  let activeTab: 'buffs' | 'debuffs' = 'buffs'

  const SRC_COLOR: Record<string, string> = {
    rune:   '#a78bfa',
    ring:   '#38bdf8',
    armor:  '#4ade80',
    weapon: '#fb923c',
    perk:   '#fbbf24',
    guild:  '#e879f9',
  }

  const SRC_LABEL: Record<string, string> = {
    rune:   'Rune',
    ring:   'Ring',
    armor:  'Armor',
    weapon: 'Weapon',
    perk:   'Perk',
    guild:  'Guild',
  }

  // Max potency across all sources in a group, used for bar widths
  function maxPotency(entries: GrantedBuff[]): number {
    return Math.max(...entries.map(e => e.potency))
  }
</script>

<div class="bl-root">
  <!-- ── Header ── -->
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
    </div>
    <button class="bl-collapse" on:click={() => expanded = !expanded}>
      {expanded ? '▲' : '▼'}
    </button>
  </div>

  {#if expanded}
    {@const list = activeTab === 'buffs' ? buffs : debuffs}
    {#if list.length === 0}
      <div class="bl-empty">
        <span class="bl-empty-icon">{activeTab === 'buffs' ? '✦' : '☠'}</span>
        <span class="bl-empty-text">
          No {activeTab === 'buffs' ? 'buff-granting' : 'debuff-applying'} items equipped.
        </span>
      </div>
    {:else}
      <div class="bl-list">
        {#each list as group (group.buffName)}
          {@const def = BUFF_DEFS[group.buffName]}
          {@const effect = calcBuffEffect(group.strongest.buffName, group.strongest.potency)}
          {@const topPotency = maxPotency(group.entries)}
          {#if def}
            <div class="bl-card" class:bl-card--debuff={def.isDebuff} style="--c:{def.color}">

              <!-- ── Accent bar ── -->
              <div class="bl-accent-bar"></div>

              <div class="bl-body">

                <!-- ── Top row: name + tags + value ── -->
                <div class="bl-top-row">
                  <div class="bl-name-group">
                    <span class="bl-buff-name" style="color:{def.color}">{def.name}</span>

                    {#if group.maxDuration > 0}
                      <span class="bl-tag bl-tag--duration">⏱ {group.maxDuration}s</span>
                    {:else}
                      <span class="bl-tag bl-tag--passive">Passive</span>
                    {/if}
                  </div>

                  <div class="bl-value-box">
                    <span class="bl-value" style="color:{def.color}">
                      {effect.value}{effect.unit === '%' ? '%' : ''}
                      {def.isDebuff ? ' to enemy' : ''}
                    </span>
                  </div>
                </div>

                <!-- ── Description  ── -->
                <div class="bl-desc-row">
                  <span class="bl-desc-text">
                    {
                      getBuffDescription(group.buffName, $result.perks)
                        .replace(
                          /x%/g,
                          `${(group.strongest.potency * 100).toFixed(0)}%`
                        )
                    }
                  </span>
                </div>
                <!-- ── Sources ── -->
                <div class="bl-sources-label">Sources</div>
                <div class="bl-sources">
                  {#each [...group.entries].sort((a, b) => b.potency - a.potency) as source}
                    {@const pct = (source.potency * 100)}
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
                      </div>

                      <div class="bl-src-right">
                        <div class="bl-bar-wrap">
                          <div class="bl-bar-fill" style="width:{barW}%;background:{def.color}"></div>
                        </div>

                        {#if source.bonusPotency && source.bonusPotency > 0}
                          <span class="bl-perk-badge">perk +{source.bonusPotency.toFixed(1)}</span>
                        {/if}

                        <div class="bl-potency-cell">
                          {#if source.bonusPotency && source.bonusPotency > 0}
                            <span class="bl-base-val">{source.basePotency?.toFixed(1)}</span>
                            <span class="bl-arrow">→</span>
                          {/if}
                          <span class="bl-src-potency" style="color:{def.color}">{source.potency.toFixed(1)}</span>
                        </div>
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

  /* ── Header ── */
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
  .bl-tab--active:last-child {
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

  /* ── Empty ── */
  .bl-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 20px;
  }
  .bl-empty-icon { font-size: 1rem; opacity: .3; }
  .bl-empty-text { font-size: .75rem; color: var(--ink-muted, #8a8d85); font-style: italic; opacity: .5; }

  /* ── List ── */
  .bl-list {
    display: flex;
    flex-direction: column;
  }

  /* ── Card ── */
  .bl-card {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid rgba(255,255,255,.04);
    transition: background .12s;
  }
  .bl-card:hover { background: rgba(255,255,255,.02); }
  .bl-card:last-child { border-bottom: none; }

  /* Gradient accent bar on the left */
  .bl-accent-bar {
    width: 4px;
    flex-shrink: 0;
    background: linear-gradient(180deg, var(--c, #4ade80) 0%, color-mix(in srgb, var(--c, #4ade80) 30%, transparent) 100%);
  }
  .bl-card--debuff .bl-accent-bar {
    background: linear-gradient(180deg, var(--c, #f87171) 0%, color-mix(in srgb, var(--c, #f87171) 25%, transparent) 100%);
  }

  /* ── Body ── */
  .bl-body {
    flex: 1;
    padding: 11px 14px 11px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  /* ── Top row ── */
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

  /* Tags */
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
  .bl-tag--passive {
    background: rgba(167,139,250,.1);
    border: 1px solid rgba(167,139,250,.22);
    color: #a78bfa;
  }

  /* Value box */
  .bl-value-box {
    flex-shrink: 0;
  }
  .bl-value {
    font-weight: 800;
    font-family: 'Courier New', monospace;
    font-size: 1.05rem;
    letter-spacing: -.01em;
  }

  /* ── Description row ── */
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

  /* ── Sources ── */
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

  /* Bar + value */
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
    min-width: 30px;
    text-align: right;
  }

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
</style>