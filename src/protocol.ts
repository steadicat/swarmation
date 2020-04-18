import {Player} from './player';

export type SaveData = {
  score: number;
  succeeded: number;
  total: number;
  name: string;
};

export type PlayerMessage = {type: 'player'; player: Player};
export type RestoreMessage = {type: 'restore'; data: string};

export type FlashMessage = {type: 'flash'; stop?: true};
export type LockInMessage = {type: 'lockIn'};

export type MoveMessage = {
  type: 'move';
  direction: 'up' | 'down' | 'left' | 'right';
  time: number;
};

export type PositionMessage = {
  type: 'position';
  id: string;
  left: number;
  top: number;
  time: number;
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
  save: string;
};

export type WelcomeMessage = {
  type: 'welcome';
  id: string;
  players: Player[];
};

export type RestartMessage = {
  type: 'restart';
};

export type IdleMessage = {type: 'idle'; id: string};
export type DisconnectedMessage = {type: 'disconnected'; id: string};
export type KickMessage = {type: 'kick'; reason: 'idle'};

type ClientMessage = FlashMessage | LockInMessage | MoveMessage | RestoreMessage;

type RelayedClientMessage = ClientMessage extends unknown
  ? Exclude<ClientMessage, MoveMessage | RestoreMessage> & {id: string}
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

export function clientEmit(socket: SocketIOClient.Socket, message: ClientMessage) {
  socket.send(message);
}

export function clientListen(
  socket: SocketIOClient.Socket,
  listener: (message: ServerMessage) => void
) {
  socket.on('message', listener);
}

export function serverListen(socket: SocketIO.Socket, listener: (message: ClientMessage) => void) {
  socket.on('message', listener);
}

export function serverEmit(socket: SocketIO.Socket | SocketIO.Namespace, message: ServerMessage) {
  socket.send(message);
}

export function serverBroadcast(socket: SocketIO.Socket, message: ServerMessage) {
  socket.broadcast.send(message);
}
