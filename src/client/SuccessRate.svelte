<script>
  export let successRate;
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

<h3 class="box">
  <span class="text">{successRate}%</span>
  success
</h3>
