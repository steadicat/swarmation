<svelte:options immutable={true} />

<script lang="ts">
  export let score: number;
</script>

<div class="box">
  <span class="text">{score}</span>
  points
</div>

<style>
  .box {
    font-size: 24px;
    line-height: 24px;
    position: fixed;
    bottom: 0;
    left: 0;
    text-align: center;
    padding: 10px;
  }
  .text {
    display: block;
    font-weight: bold;
    font-size: 60px;
    line-height: 50px;
  }
</style>
