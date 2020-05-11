<script lang="ts">
  export let color = 'var(--grid-gray)';
  export let backgroundColor = 'var(--light-text)';
  export let top = -8;
  export let right = -8;
  export let width = 16;
  export let height = 16;
</script>

<style>
  svg {
    position: absolute;
    box-shadow: var(--shadow) 1px 1px;
    cursor: pointer;
  }
</style>

<svelte:options immutable={true} />
<svg
  {width}
  {height}
  viewBox="0 0 16 16"
  stroke="currentColor"
  on:click|stopPropagation
  style="color: {color}; background: {backgroundColor}; top: {top}px; right: {right}px;
  border-radius: {width / 2 + 1}px">
  <line x1="4" y1="4" x2="12" y2="12" />
  <line x1="4" y1="12" x2="12" y2="4" />
</svg>
