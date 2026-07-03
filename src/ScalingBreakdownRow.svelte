<script lang="ts">
  import { roundMultiplier } from './lib/utils'

  import { PERCENT_STATS } from './lib/types'

  export let row: any
  export let useRoundMultiplier = false
  export let showZeroBoost = false

  $: _isPct = row.boostKey ? PERCENT_STATS.has(row.boostKey) : true
</script>

<style>
  .ds-row {
    display: grid;
    grid-template-columns: 120px 80px 20px 90px 20px 100px;
    gap: 4px;
    padding: 6px 8px;
    border-radius: 6px;
    background: var(--surface2, #1a1d1b);
    align-items: center;
    border: 1px solid transparent;
    transition: background .1s;
  }
  .ds-row:hover { background: var(--surface3, #212420); }

  .ds-col {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: .78rem;
  }
  .ds-col--op {
    justify-content: center;
    font-size: .7rem;
    color: var(--ink-muted, #8a8d85);
    opacity: .4;
    font-weight: 700;
  }
  .ds-col--val { justify-content: flex-end; }
  .ds-col--contrib { justify-content: flex-end; }
  .ds-col--boost { justify-content: flex-end; }

  .ds-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .ds-num {
    font-family: 'Courier New', monospace;
    font-weight: 800;
    font-size: .88rem;
  }

  .ds-boost {
    font-family: 'Courier New', monospace;
    font-weight: 700;
    font-size: .82rem;
    color: #4ade80;
  }
  .ds-boost--zero { color: var(--ink-muted, #8a8d85); opacity: .35; }

  .ds-contrib {
    font-family: 'Courier New', monospace;
    font-weight: 800;
    font-size: .88rem;
  }
  .ds-contrib--zero { color: var(--ink-muted, #8a8d85); opacity: .35; }
</style>

<div class="ds-row">
  <div class="ds-col ds-col--type">
    <span class="ds-dot" style="background:{row.color}"></span>
    <span style="color:{row.color}">{(row as any).label ?? (row.key.charAt(0).toUpperCase() + row.key.slice(1))}</span>
  </div>
  <div class="ds-col ds-col--val">
    <span class="ds-num" style="color:{row.color}">
      {useRoundMultiplier ? roundMultiplier(row.scalingVal) : row.scalingVal}
    </span>
  </div>
  <div class="ds-col ds-col--op">×</div>
  <div class="ds-col ds-col--boost">
    {#if showZeroBoost}
      {#if row.boostPct !== 0}
        <span class="ds-boost" style={row.boostPct < 0 ? 'color:#cf6679;' : ''}>{row.boostPct > 0 ? '+' : ''}{roundMultiplier(row.boostPct)}{_isPct ? '%' : ''}</span>
      {:else}
        <span class="ds-boost ds-boost--zero">+0{_isPct ? '%' : ''}</span>
      {/if}
    {:else}
      <span class="ds-boost" style={row.boostPct < 0 ? 'color:#cf6679;' : ''}>{row.boostPct > 0 ? '+' : ''}{roundMultiplier(row.boostPct)}{_isPct ? '%' : ''}</span>
    {/if}
  </div>
  <div class="ds-col ds-col--op">=</div>
  <div class="ds-col ds-col--contrib">
    <span class="ds-contrib" class:ds-contrib--zero={row.contribution === 0}
      style={row.contribution > 0 ? `color:${row.color}` : row.contribution < 0 ? 'color:#cf6679;' : ''}>
      {row.contribution > 0 ? '+' : ''}{row.contribution}{_isPct ? '%' : ''}
    </span>
  </div>
</div>
