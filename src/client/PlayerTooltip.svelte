<script lang="ts">
  import Tooltip from './Tooltip.svelte';

  export let player;
  export let left;
  export let top;

  function successRate({total, succeeded}) {
    if (total === 0) return 100;
    return Math.round((1000.0 * succeeded) / total) / 10;
  }
</script>

<style>
  .name {
    font-weight: bold;
    font-size: 16px;
    line-height: 20px;
    margin-bottom: 5px;
  }

  .number {
    font-size: 24px;
    line-height: 24px;
    font-weight: bold;
  }

  .flex {
    display: flex;
  }

  .col {
    flex-basis: 0;
    flex: 1;
  }
</style>

<Tooltip {left} {top}>
  <h3 class="name">{player.name}</h3>
  <div class="flex">
    <div class="col" style="margin-right: 5px; opacity: 0.7">
      <div class="number">{player.score}</div>
      points
    </div>
    <div class="col" style="opacity: 0.5">
      <div class="number">{successRate(player)}%</div>
      success
    </div>
  </div>
</Tooltip>

