<svelte:options immutable={true} />

<script lang="ts">
  import {Formation} from '../formations';
  import {countdown} from './countdown';

  export let formation: Pick<Formation, 'time'>;
  $: countdown.start(formation.time);
</script>

<div class="countdown" style="font-size: {$countdown < 0 ? 40 : 80}px">
  {$countdown < 0 ? 'wait' : $countdown}
</div>

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
