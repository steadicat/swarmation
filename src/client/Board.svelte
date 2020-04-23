<script lang="ts">
  import Tooltip from './Tooltip.svelte';
  import Welcome from './Welcome.svelte';

  import { beforeUpdate, afterUpdate } from 'svelte';
	import { quintOut } from 'svelte/easing';

  let unit = 12;

  export let players;
  export let self;
  export let activeIds;
  export let hasMoved;
  export let scoreChanges;

  let showTooltipForPlayer = null;
  let scoreChangesSeen = 0;

  $: unseenScoreChanges = scoreChanges.slice(scoreChangesSeen);

  let width;
  let height;

  $: centerX = (() => {
    if (!self) return width / 2;
    let cx = Math.floor(width / 2 / unit);
    let minLeft = Math.floor(width / 4 / unit);
    let maxRight = Math.ceil(width * 3 / 4 / unit);
    while (cx + self.left < minLeft) cx++;
    while (cx + self.left > maxRight) cx--;
    return cx;
  })();
  $: centerY = (() => {
    if (!self) return height / 2;
    let cy = Math.floor(height / 2 / unit);
    let minTop = Math.floor(height / 4 / unit);
    let maxBottom = Math.ceil(height * 3 / 4 / unit);
    while (cy + self.top < minTop) cy++;
    while (cy + self.top > maxBottom) cy--;
    return cy;
  })();

  $: gridWidth = Math.ceil(width * 3 / unit);
  $: gridHeight = Math.ceil(height * 3 / unit);
  $: gridX = centerX - Math.floor(gridWidth / 2);
  $: gridY = centerY - Math.floor(gridHeight / 2);

	function explode(node, {duration = 600}) {
		return {
      duration,
      easing: quintOut,
			css: t => `
        transform: scale(${0.1 + 0.9 * t}, ${0.1 + 0.9 *t});
        opacity: ${1 - t};
      `
		};
	}
</script>

<style>
  .grid {
    position: fixed;
    transition: left 0.1s ease-in-out, top 0.1s ease-in-out;
  }

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

<svelte:window bind:innerWidth={width} bind:innerHeight={height} />

<svg xmlns="http://www.w3.org/2000/svg" class="grid" style="width: {gridWidth * unit}px; height: {gridHeight * unit}px; left: {gridX * unit}px; top: {gridY * unit}px">
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
  class:self={player === self}
  class:flash={player.flashing}
  class:locked-in={player.lockedIn}
  class:idle={!player.active}
  class:active={activeIds.findIndex(id => id === player.id) >= 0}
  style="left: {(centerX + player.left) * unit}px; top: {(centerY + player.top) * unit}px"
  on:mouseover={() => showTooltipForPlayer = player}
  on:mouseout={() => showTooltipForPlayer = null}
/>
{/each}

{#if self}
<Welcome {hasMoved} left={(centerX + self.left) * unit} top={(centerY + self.top) * unit} />
{/if}

{#if showTooltipForPlayer}
<Tooltip player={showTooltipForPlayer} left={(centerX + showTooltipForPlayer.left) * unit} top={(centerY + showTooltipForPlayer.top) * unit} />
{/if}

{#if self}
  {#each unseenScoreChanges as scoreChange, i (i)}
    <div
      class="score"
      class:positive={scoreChange > 0}
      class:negative={scoreChange <= 0}
      style="left: {(centerX + self.left) * unit - 200}px; top: {(centerY + self.top) * unit - 50}px"
      in:explode
      on:introend="{() => scoreChangesSeen++}">
      {#if scoreChange > 0}+{/if}{scoreChange}
    </div>
  {/each}
{/if}