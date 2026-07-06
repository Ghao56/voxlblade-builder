<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { BADGE_CONFIG, type ComputedHit } from './lib/dmgTypes'

  let { hit, useCrit = false }: {
    hit: ComputedHit
    useCrit?: boolean
  } = $props()

  let groups = $derived(buildGroups(hit, useCrit))
  let hitTotal = $derived(groups.reduce((s, g) => s + g.total, 0))
  let pieSegments = $derived(groups.map(g => ({ color: g.color, pct: g.total / hitTotal })))
  const PIE_R = 10
  const PIE_CIRC = 2 * Math.PI * PIE_R

  let animReady = $state(false)

  onMount(async () => {
    await tick()
    requestAnimationFrame(() => { animReady = true })
  })

  function buildGroups(h: typeof hit, crit: boolean) {
    const map = new Map<string, { label: string; color: string; total: number; entries: Array<{ label: string; val: number; badge: string }> }>()
    const count = h.count
    for (const t of h.types) {
      if (t.isHeal || t.isCurseRip) continue
      const val = (crit || t.forceCrit) ? t.critVal : t.raw
      const dsCount = t.oncePerGroup && (h.group === 'M1' || h.group === 'M2') ? 1 : count
      const total = t.oncePerGroup ? val * dsCount : val * count
      let g = map.get(t.key)
      if (!g) {
        g = { label: t.label, color: t.color, total: 0, entries: [] }
        map.set(t.key, g)
      }
      g.total += total
      let badge = t.tag ?? ''
      g.entries.push({ label: t.label, val: total, badge })
    }
    return [...map.entries()].map(([key, g]) => ({ key, ...g }))
  }
</script>

<div class="dtt-wrap">
  {#if pieSegments.length > 1}
    <svg class="dtt-pie" viewBox="0 0 24 24">
      {#each pieSegments as seg, i}
        {@const prev = pieSegments.slice(0, i).reduce((s, x) => s + x.pct, 0)}
        <circle cx="12" cy="12" fill="none" stroke={seg.color} stroke-width="4"
          r={PIE_R}
          stroke-dasharray={animReady ? `${seg.pct * PIE_CIRC} ${(1 - seg.pct) * PIE_CIRC}` : `0 ${PIE_CIRC}`}
          stroke-dashoffset={animReady ? -prev * PIE_CIRC : 0}
          transform="rotate(-90 12 12)"
        />
      {/each}
    </svg>
  {/if}
  {#each groups as g}
    <div class="dtt-group">
      <div class="dtt-group-head">
        <span class="dtt-dot" style="background: {g.color}"></span>
        <span class="dtt-type-label" style="color: {g.color}">{g.label}</span>
        <span class="dtt-type-total">{g.total.toFixed(4)}</span>
        {#if hitTotal > 0}
          <span class="dtt-type-pct">{((g.total / hitTotal) * 100).toFixed(2)}%</span>
        {/if}
      </div>
      <div class="dtt-entries">
        {#each g.entries as e}
          <div class="dtt-entry">
            <span class="dtt-entry-val">{e.val.toFixed(4)}</span>
            {#if e.badge}
              {@const cfg = BADGE_CONFIG[e.badge]}
              <span class="dtt-badge" style="background:{cfg.color}22;color:{cfg.color}">{cfg.label}</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
  .dtt-pie {
    width: 60px;
    height: 60px;
    align-self: center;
    flex-shrink: 0;
    animation: pieEnter .6s ease-out;
    transform-origin: center;
    transform-box: fill-box;
    will-change: transform, opacity;
  }
  .dtt-pie circle {
    transition: stroke-dasharray .6s ease-out, stroke-dashoffset .6s ease-out;
  }
  @keyframes pieEnter {
    from { opacity: 0; transform: rotate(-15deg) scale(.96); }
    to   { opacity: 1; transform: rotate(0deg) scale(1); }
  }
  .dtt-wrap {
    background: #1a1a1e;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 8px;
    padding: 10px 12px;
    font-size: .7rem;
    line-height: 1.4;
    min-width: 200px;
    box-shadow: 0 8px 32px rgba(0,0,0,.5);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .dtt-group {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .dtt-group + .dtt-group {
    padding-top: 6px;
    border-top: 1px solid rgba(255,255,255,.06);
  }
  .dtt-group-head {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .dtt-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .dtt-type-label {
    font-weight: 600;
    text-transform: capitalize;
  }
  .dtt-type-total {
    margin-left: auto;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: #e8e4da;
  }
  .dtt-type-pct {
    font-size: .6rem;
    opacity: .6;
    font-variant-numeric: tabular-nums;
    margin-left: 4px;
  }
  .dtt-entries {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-left: 14px;
  }
  .dtt-entry {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: .65rem;
    opacity: .8;
  }
  .dtt-entry-val {
    font-variant-numeric: tabular-nums;
    color: #c4c0b8;
  }
  .dtt-badge {
    font-size: .55rem;
    padding: 1px 5px;
    border-radius: 3px;
    font-weight: 600;
    letter-spacing: .02em;
  }

</style>
