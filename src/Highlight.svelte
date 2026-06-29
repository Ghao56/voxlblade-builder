<script lang="ts">
  import { highlightTextParts } from './lib/utils'
  export let text: string = ''
  export let query: string = ''
  $: parts = highlightTextParts(text, query)
</script>

<span>
  {#each parts as part}
    {#if part.highlight}
      <mark class="modal-hl">{part.text}</mark>
    {:else}
      {part.text}
    {/if}
  {/each}
</span>
