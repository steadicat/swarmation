export type InfoMessage = PlayerInfo;
export type FlashMessage = {id: string; stop?: true};
export type LockInMessage = {id: string; stop?: true};
export type IdleMessage = {id: string};
export type LoginMessage = {userId: string; token: string};
export type DisconnectMessage = {};
export type DisconnectedMessage = {id: string};

export type FullPlayerInfo = {
  id: string;
  left: number;
  top: number;
  name: string;
  score: number;
  total: number;
  succeeded: number;
  time?: number;
};
export type PartialPlayerInfo = {
  id: string;
  left: number;
  top: number;
  name: never;
  score: never;
  total: never;
  succeeded: never;
  time?: number;
};
export type PlayerInfo = FullPlayerInfo | PartialPlayerInfo;

export type NextFormationMessage = {
  formation: string;
  time: number;
  map: boolean[][];
  active: number;
};

export type FormationMessage = {
  formation: string;
  difficulty: number;
  gain: number;
  loss: number;
  ids: string[];
};

export type WelcomeMessage = {
  id: string;
  players: FullPlayerInfo[];
};
