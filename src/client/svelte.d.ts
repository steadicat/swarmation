declare module '*/Game.svelte' {
  type Props = {
    score: number;
    successRate: number;
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

  class Info {
    constructor(params: {target: HTMLElement; props?: Props});
    $set(props: Partial<Props>): void;
  }

  export default Info;
}
