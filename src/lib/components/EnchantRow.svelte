<script lang="ts">
  import type { EnchantSlot } from '../types'
  import { build, setEnchantment } from '../store'
  import { enchantments, getEnchant, isExclusiveEnchant } from '../engine'

  export let slot: EnchantSlot
  export let label: string

  $: selections = $build.enchantments[slot]
  $: hasExclusive = selections.some(n => isExclusiveEnchant(getEnchant(n)))

  const opts = enchantments.map(e => ({ value: e.name, label: e.name }))

  function visible(i: number): boolean {
    if (i === 0) return true
    if (hasExclusive) return false
    return Boolean(selections[i - 1])
  }
</script>

<div class="row">
  <span class="row-label">{label}</span>
  <div class="row-selects">
    {#each [0, 1, 2] as i}
      {#if visible(i)}
        <select
          value={selections[i]}
          on:change={e => setEnchantment(slot, i as 0|1|2, (e.target as HTMLSelectElement).value)}
        >
          <option value="">—</option>
          {#each opts as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      {/if}
    {/each}
  </div>
</div>

<style>
  .row { display: grid; grid-template-columns: 52px 1fr; align-items: start; gap: 8px; }
  .row-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.12em; color: #8a8d85; font-weight: 700; padding-top: 9px; }
  .row-selects { display: flex; flex-direction: column; gap: 5px; }
  select {
    width: 100%; appearance: none; background: #1a1d1b;
    border: 1px solid rgba(255,255,255,0.1); border-radius: 7px;
    color: #e8e4da; font-size: 0.78rem; padding: 7px 24px 7px 9px; cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%234ade80' d='M1 1l4 4 4-4'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 8px center;
    font-family: inherit; transition: border-color 0.15s;
  }
  select:focus { outline: none; border-color: rgba(74,222,128,0.35); }
</style>
