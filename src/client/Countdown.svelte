<script lang="ts">
  import {countdown} from './countdown';

  export let formation;
  $: countdown.start(formation.time);
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

<svelte:options immutable={true} />
<div class="countdown" style="font-size: {$countdown < 0 ? 40 : 80}px">
  {$countdown < 0 ? 'wait' : $countdown}
</div>
