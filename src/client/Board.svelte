<script>
  export let players = [];
  export let selfId = null;
  export let activeIds = [];
</script>


  <!-- el.addEventListener('mouseover', () => {
    showTooltip(player, getScreenPosition(player));
  });
  el.addEventListener('mouseout', () => hideTooltip());
  return el; -->


{#each players as player}
<div
  class="player {player.id === selfId ? 'self' : ''} {player.flashing ? 'flash' : ''} {player.lockedIn ? 'locked-in' : ''} {player.active ? '' : 'idle'} {activeIds.includes(player.id) ? 'active' : ''}"
  style="left: {player.left * 10 + 1}px; top: {player.top * 10 + 1}px"
/>
{/each}