export type Player = {
  id: string;
  active: boolean;
  lockedIn: boolean;
  flashing: boolean;
  name: string;
  idleTurns: number;
  succeeded: number;
  total: number;
  score: number;
  left: number;
  top: number;
};
