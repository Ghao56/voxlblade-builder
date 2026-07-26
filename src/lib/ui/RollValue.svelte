<script lang="ts">
  import { onMount } from 'svelte'

  export let value: string
  export let classList: string = ''
  export let duration: number = 300

  let displayed = value
  let prev = value
  let animFrame: number | null = null

  function parseNum(s: string): { prefix: string; num: number; suffix: string } {
    const m = s.match(/^([^-\d]*)(-?[\d.]+)(.*)$/)
    if (!m) return { prefix: '', num: 0, suffix: s }
    return { prefix: m[1], num: parseFloat(m[2]), suffix: m[3] }
  }

  function animate(from: string, to: string) {
    const a = parseNum(from)
    const b = parseNum(to)
    if (a.num === b.num) { displayed = to; return }
    if (animFrame) cancelAnimationFrame(animFrame)
    const start = performance.now()
    const prefix = b.prefix
    const suffix = b.suffix
    const decimals = Math.max(
      (a.suffix === b.suffix) ? countDecimals(a.suffix) : 0,
      countDecimals(b.suffix)
    )
    function countDecimals(s: string) {
      const dot = s.indexOf('.')
      if (dot < 0) return 0
      let end = dot + 1
      while (end < s.length && /\d/.test(s[end])) end++
      return end - dot - 1
    }
    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration)
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      const cur = a.num + (b.num - a.num) * ease
      displayed = `${prefix}${cur.toFixed(decimals)}${suffix}`
      if (t < 1) animFrame = requestAnimationFrame(tick)
      else displayed = to
    }
    animFrame = requestAnimationFrame(tick)
  }

  $: if (value !== prev) {
    animate(prev, value)
    prev = value
  }

  onMount(() => { displayed = value })

  $: _neg = parseNum(displayed).num < 0
</script>

<span class="roll-val {classList}" class:roll-neg={_neg}>{displayed}</span>

<style>
  .roll-val {
    display: inline-block;
    transition: color 0.3s ease;
  }
</style>
