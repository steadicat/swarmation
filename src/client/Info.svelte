<script>
  export let score = 0;
  export let successRate = 100;
  export let countdown = -1;
  export let formationName = '\xa0';
  export let formationMap = [];

  const unit = 15;

  function formationWidth(map) {
    if (map.length === 0) return unit;
    return Math.max(
      ...Object.values(map).map((row, y) =>
        Math.max(
          ...Object.values(row)
            .map((cell, x) => cell ? x * (unit + 1) + unit : 0))
      ));
  }

  function formationHeight(map) {
    if (map.length === 0) return unit;
    return Math.max(
      ...Object.values(map).map((row, y) =>
        Math.max(
          ...Object.values(row)
            .map((cell, x) => cell ? y * (unit + 1) + unit : 0))
      ));
  }

  $: width = formationWidth(formationMap);
  $: height = formationHeight(formationMap);
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
  .formation-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100px;
    position: fixed;
    top: 0;
    left: 0;
    text-align: center;
    padding: 20px;
  }
  .formation-image {
    display: inline-block;
    vertical-align: top;
    position: relative;
  }
  .formation-pixel {
    position: absolute;
    width: 15px;
    height: 15px;
    box-shadow: inset -1px -1px 0px rgba(0,36,62,0.2), inset 1px 1px 0 rgba(255,255,255,0.4);
    background: #fb3;
  }
  .formation-name {
    font-size: 20px;
    line-height: 25px;
    font-weight: bold;
    padding-top: 10px;
    padding-bottom: 20px;
  }
  .score-box {
    font-size: 24px;
    line-height: 24px;
    position: fixed;
    bottom: 0;
    left: 0;
    text-align: center;
    padding: 10px;
  }
  .score-text {
    display: block;
    font-weight: bold;
    font-size: 60px;
    line-height: 50px;
  }
  .success-box {
    font-size: 24px;
    line-height: 24px;
    position: fixed;
    bottom: 0;
    right: 0;
    text-align: center;
    padding: 10px;
  }
  .success-text {
    display: block;
    font-weight: bold;
    font-size: 36px;
    line-height: 35px;
  }
</style>

<h1 class="countdown" style="font-size: {countdown < 0 ? 40 : 80}px">
  {countdown < 0 ? 'wait' : countdown}
</h1>
<div class="formation-box">
  <div class="formation-image" style="width: {width}px; height: {height}px">
    {#each formationMap as row, y (y)}
      {#each row as cell, x (x)}
        {#if cell}
          <div class="formation-pixel" style="top: {y * (unit + 1)}px; left: {x * (unit + 1)}px;" />
        {/if}
      {/each}
    {/each}
  </div>
  <div class="formation-name">{formationName}</div>
</div>
<h2 class="score-box">
  <span class="score-text">{score}</span>
  points
</h2>
<h3 class="success-box">
  <span class="success-text">{successRate}%</span>
  success
</h3>
