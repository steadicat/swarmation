<script lang="ts">
  import { afterUpdate } from 'svelte';
  import { fade } from 'svelte/transition';

  export let player;
  export let hasMoved = false;
  export let hidden = false;

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
  z-index: 1;
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
  font-weight: bold;
  margin-bottom: 10px;
}
p {
  margin: 0;
  padding: 0;
}
</style>

{#if !hidden}
<div
  class="welcome"
  style="width: 240px; left: {player.left * 10 + 6}px; top: {player.top * 10 - 14}px"
  transition:fade>
  {#if hasMoved}
  <p>Get into a formation with other players before the countdown expires</p>
  {:else}
  <h3>Welcome to life as a pixel</h3>
  <p>Use your <span class="arrow-image arrow"></span> keys to move</p>
  {/if}
</div>
{/if}