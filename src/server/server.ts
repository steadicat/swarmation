import Bugsnag from '@bugsnag/js';
import BugsnagPluginExpress from '@bugsnag/plugin-express';
import * as express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';

import {directions} from '../client/directions';
import {getFormations} from '../formations';
import * as map from '../map';
import {serverListen, serverSend, MessageType} from '../protocol';
import {validate, sign} from './signing';

if (process.env.NODE_ENV === 'production') {
  Bugsnag.start({
    apiKey: '598a6c87f69350bfffd18829c6e8a87c',
    plugins: [BugsnagPluginExpress],
    // @ts-expect-error
    onUncaughtException(e: Error) {
      console.log(e.stack);
    },
  });
}

const NAMES = [
  'Saber',
  'Tooth',
  'Moose',
  'Lion',
  'Peanut',
  'Jelly',
  'Thyme',
  'Zombie',
  'Cranberry',
  'Pipa',
  'Walnut',
  'Puddle',
  'Ziya',
  'Key',
];

const MAX_POINTS = 26;
const MAX_IDLE = 120;
const IDLE_AFTER_TURNS = 2;

const CLIENTS: {[id: string]: WebSocket | undefined} = {};

const formations = Object.values(getFormations());

// Configuration

const app = express();

let middleware;

if (process.env.NODE_ENV === 'production') {
  middleware = Bugsnag.getPlugin('express');
  app.use(middleware.requestHandler);
}

const server = http.createServer(app);
const wss = new WebSocket.Server({server, path: '/ws'});

app.use('/', express.static('public'));

// Routes

// Error Handling

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error | null, _: express.Request, res: express.Response, _next: unknown) => {
  err && Bugsnag.notify(err);
  res.status(500).send('Something broke!');
});

if (process.env.NODE_ENV === 'production') {
  app.use(middleware.errorHandler);
}

