<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte'

  export let value: string = ''
  export let options: Array<{ name: string }> = []
  export let placeholder: string = '— None —'

  const dispatch = createEventDispatcher()

  // ── Enchantment color map ─────────────────────────────────────────────────
  const ENCHANT_COLORS: Record<string, string> = {
    'Legendary':     'rgb(255, 238, 0)',
    'Refined':       'rgb(245, 255, 124)',
    'Strengthened':  'rgb(255, 106, 106)',
    'Dexterous':     'rgb(255, 210, 131)',
    'Burning':       'rgb(255, 106, 0)',
    'Wet':           'rgb(61, 145, 255)',
    'Earthen':       'rgb(173, 88, 49)',
    'Magical':       'rgb(74, 246, 255)',
    'Cursed':        'rgb(255, 90, 253)',
    'Windy':         'rgb(255, 255, 255)',
    'Enlightened':   'rgb(244, 255, 169)',
    'Summoners':     'rgb(179, 116, 255)',
    'Hardened':      'rgb(144, 255, 103)',
    'Warded':        'rgb(128, 255, 202)',
    'Tenacious':     'rgb(124, 177, 255)',
    'Insulated':     'rgb(169, 169, 212)',
    'Vampiric':      'rgb(255, 64, 121)',
    'Tanky':         'rgb(20, 152, 17)',
    'Berserking':    'rgb(255, 102, 0)',
    'Fragile':       'rgb(202, 213, 78)',
    'Worthless':     'rgb(153, 24, 24)',
    'Thirsty':       'rgb(162, 52, 38)',
    'Corroded':      'rgb(105, 149, 68)',
    'Corrupt':       'rgb(145, 0, 217)',
    'Sweet':         'rgb(255, 159, 103)',
    'Mythical':      'rgb(128, 0, 255)',
    'Flawless':      'rgb(255, 255, 255)',
    'Brawny':        'rgb(255, 58, 58)',
    'Quick':         'rgb(255, 240, 78)',
    'Blazing':       'rgb(255, 65, 1)',
    'Raining':       'rgb(93, 198, 255)',
    'Stone':         'rgb(182, 171, 154)',
    'Surging':       'rgb(0, 213, 255)',
    'Eldritch':      'rgb(181, 0, 72)',
    'Tempestuous':   'rgb(255, 255, 255)',
    'Blessed':       'rgb(253, 255, 130)',
    'Sacrificial':   'rgb(255, 0, 136)',
    'Wall of':       'rgb(107, 139, 173)',
    'Spell Proof':   'rgb(110, 255, 219)',
    'Ferocious':     'rgb(119, 141, 203)',
    'Contained':     'rgb(161, 176, 190)',
    'Necrotic':      'rgb(75, 255, 156)',
    "Turtle King's": 'rgb(28, 198, 23)',
    'Frenzied':      'rgb(255, 102, 0)',
    'Piercing':      'rgb(229, 229, 229)',
    'Restored':      'rgb(206, 239, 113)',
    'Quenched':      'rgb(255, 0, 0)',
    'Acidic':        'rgb(111, 255, 0)',
    'Warped':        'rgb(122, 61, 255)',
    'Candied':       'rgb(246, 178, 255)',
  }

  export function getColor(name: string): string {
    return ENCHANT_COLORS[name] ?? 'rgb(138, 141, 133)'
  }

  // ── State ─────────────────────────────────────────────────────────────────
  let open = false
  let containerEl: HTMLElement
  let triggerEl: HTMLElement
  let searchQuery = ''
  let highlightIndex = -1
  let dropdownStyle = ''

  function updateDropdownPos() {
    if (!triggerEl) return
    const r = triggerEl.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom
    const dropH = Math.min(300, spaceBelow - 8)
    if (spaceBelow < 120 && r.top > 120) {
      // open upward
      dropdownStyle = `position:fixed;bottom:${window.innerHeight - r.top + 4}px;left:${r.left}px;width:${r.width}px;max-height:${r.top - 8}px;`
    } else {
      dropdownStyle = `position:fixed;top:${r.bottom + 4}px;left:${r.left}px;width:${r.width}px;max-height:${dropH}px;`
    }
  }

  $: filtered = searchQuery.trim()
    ? options.filter(o => o.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : options

  function select(name: string) {
    value = name
    dispatch('change', name)
    open = false
    searchQuery = ''
    highlightIndex = -1
  }

  function toggle() {
    open = !open
    if (open) {
      searchQuery = ''
      highlightIndex = -1
      updateDropdownPos()
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open = true }
      return
    }
    if (e.key === 'Escape') { open = false; return }
    if (e.key === 'ArrowDown') { e.preventDefault(); highlightIndex = Math.min(highlightIndex + 1, filtered.length) }
    if (e.key === 'ArrowUp') { e.preventDefault(); highlightIndex = Math.max(highlightIndex - 1, -1) }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightIndex === -1) select('')
      else if (filtered[highlightIndex]) select(filtered[highlightIndex].name)
    }
  }

  function handleOutsideClick(e: MouseEvent) {
    if (containerEl && !containerEl.contains(e.target as Node)) {
      // Also check if click is inside the dropdown portal
      const dropdown = document.getElementById(dropdownId)
      if (dropdown && dropdown.contains(e.target as Node)) return
      open = false
    }
  }

  const dropdownId = 'ecs-portal-' + Math.random().toString(36).substr(2, 9)

  function handleScroll() { if (open) updateDropdownPos() }

  onMount(() => {
    document.addEventListener('mousedown', handleOutsideClick)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleScroll)
  })
  onDestroy(() => {
    document.removeEventListener('mousedown', handleOutsideClick)
    window.removeEventListener('scroll', handleScroll, true)
    window.removeEventListener('resize', handleScroll)
  })
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="ecs-wrap" bind:this={containerEl} on:keydown={handleKeydown}>
  <!-- Trigger -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y_role_has_required_aria_props -->
  <div
    class="ecs-trigger"
    class:ecs-trigger--open={open}
    class:ecs-trigger--filled={!!value}
    role="button"
    aria-expanded={open}
    aria-haspopup="listbox"
    tabindex="0"
    bind:this={triggerEl}
    on:click={toggle}
  >
    {#if value}
      <span class="ecs-dot" style="background:{getColor(value)};box-shadow:0 0 6px {getColor(value)}55"></span>
      <span class="ecs-label" style="color:{getColor(value)}">{value}</span>
    {:else}
      <span class="ecs-placeholder">{placeholder}</span>
    {/if}
    <span class="ecs-arrow" class:ecs-arrow--open={open}>▾</span>
  </div>

  <!-- Dropdown -->
  {#if open}
    <div class="ecs-dropdown" id={dropdownId} role="listbox" style={dropdownStyle}>
      <!-- Search -->
      <!-- svelte-ignore a11y-autofocus -->
      <div class="ecs-search-wrap">
        <span class="ecs-search-icon">⌕</span>
        <!-- svelte-ignore a11y-autofocus -->
        <input
          class="ecs-search"
          type="text"
          bind:value={searchQuery}
          placeholder="Search..."
          autofocus
          on:click|stopPropagation
        />
        {#if searchQuery}
          <button class="ecs-search-clear" on:click|stopPropagation={() => searchQuery = ''}>✕</button>
        {/if}
      </div>

      <!-- None option -->
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        class="ecs-option ecs-option--none"
        class:ecs-option--selected={value === ''}
        class:ecs-option--highlight={highlightIndex === -1}
        role="option"
        tabindex="-1"
        aria-selected={value === ''}
        on:click={() => select('')}
        on:mouseenter={() => highlightIndex = -1}
      >
        <span class="ecs-opt-dot ecs-opt-dot--none"></span>
        <span class="ecs-opt-name ecs-opt-name--none">— None —</span>
      </div>

      <!-- Options -->
      <div class="ecs-list">
        {#each filtered as opt, i}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            class="ecs-option"
            class:ecs-option--selected={value === opt.name}
            class:ecs-option--highlight={highlightIndex === i}
            role="option"
            tabindex="-1"
            aria-selected={value === opt.name}
            on:click={() => select(opt.name)}
            on:mouseenter={() => highlightIndex = i}
          >
            <span
              class="ecs-opt-dot"
              style="background:{getColor(opt.name)};box-shadow:0 0 5px {getColor(opt.name)}66"
            ></span>
            <span class="ecs-opt-name" style="color:{getColor(opt.name)}">{opt.name}</span>
            {#if value === opt.name}
              <span class="ecs-opt-check">✓</span>
            {/if}
          </div>
        {:else}
          <div class="ecs-empty">No results</div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .ecs-wrap {
    position: relative;
    flex: 1;
    min-width: 0;
    font-family: var(--font-body, 'Trebuchet MS', sans-serif);
  }

  /* ── Trigger ── */
  .ecs-trigger {
    display: flex;
    align-items: center;
    gap: 7px;
    width: 100%;
    padding: 7px 28px 7px 10px;
    border-radius: 7px;
    border: 1px solid rgba(167,139,250,0.25);
    background: #1a1d1b;
    cursor: pointer;
    min-height: 34px;
    position: relative;
    transition: border-color 0.15s, background 0.15s;
    user-select: none;
  }
  .ecs-trigger:hover,
  .ecs-trigger--open {
    border-color: rgba(167,139,250,0.5);
    background: #1e211f;
  }
  .ecs-trigger:focus {
    outline: none;
    border-color: rgba(167,139,250,0.6);
    box-shadow: 0 0 0 2px rgba(167,139,250,0.15);
  }

  .ecs-dot {
    flex-shrink: 0;
    width: 9px;
    height: 9px;
    border-radius: 50%;
  }
  .ecs-label {
    flex: 1;
    font-size: 0.8rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ecs-placeholder {
    flex: 1;
    font-size: 0.8rem;
    color: #555a52;
  }
  .ecs-arrow {
    position: absolute;
    right: 9px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.7rem;
    color: #a78bfa;
    opacity: 0.6;
    transition: transform 0.15s;
    pointer-events: none;
  }
  .ecs-arrow--open {
    transform: translateY(-50%) rotate(180deg);
  }

  /* ── Dropdown ── */
  .ecs-dropdown {
    z-index: 9999;
    background: #141715;
    border: 1px solid rgba(167,139,250,0.3);
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 12px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(167,139,250,0.08);
    animation: ecsOpen 0.12s ease;
    min-width: 180px;
    display: flex;
    flex-direction: column;
  }
  @keyframes ecsOpen {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Search ── */
  .ecs-search-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px 6px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    background: #111312;
  }
  .ecs-search-icon {
    font-size: 0.85rem;
    color: #555a52;
    flex-shrink: 0;
  }
  .ecs-search {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #e8e4da;
    font-size: 0.78rem;
    font-family: inherit;
    caret-color: #a78bfa;
  }
  .ecs-search::placeholder { color: #444845; }
  .ecs-search-clear {
    background: none;
    border: none;
    color: #555a52;
    cursor: pointer;
    font-size: 0.6rem;
    padding: 0;
    transition: color 0.12s;
  }
  .ecs-search-clear:hover { color: #f87171; }

  /* ── List ── */
  .ecs-list {
    flex: 1;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(167,139,250,0.2) transparent;
  }
  .ecs-list::-webkit-scrollbar { width: 4px; }
  .ecs-list::-webkit-scrollbar-thumb { background: rgba(167,139,250,0.2); border-radius: 2px; }

  /* ── Option ── */
  .ecs-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    cursor: pointer;
    transition: background 0.08s;
    position: relative;
  }
  .ecs-option--none {
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .ecs-option:hover,
  .ecs-option--highlight {
    background: rgba(167,139,250,0.08);
  }
  .ecs-option--selected {
    background: rgba(167,139,250,0.1);
  }

  .ecs-opt-dot {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  .ecs-opt-dot--none {
    background: #333;
    box-shadow: none;
  }
  .ecs-opt-name {
    flex: 1;
    font-size: 0.78rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: 0.01em;
  }
  .ecs-opt-name--none {
    color: #555a52 !important;
    font-weight: 400;
  }
  .ecs-opt-check {
    font-size: 0.65rem;
    color: #a78bfa;
    flex-shrink: 0;
    opacity: 0.8;
  }
  .ecs-empty {
    padding: 12px 10px;
    font-size: 0.75rem;
    color: #555a52;
    text-align: center;
    font-style: italic;
  }
</style>