<script lang="ts">
  import { createEventDispatcher } from 'svelte'

    const dispatch = createEventDispatcher<{
      change: {
        filter: Map<string,'include'|'exclude'>
        sortMode:'highest'|'lowest'|'alphabetical'
      }
    }>()

  const STAT_GROUPS = [
    {
      label: 'Boost', color: '#fb923c',
      stats: [
        { key: 'dexterityBoost', label: 'Dexterity' },
        { key: 'physicalBoost',  label: 'Physical'  },
        { key: 'magicBoost',     label: 'Magic'     },
        { key: 'fireBoost',      label: 'Fire'      },
        { key: 'waterBoost',     label: 'Water'     },
        { key: 'earthBoost',     label: 'Earth'     },
        { key: 'airBoost',       label: 'Air'       },
        { key: 'hexBoost',       label: 'Hex'       },
        { key: 'holyBoost',      label: 'Holy'      },
        { key: 'summonBoost',    label: 'Summon'    },
      ],
    },
    {
      label: 'Defense', color: '#38bdf8',
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
      label: 'Utility', color: '#4ade80',
      stats: [
        { key: 'speedBoost',       label: 'Speed'     },
        { key: 'attackSpeed',      label: 'Atk Speed' },
        { key: 'jumpBoost',        label: 'Jump'      },
      ],
    },
]
  let activeTab: 'positive' | 'negative' = 'positive'
  let sortMode: 'highest' |'lowest' |'alphabetical' ='highest'
  const NEG_STAT_GROUPS = [
    {
      label: 'Boost', color: '#f87171',
      stats: [
        { key: 'neg:dexterityBoost', label: 'Dexterity' },
        { key: 'neg:physicalBoost',  label: 'Physical'  },
        { key: 'neg:magicBoost',     label: 'Magic'     },
        { key: 'neg:fireBoost',      label: 'Fire'      },
        { key: 'neg:waterBoost',     label: 'Water'     },
        { key: 'neg:earthBoost',     label: 'Earth'     },
        { key: 'neg:airBoost',       label: 'Air'       },
        { key: 'neg:hexBoost',       label: 'Hex'       },
        { key: 'neg:holyBoost',      label: 'Holy'      },
        { key: 'neg:summonBoost',    label: 'Summon'    },
      ],
    },
    {
      label: 'Defense', color: '#fca5a5',
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
      label: 'Utility', color: '#86efac',
      stats: [
        { key: 'neg:speedBoost',  label: 'Speed'     },
        { key: 'neg:attackSpeed', label: 'Atk Speed' },
        { key: 'neg:jumpBoost',   label: 'Jump'      },
      ],
    },
  ]

    // Fully isolated state per instance
    let active: Map<string, 'include' | 'exclude'> = new Map()
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

    function toggle(key: string) {
        const cur = active.get(key)
        // off -> include
        if (!cur) {
            active.set(key, 'include')
        // include -> exclude
        } else if (cur === 'include') {
            active.set(key, 'exclude')
        // exclude -> off
        } else {
            active.delete(key)
        }
        active = new Map(active)
        dispatch('change',{filter: active,sortMode})
    }

  function remove(key: string) {
    active.delete(key)
    active = new Map(active)
    dispatch('change',{filter: active,sortMode})
  }

  function clear() {
    active = new Map()
    dispatch('change',{filter: active,sortMode})
  }

  function getLabel(key: string) {
    for (const g of STAT_GROUPS)
      for (const s of g.stats)
        if (s.key === key) return s.label
    return key
  }

  function getColor(key: string) {
    for (const g of STAT_GROUPS)
      if (g.stats.some(s => s.key === key)) return g.color
    return '#8a8d85'
  }
</script>

