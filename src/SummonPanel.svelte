<script lang="ts">
  // SummonPanel — container, luồng hiển thị:
  // Scaling ──► Stats (Base→Scaled) ──► Survival ──► Swarm Total ──► Debuffs ──► Perk Links.
  // Các block KHÔNG dùng ký hiệu số (①②③…) trên nhãn — theo yêu cầu 2026-11.
  // Mọi số đến từ SummonPanelVM (lib/summonView) — hàm thuần trên instance
  // của DamageAnalyzer giữ state ở DamageAnalyzer.
  import type { SummonPanelVM } from './lib/summonView'
  import SummonScalingStrip from './summon/SummonScalingStrip.svelte'
  import SummonStatTable from './summon/SummonStatTable.svelte'
  import SummonLifetime from './summon/SummonLifetime.svelte'
  import SummonSwarmTotal from './summon/SummonSwarmTotal.svelte'
  import SummonDebuffs from './summon/SummonDebuffs.svelte'
  import SummonLinks from './summon/SummonLinks.svelte'

  export let vm: SummonPanelVM

  // Liên kết perk — giá trị đến từ DamageAnalyzer (tính bằng hàm gốc)
  export let vassalsCroakStacks = 0
  export let vassalsCroakBoostPct = 0
  export let minionAbsorptionStacks = 0
  export let minionAbsorptionPotency = 0

  /** (value:number) — số summon đang hoạt động, viết về build.vassalsCroakSummons */
  export let onSummonCountChange: (value: number) => void = () => {}
  /** (buffName:string) — toggle buff, key `source::name` ở DamageAnalyzer */
  export let onToggleBuff: (buffName: string) => void = () => {}

  $: summonCount = vm.count
</script>

<div class="sum-panel">
  <div class="sum-header">
    <span class="sum-name">{vm.name}</span>
    <span class="sum-source">{vm.source}</span>
    <span class="sum-count">
      <b>×{vm.count}</b> alive
      {#if vm.spawnCount !== vm.count}
        <span class="sum-count-detail" title="Raw def.count — minions per cast">({vm.spawnCount}/cast · {vm.count} active)</span>
      {/if}
    </span>
  </div>

  <SummonScalingStrip {vm} />

  <div class="sum-stats">
    <div class="sum-stats-head" role="row">
      <span class="sum-stats-head--label">Stats</span>
      <span class="sum-stats-head--col">BASE</span>
      <span class="sum-stats-head--col">MULT</span>
      <span class="sum-stats-head--col">SCALED</span>
    </div>
    {#each vm.stats as st (st.key + st.label)}
      <SummonStatTable stat={st} />
    {/each}
  </div>

  <SummonLifetime {vm} />
  <SummonSwarmTotal
    {vm}
    {onSummonCountChange}
    {onToggleBuff}
  />
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
    border: 1px solid color-mix(in srgb, #c084fc 35%, transparent);
    border-radius: var(--radius-lg, 10px);
    padding: var(--space-3, 8px) var(--space-4, 12px);
    color: var(--ink, #e8e4da);
    max-width: 420px;
    box-shadow: var(--shadow-md, 0 4px 14px rgba(0,0,0,.35));
  }
  .sum-header {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: var(--space-2, 6px);
  }
  .sum-name {
    font-size: var(--text-xl, 17px);
    font-weight: var(--weight-bold, 700);
    color: #c084fc;
    letter-spacing: var(--tracking-wide, .03em);
  }
  .sum-source {
    font-size: var(--text-sm, 11px);
    color: var(--ink-muted, #8a8694);
    text-transform: uppercase;
    letter-spacing: var(--tracking-wider, .06em);
  }
  .sum-count {
    margin-left: auto;
    font-size: var(--text-base-plus, 13px);
    color: var(--ink-muted, #8a8694);
    white-space: nowrap;
  }
  .sum-count b { color: #c084fc; font-family: 'Courier New', monospace; font-weight: var(--weight-extrabold, 800); }
  .sum-count-detail { font-size: var(--text-2xs, 10px); cursor: help; }
  .sum-stats { padding: 4px 0; border-top: 1px solid color-mix(in srgb, #c084fc 15%, transparent); }
  .sum-stats-head {
    display: grid;
    grid-template-columns: 1fr 64px 72px 96px;
    gap: 6px;
    margin-bottom: 2px;
  }
  .sum-stats-head--label {
    font-size: var(--text-sm-plus, 11px);
    letter-spacing: var(--tracking-widest, .08em);
    text-transform: uppercase;
    color: #c084fc;
    font-weight: var(--weight-semibold, 600);
  }
  .sum-stats-head--col {
    font-size: var(--text-2xs, 10px);
    letter-spacing: var(--tracking-wide, .05em);
    text-align: right;
    color: var(--ink-muted, #8a8694);
    font-weight: var(--weight-semibold, 600);
    text-transform: uppercase;
  }
  @media (max-width: 600px) {
    .sum-panel { max-width: 100%; }
    .sum-count { margin-left: 0; }
  }
</style>
