import {Direction} from './directions';

const MOVEMENT_RATE = 140;

export function initializeControls({
  move,
  startFlash,
  stopFlash,
  lockIn,
}: {
  move(direction: Direction): void;
  startFlash(): void;
  stopFlash(): void;
  lockIn(): void;
}) {
  const moveIntervals: {[key in Direction]?: number} = {};

  function startMove(direction: Direction) {
    if (moveIntervals[direction] !== undefined) return;
    move(direction);
    moveIntervals[direction] = window.setInterval(() => {
      move(direction);
    }, MOVEMENT_RATE);
  }

  function stopMove(direction: Direction) {
    if (moveIntervals[direction] !== undefined) {
      clearInterval(moveIntervals[direction]);
      moveIntervals[direction] = undefined;
    }
  }
  function stopAllMoves() {
    stopMove(Direction.Up);
    stopMove(Direction.Down);
    stopMove(Direction.Left);
    stopMove(Direction.Right);
  }

  document.addEventListener('keydown', (event: KeyboardEvent) => {
    switch (event.keyCode) {
      case 38: // up
        event.preventDefault();
        startMove(Direction.Up);
        break;
      case 40: // down
        event.preventDefault();
        startMove(Direction.Down);
        break;
      case 37: // left
        event.preventDefault();
        startMove(Direction.Left);
        break;
      case 39: // right
        event.preventDefault();
        startMove(Direction.Right);
        break;
      case 32: // space
        event.preventDefault();
        startFlash();
        break;
      case 83: // s
        event.preventDefault();
        lockIn();
        break;
    }
  });

  document.addEventListener('keyup', (event: KeyboardEvent) => {
    switch (event.keyCode) {
      case 38: // up
        event.preventDefault();
        stopMove(Direction.Up);
        break;
      case 40: // down
        event.preventDefault();
        stopMove(Direction.Down);
        break;
      case 37: // left
        event.preventDefault();
        stopMove(Direction.Left);
        break;
      case 39: // right
        event.preventDefault();
        stopMove(Direction.Right);
        break;
      case 32: // space
        event.preventDefault();
        stopFlash();
        break;
    }
  });

  window.addEventListener('blur', () => {
    stopAllMoves();
  });

  let startX = 0;
  let startY = 0;
  let tick = 0;

  // TODO: this should probably be time-based
  const swipeThresholds = [
    12, // short swipe to start
    48, // long swipe to trigger continuous movement
    24, // medium ticks thereafter
  ];

  document.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1) return;
    const {screenX, screenY} = event.touches[0];
    startX = screenX;
    startY = screenY;
  });

  document.addEventListener('touchmove', (event) => {
    if (event.touches.length !== 1) return;
    if (startX === 0 && startY === 0) return;
    const {screenX: endX, screenY: endY} = event.touches[0];
    const dx2 = Math.pow(endX - startX, 2);
    const dy2 = Math.pow(endY - startY, 2);
    const distance = Math.sqrt(dx2 + dy2);
    if (distance < swipeThresholds[tick]) return;

    if (dx2 >= dy2) {
      // horizontal
      if (endX > startX) {
        move(Direction.Right);
      } else {
        move(Direction.Left);
      }
    } else {
      // vertical
      if (endY > startY) {
        move(Direction.Down);
      } else {
        move(Direction.Up);
      }
    }

    startX = endX;
    startY = endY;
    tick = tick < swipeThresholds.length - 1 ? tick + 1 : tick;
  });

  document.addEventListener('touchend', () => {
    startX = 0;
    startY = 0;
    tick = 0;
  });
}
