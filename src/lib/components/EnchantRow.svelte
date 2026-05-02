<script lang="ts">
  import type { EnchantSlot } from '../types'
  import { build, setEnchantment } from '../store'
  import { enchantments, getEnchant, isExclusiveEnchant } from '../engine'

  export let slot: EnchantSlot
  export let label: string

  $: s = $build.enchantments[slot]

  let cat: 'unAscended' | 'Ascended' = 'unAscended'

  function toggleCat() {
    cat = cat === 'unAscended' ? 'Ascended' : 'unAscended'
    // Clear all 3 slots when switching category
    setEnchantment(slot, 0, '')
    setEnchantment(slot, 1, '')
    setEnchantment(slot, 2, '')
  }

  function set(i: 0|1|2, value: string) {
    setEnchantment(slot, i, value)
  }

  // Slot 0 is exclusive → hide slots 1 & 2
  $: isExclusive = isExclusiveEnchant(getEnchant(s[0]))
  $: show1 = !isExclusive && !!s[0]
  $: show2 = show1 && !!s[1]

  // Options filtered to current category and excluding already-selected values
  $: catEnchants = enchantments.filter(e => e.category === cat)

  $: opts = (exclude1: string, exclude2: string) =>
    catEnchants
      .filter(e => e.name !== exclude1 && e.name !== exclude2)
      .map(e => ({ value: e.name, label: e.name }))

  $: opts0 = opts(s[1], s[2])
  $: opts1 = opts(s[0], s[2])
  $: opts2 = opts(s[0], s[1])

  // Tooltip
  let tooltip = { visible: false, text: '', x: 0, y: 0 }

  function getTooltipText(name: string): string {
    if (!name) return ''
    const e = getEnchant(name)
    if (!e) return ''
    const lines: string[] = []
    if (e.description) lines.push(e.description)
    const statLines = Object.entries(e.stats).flatMap(([k, v]) => {
      if (!v) return []
      const mods = Array.isArray(v) ? v : [v]
      return [mods.map(m =>
        m.type === 'multiplier' ? `${k}: ×${m.value}` : `${k}: ${m.value > 0 ? '+' : ''}${m.value}`
      ).join(', ')]
    })
    if (statLines.length) lines.push('Stats: ' + statLines.join(' | '))
    if (e.effects?.length) lines.push('Effects: ' + e.effects.map(ef => `${ef.name} +${ef.value}`).join(', '))
    if (e.additionalNotes) lines.push('⚠ ' + e.additionalNotes)
    return lines.join('\n')
  }

  function onMove(e: MouseEvent, name: string) {
    const text = getTooltipText(name)
    tooltip = text
      ? { visible: true, text, x: e.clientX + 14, y: e.clientY - 10 }
      : { ...tooltip, visible: false }
  }

  function onLeave() { tooltip = { ...tooltip, visible: false } }
</script>

{#if tooltip.visible}
  <div class="enchant-tooltip" style="left:{tooltip.x}px;top:{tooltip.y}px">
    {#each tooltip.text.split('\n') as line}<p>{line}</p>{/each}
  </div>
{/if}

<div class="row">
  <span class="row-label">{label}</span>
  <div class="row-selects">

    <!-- Slot 0 -->
    <div class="slot-row">
      <button
        class="cat-toggle"
        class:ascended={cat === 'Ascended'}
        title={cat === 'Ascended'
          ? 'Currently: Ascended — click to switch to Unascended'
          : 'Currently: Unascended — click to switch to Ascended'}
        on:click={toggleCat}
      >{cat === 'Ascended' ? 'A' : 'U'}</button>
      <select
        value={s[0]}
        on:change={e => set(0, (e.target as HTMLSelectElement).value)}
        on:mousemove={e => onMove(e, s[0])}
        on:mouseleave={onLeave}
      >
        <option value="">—</option>
        {#each opts0 as o}<option value={o.value}>{o.label}</option>{/each}
      </select>
    </div>

    <!-- Slot 1 -->
    {#if show1}
      <div class="slot-row slot-row--sub">
        <select
          value={s[1]}
          on:change={e => set(1, (e.target as HTMLSelectElement).value)}
          on:mousemove={e => onMove(e, s[1])}
          on:mouseleave={onLeave}
        >
          <option value="">—</option>
          {#each opts1 as o}<option value={o.value}>{o.label}</option>{/each}
        </select>
      </div>
    {/if}

    <!-- Slot 2 -->
    {#if show2}
      <div class="slot-row slot-row--sub">
        <select
          value={s[2]}
          on:change={e => set(2, (e.target as HTMLSelectElement).value)}
          on:mousemove={e => onMove(e, s[2])}
          on:mouseleave={onLeave}
        >
          <option value="">—</option>
          {#each opts2 as o}<option value={o.value}>{o.label}</option>{/each}
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
    flex-shrink: 0; width: 26px; height: 30px;
    border-radius: 6px; border: 1px solid rgba(255,255,255,0.12);
    background: #1a1d1b; color: #8a8d85;
    font-size: 0.7rem; font-weight: 800; cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  .cat-toggle:hover { border-color: rgba(74,222,128,0.35); color: #4ade80; }
  .cat-toggle.ascended { background: rgba(167,139,250,0.12); border-color: rgba(167,139,250,0.35); color: #a78bfa; }

  select {
    flex: 1; min-width: 0; appearance: none;
    background: #1a1d1b; border: 1px solid rgba(255,255,255,0.1);
    border-radius: 7px; color: #e8e4da;
    font-size: 0.78rem; padding: 7px 24px 7px 9px; cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%234ade80' d='M1 1l4 4 4-4'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 8px center;
    font-family: inherit; transition: border-color 0.15s;
  }
  select:focus { outline: none; border-color: rgba(74,222,128,0.35); }

  :global(.enchant-tooltip) {
    position: fixed; z-index: 9999;
    background: #1a1d1b; border: 1px solid rgba(167,139,250,0.3);
    border-radius: 8px; padding: 10px 12px; max-width: 260px;
    pointer-events: none; box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  }
  :global(.enchant-tooltip p) { margin: 0 0 4px; font-size: 0.76rem; color: #e8e4da; line-height: 1.45; }
  :global(.enchant-tooltip p:last-child) { margin-bottom: 0; }
</style>