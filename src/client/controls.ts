import {Player} from '../player';

const MOVEMENT_RATE = 140;
type Direction = 'left' | 'right' | 'up' | 'down';

const controls = {
  '38': 'up' as 'up',
  '40': 'down' as 'down',
  '37': 'left' as 'left',
  '39': 'right' as 'right',
};

const directions = {
  left(left: number, top: number): [number, number] {
    return [left - 1, top];
  },
  right(left: number, top: number): [number, number] {
    return [left + 1, top];
  },
  up(left: number, top: number): [number, number] {
    return [left, top - 1];
  },
  down(left: number, top: number): [number, number] {
    return [left, top + 1];
  },
};

export function initializeControls(
  self: Player,
  {
    move,
    startFlash,
    stopFlash,
    lockIn,
  }: {move(left: number, top: number): void; startFlash(): void; stopFlash(): void; lockIn(): void}
) {
  const moveIntervals: {[key in Direction]?: number} = {};

  function moveHandler(player: Player, direction: Direction) {
    if (player.lockedIn) return;
    const [left, top] = directions[direction](player.left, player.top);
    move(left, top);
  }

  function startMove(direction: Direction) {
    if (moveIntervals[direction]) return;
    moveHandler(self, direction);
    moveIntervals[direction] = window.setInterval(() => {
      moveHandler(self, direction);
    }, MOVEMENT_RATE);
  }

  function stopMove(direction: Direction) {
    if (moveIntervals[direction]) {
      clearInterval(moveIntervals[direction]);
      moveIntervals[direction] = undefined;
    }
  }

  document.addEventListener('keydown', (event: KeyboardEvent) => {
    const keyCode = (event.keyCode + '') as keyof typeof controls;
    if (controls[keyCode]) {
      startMove(controls[keyCode]);
      event.preventDefault();
    } else if (event.keyCode === 32) {
      // space
      event.preventDefault();
      startFlash();
    } else if (event.keyCode === 83) {
      // "s"
      event.preventDefault();
      lockIn();
    }
  });

  document.addEventListener('keyup', (event: KeyboardEvent) => {
    const keyCode = (event.keyCode + '') as keyof typeof controls;
    if (controls[keyCode]) {
      event.preventDefault();
      stopMove(controls[keyCode]);
    } else if (event.keyCode === 32) {
      // space
      event.preventDefault();
      stopFlash();
    }
  });
}
