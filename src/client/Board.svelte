<svelte:options immutable={true} />

<script lang="ts">
  import PlayerComponent from './Player.svelte';
  import PlayerTooltip from './PlayerTooltip.svelte';
  import Tooltip from './Tooltip.svelte';

  import {afterUpdate} from 'svelte';
  import {quintOut} from 'svelte/easing';

  const touch = 'ontouchstart' in window;
  const unit = 14;

  export let players: Player[];
  export let self: Player;
  export let activeIds: number[];
  export let scoreChanges: number[];
  export let hasMoved = false;

  let showTooltipForPlayer: Player | null = null;
  let scoreChangesSeen = 0;

  $: unseenScoreChanges = scoreChanges.slice(scoreChangesSeen);

  let width = 0;
  let height = 0;
  let last = {x: 0, y: 0};

  $: centerX = (() => {
    if (!self) return Math.round(width / 2 / unit);
    let cx = last.x ? last.x : Math.floor(width / 2 / unit);
    let minLeft = Math.floor(width / 4 / unit);
    let maxRight = Math.ceil((width * 3) / 4 / unit);
    while (cx + self.left < minLeft) cx++;
    while (cx + self.left > maxRight) cx--;
    return cx;
  })();
  $: centerY = (() => {
    if (!self) return Math.round(height / 2 / unit);
    let cy = last.y ? last.y : Math.floor(height / 2 / unit);
    let minTop = Math.floor(height / 4 / unit);
    let maxBottom = Math.ceil((height * 3) / 4 / unit);
    while (cy + self.top < minTop) cy++;
    while (cy + self.top > maxBottom) cy--;
    return cy;
  })();

  $: gridWidth = Math.ceil((width * 3) / unit);
  $: gridHeight = Math.ceil((height * 3) / unit);
  $: gridX = centerX - Math.floor(gridWidth / 2);
  $: gridY = centerY - Math.floor(gridHeight / 2);

  afterUpdate(() => {
    last.x = centerX;
    last.y = centerY;
  });

  function explode(_node: HTMLDivElement) {
    return {
      duration: 600,
      easing: quintOut,
      css: (t: number) => `
        transform: scale(${0.1 + 0.9 * t}, ${0.1 + 0.9 * t});
        opacity: ${1 - t};
      `,
    };
  }

  function onPlayerClick(player: Player) {
    if (!touch) return;
    showTooltipForPlayer = showTooltipForPlayer ? null : player;
  }
  function onPlayerMouseOver(player: Player) {
    if (touch) return;
    showTooltipForPlayer = player;
  }
  function onPlayerMouseOut(player: Player) {
    if (touch) return;
    showTooltipForPlayer = null;
  }
</script>

<svelte:window bind:innerWidth={width} bind:innerHeight={height} />

<svg
  xmlns="http://www.w3.org/2000/svg"
  class="grid"
  style="width: {gridWidth * unit}px; height: {gridHeight * unit}px; left: {gridX *
    unit}px; top: {gridY * unit}px"
  on:click={() => (showTooltipForPlayer = null)}
>
  <defs>
    <pattern id="grid" width={unit} height={unit} patternUnits="userSpaceOnUse">
      <rect width={unit} height={unit} fill="none" stroke="var(--grid-gray)" stroke-width="1" />
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid)" />
</svg>

{#each players as player (player.id)}
  <PlayerComponent
    left={(centerX + player.left) * unit}
    top={(centerY + player.top) * unit}
    flashing={player.flashing}
    idle={!player.active}
    lockedIn={player.lockedIn}
    self={player === self}
    active={activeIds.findIndex((id) => id === player.id) >= 0}
    on:click={() => onPlayerClick(player)}
    on:mouseover={() => onPlayerMouseOver(player)}
    on:mouseout={() => onPlayerMouseOut(player)}
  />
{/each}

{#if self && !hasMoved}
  <Tooltip left={(centerX + self.left) * unit} top={(centerY + self.top) * unit}>
    <b>Welcome!</b>
    {#if touch}Swipe in any direction to move.{:else}Use your arrow keys to move.{/if}
  </Tooltip>
{/if}

{#if showTooltipForPlayer}
  <PlayerTooltip
    player={showTooltipForPlayer}
    left={(centerX + showTooltipForPlayer.left) * unit}
    top={(centerY + showTooltipForPlayer.top) * unit}
  />
{/if}

{#if self}
  {#each unseenScoreChanges as scoreChange, i (i)}
    <div
      class="score"
      class:positive={scoreChange > 0}
      class:negative={scoreChange <= 0}
      style="left: {(centerX + self.left) * unit - 200}px; top: {(centerY + self.top) * unit -
        50}px"
      in:explode
      on:introend={() => scoreChangesSeen++}
    >
      {#if scoreChange > 0}+{/if}
      {scoreChange}
    </div>
  {/each}
{/if}

<style>
  .grid {
    position: fixed;
    transition: left 0.1s ease-in-out, top 0.1s ease-in-out;
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
    color: var(--teal);
  }

  .negative {
    color: var(--orange);
  }
</style>
