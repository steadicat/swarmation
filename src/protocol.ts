import type {Socket} from 'socket.io-client';
import type {Socket as ServerSocket, Namespace} from 'socket.io';

export type FlashMessage = {type: 'flash'; stop?: true};
export type LockInMessage = {type: 'lockIn'; stop?: true};
export type ProgressMessage = {type: 'progress'; progress: string};

export type PositionMessage = {
  type: 'position';
  left: number;
  top: number;
  time?: number;
};

export type NextFormationMessage = {
  type: 'nextFormation';
  formation: string;
  time: number;
  map: boolean[][];
  active: number;
};

export type FormationMessage = {
  type: 'formation';
  formation: string;
  difficulty: number;
  gain: number;
  loss: number;
  ids: string[];
};

export type WelcomeMessage = {
  type: 'welcome';
  id: string;
  positions: (PositionMessage & {id: string})[];
  scores: (ScoreMessage & {id: string})[];
};

export type ScoreMessage = {
  type: 'score';
  id: string;
  score: number;
  total: number;
  succeeded: number;
};

export type RestartMessage = {
  type: 'restart';
};

export type IdleMessage = {type: 'idle'; id: string};
export type DisconnectedMessage = {type: 'disconnected'; id: string};
export type KickMessage = {type: 'kick'; reason: 'idle'};

type ClientMessage = FlashMessage | LockInMessage | PositionMessage | ProgressMessage;

type RelayedClientMessage = ClientMessage extends unknown ? ClientMessage & {id: string} : never;

type ServerMessage =
  | RelayedClientMessage
  | WelcomeMessage
  | FormationMessage
  | NextFormationMessage
  | ScoreMessage
  | ProgressMessage
  | RestartMessage
  | KickMessage
  | IdleMessage
  | DisconnectedMessage;

export function clientEmit(socket: typeof Socket, message: ClientMessage) {
  socket.send(message);
}

export function clientListen(socket: typeof Socket, listener: (message: ServerMessage) => void) {
  socket.on('message', listener);
}

export function serverListen(socket: ServerSocket, listener: (message: ClientMessage) => void) {
  socket.on('message', listener);
}

export function serverEmit(socket: ServerSocket | Namespace, message: ServerMessage) {
  socket.send(message);
}

export function serverBroadcast(socket: ServerSocket, message: ServerMessage) {
  socket.broadcast.send(message);
}
