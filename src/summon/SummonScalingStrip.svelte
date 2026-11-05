<script lang="ts">
  // SCALING — real formula: base × (1 + (boost/100) × (1 + level/MAX)). The
  // mult comes from the VM (already computed via calcSummonStat); this
  // component only formats and substitutes numbers. With `shared` passed
  // (this panel's scaling matches the formula shown in the section header),
  // render compact: only the ×mult chip.
  import type { SummonPanelVM } from '../lib/summonView'
  import { fmtSummonNum } from '../lib/summonView'
  import { MAX_LEVEL } from '../lib/constants'

  export let vm: SummonPanelVM
  export let shared: SummonPanelVM['scaling'] | null = null

  // level recovered backwards from levelFactor (= 1 + level/MAX_LEVEL) —
  // DISPLAY-ONLY substitution into the formula, never a new calculation.
  $: lvl = (vm.scaling.levelFactor - 1) * MAX_LEVEL
</script>

<div class="ssp-scaling">
  {#if shared === null}
    <div class="ssp-block-label">Scaling</div>
    <div class="ssp-scaling-expr">
      <span class="ssp-chip" title="Summon Boost {fmtSummonNum(vm.scaling.boostPct)}% boosted by Summon Boost buffs; {fmtSummonNum(lvl)}/{MAX_LEVEL} = player level / max level (level factor doubles the boost at max).">
        (1 + {fmtSummonNum(vm.scaling.boostPct)}% × (1 + {fmtSummonNum(lvl)}/{MAX_LEVEL}))
      </span>
      <span class="ssp-op">=</span>
      <span class="ssp-mult">×{fmtSummonNum(vm.scaling.mult)}</span>
      {#if vm.trustyTiers}
        <span
          class="ssp-chip"
          title="Trusty Servant — dmg &times;(1 + (300 + {vm.trustyTiers.dmgIncr}%/stack)/100), HP &times;(1 + (100 + {vm.trustyTiers.hpIncr}%/stack)/100). Tier increments come from the summon's base HP (getTrustyServantTiers)."
        >
          [ Trusty dmg ×{fmtSummonNum(vm.trustyDmgMult)} · HP ×{fmtSummonNum(vm.trustyHpMult)} ]
        </span>
      {/if}
    </div>
  {:else}
    <div class="ssp-compact" title="Same scaling formula as the Summons header: (1 + {fmtSummonNum(vm.scaling.boostPct)}% × (1 + {fmtSummonNum(lvl)}/{MAX_LEVEL}))">
      <span class="ssp-block-label">Scaling</span>
      <span class="ssp-mult">×{fmtSummonNum(vm.scaling.mult)}</span>
      {#if vm.trustyTiers}
        <span
          class="ssp-chip"
          title="Trusty Servant — dmg &times;(1 + (300 + {vm.trustyTiers.dmgIncr}%/stack)/100), HP &times;(1 + (100 + {vm.trustyTiers.hpIncr}%/stack)/100). Tier increments come from the summon's base HP (getTrustyServantTiers)."
        >
          [ Trusty dmg ×{fmtSummonNum(vm.trustyDmgMult)} · HP ×{fmtSummonNum(vm.trustyHpMult)} ]
        </span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .ssp-scaling { padding: 0 0 var(--space-2, 4px) 0; }
  .ssp-block-label {
    font-size: 11px;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--sum-accent, #c084fc);
    font-weight: var(--weight-semibold, 600);
    margin-bottom: 4px;
  }
  .ssp-scaling-expr { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  .ssp-compact {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .ssp-compact .ssp-block-label { margin-bottom: 0; }
  .ssp-chip {
    font-family: var(--font-mono, monospace);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    color: var(--ink, #e8e4da);
    background: color-mix(in srgb, var(--sum-accent, #c084fc) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--sum-accent, #c084fc) 30%, transparent);
    border-radius: var(--radius-xs, 3px);
    padding: 1px 6px;
    cursor: help;
  }
  .ssp-op { color: var(--sum-muted, #a6a2b0); }
  .ssp-mult {
    font-family: var(--font-mono, monospace);
    font-size: var(--text-lg, 15px);
    font-variant-numeric: tabular-nums;
    font-weight: var(--weight-extrabold, 800);
    color: var(--sum-accent, #c084fc);
  }
</style>