function shutdown() {
  serverSend(Object.values(CLIENTS) as WebSocket[], [MessageType.Restart]);
  setTimeout(() => {
    process.exit();
  }, 2000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGHUP', shutdown);

export const PLAYERS: {[id: number]: Player | undefined} = {};

function getActivePlayers(): number {
  let n = 0;
  for (const player of Object.values(PLAYERS) as Player[]) {
    if (player.active) n++;
  }
  return n;
}

function placePlayer(numberOfPlayers: number): [number, number] {
  // Enough room around the center for 4x the number of players
  const radius = Math.ceil(4 * Math.sqrt(numberOfPlayers / Math.PI));
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.random() * radius;
  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance;
  return [Math.round(x), Math.round(y)];
}

function pickFormation() {
  const active = Math.max(2, getActivePlayers());
  const available = formations.filter(({size}) => size <= active);
  if (available.length === 0) return formations[0];
  return available[Math.floor(Math.random() * available.length)];
}

let nextFormation = pickFormation();
let nextFormationTimestamp = Date.now() + nextFormation.time * 1000;

// IO

let nextId = 0;

wss.on('connection', (client) => {
  const id = ++nextId;
  let left;
  let top;
  do {
    [left, top] = placePlayer(Object.keys(PLAYERS).length);
  } while (map.exists(left, top));

  const name = NAMES[Math.floor(Math.random() * NAMES.length)];

  const player = {
    id,
    left,
    top,
    name,
    active: true,
    flashing: false,
    lockedIn: false,
    idleTurns: 0,
    succeeded: 0,
    total: 0,
    score: 0,
  };
  PLAYERS[id] = player;
  CLIENTS[id] = client;
  map.set(left, top, player);

  serverSend([client], [MessageType.Welcome, id, Object.values(PLAYERS) as Player[]]);
  serverSend(Object.values(CLIENTS).filter((c) => c !== client) as WebSocket[], [
    MessageType.Player,
    player,
  ]);

  serverSend(
    [client],
    [
      MessageType.Formation,
      0,
      0,
      [],
      '',
      nextFormation.name,
      (nextFormationTimestamp - Date.now()) / 1000,
      nextFormation.map,
    ]
  );

  client.on('close', () => {
    delete CLIENTS[player.id];
    if (PLAYERS[player.id]) {
      map.unset(PLAYERS[player.id]!.left, PLAYERS[player.id]!.top);
      delete PLAYERS[player.id];
    }
    serverSend(Object.values(CLIENTS) as WebSocket[], [MessageType.Disconnected, id]);
  });

  serverListen(client, (message) => {
    switch (message[0]) {
      case MessageType.Restore: {
        const [, data] = message;
        const saveData = validate(data) as {
          name: string;
          score: number;
          succeeded: number;
          total: number;
        } | null;

        if (saveData) {
          const {score, succeeded, total, name} = saveData;
          player.score += score;
          player.succeeded += succeeded;
          player.total += total;
          player.name = name;
          serverSend(Object.values(CLIENTS) as WebSocket[], [MessageType.Player, player]);
        }
        break;
      }

      case MessageType.Move: {
        const {left, top, id} = player;
        const [, direction, time] = message;
        const [newLeft, newTop] = directions[direction](left, top);
        player.active = true;
        const moved = map.move(left, top, newLeft, newTop, player);
        if (moved) {
          player.left = newLeft;
          player.top = newTop;
        }
        serverSend(Object.values(CLIENTS) as WebSocket[], [
          MessageType.Position,
          id,
          player.left,
          player.top,
          time,
        ]);
        break;
      }

      case MessageType.StartFlash: {
        serverSend(Object.values(CLIENTS).filter((c) => c !== client) as WebSocket[], [
          MessageType.StartFlash,
          player.id,
        ]);
        break;
      }

      case MessageType.StopFlash: {
        serverSend(Object.values(CLIENTS).filter((c) => c !== client) as WebSocket[], [
          MessageType.StopFlash,
          player.id,
        ]);
        break;
      }

      case MessageType.LockIn: {
        player.lockedIn = true;
        serverSend(Object.values(CLIENTS).filter((c) => c !== client) as WebSocket[], [
          MessageType.LockIn,
          player.id,
        ]);
        break;
      }

      default:
        throw new Error(
          `Message type ${
            // @ts-expect-error
            message.type
          } not implemented`
        );
    }
  });
});

// Formation countdown

function endTurn() {
  const successfulPlayers = map.checkFormation(nextFormation, Object.values(PLAYERS) as Player[]);
  const successfulIds = successfulPlayers.map((player) => player.id);
  const gain = nextFormation.time;
  const loss = Math.round((MAX_POINTS - nextFormation.time) / 4);
  const playerCount = Object.keys(PLAYERS).length;
  nextFormation = pickFormation();
  console.log(
    `Formation ${nextFormation.name} completed with ${
      successfulPlayers.length
    } participants. Starting next turn with ${playerCount} players (${getActivePlayers()} active). Next formation in ${
      nextFormation.time
    }s is ${nextFormation.name} of size ${nextFormation.size}.`
  );

  for (const player of Object.values(PLAYERS) as Player[]) {
    player.total++;
    player.lockedIn = false;
    if (successfulIds.indexOf(player.id) >= 0) {
      player.succeeded++;
      player.active = true;
      player.score += gain;
      player.idleTurns = 0;
    } else {
      player.score = Math.max(0, player.score - loss);
    }
    const client = CLIENTS[player.id];
    if (!client) {
      console.warn(`Client for player ${player.id} not found`);
      continue;
    }
    serverSend(
      [client],
      [
        MessageType.Formation,
        gain,
        loss,
        successfulIds,
        sign({
          score: player.score,
          succeeded: player.succeeded,
          total: player.total,
          name: player.name,
        }),
        nextFormation.name,
        nextFormation.time,
        nextFormation.map,
      ]
    );

    if (!player.active) {
      player.idleTurns++;
      if (player.idleTurns === IDLE_AFTER_TURNS) {
        player.active = false;
        serverSend(Object.values(CLIENTS) as WebSocket[], [MessageType.Idle, player.id]);
      }
      if (player.idleTurns > MAX_IDLE) {
        serverSend([client], [MessageType.Kick, 'idle']);
        serverSend(Object.values(CLIENTS).filter((c) => c !== client) as WebSocket[], [
          MessageType.Disconnected,
          player.id,
        ]);
        client.close();
        if (PLAYERS[player.id]) {
          map.unset(PLAYERS[player.id]!.left, PLAYERS[player.id]!.top);
        }
        delete PLAYERS[player.id];
        delete CLIENTS[player.id];
      }
    }

    player.active = false;
  }

  nextFormationTimestamp = Date.now() + 1000 + nextFormation.time * 1000;
  setTimeout(endTurn, 1000 + nextFormation.time * 1000);
}

setTimeout(endTurn, nextFormation.time * 1000);

// Only listen on $ node server.js
const port = parseInt(process.argv[2] ?? '3000', 10);

if (!module.parent) server.listen(port);
console.log(`Server now listening on port ${port}...`);
