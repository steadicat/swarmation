<script lang="ts">
  export let self;

  function getSuccessRate({total, succeeded}) {
    if (total === 0) return 100;
    return Math.round((1000.0 * succeeded) / total) / 10;
  }

  $: successRate = self ? getSuccessRate(self) : 100;
</script>

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

<svelte:options immutable={true} />

<div class="box">
  <span class="text">{successRate}%</span>
  success
</div>
