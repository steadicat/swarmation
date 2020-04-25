import type * as ServerWebSocket from 'ws';

import {Direction} from './client/directions';

export type SaveData = {
  score: number;
  succeeded: number;
  total: number;
  name: string;
};

export enum MessageType {
  Welcome,
  Restore,
  Player,
  Move,
  Flash,
  LockIn,
  Position,
  Formation,
  NextFormation,
  Restart,
  Idle,
  Disconnected,
  Kick,
}

export type PlayerMessage = {type: MessageType.Player; player: Player};
export type RestoreMessage = {type: MessageType.Restore; data: string};

export type FlashMessage = {type: MessageType.Flash; stop?: true};
export type LockInMessage = {type: MessageType.LockIn};

export type MoveMessage = {
  type: MessageType.Move;
  direction: Direction;
  time: number;
};

export type PositionMessage = {
  type: MessageType.Position;
  id: number;
  left: number;
  top: number;
  time: number;
};

export type NextFormationMessage = {
  type: MessageType.NextFormation;
  formation: string;
  time: number;
  map: boolean[][];
  active: number;
};

export type FormationMessage = {
  type: MessageType.Formation;
  formation: string;
  difficulty: number;
  gain: number;
  loss: number;
  ids: number[];
  save: string;
};

export type WelcomeMessage = {
  type: MessageType.Welcome;
  id: number;
  players: Player[];
};

export type RestartMessage = {type: MessageType.Restart};

export type IdleMessage = {type: MessageType.Idle; id: number};
export type DisconnectedMessage = {type: MessageType.Disconnected; id: number};
export type KickMessage = {type: MessageType.Kick; reason: 'idle'};

type ClientMessage = FlashMessage | LockInMessage | MoveMessage | RestoreMessage;

type RelayedClientMessage = ClientMessage extends unknown
  ? Exclude<ClientMessage, MoveMessage | RestoreMessage> & {id: number}
  : never;

type ServerMessage =
  | RelayedClientMessage
  | WelcomeMessage
  | FormationMessage
  | NextFormationMessage
  | PlayerMessage
  | PositionMessage
  | RestartMessage
  | KickMessage
  | IdleMessage
  | DisconnectedMessage;

export function clientListen(
  socket: WebSocket | ServerWebSocket,
  listener: (message: ServerMessage) => void
) {
  (socket as WebSocket).addEventListener('message', (event) =>
    listener(JSON.parse(event.data) as ServerMessage)
  );
}

export function clientSend(socket: WebSocket | ServerWebSocket, message: ClientMessage) {
  socket.send(JSON.stringify(message));
}

export function serverListen(socket: ServerWebSocket, listener: (message: ClientMessage) => void) {
  socket.addEventListener('message', (event) => listener(JSON.parse(event.data) as ClientMessage));
}

export function serverSend(sockets: ServerWebSocket[], message: ServerMessage) {
  for (const socket of sockets) {
    socket.send(JSON.stringify(message));
  }
}
