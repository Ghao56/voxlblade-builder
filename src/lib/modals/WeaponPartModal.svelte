<script lang="ts">
  import { build } from '../store'
  import { formatStat } from '../engine'
  import Modal from '../Modal.svelte'
  import ModalSearchHeader from '../../ModalSearchHeader.svelte'
  import DidYouMean from '../../DidYouMean.svelte'
  import Highlight from '../../Highlight.svelte'
  import WeaponStatsDisplay from '../../WeaponStatsDisplay.svelte'

  export let close: () => void
  export let modalSearch = ''
  export let showSuggestions: boolean
  export let modalSuggestions: Array<{label: string; type: 'name' | 'perk'}>
  export let noExactResults: boolean
  export let didYouMean: Array<{label: string; type: 'name' | 'perk'; score?: number}>
  export let onFocus: () => void
  export let onBlur: () => void
  export let onSelect: (e: CustomEvent<{label: string; type: 'name' | 'perk'}>) => void
  export let selectedTags: Set<string>
  export let toggleTag: (tag: string) => void
  export let clearTags: () => void

  export let modalType: string
  export let searchedItems: any[]
  export let weaponStatFilter: Map<string, 'include' | 'exclude'>
  export let onWeaponStatFilterChange: (e: CustomEvent<any>) => void

  export let tierFilterOptions: number[] = []
  export let typeFilterOptions: string[] = []
  export let tierFilterValue = ''
  export let typeFilterValue = ''
  export let onTierFilterChange: ((val: string) => void) | undefined = undefined
  export let onTypeFilterChange: ((val: string) => void) | undefined = undefined

  $: isBlade = modalType === 'blade'
  $: isHandle = modalType === 'handle'
  $: isGlove = modalType === 'glove'
  $: isEssence = modalType === 'essence'

  $: title = isBlade ? 'Select Blade'
    : isHandle ? 'Select Handle'
    : isGlove ? 'Select Glove'
    : 'Select Essence'
  $: storeKey = isBlade ? 'weaponBlade'
    : isHandle ? 'weaponHandle'
    : isGlove ? 'monkGlove'
    : 'monkEssence'
  $: partLabel = isBlade ? 'Blade'
    : isHandle ? 'Handle'
    : isGlove ? 'Glove'
    : 'Essence'
  $: partLabelCssClass = 'modal-item--' + partLabel.toLowerCase()

  $: selectedValue = isBlade ? $build.weaponBlade
    : isHandle ? $build.weaponHandle
    : isGlove ? $build.monkGlove
    : $build.monkEssence

  function select(name: string) {
    build.update(s => ({...s, [storeKey]: name}))
    close()
  }
</script>

<Modal onclose={close}>
  <ModalSearchHeader
    {title}
    bind:modalSearch
    {showSuggestions}
    {modalSuggestions}
    modalSelectedTags={selectedTags}
    hideTags={[]}
    useWeaponStatFilter
    {weaponStatFilter}
    on:focus={onFocus}
    on:blur={onBlur}
    on:toggle={(e) => toggleTag(e.detail)}
    on:clear={clearTags}
    on:select={onSelect}
    on:weaponStatFilterChange={onWeaponStatFilterChange}
  />
    {#if tierFilterOptions.length || typeFilterOptions.length}
    <div class="modal-filters">
      {#if tierFilterOptions.length}
        <select class="modal-filter-sel" value={tierFilterValue} on:change={(e) => onTierFilterChange?.(e.currentTarget.value)}>
          <option value="">All Tiers</option>
          {#each tierFilterOptions as t}
            <option value={String(t)}>Tier {t}</option>
          {/each}
        </select>
      {/if}
      {#if typeFilterOptions.length}
        <select class="modal-filter-sel" value={typeFilterValue} on:change={(e) => onTypeFilterChange?.(e.currentTarget.value)}>
          <option value="">All Types</option>
          {#each typeFilterOptions as t}
            <option value={t}>{t}</option>
          {/each}
        </select>
      {/if}
    </div>
  {/if}
  <div class="modal-list modal-list--compact">
    <button class="modal-item modal-item--sm" class:modal-item--active={!selectedValue}
      on:click={() => select('')}>
      <span class="modal-item-name">— None —</span>
    </button>
    {#each searchedItems as item}
      <button class="modal-item modal-item--sm {partLabelCssClass}"
        class:modal-item--active={selectedValue === item.name}
        on:click={() => select(item.name)}>
        <div class="modal-item-head">
          <span class="modal-item-name"><Highlight text={item.name} query={modalSearch} /></span>
          <span class="modal-tier-badge" class:modal-tier-badge--handle={isHandle} class:modal-tier-badge--glove={isGlove}>T{item.tier}</span>
          {#if (isBlade && item.bladeType) || (isHandle && item.handleType)}
            <span class="modal-type-badge" class:modal-type-badge--blade={isBlade} class:modal-type-badge--handle={isHandle}>{item.bladeType || item.handleType}</span>
          {/if}
          {#if item.attackSpeed != null}
            <span class="modal-cd-badge">{item.attackSpeed}x spd</span>
          {/if}
        </div>
        <WeaponStatsDisplay stats={item.stats ?? {}} />
        {#if (item as any).perks?.length}
          {#each (item as any).perks as p}
            <span class="modal-perk-tag"><Highlight text={p.name} query={modalSearch} /> +{p.amount}</span>
          {/each}
        {/if}
      </button>
    {/each}
    <DidYouMean
      {noExactResults}
      {didYouMean}
      searchQuery={modalSearch}
      on:select={(e) => { modalSearch = e.detail }}
    />
  </div>
</Modal>
