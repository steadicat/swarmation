import * as map from './map';
import {sign} from './signing';
import {serverEmit, serverBroadcast, PositionMessage, ScoreMessage} from '../protocol';

const MAX_IDLE = 120;
const IDLE_AFTER_TURNS = 2;

export const PLAYERS: {[id: string]: Player} = {};

export class Player {
  public id: string;
  public client: SocketIO.Socket;
  private active: boolean | null = null;
  public name: string | null = null;
  private idleTurns = 0;
  private succeeded = 0;
  private total = 0;
  public score = 0;
  public left: number | null = null;
  public top: number | null = null;

  constructor(id: string, client: SocketIO.Socket) {
    this.id = id;
    this.client = client;
  }

  static get(client: SocketIO.Socket) {
    if (!PLAYERS[client.id]) PLAYERS[client.id] = new Player(client.id, client);
    return PLAYERS[client.id];
  }

  static getCount(): number {
    return Object.keys(PLAYERS).length;
  }

  static getActive(): number {
    let n = 0;
    for (const id in PLAYERS) {
      if (!PLAYERS[id].idleTurns) n++;
    }
    return n;
  }

  setPosition(message: Omit<PositionMessage, 'type'>) {
    const top = this.top;
    const left = this.left;
    this.left = message.left;
    this.top = message.top;
    map.move(left, top, this.left, this.top, this);
  }

  getPosition(): PositionMessage & {id: string} {
    if (this.left === null) throw new Error('Player not positioned');
    if (this.top === null) throw new Error('Player not positioned');
    return {
      type: 'position',
      id: this.id,
      left: this.left,
      top: this.top,
    };
  }

  getScore(): ScoreMessage & {id: string} {
    return {
      type: 'score',
      id: this.id,
      score: this.score,
      total: this.total,
      succeeded: this.succeeded,
    };
  }

  setActive() {
    this.active = true;
  }

  endTurn() {
    serverEmit(this.client, {
      type: 'progress',
      progress: sign({score: this.score, succeeded: this.succeeded, total: this.total}),
    });
    if (this.active) {
      this.idleTurns = 0;
    } else {
      if (this.idleTurns === IDLE_AFTER_TURNS) {
        serverEmit(this.client, {type: 'idle', id: this.id});
        serverEmit(this.client.broadcast, {type: 'idle', id: this.id});
      }
      this.idleTurns++;
      if (this.idleTurns > MAX_IDLE) this.kick();
    }
    this.active = false;
  }

  disconnect(sockets: SocketIO.Namespace) {
    serverEmit(sockets, {type: 'disconnected', id: this.id});
    delete PLAYERS[this.id];
  }

  kick() {
    serverEmit(this.client, {type: 'kick', reason: 'idle'});
    serverBroadcast(this.client, {type: 'disconnected', id: this.id});
    this.client.disconnect(true);
    delete PLAYERS[this.id];
  }
}
