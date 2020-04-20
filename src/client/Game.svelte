<script>
  import Info from './Info.svelte';
  import Board from './Board.svelte';

  export let message = null;

  export let players = [];
  export let selfId = null;
  export let activeIds = [];
  export let hasMoved = false;

  export let score = 0;
  export let successRate = 100;
  export let countdown = -1;
  export let formationName = '\xa0';
  export let formationMap = [];

  export let scoreChanges = [];
</script>

<style>
:global(body) {
  font: 14px/20px 'Source Sans Pro', sans-serif;
  color: #024;
  background: #abbdd1;
  margin: 0;
  padding: 0;
}

:global(#game) {
  position: relative;
}

.message {
  padding: 200px 260px;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background-color: rgba(0,36,62,0.2);
  border-radius: 12px;
  font-weight: bold;
  text-align: center;
  position: absolute;
  color: #fff;
  font-size: 36px;
  line-height: 35px;
}
</style>

<Board {players} {selfId} {activeIds} {hasMoved} {scoreChanges} />
<Info {score} {successRate} {countdown} {formationName} {formationMap} />

{#if message}
<div class="message">{message}</div>
{/if}