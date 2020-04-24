type GameProps = {
  players: Player[];
  self: Player | null;

  formation: {time: number; name: string; map: boolean[][]};
  activeIds: string[];
  scoreChanges: number[];

  hasMoved: boolean;
  connected: boolean;
  kickedOut: boolean;
  message: string | null;
};

declare module '*/Game.svelte' {
  class Game {
    constructor(params: {target: HTMLElement; props?: GameProps});
    $set(props: Partial<GameProps>): void;
  }

  export default Game;
}
