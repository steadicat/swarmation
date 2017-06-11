import * as util from '../util';
import {Player} from './players';

const MAP = {};

export function set(x, y, v) {
  if (!MAP[x]) MAP[x] = {};
  MAP[x][y] = v;
}

export function get(x, y) {
  if (MAP[x]) return MAP[x][y];
}

export function unset(x, y, v) {
  if (MAP[x]) delete MAP[x][y];
}

export function move(x1, y1, x2, y2, v) {
  if (x1 !== x2 || y1 !== y2) {
    unset(x1, y1, v);
    set(x2, y2, v);
  }
}

export function exists(x, y) {
  if (!MAP[x]) return false;
  return MAP[x][y] !== undefined;
}

export function checkFormationAtOrigin(formation, x, y) {
  const players = [];
  const success = formation.points.every(point => {
    const player = get(x + point[0], y + point[1]);
    players.push(player);
    return !!player;
  });
  if (!success) return [];
  players.push(get(x, y));
  return players;
}

export function checkFormation(formation, players: {[id: string]: Player}): {[id: string]: Player} {
  const winners = {};
  for (const id in players) {
    const player = players[id];
    const f = checkFormationAtOrigin(formation, player.left, player.top);
    f.forEach(p => {
      // work around dirty map bug
      if (!p) return;
      winners[p.id] = p;
    });
  }
  return winners;
}
