import NodeWebSocket from 'ws';
import type {Direction} from './client/directions.js';

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
  StartFlash,
  StopFlash,
  LockIn,
  Position,
  Formation,
  Restart,
  Idle,
  Disconnected,
  Kick,
  Subscribe,
}

type ClientMessage =
  | [MessageType.StartFlash]
  | [MessageType.StopFlash]
  | [MessageType.LockIn]
  | [MessageType.Move, Direction, /* time */ number]
  | [MessageType.Restore, string]
  | [MessageType.Subscribe, string];

type ServerMessage =
  // Relayed client messages
  | [MessageType.StartFlash, number]
  | [MessageType.StopFlash, number]
  | [MessageType.LockIn, number]

  // Server-sent messages
  | [
      MessageType.Welcome,
      /* id */ number,
      /* players */ Player[],
      /* formation */ string,
      /* time */ number,
      /* map */ boolean[][]
    ]
  | [MessageType.Player, Player]
  | [MessageType.Position, /* id */ number, /* left */ number, /* top */ number, /* time */ number]
  | [
      MessageType.Formation,
      /* gain */ number,
      /* loss */ number,
      /* ids */ number[],
      /* save */ string,
      /* name */ string,
      /* time */ number,
      /* map */ boolean[][]
    ]
  | [MessageType.Restart]
  | [MessageType.Kick, /* reason */ 'idle']
  | [MessageType.Idle, /* id */ number]
  | [MessageType.Disconnected, /* id */ number];

export function clientListen(
  socket: WebSocket | NodeWebSocket,
  listener: (message: ServerMessage) => void
) {
  (socket as WebSocket).addEventListener('message', (event) =>
    listener(JSON.parse(event.data) as ServerMessage)
  );
}

export function clientSend(socket: WebSocket | NodeWebSocket, message: ClientMessage) {
  socket.send(JSON.stringify(message));
}

export function serverListen(socket: NodeWebSocket, listener: (message: ClientMessage) => void) {
  socket.addEventListener('message', (event) =>
    listener(JSON.parse(event.data.toString()) as ClientMessage)
  );
}

export function serverSend(sockets: NodeWebSocket[], message: ServerMessage) {
  for (const socket of sockets) {
    socket.send(JSON.stringify(message));
  }
}
