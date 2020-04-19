<script>
export let player;

function successRate({total, succeeded}) {
  if (total === 0) return 100;
  return Math.round((1000.0 * succeeded) / total) / 10;
}
</script>

<style>
.tooltip {
  transform: translate(-50%, -100%);
  z-index: 1;
  background: #fff
}

.tooltip:after {
  background: url(/images/tip.png) no-repeat center center;
  content: " ";
  width: 24px;
  height: 10px;
  position: absolute;
  bottom: -10px;
  left: 50%;
  margin-left: -12px;
}

.large {
  font-size: 24px;
  line-height: 25px;
}

.flex {
  display: flex;
}

.col {
  flex-basis: 0;
  flex: 1;
}
</style>

<div class="tooltip pas" style="left: {player.left * 10 + 6}px; top: {player.top * 10 - 14}px">
  <h3 class="b medium mbs">{player.name}</h3>
  <div class="flex">
    <div class="col mrs light">
      <div class="large b">{player.score}</div> points
    </div>
    <div class="col dim">
      <div class="large b">{successRate(player)}%</div> success
    </div>
  </div>
</div>

