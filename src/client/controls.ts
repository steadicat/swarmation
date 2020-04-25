import {Direction} from './directions';

const MOVEMENT_RATE = 140;

export function initializeControls(
  self: Player,
  {
    move,
    startFlash,
    stopFlash,
    lockIn,
  }: {
    move(direction: Direction): void;
    startFlash(): void;
    stopFlash(): void;
    lockIn(): void;
  }
) {
  const moveIntervals: {[key in Direction]?: number} = {};

  function moveHandler(direction: Direction) {
    if (self.lockedIn) return;
    move(direction);
  }

  function startMove(direction: Direction) {
    if (moveIntervals[direction] !== undefined) return;
    moveHandler(direction);
    moveIntervals[direction] = window.setInterval(() => {
      moveHandler(direction);
    }, MOVEMENT_RATE);
  }

  function stopMove(direction: Direction) {
    if (moveIntervals[direction] !== undefined) {
      clearInterval(moveIntervals[direction]);
      moveIntervals[direction] = undefined;
    }
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
    const {screenX: endX, screenY: endY} = event.touches[0];
    const dx2 = Math.pow(endX - startX, 2);
    const dy2 = Math.pow(endY - startY, 2);
    const distance = Math.sqrt(dx2 + dy2);
    if (distance < 10) return;

    if (dx2 >= dy2) {
      // horizontal
      if (endX > startX) {
        moveHandler(Direction.Right);
      } else {
        moveHandler(Direction.Left);
      }
    } else {
      // vertical
      if (endY > startY) {
        moveHandler(Direction.Down);
      } else {
        moveHandler(Direction.Up);
      }
    }
    startX = 0;
    startY = 0;
  });
}
