<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { ELEMENTAL_BOOST_STATS, NEGATIVE_ELEMENTAL_BOOST_STATS } from './lib/stats/elementalBoosts'
  import { createFilterActions } from './lib/stats/filterActions'
  import { UI_COLORS } from './lib/uiConstants'
  import StatChip, { buildStatMaps } from './lib/StatFilterShared.svelte'

  const dispatch = createEventDispatcher<{
    change: {
      filter: Map<string,'include'|'exclude'>
      sortMode:'highest' | 'lowest' | 'alphabetical' | 'most-effective' | 'brawny'
    }
  }>()

  const STAT_GROUPS = [
    { label: 'Boost', color: UI_COLORS.combat, stats: ELEMENTAL_BOOST_STATS },
    {
      label: 'Defense', color: UI_COLORS.water,
      stats: [
        { key: 'physicalDefense', label: 'Phys Def'   },
        { key: 'magicDefense',    label: 'Magic Def'  },
        { key: 'fireDefense',     label: 'Fire Def'   },
        { key: 'waterDefense',    label: 'Water Def'  },
        { key: 'earthDefense',    label: 'Earth Def'  },
        { key: 'airDefense',      label: 'Air Def'    },
        { key: 'hexDefense',      label: 'Hex Def'    },
        { key: 'holyDefense',     label: 'Holy Def'   },
        { key: 'warding',         label: 'Warding'    },
        { key: 'protection',      label: 'Protection' },
        { key: 'tenacity',        label: 'Tenacity'   },        
        { key: 'heatResistance',   label: 'Heat Res'  },
        { key: 'coldResistance',   label: 'Cold Res'  },
      ],
    },
    {
      label: 'Utility', color: UI_COLORS.support,
      stats: [
        { key: 'speedBoost',       label: 'Speed'     },
        { key: 'attackSpeed',      label: 'Atk Speed' },
        { key: 'jumpBoost',        label: 'Jump'      },
      ],
    },
  ]

  const NEG_STAT_GROUPS = [
    { label: 'Boost', color: UI_COLORS.status, stats: NEGATIVE_ELEMENTAL_BOOST_STATS },
    {
      label: 'Defense', color: UI_COLORS.statusNegative,
      stats: [
        { key: 'neg:physicalDefense', label: 'Phys Def'   },
        { key: 'neg:magicDefense',    label: 'Magic Def'  },
        { key: 'neg:fireDefense',     label: 'Fire Def'   },
        { key: 'neg:waterDefense',    label: 'Water Def'  },
        { key: 'neg:earthDefense',    label: 'Earth Def'  },
        { key: 'neg:airDefense',      label: 'Air Def'    },
        { key: 'neg:hexDefense',      label: 'Hex Def'    },
        { key: 'neg:holyDefense',     label: 'Holy Def'   },
        { key: 'neg:warding',         label: 'Warding'    },
        { key: 'neg:protection',      label: 'Protection' },
        { key: 'neg:tenacity',        label: 'Tenacity'   },
        { key: 'neg:heatResistance',   label: 'Heat Res'  },
        { key: 'neg:coldResistance',   label: 'Cold Res'  },
      ],
    },
    {
      label: 'Utility', color: UI_COLORS.supportNegative,
      stats: [
        { key: 'neg:speedBoost',  label: 'Speed'     },
        { key: 'neg:attackSpeed', label: 'Atk Speed' },
        { key: 'neg:jumpBoost',   label: 'Jump'      },
      ],
    },
  ]

  const { labelMap: STAT_LABEL_MAP, colorMap: STAT_COLOR_MAP } = buildStatMaps([...STAT_GROUPS, ...NEG_STAT_GROUPS])

  let activeTab: 'positive' | 'negative' = 'positive'
  let sortMode: 'highest' | 'lowest' | 'alphabetical' = 'highest'

  let active: Map<string, 'include' | 'exclude'> = new Map()
    const { toggle, remove, clear, handleChipKeyDown } = createFilterActions(
    () => active,
    (next) => { active = next },
    (next) => dispatch('change', { filter: next, sortMode })
  )
  let expanded = false

  $: activeCount = active.size

  $: hiddenInPositive = new Set(
    [...active.keys()]
        .filter(k => k.startsWith('neg:'))
        .map(k => k.slice(4))
  )

  $: hiddenInNegative = new Set(
    [...active.keys()]
        .filter(k => !k.startsWith('neg:'))
  )

  $: currentGroups = activeTab === 'positive' ? STAT_GROUPS : NEG_STAT_GROUPS
  $: currentHiddenSet = activeTab === 'positive' ? hiddenInPositive : hiddenInNegative
