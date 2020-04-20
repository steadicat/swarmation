<script>
export let player;
export let left;
export let top;

function successRate({total, succeeded}) {
  if (total === 0) return 100;
  return Math.round((1000.0 * succeeded) / total) / 10;
}
</script>

<style>
.tooltip {
  transform: translate(-50%, -100%);
  z-index: 1;
  background: #fff;
  transition: left 0.1s ease-in-out, top 0.1s ease-in-out;
  position: absolute;
  text-align: center;
  border-radius: 3px;
  box-shadow: rgba(0,36,62,0.2) 2px 2px 0px;
  border: 1px solid #798796;
  display: inline-block;
  vertical-align: top;
  padding: 5px;
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

.name {
  font-weight: bold;
  font-size: 16px;
  line-height: 20px;
  margin: 0;
  padding: 0;
  margin-bottom: 5px;
}

.number {
  font-size: 24px;
  line-height: 24px;
  font-weight: bold;
}

.flex {
  display: flex;
}

.col {
  flex-basis: 0;
  flex: 1;
}
</style>

<div class="tooltip" style="left: {left + 6}px; top: {top - 14}px">
  <h3 class="name">{player.name}</h3>
  <div class="flex">
    <div class="col" style="margin-right: 5px; opacity: 0.7">
      <div class="number">{player.score}</div>
      points
    </div>
    <div class="col" style="opacity: 0.5">
      <div class="number">{successRate(player)}%</div>
      success
    </div>
  </div>
</div>

