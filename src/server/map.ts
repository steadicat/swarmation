import {Formation} from '../formations';
import {Player} from './players';

const MAP: {[x: number]: {[y: number]: Player}} = {};

export function set(x: number, y: number, v: Player) {
  if (!MAP[x]) MAP[x] = {};
  MAP[x][y] = v;
}

export function get(x: number, y: number): Player | null {
  if (MAP[x]) return MAP[x][y];
  return null;
}

export function unset(x: number, y: number) {
  if (MAP[x]) delete MAP[x][y];
}

export function move(x1: number, y1: number, x2: number, y2: number, v: Player) {
  if (x1 !== x2 || y1 !== y2) {
    unset(x1, y1);
    set(x2, y2, v);
  }
}

export function exists(x: number, y: number) {
  if (!MAP[x]) return false;
  return MAP[x][y] !== undefined;
}

export function checkFormationAtOrigin(formation: Formation, x: number, y: number) {
  const players: Player[] = [];
  const success = formation.points.every(point => {
    const player = get(x + point[0], y + point[1]);
    players.push(player);
    return !!player;
  });
  if (!success) return [];
  players.push(get(x, y));
  return players;
}

export function checkFormation(formation: Formation, players: {[id: string]: Player}) {
  const winners: {[id: string]: Player} = {};
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