</script>

<div class="sf-root">
  <div class="sf-header">
    <button 
      class="sf-toggle" 
      aria-expanded={expanded} 
      on:click={() => expanded = !expanded}
    >
      <span class="sf-icon">{expanded ? '▾' : '▸'}</span>
      <span class="sf-title">Filter by Stat</span>
      {#if activeCount > 0}
        <span class="sf-badge">{activeCount} active</span>
      {:else}
        <span class="sf-hint">click to filter</span>
      {/if}
    </button>

    {#if activeCount > 0}
      <div class="sf-active-row">
        {#each [...active.entries()] as [key, state]}
          <StatChip
            {state}
            color={STAT_COLOR_MAP.get(key) ?? '#8a8d85'}
            title="Click to cycle · Right-click or press Delete to remove"
            aria-label="Filter {STAT_LABEL_MAP.get(key) ?? key}: {state}. Click to cycle, Delete to remove."
            on:click={() => toggle(key)}
            on:contextmenu={() => remove(key)}
            on:keydown={(e) => handleChipKeyDown(e.detail, key)}
          >
            {STAT_LABEL_MAP.get(key) ?? key}
          </StatChip>
        {/each}
        <button class="sf-clear" on:click={clear}>Clear all</button>
      </div>
    {/if}
  </div>

  {#if expanded}
  <div class="sf-panel">

    <div class="sf-tab-row" role="tablist" aria-label="Stat Types">
      <button
        class="sf-tab"
        role="tab"
        aria-selected={activeTab === 'positive'}
        class:sf-tab--active={activeTab === 'positive'}
        on:click={() => activeTab = 'positive'}
      >
        Positive Stats
      </button>

      <button
        class="sf-tab"
        role="tab"
        aria-selected={activeTab === 'negative'}
        class:sf-tab--active={activeTab === 'negative'}
        on:click={() => activeTab = 'negative'}
      >
        Negative Stats
      </button>
    </div>

    <div class="sf-legend">
      <div class="sf-sort-row" role="group" aria-label="Sort options">
        <button 
          class="sf-tab" 
          class:sf-tab--active={sortMode === 'highest'} 
          aria-pressed={sortMode === 'highest'}
          on:click={()=>{sortMode='highest'; dispatch('change',{filter:active,sortMode})}}
        >
          Highest
        </button>
        <button 
          class="sf-tab" 
          class:sf-tab--active={sortMode === 'lowest'} 
          aria-pressed={sortMode === 'lowest'}
          on:click={()=>{sortMode='lowest'; dispatch('change',{filter:active,sortMode})}}
        >
          Lowest
        </button>
        <button 
          class="sf-tab" 
          class:sf-tab--active={sortMode === 'alphabetical'} 
          aria-pressed={sortMode === 'alphabetical'}
          on:click={()=>{sortMode='alphabetical'; dispatch('change',{filter:active,sortMode})}}
        >
          ABC
        </button>
      </div> 
      <span class="sf-leg sf-leg--off">○ Off</span>
      <span class="sf-leg sf-leg--inc">+ Must have</span>
      <span class="sf-leg sf-leg--exc">− Must NOT have</span>
      <span class="sf-leg-hint">
        · Click to cycle · Right-click to remove
      </span>
    </div>

    {#each currentGroups as group}
      <div class="sf-group">
        <span class="sf-group-label" style="color:{group.color}">
          {group.label}
        </span>

        <div class="sf-chips">
          {#each group.stats as stat}
            {@const state = active.get(stat.key)}
            {@const dimmed = currentHiddenSet.has(activeTab === 'negative' ? stat.key.slice(4) : stat.key)}
            <StatChip
              {state}
              color={group.color}
              dimmed={dimmed}
              aria-label="{activeTab === 'negative' ? 'Negative ' : ''}{stat.label} stat filter. Current: {state ?? 'off'}."
              on:click={() => toggle(stat.key)}
              on:contextmenu={() => remove(stat.key)}
              on:keydown={(e) => handleChipKeyDown(e.detail, stat.key)}
            >
              {stat.label}
            </StatChip>
          {/each}
        </div>
      </div>
    {/each}

  </div>
{/if}
</div>

<style>
  .sf-root {
    display:flex;flex-direction:column;gap:4px;margin-bottom:8px;
    border-radius:8px;border:1px solid rgba(255,255,255,.06);
    background:rgba(255,255,255,.02);overflow:hidden;
    font-family:var(--font-body,'Trebuchet MS',sans-serif);
  }
  .sf-header { display:flex;align-items:center;gap:8px;padding:6px 10px;flex-wrap:wrap; }
  .sf-toggle {
    width:100%;display:flex;align-items:center;gap:6px;background:none;border:none;
    cursor:pointer;padding:0;font-family:inherit;color:var(--ink-muted,#8a8d85);
    flex-shrink:0;transition:color .15s;
  }
  .sf-toggle:hover { color:var(--ink,#e8e4da); }
  .sf-icon { font-size:.65rem;opacity:.6;width:10px; }
  .sf-title { font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.14em; }
  .sf-badge {
    font-size:.58rem;font-weight:800;padding:1px 6px;border-radius:999px;
    background:rgba(251,146,60,.18);border:1px solid rgba(251,146,60 Rim, .35);color:#fb923c;
  }
  .sf-hint { font-size:.58rem;opacity:.35;font-style:italic; }
  .sf-active-row { display:flex;flex-wrap:wrap;gap:3px;align-items:center;flex:1; }
  .sf-clear {
    font-size:.6rem;font-weight:700;padding:2px 8px;border-radius:999px;
    border:1px solid rgba(248,113,113,.25);background:rgba(248,113,113,.08);
    color:#f87171;cursor:pointer;font-family:inherit;transition:all .12s;flex-shrink:0;
  }
  .sf-clear:hover { background:rgba(248,113,113,.2); }
  .sf-panel {
    display:flex;flex-direction:column;gap:4px;padding:6px 10px 10px;
    border-top:1px solid rgba(255,255,255,.06);animation:sfOpen .12s ease;
  }
  @keyframes sfOpen { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
  .sf-legend { display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:2px; }
  .sf-leg { font-size:.58rem;font-weight:700;padding:1px 6px;border-radius:4px; }
  .sf-leg--off  { color:var(--ink-muted,#8a8d85);background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08); }
  .sf-leg--inc  { color:#4ade80;background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.25); }
  .sf-leg--exc  { color:#f87171;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.25); }
  .sf-leg-hint  { font-size:.55rem;color:var(--ink-muted,#8a8d85);opacity:.45;font-style:italic; }
  .sf-group { display:flex;align-items:center;gap:6px;flex-wrap:wrap; }
  .sf-group-label {
    font-size:.52rem;font-weight:800;text-transform:uppercase;letter-spacing:.14em;
    opacity:.7;flex-shrink:0;min-width:50px;text-align:right;
  }
  .sf-chips { display:flex;flex-wrap:wrap;gap:3px;flex:1; }
  .sf-tab-row { display: flex; gap: 4px; margin-bottom: 4px; }
  .sf-tab {
    flex: 1;
    font-size: .6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .1em;
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,.08);
    background: rgba(255,255,255,.03);
    color: var(--ink-muted, #8a8d85);
    cursor: pointer;
    transition: all .12s;
    font-family: inherit;
  }
  .sf-tab:hover { color: var(--ink, #e8e4da); border-color: rgba(255,255,255,.15); }
  .sf-tab--active {
    background: rgba(251,146,60,.12);
    border-color: rgba(251,146,60,.3);
    color: #fb923c;
  }
  .sf-tab--active:last-child {
    background: rgba(248,113,113,.12);
    border-color: rgba(248,113,113,.3);
    color: #f87171;
  }

  .sf-sort-row {
    display: flex;
    gap: 6px;
    margin-bottom: 8px;
    background: rgba(0, 0, 0, 0.2);
    padding: 3px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.04);
  }

  .sf-sort-row button {
    flex: 1;
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid transparent;
    cursor: pointer;
    background: transparent;
    color: #8a8d85;
    font-size: .58rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .05em;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .sf-sort-row button:hover:not(.sf-tab--active) {
    color: #e8e4da;
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .sf-sort-row button.sf-tab--active {
    background: rgba(251, 146, 60, 0.15);
    border-color: rgba(251, 146, 60, 0.4);
    color: #fb923c;
    font-weight: 700;
    box-shadow: 0 2px 8px rgba(251, 146, 60, 0.15);
    text-shadow: 0 0 4px rgba(251, 146, 60, 0.2);
  }
</style>