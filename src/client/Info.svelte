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
    line-height: 75px;
    font-weight: bold;
  }
  .formation-box {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100px;
  }
  .formation-image {
    display: inline-block;
    vertical-align: top;
    position: relative;
  }
  .formation-name {
    font-size: 20px;
    line-height: 25px;
    font-weight: bold;
  }
  .score-box {
    font-size: 24px;
    line-height: 25px;
    border-top: 1px solid #ddd;
    margin-top: -1px;
    opacity: 0.7;
  }
  .score-text {
    display: block;
    font-weight: bold;
    font-size: 60px;
    line-height: 65px;
  }
  .success-box {
    font-size: 24px;
    line-height: 25px;
    border-top: 1px solid #ddd;
    margin-top: -1px;
    border-bottom: 1px solid #ddd;
    margin-bottom: -1px;
    opacity: 0.5;
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
    {#each formationMap as row, y}
      {#each row as cell, x}
      <div class="ref" style="top: {y * (unit + 1)}px; left: {x * (unit + 1)}px;" />
      {/each}
    {/each}
  </div>
</div>
<div class="formation-name ptm pbl">{formationName}</div>
<h2 class="score-box pbl">
  <span class="score-text">{score}</span>
  points
</h2>
<h3 class="success-box ptl pbl">
  <span class="success-text">{successRate}%</span>
  success
</h3>
