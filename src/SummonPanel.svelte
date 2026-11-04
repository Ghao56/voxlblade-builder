<script lang="ts">
  // SummonPanel — container, display flow: Scaling → Stats → Survival →
  // Swarm Total → Buffs → Debuffs → Perk Links. Buffs own a titled block like
  // debuffs (owner 2026-11); the header shows no alive count (the sliders are
  // the single source for that) and no circled-number labels (owner 2026-11).
  // Every number comes from SummonPanelVM (lib/summonView) — pure functions
  // built on the instance DamageAnalyzer holds.
  import type { SummonPanelVM } from './lib/summonView'
  import SummonScalingStrip from './summon/SummonScalingStrip.svelte'
  import SummonStatTable from './summon/SummonStatTable.svelte'
  import SummonLifetime from './summon/SummonLifetime.svelte'
  import SummonSwarmTotal from './summon/SummonSwarmTotal.svelte'
  import SummonBuffs from './summon/SummonBuffs.svelte'
  import SummonDebuffs from './summon/SummonDebuffs.svelte'
  import SummonLinks from './summon/SummonLinks.svelte'

  export let vm: SummonPanelVM
  /** Shared scaling (from the section header). When this panel's scaling is
   *  identical, the strip renders compact — the formula is not repeated. */
  export let sharedScaling: SummonPanelVM['scaling'] | null = null

  // Perk links — values come from DamageAnalyzer (computed by the original functions)
  export let vassalsCroakStacks = 0
  export let vassalsCroakBoostPct = 0
  export let minionAbsorptionStacks = 0
  export let minionAbsorptionPotency = 0

  /** (value:number) — active summons count, writes back to build.vassalsCroakSummons */
  export let onSummonCountChange: (value: number) => void = () => {}
  /** (buffName:string) — buff toggle, key `source::name` handled in DamageAnalyzer */
  export let onToggleBuff: (buffName: string) => void = () => {}

  $: summonCount = vm.count
  $: hideFormula = !!sharedScaling &&
    vm.scaling.boostPct === sharedScaling.boostPct &&
    vm.scaling.levelFactor === sharedScaling.levelFactor &&
    vm.scaling.mult === sharedScaling.mult
  // Group subheader when the stat key changes (tenacity/defense → "Defenses",
  // attack rows → "Attacks"). Rendered inside the stats block.
</script>

<div class="sum-panel">
  <div class="sum-header">
    <span class="sum-name">{vm.name}</span>
    <span class="sum-chip sum-source">{vm.source}</span>
  </div>

  <SummonScalingStrip {vm} shared={hideFormula ? sharedScaling : null} />

  <div class="sum-stats">
    <div class="sum-stats-head" role="row">
      <span class="sum-stats-head--label">Stats</span>
      <span class="sum-stats-head--col">Base</span>
      <span class="sum-stats-head--col">Mult</span>
      <span class="sum-stats-head--col">Scaled</span>
    </div>
    {#each vm.stats as st, i (st.key + st.label)}
      {#if st.key !== 'attack' && (i === 0 || vm.stats[i - 1].key === 'attack')}
        <div class="sum-group-label">Defenses</div>
      {:else if st.key === 'attack' && (i === 0 || vm.stats[i - 1].key !== 'attack')}
        <div class="sum-group-label sum-group-label--attack">Attacks</div>
      {/if}
      <SummonStatTable
        stat={st}
        zebra={i % 2 === 0}
      />
    {/each}
  </div>

  <SummonLifetime {vm} />
  <SummonSwarmTotal {vm} {onSummonCountChange} />
  <SummonBuffs {vm} {onToggleBuff} />
  <SummonDebuffs {vm} />
  <SummonLinks
    {vassalsCroakStacks}
    {vassalsCroakBoostPct}
    {minionAbsorptionStacks}
    {minionAbsorptionPotency}
    activeCount={summonCount}
  />
</div>

<style>
  .sum-panel {
    background: var(--surface2, #2b2735);
    border: 1px solid color-mix(in srgb, var(--sum-accent, #c084fc) 28%, transparent);
    border-radius: var(--radius-lg, 10px);
    padding: var(--space-4, 12px) var(--space-4, 12px);
    color: var(--ink, #e8e4da);
    box-shadow: var(--shadow-md, 0 4px 14px rgba(0,0,0,.35));
    transition: border-color var(--duration-fast, .15s) var(--ease-out, ease);
  }
  .sum-panel:hover {
    border-color: var(--sum-accent-border, rgba(192,132,252,.3));
  }
  .sum-header {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: var(--space-2, 6px);
    row-gap: 4px;
  }
  .sum-name {
    font-size: var(--text-lg, 17px);
    font-weight: var(--weight-bold, 700);
    color: var(--sum-accent, #c084fc);
    letter-spacing: var(--tracking-wide, .03em);
  }
  .sum-chip {
    font-size: 12px;
    color: var(--sum-muted, #a6a2b0);
    text-transform: uppercase;
    letter-spacing: .06em;
    background: rgba(192,132,252,.08);
    border: 1px solid color-mix(in srgb, var(--sum-accent, #c084fc) 22%, transparent);
    border-radius: var(--radius-full, 999px);
    padding: 1px 8px;
  }
  .sum-stats { padding: 4px 0 0 0; border-top: 1px solid color-mix(in srgb, var(--sum-accent, #c084fc) 15%, transparent); }
  .sum-stats-head {
    display: grid;
    grid-template-columns: minmax(110px, 1.4fr) repeat(3, minmax(56px, 1fr));
    gap: 6px;
    padding-bottom: 2px;
  }
  .sum-stats-head--label {
    font-size: 11px;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--sum-accent, #c084fc);
    font-weight: var(--weight-semibold, 600);
  }
  .sum-stats-head--col {
    font-size: 12px;
    letter-spacing: .06em;
    text-align: right;
    color: var(--sum-muted, #a6a2b0);
    font-weight: var(--weight-semibold, 600);
    text-transform: capitalize;
  }
  .sum-group-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: var(--sum-muted, #a6a2b0);
    font-weight: var(--weight-semibold, 600);
    padding: 4px 0 2px 0;
  }
  .sum-group-label--attack {
    margin-top: 4px;
    padding-top: 5px;
    border-top: 1px solid color-mix(in srgb, var(--sum-accent, #c084fc) 30%, transparent);
  }
  @media (max-width: 600px) {
    .sum-header { flex-wrap: wrap; row-gap: 4px; }
  }
</style>
