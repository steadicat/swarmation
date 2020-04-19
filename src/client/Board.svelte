<script>
  import Tooltip from './Tooltip.svelte';

  export let players = [];
  export let selfId = null;
  export let activeIds = [];

  let showTooltipForPlayer = null;
</script>

<style>
  .player {
    position: absolute;
    width: 10px;
    height: 10px;
    transition: left 0.1s ease-in-out, top 0.1s ease-in-out;
    box-shadow: inset -1px -1px 0px rgba(0,36,62,0.2), inset 1px 1px 0 rgba(255,255,255,0.3);
    background: #aaa;
  }

  .self {
    background: #6dd;
  }
  .idle {
    opacity: 0.5;
  }
  .flash {
    background: #f85;
  }
  .active {
    box-shadow: inset -1px -1px 0px rgba(0,36,62,0.2), inset 1px 1px 0 rgba(255,255,255,0.4);
    background: #fb3;
  }
  .locked-in {
    box-shadow: inset -1px -1px 0px #000, inset 1px 1px 0 rgba(255,255,255,0.25);
    background: #444;
    animation: bounceIn .75s cubic-bezier(0.215, 0.610, 0.355, 1.000);
  }

  @keyframes bounceIn {
    0% { transform: scale3d(.3, .3, .3) }
    20% { transform: scale3d(1.2, 1.2, 1.2) }
    40% { transform: scale3d(.85, .85, .85) }
    60% { transform: scale3d(1.08, 1.08, 1.08) }
    80% { transform: scale3d(.95, .95, .95) }
    100% { transform: scale3d(1, 1, 1) }
  }
</style>

{#each players as player}
<div
  class="player"
  class:self={player.id === selfId}
  class:flash={player.flashing}
  class:locked-in={player.lockedIn}
  class:idle={!player.active}
  class:active={activeIds.findIndex(id => id === player.id) >= 0}
  style="left: {player.left * 10 + 1}px; top: {player.top * 10 + 1}px"
  on:mouseover={() => showTooltipForPlayer = player}
  on:mouseout={() => showTooltipForPlayer = null}
/>
{/each}

{#if showTooltipForPlayer}
<Tooltip player={showTooltipForPlayer} />
{/if}