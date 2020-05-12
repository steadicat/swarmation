<script lang="ts">
  export let formation;

  function formationWidth(map) {
    if (map.length === 0) return unit;
    return Math.max(
      ...Object.values(map).map((row, y) =>
        Math.max(...Object.values(row).map((cell, x) => (cell ? x + 1 : 0)))
      )
    );
  }

  function formationHeight(map) {
    if (map.length === 0) return unit;
    return Math.max(
      ...Object.values(map).map((row, y) =>
        Math.max(...Object.values(row).map((cell, x) => (cell ? y + 1 : 0)))
      )
    );
  }

  const size = 64;

  $: unit = Math.floor(
    Math.min(20, size / formationWidth(formation.map), size / formationHeight(formation.map))
  );
</script>

<style>
  .container {
    position: fixed;
    top: 14px;
    left: 14px;
    text-align: center;
  }
  .box {
    text-align: center;
    background: var(--light-text);
    border-radius: 3px;
    box-shadow: var(--shadow) 2px 2px 0px;
    border: 1px solid var(--medium-blue);
    padding: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .image {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  .row {
    display: flex;
    flex-wrap: nowrap;
    justify-content: flex-start;
  }
  .pixel {
    box-shadow: inset -1px -1px 0px rgba(0, 36, 62, 0.2), inset 1px 1px 0 rgba(255, 255, 255, 0.4);
    background: var(--yellow);
    margin: 0 1px 1px 0;
  }
  .empty {
    margin: 0 1px 1px 0;
  }
  .name {
    font-size: 20px;
    line-height: 25px;
    font-weight: bold;
    padding-top: 6px;
  }
</style>

<svelte:options immutable={true} />
<div class="container">
  <div class="box" style="width: {size}px; height: {size}px">
    <div class="image">
      {#each formation.map as row, y (y)}
        <div class="row">
          {#each row as cell, x (x)}
            {#if cell}
              <div class="pixel" style="width: {unit}px; height: {unit}px" />
            {:else}
              <div class="empty" style="width: {unit}px; height: {unit}px" />
            {/if}
          {:else}
            <div class="empty" style="width: {unit}px; height: {unit}px" />
          {/each}
        </div>
      {/each}
    </div>
  </div>
  <div class="name">{formation.name}</div>
</div>
