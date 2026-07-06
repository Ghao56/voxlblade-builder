<script lang="ts">
  import { CD_MINIMUM } from './lib/constants'

  interface CdrStep {
    multiplier: number;
    isMultiply?: boolean;
    pct: number;
    source: string;
  }

  /** The array of CDR reduction steps (runeBreakdown or waBreakdown). */
  export let breakdown: CdrStep[];
  /** Base cooldown before any CDR is applied (e.g. rune.cooldown or selectedWA.cooldown). */
  export let baseCd: number;
  /**
   * When a Set-bonus overrides the CD before perk CDR is applied, pass that value here.
   * If null/undefined the component starts from baseCd directly.
   */
  export let setCD: number | null = null;

  // The effective starting CD for perk-by-perk reduction
  $: startCD = setCD != null ? setCD : baseCd;
</script>

<div class="cdr-steps-calc">
  {#if setCD != null}
    <!-- Show the set-bonus override first -->
    <div class="cdr-calc-row">
      <span class="cdr-cd-old">{baseCd}s</span>
      <span class="cdr-arrow">→</span>
      <span class="cdr-cd-new">{setCD}s</span>
    </div>
  {/if}

  {#each breakdown as step, i}
    {@const prevCD = i === 0
      ? startCD
      : startCD * breakdown.slice(0, i).reduce((a, s) => a * s.multiplier, 1)}
    {@const nextCD = startCD * breakdown.slice(0, i + 1).reduce((a, s) => a * s.multiplier, 1)}
    {@const isLast = i === breakdown.length - 1}

    <div class="cdr-calc-row">
      <span class="cdr-cd-old">{i === 0 ? prevCD : prevCD.toFixed(2)}s</span>
      <span class="cdr-arrow">{step.isMultiply ? '×' : '÷'}</span>
      <span class="cdr-calc-mult">
        {step.isMultiply ? step.multiplier.toFixed(2) : (1 / step.multiplier).toFixed(2)}
      </span>
      <span class="cdr-arrow">=</span>
      <span class="cdr-cd-new">{nextCD.toFixed(2)}s</span>
    </div>

    {#if isLast}
      {@const floored = Math.floor(nextCD)}
      {@const capped = Math.max(CD_MINIMUM, floored)}
      <div class="cdr-calc-row cdr-calc-row--floor">
        <span class="cdr-floor-label">floor</span>
        <span class="cdr-arrow">→</span>
        {#if capped > floored}
          <span class="cdr-cd-new" style="text-decoration:line-through;opacity:.35">{floored}s</span>
          <span class="cdr-arrow">→</span>
          <span class="cdr-cd-new" style="color:var(--accent2)">1s</span>
          <span class="cdr-cap-label">(min)</span>
        {:else}
          <span class="cdr-cd-new">{floored}s</span>
        {/if}
      </div>
    {/if}
  {/each}
</div>
<style>
.cdr-cap-label {
    font-size: .58rem;
    color: var(--accent2);
    font-weight: 700;
    opacity: .7;
    letter-spacing: .06em;
}
.cdr-cd-old { font-size:.75rem; color:var(--ink-muted); text-decoration:line-through; opacity:.4; }
.cdr-arrow { font-size:.7rem; color:var(--ink-muted); opacity:.35; }
.cdr-cd-new { font-size:.95rem; font-weight:800; color:#34d399; }
.cdr-calc-row--floor { 
  padding-top: 4px;
  border-top: 1px dashed rgba(52,211,153,.2);
  margin-top: 2px;
}
.cdr-floor-label { 
  font-size: .62rem; 
  color: var(--ink-muted); 
  opacity: .5;
  font-style: italic;
  letter-spacing: .08em;
}
</style>