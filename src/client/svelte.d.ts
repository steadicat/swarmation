type GameProps = {
  countdown: number;
  formationName: string;
  formationMap: boolean[][];
  activeIds: string[];
  players: Player[];
  selfId: string;
  hasMoved: boolean;
  message?: string;
  scoreChanges: number[];
};

declare module '*/Game.svelte' {
  class Game {
    constructor(params: {target: HTMLElement; props?: GameProps});
    $set(props: Partial<GameProps>): void;
  }

  export default Game;
}
