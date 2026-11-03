<script lang="ts">
  // ④ SWARM TOTAL — slider số summon đang hoạt động (clamp theo cap, ủy thác
  // qua callback vào build.vassalsCroakSummons) + buff toggle (key
  // `source::name` ở DamageAnalyzer). Row math đã bỏ theo yêu cầu 2026-11 —
  // tổng damage của summon hiển thị tập trung ở chip Base Damage/panel khác.
  // count === 0 → trạng thái trống "not summoned".
  import type { SummonPanelVM } from '../lib/summonView'

  export let vm: SummonPanelVM
  /** (value) → DamageAnalyzer build.update vassalsCroakSummons */
  export let onSummonCountChange: (value: number) => void = () => {}
  export let onToggleBuff: (buffName: string) => void = () => {}

  $: empty = vm.count === 0
</script>

<div class="swe-swarm">
  <div class="swe-block-label">Swarm Total</div>

  {#if empty}
    <div class="swe-empty">not summoned</div>
  {/if}

  <div class="swe-slider-row">
    <span class="swe-slider-label">Active summons</span>
    <input
      class="swe-slider"
      type="range"
      min="0"
      max={vm.cap}
      step="1"
      value={vm.count}
      on:change={(e) => onSummonCountChange(Number((e.currentTarget as HTMLInputElement).value))}
      aria-label="Active summon count"
      aria-valuemax={vm.cap}
      aria-valuemin={0}
      aria-valuenow={vm.count}
    />
    <span class="swe-slider-val" style="color:#c084fc">{vm.count}</span>
  </div>

  {#if vm.buffs.length}
    <div class="swe-buffs">
      {#each vm.buffs as b (vm.source + '::' + b.name)}
        <button
          class="swe-chip" class:swe-chip--off={!b.active}
          aria-pressed={b.active}
          title={b.affectsDamage ? 'Feeds the damage mult chain (calcSummonBuffDmgMult)' : 'Display buff, not part of the damage chain'}
          on:click={() => onToggleBuff(b.name)}
        >
          [ {b.name} ] <span class="swe-chip-val">{b.active ? b.value : '—'}</span>
          <span class="swe-chip-toggle">{b.active ? 'ON' : 'OFF'}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .swe-swarm { padding: 4px 0; border-top: 1px solid color-mix(in srgb, #c084fc 15%, transparent); }
  .swe-block-label {
    font-size: var(--text-sm-plus, 11px);
    letter-spacing: var(--tracking-widest, .08em);
    text-transform: uppercase;
    color: #c084fc;
    font-weight: var(--weight-semibold, 600);
    margin-bottom: 4px;
  }
  .swe-empty {
    color: var(--ink-muted, #8a8694);
    font-style: italic;
    font-size: var(--text-base-plus, 13px);
    padding: 2px 0;
  }
  .swe-slider-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
  }
  .swe-slider-label { font-size: var(--text-base-plus, 13px); color: var(--ink-muted, #8a8694); }
  .swe-slider {
    flex: 1;
    height: 8px;
    accent-color: #c084fc;
    cursor: pointer;
  }
  .swe-slider-val {
    font-family: 'Courier New', monospace;
    font-weight: var(--weight-extrabold, 800);
    color: #c084fc;
    min-width: 2ch;
    text-align: right;
  }
  .swe-buffs { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
  .swe-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    border-radius: var(--radius-full, 999px);
    font-size: var(--text-base, 12px);
    font-weight: var(--weight-semibold, 600);
    color: var(--ink, #e8e4da);
    border: 1px solid var(--border-strong, rgba(255,255,255,.25));
    background: color-mix(in srgb, #c084fc 10%, transparent);
    cursor: pointer;
    font-family: var(--font-body, inherit);
  }
  .swe-chip--off {
    opacity: .45;
    filter: grayscale(.6);
    border-style: dashed;
  }
  .swe-chip-val { font-weight: var(--weight-extrabold, 800); font-family: 'Courier New', monospace; }
  .swe-chip-toggle {
    font-size: var(--text-2xs, 10px);
    font-weight: var(--weight-extrabold, 800);
    letter-spacing: var(--tracking-wide, .05em);
    padding: 1px 5px;
    border-radius: var(--radius-full, 999px);
    background: rgba(0,0,0,.35);
    border: 1px solid var(--border, rgba(255,255,255,.15));
  }
</style>
