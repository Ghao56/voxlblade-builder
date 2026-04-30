<script lang="ts">
  import type { EnchantSlot } from '../types'
  import { build, setEnchantment } from '../store'
  import { enchantments, getEnchant, isExclusiveEnchant } from '../engine'

  export let slot: EnchantSlot
  export let label: string

  $: selections = $build.enchantments[slot]

  let cat: 'unAscended' | 'Ascended' = 'unAscended'

  function toggleCat() {
    cat = cat === 'unAscended' ? 'Ascended' : 'unAscended'
    setEnchantment(slot, 0, '')
    setEnchantment(slot, 1, '')
    setEnchantment(slot, 2, '')
  }

  $: slot0Exclusive = isExclusiveEnchant(getEnchant(selections[0]))
  $: show1 = !slot0Exclusive && Boolean(selections[0])
  $: show2 = !slot0Exclusive && Boolean(selections[0]) && Boolean(selections[1])

  function handleChange(i: 0|1|2, value: string) {
    if (value && isExclusiveEnchant(getEnchant(value)) && i !== 0) {
      setEnchantment(slot, 0, value)
      setEnchantment(slot, 1, '')
      setEnchantment(slot, 2, '')
      return
    }
    setEnchantment(slot, i, value)
  }

  $: opts0 = enchantments
    .filter(e => e.category === cat && selections[1] !== e.name && selections[2] !== e.name)
    .map(e => ({ value: e.name, label: e.name }))

  $: opts1 = enchantments
    .filter(e => e.category === cat && selections[0] !== e.name && selections[2] !== e.name)
    .map(e => ({ value: e.name, label: e.name }))

  $: opts2 = enchantments
    .filter(e => e.category === cat && selections[0] !== e.name && selections[1] !== e.name)
    .map(e => ({ value: e.name, label: e.name }))

  // Tooltip
  let tooltip = { visible: false, text: '', x: 0, y: 0 }

  function getEnchantTooltip(name: string): string {
    if (!name) return ''
    const e = getEnchant(name)
    if (!e) return ''
    const lines: string[] = []
    if (e.description) lines.push(e.description)
    const statLines = Object.entries(e.stats).map(([k, v]) => {
      if (!v) return null
      const mods = Array.isArray(v) ? v : [v]
      return mods.map(m =>
        m.type === 'multiplier'
          ? `${k}: ×${m.value}`
          : `${k}: ${m.value > 0 ? '+' : ''}${m.value}`
      ).join(', ')
    }).filter(Boolean)
    if (statLines.length) lines.push('Stats: ' + statLines.join(' | '))
    if (e.effects?.length) lines.push('Effects: ' + e.effects.map(ef => `${ef.name} +${ef.value}`).join(', '))
    if (e.additionalNotes) lines.push('⚠ ' + e.additionalNotes)
    return lines.join('\n')
  }

  function showTooltip(e: MouseEvent, name: string) {
    const text = getEnchantTooltip(name)
    if (!text) return
    tooltip = { visible: true, text, x: (e.target as HTMLElement).getBoundingClientRect().right + 8, y: (e.target as HTMLElement).getBoundingClientRect().top }
  }

  function hideTooltip() {
    tooltip = { ...tooltip, visible: false }
  }

  function onSelectMouseMove(e: MouseEvent, name: string) {
    if (!name) { hideTooltip(); return }
    showTooltip(e, name)
    tooltip = { ...tooltip, x: e.clientX + 14, y: e.clientY - 10 }
  }
</script>

<!-- Global tooltip -->
{#if tooltip.visible}
  <div class="enchant-tooltip" style="left:{tooltip.x}px;top:{tooltip.y}px">
    {#each tooltip.text.split('\n') as line}
      <p>{line}</p>
    {/each}
  </div>
{/if}

<div class="row">
  <span class="row-label">{label}</span>
  <div class="row-selects">
    <!-- Slot 0 — toggle + tooltip -->
    <div class="slot-row">
      <button class="cat-toggle" class:ascended={cat === 'Ascended'} on:click={toggleCat}
        title={cat === 'Ascended' ? 'Currently: Ascended — click to switch to Unascended' : 'Currently: Unascended — click to switch to Ascended'}>
        {cat === 'Ascended' ? 'A' : 'U'}
      </button>
      <select value={selections[0]}
        on:change={e => handleChange(0, (e.target as HTMLSelectElement).value)}
        on:mousemove={e => onSelectMouseMove(e, selections[0])}
        on:mouseleave={hideTooltip}
      >
        <option value="">—</option>
        {#each opts0 as opt}<option value={opt.value}>{opt.label}</option>{/each}
      </select>
    </div>

    <!-- Slot 1 — không có indicator -->
    {#if show1}
      <div class="slot-row slot-row--sub">
        <select value={selections[1]}
          on:change={e => handleChange(1, (e.target as HTMLSelectElement).value)}
          on:mousemove={e => onSelectMouseMove(e, selections[1])}
          on:mouseleave={hideTooltip}
        >
          <option value="">—</option>
          {#each opts1 as opt}<option value={opt.value}>{opt.label}</option>{/each}
        </select>
      </div>
    {/if}

    {#if show2}
      <div class="slot-row slot-row--sub">
        <select value={selections[2]}
          on:change={e => handleChange(2, (e.target as HTMLSelectElement).value)}
          on:mousemove={e => onSelectMouseMove(e, selections[2])}
          on:mouseleave={hideTooltip}
        >
          <option value="">—</option>
          {#each opts2 as opt}<option value={opt.value}>{opt.label}</option>{/each}
        </select>
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
    flex-shrink: 0;
    width: 26px; height: 30px;
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.12);
    background: #1a1d1b;
    color: #8a8d85;
    font-size: 0.7rem; font-weight: 800;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  .cat-toggle:hover { border-color: rgba(74,222,128,0.35); color: #4ade80; }
  .cat-toggle.ascended { background: rgba(167,139,250,0.12); border-color: rgba(167,139,250,0.35); color: #a78bfa; }

  select {
    flex: 1; min-width: 0; appearance: none;
    background: #1a1d1b;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 7px; color: #e8e4da;
    font-size: 0.78rem; padding: 7px 24px 7px 9px; cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%234ade80' d='M1 1l4 4 4-4'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 8px center;
    font-family: inherit; transition: border-color 0.15s;
  }
  select:focus { outline: none; border-color: rgba(74,222,128,0.35); }

  /* Tooltip */
  :global(.enchant-tooltip) {
    position: fixed;
    z-index: 9999;
    background: #1a1d1b;
    border: 1px solid rgba(167,139,250,0.3);
    border-radius: 8px;
    padding: 10px 12px;
    max-width: 260px;
    pointer-events: none;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  }
  :global(.enchant-tooltip p) {
    margin: 0 0 4px;
    font-size: 0.76rem;
    color: #e8e4da;
    line-height: 1.45;
  }
  :global(.enchant-tooltip p:last-child) { margin-bottom: 0; }
</style>