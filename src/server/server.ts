import Bugsnag from '@bugsnag/js';
import BugsnagPluginExpress from '@bugsnag/plugin-express';
import express from 'express';
import * as http from 'http';
import * as path from 'path';
import {WebSocketServer} from 'ws';

import {directions} from '../client/directions.js';
import {getFormations} from '../formations.js';
import * as map from '../map.js';
import {serverListen, serverSend, MessageType} from '../protocol.js';
import {
  addSubscriber,
  removeSubscriber,
  sendNotification,
  getSubscribers,
  updateSubscriber,
} from './notifications.js';
import {validate, sign} from './signing.js';

if (process.env.NODE_ENV === 'production') {
  Bugsnag.start({
    apiKey: '598a6c87f69350bfffd18829c6e8a87c',
    plugins: [BugsnagPluginExpress],
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
const PLAYERS: {[id: number]: Player | undefined} = {};

const formations = Object.values(getFormations());

// Configuration

const app = express();

let middleware;

if (process.env.NODE_ENV === 'production') {
  middleware = Bugsnag.getPlugin('express');
  app.use(middleware.requestHandler);
}

const server = http.createServer(app);
const wss = new WebSocketServer({server, path: '/ws'});

app.use(
  '/',
  express.static('public', {
    setHeaders(res, path) {
      if (process.env.NODE_ENV !== 'production') return;
      const mime = express.static.mime.lookup(path);
      if (mime === 'application/javascript') {
        res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
      } else if (mime === 'text/css') {
        res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
      } else if (mime !== 'text/html') {
        res.setHeader('Cache-Control', 'public, max-age=360');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=60');
      }
    },
  })
);
app.use(express.urlencoded({extended: true}));

// Routes
app.get('/status', (_, res) => {
  res.send({capacity: Object.keys(PLAYERS).length / 100});
});

app.post('/subscribe', async (req, res) => {
  await addSubscriber(req.body.email);
  res.send({ok: true});
});

app.get('/unsubscribe/:id', async (req, res) => {
  await removeSubscriber(req.params.id);
  res.redirect('/unsubscribed.html');
});

app.post('/notify', async (req, res) => {
  const isValid = req.body.signature !== undefined && validate(req.body.signature);
  if (!isValid) return res.status(403).send({error: 'forbidden', message: 'Forbidden'});

  const subscribers = await getSubscribers();

  for (const {id, email, lastNotified} of subscribers) {
    if (new Date(lastNotified).valueOf() > Date.now() - 60 * 60 * 1000) continue;
    try {
      await sendNotification(id, email);
      await updateSubscriber(id);
    } catch (err) {
      Bugsnag.notify(err);
      console.error(err);
      continue;
    }
  }

  res.send({ok: true});
});

// Error Handling

app.get('*', async (req, res) => {
  res.status(404).sendFile(path.resolve('public/404.html'));
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error | null, _: express.Request, res: express.Response, _next: unknown) => {
  err && Bugsnag.notify(err);
  res.status(500).sendFile(path.resolve('public/500.html'));
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

  serverSend(
    [client],
    [
      MessageType.Welcome,
      id,
      Object.values(PLAYERS) as Player[],
      nextFormation.name,
      (nextFormationTimestamp - Date.now()) / 1000,
      nextFormation.map,
    ]
  );

  serverSend(Object.values(CLIENTS).filter((c) => c !== client) as WebSocket[], [
    MessageType.Player,
    player,
  ]);

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
        player.active = true;
        serverSend(Object.values(CLIENTS).filter((c) => c !== client) as WebSocket[], [
          MessageType.StartFlash,
          player.id,
        ]);
        break;
      }

      case MessageType.StopFlash: {
        player.active = true;
        serverSend(Object.values(CLIENTS).filter((c) => c !== client) as WebSocket[], [
          MessageType.StopFlash,
          player.id,
        ]);
        break;
      }

      case MessageType.LockIn: {
        player.active = true;
        player.lockedIn = true;
        serverSend(Object.values(CLIENTS).filter((c) => c !== client) as WebSocket[], [
          MessageType.LockIn,
          player.id,
        ]);
        break;
      }

      case MessageType.Subscribe: {
        const [, email] = message;
        addSubscriber(email);
        break;
      }

      default:
        Bugsnag.notify(
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

server.listen(port);
console.log(`Server now listening on port ${port}...`);
