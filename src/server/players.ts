import * as map from './map';

const MAX_IDLE = 120;
const IDLE_AFTER_TURNS = 2;

export const PLAYERS = {};

export class Player {
  id: string;
  client: {
    emit: (event: string, payload: object) => void;
    broadcast: {
      emit: (event: string, payload: object) => void;
    };
    connection: {
      end: () => void;
    };
  }; // TODO
  active: boolean;
  userId: string;
  idleTurns = 0;
  succeeded: boolean;
  name: string;
  score: number;
  left: number;
  top: number;
  token: string;
  total: number;

  constructor(client) {
    this.id = client.id;
    this.client = client;
  }

  static get(client) {
    if (!PLAYERS[client.id]) PLAYERS[client.id] = new Player(client);
    return PLAYERS[client.id];
  }

  static byId(id) {
    return PLAYERS[id];
  }

  static getList() {
    const list = [];
    for (const id in PLAYERS) {
      list.push(PLAYERS[id].getInfo());
    }
    return list;
  }

  static getActive() {
    let n = 0;
    for (const id in PLAYERS) {
      if (!PLAYERS[id].idleTurns) n++;
    }
    return n;
  }

  static endTurn() {
    for (const id in PLAYERS) PLAYERS[id].endTurn();
  }

  setInfo(info) {
    const top = this.top;
    const left = this.left;
    for (const key in info) {
      if (key === 'id') continue;
      if (info[key] !== undefined && info[key] !== null) this[key] = info[key];
    }
    map.move(left, top, this.left, this.top, this);
  }

  getInfo() {
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
        this.client.emit('idle', {id: this.id});
        this.client.broadcast.emit('idle', {id: this.id});
      }
      this.idleTurns++;
      if (this.idleTurns > MAX_IDLE) this.kick();
    }
    this.active = false;
  }

  login(userId, token) {
    this.userId = userId;
    this.token = token;
  }

  disconnect(sockets) {
    sockets.emit('disconnected', {id: this.id});
    delete PLAYERS[this.id];
  }

  kick() {
    this.client.emit('kick', {reason: 'idle'});
    this.client.broadcast.emit('disconnected', {id: this.id});
    this.client.connection && this.client.connection.end();
    delete PLAYERS[this.id];
  }
}
