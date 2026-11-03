<script lang="ts">
  // ③ SỐNG CÒN — thanh HP + decay. HP/decay từ instance (khoá lúc spawn).
  // decay gốc đến từ VM (lifetime.baseDecay, qua hàm gốc getSummonBaseDecay)
  // — component chỉ hiển thị, KHÔNG dựng lại phép tính ÷ (1 + boost).
  import type { SummonPanelVM } from '../lib/summonView'
  import { fmtSummonNum, fmtSummonDuration } from '../lib/summonView'

  export let vm: SummonPanelVM

  $: pct = vm.lifetime.maxHp > 0 ? Math.max(0, Math.min(100, (vm.lifetime.hp / vm.lifetime.maxHp) * 100)) : 0
  // xanh → vàng → đỏ theo ngưỡng %
  $: barColor = pct >= 50 ? '#4ade80' : pct >= 25 ? '#facc15' : '#ef4444'
  $: secondsText = vm.lifetime.seconds === null ? '∞' : '~' + fmtSummonDuration(vm.lifetime.seconds)
</script>

<div class="slt-lifetime">
  <div class="slt-block-label">Survival</div>
  <div class="slt-bar-row">
    <div class="slt-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(pct)}>
      <div class="slt-fill" style="--fill:{pct}%; --bc:{barColor}"></div>
    </div>
    <span class="slt-hp" style="color:{barColor}">{fmtSummonNum(vm.lifetime.hp)}<span class="slt-hp-max">/{fmtSummonNum(vm.lifetime.maxHp)}</span></span>
  </div>
  <div class="slt-detail">
    <span
      class="slt-decay"
      title={vm.lifetime.baseDecay !== null
        ? `Base decay ${fmtSummonNum(vm.lifetime.baseDecay)} — reduced by Summon Boost (calcSummonDecayPercent, SummonData)`
        : undefined}
    >−{fmtSummonNum(vm.lifetime.decayPerSec)}/s decay</span>
    <span class="slt-lifetime-val">{secondsText}</span>
  </div>
</div>

<style>
  .slt-lifetime { padding: 4px 0; border-top: 1px solid color-mix(in srgb, #c084fc 15%, transparent); }
  .slt-block-label { font-size: var(--text-sm-plus, 11px); letter-spacing: var(--tracking-widest, .08em); text-transform: uppercase; color: #c084fc; font-weight: var(--weight-semibold, 600); margin-bottom: 4px; }  .slt-bar-row { display: flex; align-items: center; gap: 8px; }
  .slt-bar {
    flex: 1;
    height: 10px;
    border-radius: var(--radius-full, 999px);
    background: var(--surface, #26232e);
    overflow: hidden;
  }
  .slt-fill {
    height: 100%;
    width: var(--fill);
    background: var(--bc);
    border-radius: inherit;
    transition: width var(--duration-fast, .15s) var(--ease-out, ease);
  }
  .slt-hp {
    font-family: 'Courier New', monospace;
    font-size: var(--text-base-plus, 13px);
    font-weight: var(--weight-extrabold, 800);
    white-space: nowrap;
  }
  .slt-hp-max { color: var(--ink-muted, #8a8694); font-weight: var(--weight-semibold, 600); }
  .slt-detail {
    display: flex; justify-content: space-between; gap: 8px;
    margin-top: 3px;
    font-size: var(--text-base-plus, 13px);
  }
  .slt-decay { color: var(--neg, #cf6679); font-weight: var(--weight-semibold, 600); }
  .slt-lifetime-val { color: var(--accent2, #facc15); font-weight: var(--weight-bold, 700); font-family: 'Courier New', monospace; }
</style>
