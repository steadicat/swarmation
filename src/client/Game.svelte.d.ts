export type GameProps = {
  players: Player[];
  self: Player | null;

  formation: {time: number; name: string; map: boolean[][]};
  activeIds: number[];
  scoreChanges: number[];

  hasMoved: boolean;
  kickedOut: boolean;
  message: string | null;
};

class Game {
  constructor(params: {target: HTMLElement; props?: GameProps});
  $set(props: Partial<GameProps>): void;
}

export default Game;
