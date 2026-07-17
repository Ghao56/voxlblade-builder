<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { highlightTextParts } from './lib/utils'

  const dispatch = createEventDispatcher<{ select: { label: string; type: 'name' | 'perk' } }>()

  export let show: boolean
  export let suggestions: Array<{ label: string; type: 'name' | 'perk' }>
  export let suggestQuery: string
</script>

{#if show && suggestions.length > 0}
  <div class="suggest-drop">
    {#each suggestions as s}
      <button
        class="suggest-item"
        class:suggest-item--perk={s.type === 'perk'}
        on:mousedown|preventDefault={() => dispatch('select', { label: s.label, type: s.type })}
      >
        <span class="suggest-type">{s.type === 'perk' ? 'Perk' : 'Name'}</span>
          <span class="suggest-label">
          {#each highlightTextParts(s.label, suggestQuery) as part}
            {#if part.highlight}
              <mark class="modal-hl">{part.text}</mark>
            {:else}
              {part.text}
            {/if}
          {/each}
        </span>
      </button>
    {/each}
  </div>
{/if}
<style>
.suggest-drop {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: var(--z-dropdown);
  background: var(--surface); border: 1px solid rgba(167,139,250,.4);
  border-radius: var(--radius-sm);
  box-shadow: 0 8px 24px rgba(0,0,0,.5);
  overflow-y: auto;
  max-height: 260px;
  scrollbar-width: thin;
  scrollbar-color: rgba(167,139,250,.3) transparent;
  animation: iepSlide .12s ease;
}
.suggest-drop::-webkit-scrollbar { width: 4px; }
.suggest-drop::-webkit-scrollbar-thumb { background: rgba(167,139,250,.3); border-radius: 2px; }
.suggest-item {
  display: flex; align-items: center; gap: 8px;
  width: 100%; text-align: left; padding: 8px 12px;
  background: none; border: none; border-bottom: 1px solid var(--border);
  color: var(--ink); font-family: var(--font-body); font-size: .84rem;
  cursor: pointer; transition: background .1s;
}
.suggest-label { flex: 1; min-width: 0; }
.suggest-item:last-child { border-bottom: none; }
.suggest-item:hover { background: var(--surface3); }
.suggest-item--perk { color: var(--accent2); }
.suggest-type {
  font-size: .55rem; font-weight: 800; text-transform: uppercase;
  letter-spacing: .14em; padding: 1px 5px; border-radius: 3px;
  flex-shrink: 0;
  background: rgba(167,139,250,.12); border: 1px solid rgba(167,139,250,.2); color: var(--accent3);
}
.suggest-item--perk .suggest-type {
  background: rgba(245,158,11,.12); border-color: rgba(245,158,11,.22); color: var(--accent2);
}
</style>