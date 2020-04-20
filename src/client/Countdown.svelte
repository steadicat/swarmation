<script>
  export let countdown;
</script>

<style>
  .countdown {
    margin: 0;
    padding: 0;
    line-height: 75px;
    font-weight: bold;
    position: fixed;
    top: 0;
    right: 20px;
  }
</style>

<h1 class="countdown" style="font-size: {countdown < 0 ? 40 : 80}px">
  {countdown < 0 ? 'wait' : countdown}
</h1>

