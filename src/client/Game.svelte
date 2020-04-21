<script>
  import Board from './Board.svelte';
  import Formation from './Formation.svelte';
  import Countdown from './Countdown.svelte';
  import Score from './Score.svelte';
  import SuccessRate from './SuccessRate.svelte';

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

:global(html, body, h1, h2, h3, h4, p) {
  margin: 0;
  padding: 0;
}

:global(html) {
  min-height: 100%;
}

:global(body) {
  overflow: hidden;
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex: 1;
  font: 14px/20px 'Source Sans Pro', sans-serif;
  color: #024;
  background: #abbdd1;
}

:global(#game) {
  position: relative;
  flex: 1;
  background: #eee;
  display: flex;
}

h1 {
  font-family: 'Lobster';
  position: absolute;
  top: 25px;
  left: 0;
  right: 0;
  font-size: 40px;
  color: #fff;
  text-shadow: #abbdd1 1px 1px 0px;
  text-align: center;
}

.message {
  padding: 20px;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background-color: rgba(0,36,62,0.2);
  font-weight: bold;
  position: absolute;
  color: #fff;
  font-size: 36px;
  line-height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding-bottom: 40px;
}

.inner {
  max-width: 16em;
}
</style>

<Board {players} {selfId} {activeIds} {hasMoved} {scoreChanges} />

<h1>Swarmation</h1>

<Formation {formationName} {formationMap} />
<Countdown {countdown} />
<Score {score} />
<SuccessRate {successRate} />

{#if message}
  <div class="message">
    <div class="inner">{message}</div>
  </div>
{/if}