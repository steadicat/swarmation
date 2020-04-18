import {Player} from '../player';

let tooltip: HTMLElement | null = null;

function successRate({total, succeeded}: Player) {
  if (total === 0) return 100;
  return Math.round((1000.0 * succeeded) / total) / 10;
}

export function showTooltip(player: Player, [left, top]: [number, number]) {
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'tooltip pas';
    document.body.appendChild(tooltip);
  }
  tooltip.innerHTML = `
    <h3 class="b medium mbs">${player.name}</h3>
    <div class="col mrs light">
        <div class="large b">${player.score}</div> points
    </div>
    <div class="col dim">
        <div class="large b">${successRate(player)}%</div> success
    </div>
    `;
  tooltip.style.left = left - tooltip.offsetWidth / 2 + 5 + 'px';
  tooltip.style.top = top - tooltip.offsetHeight - 15 + 'px';
}

export function hideTooltip() {
  if (!tooltip) return;
  tooltip.parentNode?.removeChild(tooltip);
  tooltip = null;
}
