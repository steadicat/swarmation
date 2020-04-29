export type GameProps = {
  players: readonly Readonly<Player>[];
  selfID: number | null;

  formation: Readonly<{time: number; name: string; map: boolean[][]}>;
  activeIds: readonly number[];
  scoreChanges: readonly number[];

  hasMoved: boolean;
  message: string | null;
};

class Game {
  constructor(params: {target: HTMLElement; props?: GameProps});
  $set(props: Partial<GameProps>): void;
}

export default Game;
