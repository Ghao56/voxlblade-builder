<script lang="ts">
  import { slide } from 'svelte/transition'
  import { createEventDispatcher, tick } from 'svelte'
  import { UI_COLORS } from './lib/uiConstants'
  import Badge from './lib/ui/Badge.svelte'

  export let selectedTags: Set<string>
  export let hideTags: string[] = []

  const dispatch = createEventDispatcher()

  const TAG_GROUPS: Array<{ label: string; color: string; tags: string[] }> = [
    {
      label: 'Combat',
      color: UI_COLORS.combat,
      tags: ["Attack Speed","Damage Boost","Crit","Crit Damage","Finisher","RNG","Guardbreak","Poise","Defensive","Offensive", "Mobility"],
    },
    {
      label: 'Support',
      color: UI_COLORS.support,
      tags: ["Healing","Heal Boost","Cleanse","Cooldown Reduction"],
    },
    {
      label: 'Status',
      color: UI_COLORS.status,
      tags: ["Bleed Potency","Burn Potency","Poison Potency","Buff","Debuff"],
    },
    {
      label: 'Weapon Art/Rune',
      color: UI_COLORS.cantrip,
      tags:  ["Weapon Art","Weapon Art Activated","Rune","Rune Activated"],
    },
    {
      label: 'Special',
      color: UI_COLORS.special,
      tags: ["Summoner","Stance Change","Self-Damage","Self-Debuff","Stat Boost"],
    },
  ]

  const TAG_COLOR_MAP = new Map<string, string>()
  for (const group of TAG_GROUPS) {
    for (const tag of group.tags) {
      TAG_COLOR_MAP.set(tag, group.color)
    }
  }

  $: filteredGroups = TAG_GROUPS.map(group => ({
    ...group,
    tags: group.tags.filter(t => !hideTags.includes(t))
  })).filter(group => group.tags.length > 0)

  let expanded = false

  function toggle(tag: string) {
    dispatch('toggle', tag)
  }

  function clearAll() {
    selectedTags.clear()
    selectedTags = selectedTags
    dispatch('change', selectedTags)
  }

  async function togglePanel() {
    expanded = !expanded
    if (expanded) {
      await tick()
    }
  }
</script>

