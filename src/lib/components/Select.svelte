<script lang="ts">
  export let label: string
  export let value: string
  export let options: Array<{ value: string; label: string }>
  export let placeholder: string = "None"
  export let onChange: (v: string) => void = () => {}
</script>

<div class="field">
  <label>{label}</label>
  <select bind:value on:change={e => onChange((e.target as HTMLSelectElement).value)}>
    <option value="">{placeholder}</option>
    {#each options as opt}
      <option value={opt.value}>{opt.label}</option>
    {/each}
  </select>
</div>
