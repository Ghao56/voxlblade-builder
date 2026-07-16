<script lang="ts">
  export let size: number = 16
  const uid = Math.random().toString(36).slice(2, 7)
</script>

<svg viewBox="0 0 128 128" width={size} height={size} style="display:inline-block;vertical-align:middle;flex-shrink:0">
    <defs>
    <linearGradient id="cg-{uid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#d84b55"/>
      <stop offset="100%" stop-color="#ff9a42"/>
    </linearGradient>
  </defs>
  <path fill="url(#cg-{uid})" d="M10 15 L70 45 L76 25 L84 45 L96 18 L96 96 L20 96 L52 84 L18 70 L42 65 Z"/>
</svg>