<div class="tf-container">
<div 
    class="tf-bar" 
    class:tf-bar--open={expanded}
    role="button"
    tabindex="0"
    aria-expanded={expanded}
    aria-label="Toggle Tag Filter Panel"
    style="cursor: pointer;"
    on:click={togglePanel}
    on:keydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        togglePanel();
      }
    }}
  >
    <div class="tf-bar-left">
      <div class="tf-toggle-info">
        <span class="tf-chevron" class:tf-chevron--rot={expanded}>▸</span>
        <span class="tf-bar-title">Filter by Tags</span>
        
        {#if selectedTags.size > 0}
          <Badge color="var(--accent2)" size="xs" square solid>{selectedTags.size}</Badge>
        {:else}
          <span class="sf-hint">click to filter</span>
        {/if}
      </div>

      {#if selectedTags.size > 0}
        <div class="tf-summary-chips">
          {#each Array.from(selectedTags) as tag}
            <button 
              class="tf-sum-chip" 
              style="--c: {TAG_COLOR_MAP.get(tag) ?? '#94a3b8'}"
              title="Click to remove tag"
              aria-label="Remove filter tag {tag}"
              on:click|stopPropagation={() => toggle(tag)}
            >
              {tag} <span class="tf-sum-chip-x">×</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    {#if selectedTags.size > 0}
      <button 
        class="tf-clear-btn" 
        on:click|stopPropagation={clearAll}
        on:keydown|stopPropagation
      >
        Clear All
      </button>
    {/if}
  </div>

  {#if expanded}
    <div class="tf-panel" transition:slide={{ duration: 200 }}>
      {#each filteredGroups as group}
        <div class="tf-group">
          <span class="tf-group-label" style="color:{group.color}">{group.label}</span>
          <div class="tf-chips">
            {#each group.tags as tag}
              {@const active = selectedTags.has(tag)}
              <button
                class="tf-chip"
                class:tf-chip--active={active}
                style="--c:{group.color}"
                aria-pressed={active}
                on:click={() => toggle(tag)}
              >
                {tag}
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .tf-container {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
    font-family: var(--font-body);
    transition: border-color var(--transition-fast);
  }
  .tf-container:hover {
    border-color: var(--border-hover);
  }

  .tf-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    gap: 12px;
    user-select: none;
    transition: background var(--transition-fast), color var(--transition-fast);
    color: var(--ink-muted);
  }
  .tf-bar:hover {
    background: rgba(255, 255, 255, 0.015);
    color: var(--ink);
  }
  .tf-bar--open {
    color: var(--ink);
  }

  .tf-bar-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    overflow: hidden;
  }

  .tf-toggle-info {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .tf-chevron {
    font-size: .65rem;
    display: inline-block;
    transition: transform var(--transition-fast);
    transform: translateX(1px);
    opacity: .5;
  }
  .tf-chevron--rot { transform: rotate(90deg) translateY(-1px); opacity: .8; }

  .tf-bar-title {
    font-size: .62rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .15em;
  }

  .tf-summary-chips {
    display: flex;
    align-items: center;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
    padding-bottom: 0px;
  }
  .tf-summary-chips::-webkit-scrollbar { display: none; }

  .tf-sum-chip {
    font-size: .58rem;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: var(--radius-xs);
    background: color-mix(in srgb, var(--c) 10%, rgba(255,255,255,0.02));
    border: 1px solid color-mix(in srgb, var(--c) 30%, rgba(255,255,255,0.06));
    color: color-mix(in srgb, var(--c) 80%, #d1d5db);
    cursor: pointer;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 3px;
    font-family: inherit;
    transition: all var(--transition-fast);
  }
  .tf-sum-chip:hover {
    background: color-mix(in srgb, var(--c) 20%, rgba(255,255,255,0.04));
    border-color: var(--c);
    color: #fff;
  }
  .tf-sum-chip-x { opacity: .45; font-size: .65rem; font-weight: 400; }

  .tf-clear-btn {
    background: none;
    border: none;
    padding: 2px 8px;
    font-size: .58rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: var(--neg);
    opacity: .6;
    cursor: pointer;
    font-family: inherit;
    border-radius: var(--radius-xs);
    transition: all var(--transition-fast);
  }
  .tf-clear-btn:hover { opacity: 1; background: rgba(248,113,113,0.06); }

  .tf-panel {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 8px 12px 10px;
    border-top: 1px solid var(--border);
  }

  .tf-group {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .tf-group-label {
    font-size: .52rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .14em;
    opacity: .65;
    flex-shrink: 0;
    min-width: 50px;
    text-align: right;
  }

  .tf-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    flex: 1;
  }

  .tf-chip {
    font-size: .62rem;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--surface3);
    color: var(--ink-muted);
    cursor: pointer;
    transition: all var(--transition-fast);
    font-family: inherit;
    line-height: 1.5;
    user-select: none;
  }
  .tf-chip:hover {
    border-color: color-mix(in srgb, var(--c) 45%, transparent);
    color: var(--c);
    background: color-mix(in srgb, var(--c) 8%, transparent);
  }
  .tf-chip--active {
    background: color-mix(in srgb, var(--c) 12%, transparent) !important;
    border-color: color-mix(in srgb, var(--c) 50%, transparent) !important;
    color: var(--c) !important;
    font-weight: 700;
    box-shadow: 0 0 8px color-mix(in srgb, var(--c) 12%, transparent);
  }
  .tf-chip--active:hover {
    background: color-mix(in srgb, var(--c) 20%, transparent) !important;
    border-color: var(--c) !important;
  }
  .sf-hint { font-size:.58rem;opacity:.3;font-style:italic; }

</style>