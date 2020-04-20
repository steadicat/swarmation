import {Formation} from './formations';
import {Player} from './player';

const MAP: {[x: number]: {[y: number]: Player | undefined}} = {};

export function set(x: number, y: number, v: Player) {
  if (!MAP[x]) MAP[x] = {};
  MAP[x][y] = v;
}

export function get(x: number, y: number): Player | null {
  if (MAP[x]) return MAP[x][y] ?? null;
  return null;
}

export function unset(x: number, y: number) {
  if (MAP[x]) delete MAP[x][y];
}

export function exists(x: number, y: number) {
  if (!MAP[x]) return false;
  return MAP[x][y] !== undefined;
}

export function isValidMove(x1: number, y1: number, x2: number, y2: number, v: Player) {
  if (x1 === x2 && y1 === y2) return false;
  if (exists(x2, y2)) return false;
  if (get(x1, y1) !== v) return false;
  return true;
}

export function move(x1: number, y1: number, x2: number, y2: number, v: Player) {
  if (!isValidMove(x1, y1, x2, y2, v)) return false;
  unset(x1, y1);
  set(x2, y2, v);
  return true;
}

export function clear() {
  for (const key of Object.keys(MAP)) {
    delete MAP[(key as unknown) as number];
  }
}

export function checkFormationAtOrigin(formation: Formation, x: number, y: number) {
  const players: Player[] = [];
  const success = formation.points.every((point) => {
    const player = get(x + point[0], y + point[1]);
    player && players.push(player);
    return !!player;
  });
  if (!success) return [];
  const player = get(x, y);
  player && players.push(player);
  return players;
}

export function checkFormation(formation: Formation, players: {[id: string]: Player}) {
  const winners: {[id: string]: Player} = {};
  for (const id in players) {
    const player = players[id];
    const f =
      player.left && player.top ? checkFormationAtOrigin(formation, player.left, player.top) : [];
    f.forEach((p) => {
      // work around dirty map bug
      if (!p) return;
      winners[p.id] = p;
    });
  }
  return winners;
}
