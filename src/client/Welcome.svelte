<script lang="ts">
  import { afterUpdate } from 'svelte';
  import { fade } from 'svelte/transition';

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
.welcome {
  transform: translate(-50%, -100%);
  background: #fff;
  transition: left 0.1s ease-in-out, top 0.1s ease-in-out;
  position: absolute;
  text-align: center;
  border-radius: 3px;
  box-shadow: rgba(0,36,62,0.2) 2px 2px 0px;
  border: 1px solid #798796;
  display: inline-block;
  vertical-align: top;
  padding: 10px;
}

.welcome:after {
  background: url(/images/tip.png) no-repeat center center;
  content: " ";
  width: 24px;
  height: 10px;
  position: absolute;
  bottom: -10px;
  left: 50%;
  margin-left: -12px;
}

h3 {
  margin: 0;
  padding: 0;
  font-size: 16px;
  line-height: 20px;
  font-weight: bold;
  margin-bottom: 10px;
}
p {
  margin: 0;
  padding: 0;
}

.arrow-image {
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
<div
  class="welcome"
  style="width: 240px; left: {left + 6}px; top: {top - 14}px"
  transition:fade>
  {#if !hasMoved}
  <h3>Welcome to life as a pixel</h3>
    {#if touch}
    <p>Swipe in any direction to move</p>
    {:else}
    <p>Use your <span class="arrow-image arrow">arrow</span> keys to move</p>
    {/if}
  {:else}
  <p>Get into a formation with other players before the countdown expires</p>
  {/if}
</div>
{/if}