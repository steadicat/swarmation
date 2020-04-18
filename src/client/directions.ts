export type Direction = 'left' | 'right' | 'up' | 'down';

export const directions = {
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
