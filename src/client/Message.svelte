<script lang="ts">
  export let message;
</script>

<style>
  .message {
    padding: 20px;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    background-color: var(--shadow);
    font-weight: bold;
    position: absolute;
    color: var(--light-text);
    font-size: 36px;
    line-height: 35px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding-bottom: 40px;
  }

  .inner {
    max-width: 16em;
  }
</style>

<svelte:options immutable={true} />

<div class="message">
  <div class="inner">{message}</div>
</div>
