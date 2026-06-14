<script lang="ts">
  import type { EnchantSlot } from '../types'
  import { build, setEnchantment } from '../store'
  import { enchantments, getEnchant, isExclusiveEnchant } from '../engine'
  import { getEnchantTooltipText } from '../enchantTooltip'
  import EnchantSelect from '../EnchantSelect.svelte'

  export let slot: EnchantSlot
  export let label: string

  $: s = $build.enchantments[slot]

  let cat: 'unAscended' | 'Ascended' = 'unAscended'

  function toggleCat() {
    cat = cat === 'unAscended' ? 'Ascended' : 'unAscended'
    build.update(s => ({
      ...s,
      enchantments: {
        ...s.enchantments,
        [slot]: ['', '', ''] as [string, string, string]
      }
    }))
  }

  function set(i: 0|1|2, value: string) {
    setEnchantment(slot, i, value)
  }

  $: isExclusive = isExclusiveEnchant(getEnchant(s[0]))
  $: show1 = !isExclusive && !!s[0]
  $: show2 = show1 && !!s[1]

  $: catEnchants = enchantments.filter(e => e.category === cat)

  $: opts = (exclude1: string, exclude2: string) =>
    catEnchants.filter(e => e.name !== exclude1 && e.name !== exclude2)

  $: opts0 = opts(s[1], s[2])
  $: opts1 = opts(s[0], s[2])
  $: opts2 = opts(s[0], s[1])

  let tooltip = { visible: false, text: '', x: 0, y: 0 }

  function showTooltip(e: MouseEvent, name: string) {
    if (!name) return
    const text = getEnchantTooltipText(name, true)
    if (!text) return

    tooltip = {
      visible: true,
      text,
      x: e.clientX + 12,
      y: e.clientY + 12
    }
  }

  function hideTooltip() {
    tooltip.visible = false
  }
</script>

{#if tooltip.visible}
  <div class="enchant-tooltip" style="left:{tooltip.x}px;top:{tooltip.y}px">
    {#each tooltip.text.split('\n') as line}<p>{line}</p>{/each}
  </div>
{/if}

<div class="row">
  <span class="row-label">{label}</span>
  <div class="row-selects">

  <div class="slot-row" role="presentation" on:mousemove={e => showTooltip(e, s[0])} on:mouseleave={hideTooltip}>
  <button class="cat-toggle" class:ascended={cat === 'Ascended'} title={cat === 'Ascended'
      ? 'Currently: Ascended — click to switch to Unascended'
      : 'Currently: Unascended — click to switch to Ascended'}
    on:click={toggleCat}>{cat === 'Ascended' ? 'A' : 'U'}</button>
  <EnchantSelect value={s[0]} options={opts0} on:change={e => set(0, e.detail)}/>
</div>

{#if show1}
  <div 
    class="slot-row slot-row--sub"
    role="presentation"
    on:mousemove={e => showTooltip(e, s[1])}
    on:mouseleave={hideTooltip}
  >
    <EnchantSelect
      value={s[1]}
      options={opts1}
      on:change={e => set(1, e.detail)}
    />
  </div>
{/if}

{#if show2}
  <div 
    class="slot-row slot-row--sub"
    role="presentation"
    on:mousemove={e => showTooltip(e, s[2])}
    on:mouseleave={hideTooltip}
  >
    <EnchantSelect
      value={s[2]}
      options={opts2}
      on:change={e => set(2, e.detail)}
    />
  </div>
{/if}

  </div>
</div>

<style>
  .row { display: grid; grid-template-columns: 52px 1fr; align-items: start; gap: 8px; }
  .row-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.12em; color: #8a8d85; font-weight: 700; padding-top: 9px; }
  .row-selects { display: flex; flex-direction: column; gap: 5px; }

  .slot-row { display: flex; gap: 5px; align-items: center; }
  .slot-row--sub { padding-left: 31px; }

  .cat-toggle {
    flex-shrink: 0; width: 26px; height: 30px;
    border-radius: 6px; border: 1px solid rgba(255,255,255,0.12);
    background: #1a1d1b; color: #8a8d85;
    font-size: 0.7rem; font-weight: 800; cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  .cat-toggle:hover { border-color: rgba(74,222,128,0.35); color: #4ade80; }
  .cat-toggle.ascended { background: rgba(167,139,250,0.12); border-color: rgba(167,139,250,0.35); color: #a78bfa; }

  :global(.enchant-tooltip) {
    position: fixed; z-index: 9999;
    background: #1a1d1b; border: 1px solid rgba(167,139,250,0.3);
    border-radius: 8px; padding: 10px 12px; max-width: 260px;
    pointer-events: none; box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  }
  :global(.enchant-tooltip p) { margin: 0 0 4px; font-size: 0.76rem; color: #e8e4da; line-height: 1.45; }
  :global(.enchant-tooltip p:last-child) { margin-bottom: 0; }
</style>