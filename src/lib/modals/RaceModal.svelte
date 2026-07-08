<script lang="ts">
  import { build } from '../store'
  import { races, formatStat, formatLabel } from '../engine'
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

  $: searched = races.filter(r => {
    if (!modalSearch.trim()) return true
    const q = modalSearch.toLowerCase()
    return r.name.toLowerCase().includes(q)
  })
</script>

<Modal onclose={close}>
  <ModalSearchHeader
    title="Select Race"
    bind:modalSearch
    {showSuggestions}
    {modalSuggestions}
    hideTagFilter
    hideStatFilter
    on:focus={onFocus}
    on:blur={onBlur}
    on:select={onSelect}
  />
  <div class="modal-list">
    {#each searched as r}
      <button class="modal-item" class:modal-item--active={$build.race === r.name}
        on:click={() => { build.update(s => ({...s, race: r.name})); close() }}>
        <span class="modal-item-name"><Highlight text={r.name} query={modalSearch} /></span>
        <span class="modal-item-desc">{r.passive}</span>
        {#if r.statModifiers && Object.keys(r.statModifiers).length}
          <div class="modal-item-stats">
            {#each Object.entries(r.statModifiers) as [k,v]}
              <span class="modal-stat-pill" class:neg={v < 0}>{formatLabel(k)}: {formatStat(k, v as number)}</span>
            {/each}
          </div>
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
