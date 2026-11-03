<script lang="ts">
  // ⑥ PERK LINKS — nguồn số liệu KHÔNG tính lại ở đây:
  // - Vassals Croak: boost % đến từ DamageAnalyzer (cùng công thức
  //   BOOST_DEF_MAP['Vassals Croak'] hiển thị trong Perk Base Damage).
  // - Minion Absorption: potency đến từ calcMinionAbsorptionPotency (gọi ở
  //   DamageAnalyzer), prop truyền xuống.
  // Block ẨN TOÀN BỘ khi không có perk nào active (yêu cầu chủ dự án 2026-11).
  import { fmtSummonNum } from '../lib/summonView'

  export let vassalsCroakStacks = 0
  export let vassalsCroakBoostPct = 0
  export let minionAbsorptionStacks = 0
  export let minionAbsorptionPotency = 0
  export let activeCount = 0

  // có ít nhất một liên kết đang thực sự "sống" (không phải dòng muted)
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
      <span class="sl-text">Vassals Croak: swarm <b>{activeCount}</b> × {vassalsCroakStacks} stacks → <span class="sl-num" style="color:#93ff87">×{fmtSummonNum(1 + vassalsCroakBoostPct / 100)}</span> damage boost</span>
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
  .sl-row { display: flex; gap: 6px; align-items: baseline; padding: 2px 0; font-size: var(--text-base-plus, 13px); }
  .sl-arrow { color: #c084fc; font-weight: var(--weight-bold, 700); }
  .sl-text { color: var(--ink, #e8e4da); }
  .sl-text b { color: #c084fc; font-family: 'Courier New', monospace; }
  .sl-text--muted { color: var(--ink-muted, #8a8694); }
  .sl-num { font-family: 'Courier New', monospace; font-weight: var(--weight-extrabold, 800); }
</style>
