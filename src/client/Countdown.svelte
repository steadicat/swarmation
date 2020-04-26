<script lang="ts">
  import {afterUpdate} from 'svelte';

  export let formation;

  let lastFormation = formation;
  let countdown = formation ? formation.time : -1;
  let interval = -1;

  afterUpdate(() => {
    if (formation !== lastFormation) {
      countdown = formation.time;
      clearInterval(interval);
      interval = setInterval(() => {
        countdown--;
        if (countdown === 0) clearInterval(interval);
      }, 1000);
    }
    lastFormation = formation;
  });
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

<div class="countdown" style="font-size: {countdown < 0 ? 40 : 80}px">
  {countdown < 0 ? 'wait' : countdown}
</div>
