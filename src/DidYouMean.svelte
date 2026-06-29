<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { highlightTextParts } from './lib/utils'

  export let noExactResults: boolean = false
  export let didYouMean: Array<{ label: string; type: 'name' | 'perk'; score?: number }> = []
  export let searchQuery: string = ''

  const dispatch = createEventDispatcher<{ select: string }>()

  function highlightParts(label: string, query: string): Array<{ text: string; highlight: boolean }> {
    return highlightTextParts(label, query)
  }
</script>

{#if noExactResults && didYouMean.length > 0}
  <div class="dym-block">
    <span class="dym-label">Did you mean?</span>
    <div class="dym-chips">
      {#each didYouMean as s}
        <button class="dym-chip" class:dym-chip--perk={s.type === 'perk'}
          on:click={() => dispatch('select', s.label)}>
          {#if s.type === 'perk'}
            <span class="perk-icon">💡</span>
          {/if}
          {#each highlightParts(s.label, searchQuery) as part}
            {#if part.highlight}
              <em class="modal-hl">{part.text}</em>
            {:else}
              {part.text}
            {/if}
          {/each}
        </button>
      {/each}
    </div>
  </div>
{:else if noExactResults}
  <p class="dym-empty">No results for "<strong>{searchQuery}</strong>"</p>
{/if}

<style>
  :global(.modal-hl) {
    display: inline;
    background: rgba(167,139,250,.3);
    color: var(--accent3);
    border-radius: 2px;
    padding: 0 1px;
    font-weight: 800;
    font-style: normal;
  }
  .dym-block {
    margin-top: 8px;
    padding: 10px 12px;
    background: rgba(167,139,250,.07);
    border: 1px solid rgba(167,139,250,.22);
    border-radius: var(--radius-sm);
    display: flex;
    flex-direction: column;
    gap: 7px;
    animation: iepSlide .15s ease;
  }
  .dym-label {
    font-size: .6rem;
    text-transform: uppercase;
    letter-spacing: .16em;
    font-weight: 800;
    color: var(--accent3);
    opacity: .7;
  }
  .dym-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .dym-chip {
    font-size: .78rem;
    font-weight: 600;
    padding: 4px 11px;
    border-radius: 999px;
    border: 1px solid rgba(167,139,250,.3);
    background: rgba(167,139,250,.1);
    color: var(--accent3);
    cursor: pointer;
    font-family: var(--font-body);
    transition: all .12s;
  }
  .dym-chip:hover {
    background: rgba(167,139,250,.22);
    border-color: rgba(167,139,250,.55);
  }
  .dym-chip--perk {
    border-color: rgba(245,158,11,.3);
    background: rgba(245,158,11,.09);
    color: var(--accent2);
  }
  .dym-chip--perk:hover {
    background: rgba(245,158,11,.2);
    border-color: rgba(245,158,11,.55);
  }
  .dym-empty {
    margin-top: 8px;
    padding: 10px 12px;
    font-size: .8rem;
    color: var(--ink-muted);
    font-style: italic;
    background: var(--surface3);
    border-radius: var(--radius-sm);
    border: 1px dashed var(--border);
  }
  .dym-empty strong { color: var(--ink); font-style: normal; }
</style>