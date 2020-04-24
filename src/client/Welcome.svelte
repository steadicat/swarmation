<script lang="ts">
  import { afterUpdate } from 'svelte';

  import Tooltip from './Tooltip.svelte';

  export let left;
  export let top;
  export let hasMoved = false;
  export let hidden = false;

  let touch = 'ontouchstart' in window;

  let timeout;
  afterUpdate(() => {
    if (hasMoved && !timeout) {
      timeout = setTimeout(() => hidden = true, 10000);
    }
  });
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

{#if !hidden}
  <Tooltip {left} {top} style="width: 240px; padding: 10px;" fadeDuration={1000}>
    {#if !hasMoved}
      <h3>Welcome to life as a pixel</h3>
      {#if touch}
        <p>Swipe in any direction to move</p>
      {:else}
        <p>Use your <span class="arrow">arrow</span> keys to move</p>
      {/if}
    {:else}
      <p>Get into a formation with other players before the countdown expires</p>
    {/if}
  </Tooltip>
{/if}