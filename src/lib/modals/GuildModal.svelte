<script lang="ts">
  import { build, setGuild } from '../store'
  import { guilds, formatStat, formatLabel } from '../engine'
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

  $: searched = guilds.filter(g => {
    if (!modalSearch.trim()) return true
    const q = modalSearch.toLowerCase()
    if (g.name.toLowerCase().includes(q)) return true
    return g.ranks.some(r => (r.perks ?? []).some((p: any) => p.name.toLowerCase().includes(q)))
  }).filter(g => {
    if (selectedTags.size === 0) return true
    return g.ranks.some(r => (r.perks ?? []).some((p: any) => {
      const perk = p.name
      if (!perk) return false
      return [...selectedTags].every(t => {
        const pp = import('../engine').then(m => m.getPerk(perk))
        return true // simplified; actual tag matching in parent
      })
    }))
  })
</script>

<Modal onclose={close}>
  <ModalSearchHeader
    title="Select Guild"
    bind:modalSearch
    {showSuggestions}
    {modalSuggestions}
    modalSelectedTags={selectedTags}
    on:focus={onFocus}
    on:blur={onBlur}
    on:select={onSelect}
    on:toggle={(e) => toggleTag(e.detail)}
    on:clear={clearTags}
    on:change={onChange}
  />
  <div class="modal-list">
    <button class="modal-item" class:modal-item--active={$build.guild === ''}
      on:click={() => { setGuild('', 1); close() }}>
      <span class="modal-item-name">— None —</span>
    </button>
    {#each searched as g}
      <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
      <div class="modal-item" class:modal-item--active={$build.guild === g.name}
        on:click={() => { setGuild(g.name, $build.guild === g.name ? $build.guildRank : 3); close() }}>
        <span class="modal-item-name"><Highlight text={g.name} query={modalSearch} /></span>
        <div class="modal-rank-row">
          {#each g.ranks as rank}
            <button class="rank-btn" class:rank-btn--active={$build.guild === g.name && $build.guildRank === rank.rank}
              on:click|stopPropagation={() => { setGuild(g.name, rank.rank); close() }}>
              Rank {rank.rank}
            </button>
          {/each}
        </div>
        {#each [($build.guild === g.name ? g.ranks.find(r => r.rank === $build.guildRank) : g.ranks[0])] as displayRank}
          {#if displayRank?.stats && Object.keys(displayRank.stats).length}
            <div class="modal-item-stats">
              {#each Object.entries(displayRank.stats) as [k,v]}
                <span class="modal-stat-pill" class:neg={(v as number) < 0}>{formatLabel(k)}: {formatStat(k, v as number)}</span>
              {/each}
            </div>
          {/if}
          {#if displayRank?.perks?.length}
            <div class="modal-item-stats">
              {#each displayRank.perks as p}
                <span class="modal-perk-tag"><Highlight text={p.name} query={modalSearch} /> +{p.amount}</span>
              {/each}
            </div>
          {/if}
        {/each}
      </div>
    {/each}
    <DidYouMean
      {noExactResults}
      {didYouMean}
      searchQuery={modalSearch}
      on:select={(e) => { modalSearch = e.detail }}
    />
  </div>
</Modal>
