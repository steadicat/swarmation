<svelte:options immutable={true} />

<script lang="ts">
  export let self: {total: number; succeeded: number};

  function getSuccessRate({total, succeeded}: {total: number; succeeded: number}) {
    if (total === 0) return 100;
    return Math.round((1000.0 * succeeded) / total) / 10;
  }

  $: successRate = self ? getSuccessRate(self) : 100;
</script>

<div class="box">
  <span class="text">{successRate}%</span>
  success
</div>

<style>
  .box {
    font-size: 24px;
    line-height: 24px;
    position: fixed;
    bottom: 0;
    right: 0;
    text-align: center;
    padding: 10px;
  }
  .text {
    display: block;
    font-weight: bold;
    font-size: 36px;
    line-height: 35px;
  }
</style>
