<script lang="ts">
  export let label: string
  export let value: string
  export let options: Array<{ value: string; label: string }>
  export let placeholder: string = "None"
  export let onChange: (v: string) => void = () => {}
  let id = 'select-' + Math.random().toString(36).substr(2, 9);
</script>

<div class="field">
  <label for={id}>{label}</label>
  <select {id} bind:value on:change={e => onChange((e.target as HTMLSelectElement).value)}>
    <option value="">{placeholder}</option>
    {#each options as opt}
      <option value={opt.value}>{opt.label}</option>
    {/each}
  </select>
</div>
