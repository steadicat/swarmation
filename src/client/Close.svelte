<script lang="ts">
  export let color = 'var(--grid-gray)';
  export let top = 0;
  export let right = 0;
  export let width = 16;
  export let height = 16;
</script>

<style>
  svg {
    position: absolute;
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
  style="color: {color}; top: {top}px; right: {right}px;">
  <line x1="4" y1="4" x2="12" y2="12" stroke-width="2" />
  <line x1="4" y1="12" x2="12" y2="4" stroke-width="2" />
</svg>
