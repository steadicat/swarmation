<script lang="ts">
  import Tooltip from './Tooltip.svelte';
  import Welcome from './Welcome.svelte';

  import { afterUpdate } from 'svelte';

  let unit = 12;

  export let players = [];
  export let selfId = null;
  export let activeIds = [];
  export let hasMoved = false;
  export let scoreChanges = [];

  let showTooltipForPlayer = null;
  let scoreChangesSeen = 0;

  $: self = players.find(player => player.id === selfId);
  $: unseenScoreChanges = scoreChanges.slice(scoreChangesSeen);
  
	function explode(node, {duration} = {duration: 600}) {
		return {
      duration,
			css: t => `
        transform: scale(${0.1 + 0.9 * t}, ${0.1 + 0.9 *t});
        opacity: ${1 - t};
      `
		};
	}
</script>

<style>
  .player {
    position: absolute;
    width: 12px;
    height: 12px;
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

  .score {
    font-weight: bold;
    transform-origin: 50% 100%;
    font-size: 300px;
    width: 400px;
    opacity: 0;
    pointer-events: none;
    position: absolute;
    text-align: center;
  }

  .positive {
    color: #6dd;
  }
  .negative {
    color: #f85;
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

<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="grid" width="{unit}" height="{unit}" patternUnits="userSpaceOnUse">
      <rect width="{unit}" height="{unit}" fill="none" stroke="#e0e0e0" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid)" />
</svg>

{#each players as player (player.id)}
<div
  class="player"
  class:self={player.id === selfId}
  class:flash={player.flashing}
  class:locked-in={player.lockedIn}
  class:idle={!player.active}
  class:active={activeIds.findIndex(id => id === player.id) >= 0}
  style="left: {player.left * unit + 1}px; top: {player.top * unit + 1}px"
  on:mouseover={() => showTooltipForPlayer = player}
  on:mouseout={() => showTooltipForPlayer = null}
/>
{/each}

{#if self}
<Welcome {hasMoved} left={self.left * unit} top={self.top * unit} />
{/if}

{#if showTooltipForPlayer}
<Tooltip player={showTooltipForPlayer} left={self.left * unit} top={self.top * unit} />
{/if}

{#if self}
  {#each unseenScoreChanges as scoreChange, i (i)}
    <div
      class="score"
      class:positive={scoreChange > 0}
      class:negative={scoreChange <= 0}
      style="left: {self.left * unit - 200}px; top: {self.top * unit - 50}px"
      in:explode
      on:introend="{() => scoreChangesSeen++}">
      {#if scoreChange > 0}+{/if}{scoreChange}
    </div>
  {/each}
{/if}