<svelte:options immutable={true} />

<script lang="ts">
  export let left: number;
  export let top: number;
  export let self: boolean;
  export let flashing: boolean;
  export let lockedIn: boolean;
  export let idle: boolean;
  export let active: boolean;
</script>

<div
  class="player"
  style="left: {left}px; top: {top}px"
  class:flashing
  class:lockedIn
  class:idle
  class:self
  class:active
  on:mouseover
  on:mouseout
  on:click
/>

<style>
  .player {
    position: absolute;
    width: var(--unit);
    height: var(--unit);
    transition: left 0.1s ease-in-out, top 0.1s ease-in-out;
    box-shadow: inset -1px -1px 0px var(--shadow), inset 1px 1px 0 var(--highlight);
    background: var(--gray);
  }

  .self {
    background: var(--teal);
  }
  .idle {
    opacity: 0.5;
  }
  .flashing {
    background: var(--orange);
  }
  .lockedIn {
    box-shadow: inset -1px -1px 0px var(--dark-shadow), inset 1px 1px 0 var(--light-highlight);
    background: var(--dark-gray);
    animation: bounceIn 0.75s cubic-bezier(0.215, 0.61, 0.355, 1);
  }
  .active {
    box-shadow: inset -1px -1px 0px var(--shadow), inset 1px 1px 0 var(--dark-highlight);
    background: var(--yellow);
  }

  @keyframes bounceIn {
    0% {
      transform: scale3d(0.3, 0.3, 0.3);
    }
    20% {
      transform: scale3d(1.2, 1.2, 1.2);
    }
    40% {
      transform: scale3d(0.85, 0.85, 0.85);
    }
    60% {
      transform: scale3d(1.08, 1.08, 1.08);
    }
    80% {
      transform: scale3d(0.95, 0.95, 0.95);
    }
    100% {
      transform: scale3d(1, 1, 1);
    }
  }
</style>
