import {DisconnectedMessage, IdleMessage, PlayerInfo} from '../types';
import * as map from './map';

const MAX_IDLE = 120;
const IDLE_AFTER_TURNS = 2;

export const PLAYERS: {[id: string]: Player} = {};

export class Player {
  public id: string;
  public client: SocketIO.Socket | null;
  private active: boolean;
  public userId: string;
  private idleTurns = 0;
  private succeeded: number;
  private name: string;
  public score: number;
  public left: number;
  public top: number;
  private total: number;

  constructor(id: string, client?: SocketIO.Socket) {
    this.id = id;
    this.client = client;
  }

  static get(client: SocketIO.Socket) {
    if (!PLAYERS[client.id]) PLAYERS[client.id] = new Player(client.id, client);
    return PLAYERS[client.id];
  }

  static byId(id: string) {
    return PLAYERS[id];
  }

  static getList(): PlayerInfo[] {
    const list = [];
    for (const id in PLAYERS) {
      list.push(PLAYERS[id].getInfo());
    }
    return list;
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

  static endTurn() {
    for (const id in PLAYERS) PLAYERS[id].endTurn();
  }

  setInfo(info: PlayerInfo) {
    const top = this.top;
    const left = this.left;
    for (const key in info) {
      const k = key as keyof typeof info;
      if (k === 'id') continue;
      if (k === 'time') continue;
      if (info[k] !== undefined && info[k] !== null) this[k] = info[k];
    }
    map.move(left, top, this.left, this.top, this);
  }

  getInfo(): PlayerInfo {
    return {
      id: this.id,
      left: this.left,
      top: this.top,
      name: this.name,
      score: this.score,
      total: this.total,
      succeeded: this.succeeded,
    };
  }

  setActive() {
    this.active = true;
  }

  endTurn() {
    if (this.active) {
      this.idleTurns = 0;
    } else {
      if (this.idleTurns === IDLE_AFTER_TURNS) {
        this.client.emit('idle', {id: this.id} as IdleMessage);
        this.client.broadcast.emit('idle', {id: this.id} as IdleMessage);
      }
      this.idleTurns++;
      if (this.idleTurns > MAX_IDLE) this.kick();
    }
    this.active = false;
  }

  login(userId: string, _token: string) {
    this.userId = userId;
  }

  disconnect(sockets: SocketIO.Namespace) {
    sockets.emit('disconnected', {id: this.id} as DisconnectedMessage);
    delete PLAYERS[this.id];
  }

  kick() {
    this.client.emit('kick', {reason: 'idle'});
    this.client.broadcast.emit('disconnected', {id: this.id});
    this.client.disconnect(true);
    delete PLAYERS[this.id];
  }
}
