<svelte:options immutable={true} />

<script lang="ts">
  import {fade} from 'svelte/transition';

  export let left: number;
  export let top: number;
  export let style = '';
</script>

<div transition:fade class="tooltip" style="left: {left + 6}px; top: {top - 14}px; {style}">
  <slot />
</div>

<style>
  .tooltip {
    position: fixed;
    transform: translate(-50%, -100%);
    transition: left 0.1s ease-in-out, top 0.1s ease-in-out;
    border: 1px solid var(--medium-blue);
    border-radius: 3px;
    background: var(--light-text);
    box-shadow: var(--shadow) 2px 2px 0px;
    text-align: center;
    display: inline-block;
    padding: 6px 12px;
  }

  .tooltip:after {
    background: url(/images/tip.png) no-repeat center center;
    content: ' ';
    width: 24px;
    height: 10px;
    position: absolute;
    bottom: -10px;
    left: 50%;
    margin-left: -12px;
  }
</style>
