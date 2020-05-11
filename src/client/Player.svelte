<script lang="ts">
  export let left;
  export let top;
  export let self;
  export let flashing;
  export let lockedIn;
  export let idle;
  export let active;
</script>

<style>
  .player {
    position: absolute;
    width: 12px;
    height: 12px;
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

<svelte:options immutable={true} />

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
  on:click />
