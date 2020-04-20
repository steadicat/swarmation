<script lang="ts">
  export let formationMap;
  export let formationName;
  let unit = 16;

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
  .box {
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
  .image {
    display: inline-block;
    vertical-align: top;
    position: relative;
  }
  .pixel {
    position: absolute;
    width: 15px;
    height: 15px;
    box-shadow: inset -1px -1px 0px rgba(0,36,62,0.2), inset 1px 1px 0 rgba(255,255,255,0.4);
    background: #fb3;
  }
  .name {
    font-size: 20px;
    line-height: 25px;
    font-weight: bold;
    padding-top: 10px;
    padding-bottom: 20px;
  }
</style>

<div class="box">
  <div class="image" style="width: {width}px; height: {height}px">
    {#each formationMap as row, y (y)}
      {#each row as cell, x (x)}
        {#if cell}
          <div class="pixel" style="top: {y * (unit + 1)}px; left: {x * (unit + 1)}px;" />
        {/if}
      {/each}
    {/each}
  </div>
  <div class="name">{formationName}</div>
</div>