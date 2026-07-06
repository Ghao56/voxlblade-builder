<script context="module" lang="ts">
  interface StatDef {
    key: string
    label: string
  }
  interface StatGroup {
    label: string
    color: string
    stats: StatDef[]
  }
  export function buildStatMaps(
    groups: StatGroup[]
  ): { labelMap: Map<string, string>; colorMap: Map<string, string> } {
    const labelMap = new Map<string, string>()
    const colorMap = new Map<string, string>()
    for (const g of groups) {
      for (const s of g.stats) {
        labelMap.set(s.key, s.label)
        colorMap.set(s.key, g.color)
      }
    }
    return { labelMap, colorMap }
  }
</script>

<script lang="ts">
  export let state: 'include' | 'exclude' | undefined = undefined
  export let color: string = '#fb923c'
  export let dimmed: boolean = false
  export let title: string | undefined = undefined
  export let prefix: string | undefined = undefined

  let ariaLabel: string | undefined = undefined
  export { ariaLabel as 'aria-label' }

  import { createEventDispatcher } from 'svelte'
  const dispatch = createEventDispatcher()

  function handleClick() { dispatch('click') }
  function handleContextMenu() { dispatch('contextmenu') }
  function handleKeydown(e: KeyboardEvent) { dispatch('keydown', e) }
</script>

<button
  class="chip"
  class:chip--include={state === 'include'}
  class:chip--exclude={state === 'exclude'}
  class:chip--dimmed={dimmed}
  style="--c:{color}"
  aria-pressed={!!state}
  aria-label={ariaLabel}
  {title}
  disabled={dimmed}
  on:click={handleClick}
  on:contextmenu|preventDefault={handleContextMenu}
  on:keydown={handleKeydown}
>
  {#if prefix}<span class="prefix">{prefix}</span>{/if}
  {#if state}
    <span class="sign">{state === 'include' ? '+' : '−'}</span>
  {/if}
  <slot />
</button>

<style>
  .chip {
    display:inline-flex;align-items:center;gap:3px;font-size:.62rem;font-weight:600;
    padding:2px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.08);
    background:rgba(255,255,255,.03);color:#8a8d85;cursor:pointer;transition:all .12s;
    font-family:inherit;line-height:1.5;user-select:none;
  }
  .chip:hover {
    border-color:color-mix(in srgb,var(--c,#fb923c) 50%,transparent);
    color:var(--c,#fb923c);
    background:color-mix(in srgb,var(--c,#fb923c) 10%,transparent);
  }
  .chip--include {
    background:rgba(74,222,128,.14);border-color:rgba(74,222,128,.45);
    color:#4ade80;font-weight:700;box-shadow:0 0 6px rgba(74,222,128,.15);
  }
  .chip--include:hover { background:rgba(74,222,128,.22);border-color:rgba(74,222,128,.7);color:#4ade80; }
  .chip--exclude {
    background:rgba(248,113,113,.12);border-color:rgba(248,113,113,.4);
    color:#f87171;font-weight:700;box-shadow:0 0 6px rgba(248,113,113,.12);
  }
  .chip--exclude:hover { background:rgba(248,113,113,.22);border-color:rgba(248,113,113,.65);color:#f87171; }
  .chip--dimmed { opacity:.28; pointer-events:none; }
  .sign { font-size:.7rem;font-weight:900;line-height:1;margin-right:1px; }
  .prefix {
    font-size: .48rem;font-weight:800;letter-spacing:.1em;
    padding:1px 4px;border-radius:3px;
    background:color-mix(in srgb,var(--c,#fb923c) 18%,transparent);
    color:var(--c,#fb923c);
    border:1px solid color-mix(in srgb,var(--c,#fb923c) 35%,transparent);
    flex-shrink:0;
  }
</style>
