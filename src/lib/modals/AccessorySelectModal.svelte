<script lang="ts">
  import { build } from '../store'
  import { getArmorPart, formatStat, formatLabel } from '../engine'
  import Modal from '../Modal.svelte'
  import ModalSearchHeader from '../../ModalSearchHeader.svelte'
  import DidYouMean from '../../DidYouMean.svelte'
  import Highlight from '../../Highlight.svelte'

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
  export let onChange: (e: CustomEvent<any>) => void

  export let modalType: string
  export let searchedItems: any[]
  export let showSortButtons = false
  export let effectiveLabel = 'boost'
  export let hideTags: string[] | undefined = undefined

  $: slotName = modalType === 'armor-helmet' || modalType === 'infusion-helmet' ? 'Helmet'
    : modalType === 'armor-chestplate' || modalType === 'infusion-chestplate' ? 'Chestplate'
    : modalType === 'armor-leggings' || modalType === 'infusion-leggings' ? 'Leggings'
    : null
  $: isInfusion = modalType.startsWith('infusion-')
  $: isRing = modalType === 'ring' || modalType === 'infusion-ring'
  $: isRune = modalType === 'rune'

  $: title = isInfusion
    ? `Select Infusion ${slotName || (isRing ? 'Ring' : '')}`
    : isRing ? 'Select Ring'
    : isRune ? 'Select Rune'
    : `Select ${slotName}`

  $: storeKey = isInfusion
    ? (modalType === 'infusion-ring' ? 'infusionRing' : ('infusion' + slotName) as string)
    : isRing ? 'ring'
    : isRune ? 'rune'
    : (slotName?.toLowerCase() ?? '')

  $: selectedValue = isInfusion
    ? (modalType === 'infusion-ring' ? $build.infusionRing : $build[storeKey as 'infusionHelmet' | 'infusionChestplate' | 'infusionLeggings'])
    : isRing ? $build.ring
    : isRune ? $build.rune
    : $build[storeKey as 'helmet' | 'chestplate' | 'leggings']

  function select(name: string) {
    build.update(s => ({...s, [storeKey]: name}))
    close()
  }

  function getItemStats(item: any) {
    if (slotName) {
      const part = getArmorPart(item.name, slotName as any)
      return part?.stats ?? {}
    }
    if (isRing) return item.stats ?? {}
    if (isRune) return item.stats ?? {}
    return {}
  }

  function getItemPerk(item: any): { name: string; amount: number } | null {
    if (slotName) {
      const part = getArmorPart(item.name, slotName as any)
      if (part?.perkName) return { name: part.perkName, amount: part.perkAmount ?? 1 }
      return null
    }
    if (item.perkName) return { name: item.perkName, amount: item.perkAmount ?? 1 }
    return null
  }

  function getItemDesc(item: any): string | undefined {
    if (slotName) {
      const part = getArmorPart(item.name, slotName as any)
      return part?.description
    }
    return item.description
  }
</script>

<Modal onclose={close}>
  <ModalSearchHeader
    {title}
    bind:modalSearch
    {showSuggestions}
    {modalSuggestions}
    modalSelectedTags={selectedTags}
    {showSortButtons}
    {hideTags}
    {effectiveLabel}
    on:focus={onFocus}
    on:blur={onBlur}
    on:select={onSelect}
    on:toggle={(e) => toggleTag(e.detail)}
    on:clear={clearTags}
    on:change={onChange}
  />
  <div class="modal-list modal-list--compact">
    <button class="modal-item modal-item--sm" class:modal-item--inf={isInfusion} class:modal-item--active={!selectedValue}
      on:click={() => select('')}>
      <span class="modal-item-name">— None —</span>
    </button>
    {#each searchedItems as item}
      <button class="modal-item modal-item--sm" class:modal-item--inf={isInfusion} class:modal-item--active={selectedValue === item.name}
        on:click={() => select(item.name)}>
        <div class="modal-item-head">
          <span class="modal-item-name">
            <Highlight text={item.name} query={modalSearch} />
            {#if isInfusion}<span class="inf-label">×0.5</span>{/if}
          </span>
        </div>
        {#if getItemDesc(item)}
          <span class="modal-item-desc">{getItemDesc(item)}</span>
        {/if}
        {#if isRune}
          <span class="modal-cd-badge">CD: {item.cooldown}s</span>
        {/if}
        {#each [getItemPerk(item)] as perk}
          {#if perk}
            <span class="modal-perk-tag"><Highlight text={perk.name} query={modalSearch} /> +{perk.amount}</span>
          {/if}
        {/each}
        <div class="modal-item-stats">
          {#each Object.entries(getItemStats(item)).filter(([,v]) => v !== 0) as [k,v]}
            <span class="modal-stat-pill" class:modal-stat-pill--inf={isInfusion} class:neg={(v as number) < 0}>
              {formatLabel(k)}: {formatStat(k, isInfusion ? (v as number) * 0.5 : v as number)}
            </span>
          {/each}
        </div>
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
