<script lang="ts">
  import type { EnchantSlot } from '../types'
  import { build, setEnchantment } from '../store'
  import { enchantments, getEnchant, isExclusiveEnchant } from '../engine'

  export let slot: EnchantSlot
  export let label: string

  $: selections = $build.enchantments[slot]

  // Which enchants are already picked in other slots (for filtering)
  $: usedNames = new Set(selections.filter(Boolean))

  const opts = enchantments.map(e => ({ value: e.name, label: e.name }))

  // Slot i is visible if:
  // - i === 0: always
  // - i === 1: slot 0 is filled AND not exclusive
  // - i === 2: slot 1 is filled AND slot 0 is not exclusive
  $: slot0Exclusive = isExclusiveEnchant(getEnchant(selections[0]))
  $: show1 = !slot0Exclusive && Boolean(selections[0])
  $: show2 = !slot0Exclusive && Boolean(selections[0]) && Boolean(selections[1])

  function visible(i: number): boolean {
    if (i === 0) return true
    if (slot0Exclusive) return false
    if (i === 1) return Boolean(selections[0])
    if (i === 2) return Boolean(selections[0]) && Boolean(selections[1])
    return false
  }

  function handleChange(i: 0 | 1 | 2, value: string) {
    // If user picks an exclusive on slot 1 or 2, move it to slot 0 and clear rest
    if (value && isExclusiveEnchant(getEnchant(value)) && i !== 0) {
      setEnchantment(slot, 0, value)
      setEnchantment(slot, 1, "")
      setEnchantment(slot, 2, "")
      return
    }
    setEnchantment(slot, i, value)
  }

  // Options for each slot — exclude names already chosen in OTHER slots
  function optsFor(i: number) {
    const others = new Set(selections.filter((v, idx) => idx !== i && Boolean(v)))
    return opts.filter(o => !others.has(o.value))
  }
</script>

<div class="row">
  <span class="row-label">{label}</span>
  <div class="row-selects">
    {#each [0, 1, 2] as i}
      {#if i === 0 || (i === 1 && show1) || (i === 2 && show2)}
        <select
          value={selections[i]}
          on:change={e => handleChange(i as 0|1|2, (e.target as HTMLSelectElement).value)}
        >
          <option value="">—</option>
          {#each optsFor(i) as opt}
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