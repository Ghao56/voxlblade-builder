<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  // Props mirroring the variables used inline in App.svelte
  export let title: string;
  export let modalSearch: string;
  export let showSuggestions: boolean;
  export let modalSuggestions: any[];
  export let modalSelectedTags: Set<string>;
  /** When true, renders WeaponStatFilter instead of StatFilter */
  export let useWeaponStatFilter: boolean = false;
  /** Required when useWeaponStatFilter is true */
  export let weaponStatFilter: any = null;
  /** When true, renders the Highest / Most Effective / Brawny sort row */
  export let showSortButtons: boolean = false;
  /** Required when showSortButtons is true */
  export let weaponResult: any = null;
  /** Bindable so the parent can read which sort mode is active */
  export let statFilterSortMode: string = 'highest';
  /**
   * Tooltip label inserted into "Sort by Σ(weapon scaling × <effectiveLabel>)".
   * Defaults to "boost"; pass "armor boost" for the infusion slot modal.
   */
  export let effectiveLabel: string = 'boost';

  const dispatch = createEventDispatcher()

  // Re-export the components that were used inline — callers don't need to import them
  import SuggestDrop from './SuggestDrop.svelte';
  import TagFilter from './TagFilter.svelte';
  import StatFilter from './StatFilter.svelte';
  import WeaponStatFilter from './WeaponStatFilter.svelte';

  function handleSelect(e: any) {
    dispatch('select', e.detail)
  }

  function handleToggle(e: any) {
    dispatch('toggle', e.detail)
  }

  function handleClear() {
    dispatch('clear')
  }

  function handleChange(e: any) {
    dispatch('change', e.detail)
  }

  function handleWeaponStatFilterChange(e: any) {
    dispatch('weaponStatFilterChange', e.detail)
  }
</script>

<h2 class="modal-title">{title}</h2>

<div class="search-wrap">
  <input
    class="modal-search-input"
    type="text"
    bind:value={modalSearch}
    placeholder="Search name or perk..."
    on:focus
    on:blur
  />
  <SuggestDrop
    show={showSuggestions}
    suggestions={modalSuggestions}
    suggestQuery={modalSearch}
    on:select={handleSelect}
  />
</div>

<TagFilter
  selectedTags={modalSelectedTags}
  hideTags={['Stance Change']}
  on:toggle={handleToggle}
  on:clear={handleClear}
/>

{#if useWeaponStatFilter}
  <WeaponStatFilter filterValue={weaponStatFilter} on:change={handleWeaponStatFilterChange} />
{:else}
  <StatFilter on:change={handleChange} />
{/if}

{#if showSortButtons && weaponResult}
  <div class="armor-sort-row">
    <span class="armor-sort-label">Sort</span>
    <button
      class="armor-sort-btn"
      class:armor-sort-btn--active={statFilterSortMode === 'highest'}
      on:click={() => (statFilterSortMode = 'highest')}
    >Highest</button>
    <button
      class="armor-sort-btn armor-sort-btn--eff"
      class:armor-sort-btn--active={statFilterSortMode === 'most-effective'}
      on:click={() => (statFilterSortMode = 'most-effective')}
      title="Sort by Σ(weapon scaling × {effectiveLabel})"
    >Most Effective</button>
    <button
      class="armor-sort-btn armor-sort-btn--brawny"
      class:armor-sort-btn--active={statFilterSortMode === 'brawny'}
      on:click={() => (statFilterSortMode = 'brawny')}
      title="Apply Brawny conversion then sort by effective boost"
    >Brawny</button>
  </div>
{/if}
<style>
/* ── Search suggestions ── */
:global(.search-wrap) { position: relative; margin-bottom: 12px; }
:global(.search-wrap .modal-search-input) { margin-bottom: 0; }
:global(.modal-search-input) {
  width: 100%;
  background: var(--surface3);
  border: 1px solid rgba(167,139,250,.35);
  border-radius: var(--radius-sm);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: .85rem;
  padding: 9px 14px;
  outline: none;
  margin-bottom: 12px;
  caret-color: var(--accent3);
  transition: border-color .15s, box-shadow .15s;
}
:global(.modal-search-input::placeholder) { color: var(--ink-muted); opacity: .5; }
:global(.modal-search-input:focus) {
  border-color: rgba(167,139,250,.6);
  box-shadow: 0 0 0 2px rgba(167,139,250,.12);
}

:global(.modal-hl) {
  display: inline;
  background: rgba(167,139,250,.3);
  color: var(--accent3);
  border-radius: 2px;
  padding: 0 1px;
  font-weight: 800;
  font-style: normal;
}

.armor-sort-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
    flex-wrap: wrap;
}
.armor-sort-label {
    font-size: .62rem;
    text-transform: uppercase;
    letter-spacing: .14em;
    font-weight: 700;
    color: var(--ink-muted);
    opacity: .6;
    margin-right: 2px;
}
.armor-sort-btn {
    font-size: .7rem;
    font-weight: 700;
    padding: 4px 11px;
    border-radius: 999px;
    border: 1px solid var(--border-strong);
    background: var(--surface3);
    color: var(--ink-muted);
    cursor: pointer;
    font-family: var(--font-body);
    transition: all .15s;
}
.armor-sort-btn:hover { color: var(--ink); border-color: rgba(255,255,255,.2); }
.armor-sort-btn--active {
    background: rgba(74,222,128,.12);
    border-color: rgba(74,222,128,.35);
    color: var(--accent);
}
.armor-sort-btn--eff.armor-sort-btn--active {
    background: rgba(167,139,250,.14);
    border-color: rgba(167,139,250,.4);
    color: var(--accent3);
}
.armor-sort-btn--brawny.armor-sort-btn--active {
    background: rgba(251,146,60,.14);
    border-color: rgba(251,146,60,.4);
    color: var(--weapon-blade);
}
</style>