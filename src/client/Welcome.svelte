<script lang="ts">
  import {onDestroy} from 'svelte';

  import Tooltip from './Tooltip.svelte';

  export let left;
  export let top;
  export let hasMoved = false;

  let show = true;
  let touch = 'ontouchstart' in window;

  $: timeout = hasMoved ? window.setTimeout(() => (show = false), 3000) : -1;
  onDestroy(() => window.clearTimeout(timeout));
</script>

<style>
  h3 {
    margin: 0;
    padding: 0;
    font-size: 16px;
    line-height: 20px;
    font-weight: bold;
    margin-bottom: 10px;
  }

  .arrow {
    background: url(../images/arrow-keys-dark.svg) no-repeat center center;
    display: inline-block;
    width: 37px;
    height: 24px;
    position: relative;
    top: 2px;
    text-indent: -10000px;
    overflow: hidden;
  }
</style>

<svelte:options immutable={true} />

<Tooltip
  {left}
  {top}
  style="width: 240px; padding: 10px; opacity: {show ? 1 : 0}; transition: left 0.1s ease-in-out,
  top 0.1s ease-in-out, 1s opacity">
  {#if !hasMoved}
    <h3>Welcome to life as a pixel</h3>
    {#if touch}
      <p>Swipe in any direction to move</p>
    {:else}
      <p>
        Use your
        <span class="arrow">arrow</span>
        keys to move
      </p>
    {/if}
  {:else}
    <p>Get into a formation with other players before the countdown expires</p>
  {/if}
</Tooltip>