<div class="sf-root">
  <div class="sf-header">
    <button class="sf-toggle" on:click={() => expanded = !expanded}>
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
          <button
            class="sf-chip sf-chip--active"
            class:sf-chip--include={state === 'include'}
            class:sf-chip--exclude={state === 'exclude'}
            style="--c:{getColor(key)}"
            title="Click cycle · Right-click remove"
            on:click={() => toggle(key)}
            on:contextmenu|preventDefault={() => remove(key)}
          >
            <span class="sf-sign">{state === 'include' ? '+' : '−'}</span>
            {getLabel(key)}
          </button>
        {/each}
        <button class="sf-clear" on:click={clear}>Clear all</button>
      </div>
    {/if}
  </div>

  {#if expanded}
  <div class="sf-panel">

    <div class="sf-tab-row">
      <button
        class="sf-tab"
        class:sf-tab--active={activeTab === 'positive'}
        on:click={() => activeTab = 'positive'}
      >
        Positive Stats
      </button>

      <button
        class="sf-tab"
        class:sf-tab--active={activeTab === 'negative'}
        on:click={() => activeTab = 'negative'}
      >
        Negative Stats
      </button>
    </div>

    <div class="sf-legend">
      <div class="sf-sort-row">
        <button class={sortMode==='highest'? 'sf-tab sf-tab--active': 'sf-tab'} on:click={()=>{sortMode='highest'; dispatch('change',{filter:active,sortMode})}}>
          Highest
        </button>
        <button class={sortMode==='lowest'? 'sf-tab sf-tab--active': 'sf-tab'} on:click={()=>{sortMode='lowest'; dispatch('change',{filter:active,sortMode})}}>
          Lowest
        </button>
        <button class={sortMode==='alphabetical'? 'sf-tab sf-tab--active': 'sf-tab'} on:click={()=>{sortMode='alphabetical'; dispatch('change',{filter:active,sortMode})}}>
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

        {#if activeTab === 'positive'}

        {#each STAT_GROUPS as group}
            <div class="sf-group">
            <span
              class="sf-group-label"
              style="color:{group.color}"
            >
              {group.label}
            </span>

            <div class="sf-chips">
                {#each group.stats as stat}
                {@const state = active.get(stat.key)}
                {@const dimmed = hiddenInPositive.has(stat.key)}
                <button
                  class="sf-chip"
                  class:sf-chip--include={state === 'include'}
                  class:sf-chip--exclude={state === 'exclude'}
                  class:sf-chip--dimmed={dimmed}
                  style="--c:{group.color}"
                  on:click={() => toggle(stat.key)}
                  on:contextmenu|preventDefault={() => remove(stat.key)}
                >
                  {#if state}
                    <span class="sf-sign">
                      {state === 'include' ? '+' : '−'}
                    </span>
                  {/if}

                  {stat.label}
                </button>
              {/each}
            </div>
          </div>
      {/each}

        {:else}

        {#each NEG_STAT_GROUPS as group}
            <div class="sf-group">
            <span
              class="sf-group-label"
              style="color:{group.color}"
            >
              {group.label}
            </span>

            <div class="sf-chips">
                {#each group.stats as stat}
                {@const state = active.get(stat.key)}
                {@const dimmed = hiddenInNegative.has(stat.key.slice(4))}
                <button
                  class="sf-chip"
                  class:sf-chip--include={state === 'include'}
                  class:sf-chip--exclude={state === 'exclude'}
                  class:sf-chip--dimmed={dimmed}
                  style="--c:{group.color}"
                  on:click={() => toggle(stat.key)}
                  on:contextmenu|preventDefault={() => remove(stat.key)}
                >
                  {#if state}
                    <span class="sf-sign">
                      {state === 'include' ? '+' : '−'}
                    </span>
                  {/if}

                  {stat.label}
                </button>
              {/each}
            </div>
          </div>
      {/each}

    {/if}

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
    background:rgba(251,146,60,.18);border:1px solid rgba(251,146,60,.35);color:#fb923c;
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
  .sf-legend {
    display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:2px;
  }
  .sf-leg {
    font-size:.58rem;font-weight:700;padding:1px 6px;border-radius:4px;
  }
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
  .sf-chip {
    display:inline-flex;align-items:center;gap:3px;font-size:.62rem;font-weight:600;
    padding:2px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.08);
    background:rgba(255,255,255,.03);color:#8a8d85;cursor:pointer;transition:all .12s;
    font-family:inherit;line-height:1.5;user-select:none;
  }
  .sf-chip:hover {
    border-color:color-mix(in srgb,var(--c,#fb923c) 50%,transparent);
    color:var(--c,#fb923c);
    background:color-mix(in srgb,var(--c,#fb923c) 10%,transparent);
  }
  .sf-chip--include {
    background:rgba(74,222,128,.14);border-color:rgba(74,222,128,.45);
    color:#4ade80;font-weight:700;box-shadow:0 0 6px rgba(74,222,128,.15);
  }
  .sf-chip--include:hover { background:rgba(74,222,128,.22);border-color:rgba(74,222,128,.7);color:#4ade80; }
  .sf-chip--exclude {
    background:rgba(248,113,113,.12);border-color:rgba(248,113,113,.4);
    color:#f87171;font-weight:700;box-shadow:0 0 6px rgba(248,113,113,.12);
  }
  .sf-chip--exclude:hover { background:rgba(248,113,113,.22);border-color:rgba(248,113,113,.65);color:#f87171; }
  .sf-chip--dimmed { opacity:.28; pointer-events:none; }
  .sf-sign { font-size:.7rem;font-weight:900;line-height:1;margin-right:1px; }
  .sf-tab-row {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}
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