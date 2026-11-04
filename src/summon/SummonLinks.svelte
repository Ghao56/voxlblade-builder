<script lang="ts">
  // PERK LINKS — values are NOT recalculated here: Vassals Croak boost % comes
  // from DamageAnalyzer (same BOOST_DEF_MAP ['Vassals Croak'] formula shown in
  // Perk Base Damage); Minion Absorption potency comes from
  // calcMinionAbsorptionPotency (called in DamageAnalyzer), passed via props.
  // Whole block HIDDEN when no perk is active (owner, 2026-11).
  import { fmtSummonNum } from '../lib/summonView'

  export let vassalsCroakStacks = 0
  export let vassalsCroakBoostPct = 0
  export let minionAbsorptionStacks = 0
  export let minionAbsorptionPotency = 0
  export let activeCount = 0

  // at least one link is genuinely "live" (not a muted row)
  $: hasActiveLink =
    vassalsCroakStacks > 0 ||
    (minionAbsorptionStacks > 0 && minionAbsorptionPotency > 0)
</script>

{#if hasActiveLink}
<div class="sl-links">
  <div class="sl-block-label">Perk Links</div>

  <div class="sl-row">
    <span class="sl-arrow">→</span>
    {#if vassalsCroakStacks > 0}
      <span class="sl-text">Vassals Croak: swarm <b>{activeCount}</b> × {vassalsCroakStacks} stacks → <span class="sl-num sl-num--mult">×{fmtSummonNum(1 + vassalsCroakBoostPct / 100)}</span> damage boost</span>
    {:else}
      <span class="sl-text sl-text--muted">Vassals Croak: perk required (0 stacks)</span>
    {/if}
  </div>

  <div class="sl-row">
    <span class="sl-arrow">→</span>
    {#if minionAbsorptionStacks > 0 && minionAbsorptionPotency > 0}
      <span class="sl-text">Minion Absorption: +<span class="sl-num" style="color:#7dd3fc">{fmtSummonNum(minionAbsorptionPotency)}</span> personal buff (from summonBoost)</span>
    {:else if minionAbsorptionStacks > 0}
      <span class="sl-text sl-text--muted">Minion Absorption: no summonBoost yet (potency 0)</span>
    {:else}
      <span class="sl-text sl-text--muted">Minion Absorption: perk required</span>
    {/if}
  </div>
</div>
{/if}

<style>
  .sl-links { padding: 6px 0 2px 0; border-top: 1px solid color-mix(in srgb, #c084fc 15%, transparent); }
  .sl-block-label {
    font-size: var(--text-sm-plus, 11px);
    letter-spacing: var(--tracking-widest, .08em);
    text-transform: uppercase;
    color: #c084fc;
    font-weight: var(--weight-semibold, 600);
    margin-bottom: 4px;
  }
  .sl-row { display: flex; gap: 6px; align-items: baseline; padding: 2px 0; font-size: 13px; }
  .sl-arrow { color: var(--sum-accent, #c084fc); font-weight: var(--weight-bold, 700); }
  .sl-text { color: var(--ink, #e8e4da); }
  .sl-text b { color: var(--sum-accent, #c084fc); font-family: var(--font-mono, monospace); }
  .sl-text--muted { color: var(--sum-muted, #a6a2b0); }
  .sl-num { font-family: var(--font-mono, monospace); font-variant-numeric: tabular-nums; font-weight: var(--weight-extrabold, 800); }
  .sl-num--mult { color: var(--sum-accent, #c084fc); } /* damage multiplier → same purple language as the other mult readouts */
</style>
