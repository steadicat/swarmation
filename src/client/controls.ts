import {Player} from '../player';
import {directions, Direction} from './directions';

const MOVEMENT_RATE = 140;

const controls = {
  '38': 'up',
  '40': 'down',
  '37': 'left',
  '39': 'right',
} as const;

export function initializeControls(
  self: Player,
  {
    move,
    startFlash,
    stopFlash,
    lockIn,
  }: {
    move(direction: Direction, left: number, top: number): void;
    startFlash(): void;
    stopFlash(): void;
    lockIn(): void;
  }
) {
  const moveIntervals: {[key in Direction]?: number} = {};

  function moveHandler(direction: Direction) {
    if (self.lockedIn) return;
    const [left, top] = directions[direction](self.left, self.top);
    move(direction, left, top);
  }

  function startMove(direction: Direction) {
    if (moveIntervals[direction]) return;
    moveHandler(direction);
    moveIntervals[direction] = window.setInterval(() => {
      moveHandler(direction);
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

  let startX = 0;
  let startY = 0;

  document.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1) return;
    const {screenX, screenY} = event.touches[0];
    startX = screenX;
    startY = screenY;
  });

  document.addEventListener('touchmove', (event) => {
    if (event.touches.length !== 1) return;
    if (startX === 0 && startY === 0) return;
    const {screenX: endX, screenY: endY} = event.changedTouches[0];
    const dx2 = Math.pow(endX - startX, 2);
    const dy2 = Math.pow(endY - startY, 2);
    const distance = Math.sqrt(dx2 + dy2);
    if (distance < 10) return;

    if (dx2 >= dy2) {
      // horizontal
      if (endX > startX) {
        moveHandler('right');
      } else {
        moveHandler('left');
      }
    } else {
      // vertical
      if (endY > startY) {
        moveHandler('down');
      } else {
        moveHandler('up');
      }
    }
    startX = 0;
    startY = 0;
  });
}
