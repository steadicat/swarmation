export enum Direction {
  Up,
  Down,
  Left,
  Right,
}

export const directions = {
  [Direction.Up]: (left: number, top: number): [number, number] => [left, top - 1],
  [Direction.Down]: (left: number, top: number): [number, number] => [left, top + 1],
  [Direction.Left]: (left: number, top: number): [number, number] => [left - 1, top],
  [Direction.Right]: (left: number, top: number): [number, number] => [left + 1, top],
};
