import * as express from 'express';
import * as http from 'http';
import * as SocketIO from 'socket.io';
import {Formation, getFormations, sizeRange} from '../formations';
import * as map from '../map';
import {validate, sign} from './signing';
import {serverListen, serverEmit, serverBroadcast} from '../protocol';
import {Player} from '../player';
import Bugsnag from '@bugsnag/js';
import BugsnagPluginExpress from '@bugsnag/plugin-express';
import {directions} from '../client/directions';

Bugsnag.start({
  apiKey: '598a6c87f69350bfffd18829c6e8a87c',
  plugins: [BugsnagPluginExpress],
});

const WIDTH = 84;
const HEIGHT = 60;

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

var middleware = Bugsnag.getPlugin('express');

const app = express();
app.use(middleware.requestHandler);

const server = http.createServer(app);
const io = SocketIO(server);

// Configuration

app.use('/', express.static('public'));

// Routes

// Error Handling
app.use((err: Error | null, _: express.Request, res: express.Response, _next: unknown) => {
  err && Bugsnag.notify(err);
  res.status(500).send('Something broke!');
});

app.use(middleware.errorHandler);

process.on('uncaughtException', (e: Error) => {
  console.log(e.stack);
});

function shutdown() {
  if (io.sockets) serverEmit(io.sockets, {type: 'restart'});
  setTimeout(() => {
    process.exit();
  }, 2000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGHUP', shutdown);

export const PLAYERS: {[id: string]: Player} = {};

function getActivePlayers(): number {
  let n = 0;
  for (const id in PLAYERS) {
    if (!PLAYERS[id]!.idleTurns) n++;
  }
  return n;
}

// IO

io.sockets.on('connection', (client: SocketIO.Socket) => {
  let left;
  let top;
  do {
    left = Math.floor(Math.random() * WIDTH);
    top = Math.floor(Math.random() * HEIGHT);
  } while (map.exists(left, top));

  const name = NAMES[Math.floor(Math.random() * NAMES.length)];

  const player = {
    id: client.id,
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
  PLAYERS[client.id] = player;
  CLIENTS[client.id] = client;
  map.set(left, top, player);

  serverEmit(client, {type: 'welcome', id: client.id, players: Object.values(PLAYERS)});
  serverBroadcast(client, {type: 'player', player});

  if (FORMATION && TIME > 0) {
    serverEmit(client, {
      type: 'nextFormation',
      formation: FORMATION.name,
      time: TIME,
      map: FORMATION.map,
      active: getActivePlayers(),
    });
  }

  client.on('disconnect', () => {
    serverEmit(io.sockets, {type: 'disconnected', id: player.id});
    map.unset(PLAYERS[player.id].left, PLAYERS[player.id].top);
    delete PLAYERS[player.id];
    delete CLIENTS[player.id];
  });

  serverListen(client, (message) => {
    switch (message.type) {
      case 'restore': {
        const saveData = validate(message.data) as {
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
          serverEmit(io.sockets, {type: 'player', player});
        }
        break;
      }

      case 'move': {
        const {left, top, id} = player;
        const {direction, time} = message;
        const [newLeft, newTop] = directions[direction](left, top);
        player.active = true;
        const moved = map.move(left, top, newLeft, newTop, player);
        if (moved) {
          player.left = newLeft;
          player.top = newTop;
        }
        serverEmit(io.sockets, {type: 'position', id, left: player.left, top: player.top, time});
        break;
      }

      case 'flash': {
        serverBroadcast(client, {...message, id: player.id});
        break;
      }

      case 'lockIn': {
        player.lockedIn = true;
        serverBroadcast(client, {...message, id: player.id});
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

const formations = getFormations();

const FORMATIONS: Formation[][] = [];
let FORMATION: Formation;
const [MIN_SIZE, MAX_SIZE] = sizeRange(formations);

for (let i = 0; i <= MAX_SIZE; i++) FORMATIONS[i] = [];

for (const id in formations) {
  const formation = formations[id];
  for (let i = formation.size; i <= MAX_SIZE; i++) {
    FORMATIONS[i].push(formation);
  }
}

function pickFormation(): Formation {
  const available = FORMATIONS[Math.max(MIN_SIZE, Math.min(getActivePlayers(), MAX_SIZE))];
  if (available.length === 0) throw new Error('No formations available');
  return available[Math.floor(Math.random() * available.length)];
}

function startTurn() {
  const playerCount = Object.keys(PLAYERS).length;
  console.log(`Starting turn with ${playerCount} players (${getActivePlayers()} active).`);
  FORMATION = pickFormation();
  while (!FORMATION) FORMATION = pickFormation();
  TIME = FORMATION.difficulty;
  console.log(`Next formation is ${FORMATION.name} of size ${FORMATION.size}.`);
  serverEmit(io.sockets, {
    type: 'nextFormation',
    formation: FORMATION.name,
    time: TIME,
    map: FORMATION.map,
    active: getActivePlayers(),
  });
}

const MAX_POINTS = 26;
const MAX_IDLE = 120;
const IDLE_AFTER_TURNS = 2;

const CLIENTS: {[id: string]: SocketIO.Socket | undefined} = {};

function endTurn() {
  const players = map.checkFormation(FORMATION, PLAYERS);
  const gain = FORMATION.difficulty;
  const loss = Math.round((MAX_POINTS - FORMATION.difficulty) / 4);
  const ids = Object.keys(players);
  console.log(`Formation ${FORMATION.name} completed with ${ids.length} participants.`);
  for (const player of Object.values(PLAYERS)) {
    player.total++;
    player.lockedIn = false;
    if (ids.indexOf(player.id) >= 0) {
      player.succeeded++;
      player.active = true;
      player.score += gain;
    } else {
      player.score = Math.max(0, player.score - loss);
    }
    const client = CLIENTS[player.id];
    if (!client) throw new Error('Client for player not found');
    serverEmit(client, {
      type: 'formation',
      formation: FORMATION.name,
      difficulty: FORMATION.difficulty,
      gain,
      loss,
      ids,
      save: sign({
        score: player.score,
        succeeded: player.succeeded,
        total: player.total,
        name: player.name,
      }),
    });
    if (player.active) {
      player.idleTurns = 0;
    } else {
      const client = CLIENTS[player.id];
      if (!client) throw new Error('Client for player not found');
      if (player.idleTurns === IDLE_AFTER_TURNS) {
        player.active = false;
        serverEmit(client, {type: 'idle', id: player.id});
        serverEmit(client.broadcast, {type: 'idle', id: player.id});
      }
      player.idleTurns++;
      if (player.idleTurns > MAX_IDLE) {
        serverEmit(client, {type: 'kick', reason: 'idle'});
        serverBroadcast(client, {type: 'disconnected', id: player.id});
        client.disconnect(true);
        map.unset(PLAYERS[player.id].left, PLAYERS[player.id].top);
        delete PLAYERS[player.id];
        delete CLIENTS[player.id];
      }
    }
    player.active = false;
  }
}

// main loop
let TIME = 0;
setInterval(() => {
  TIME--;
  if (TIME === 0) {
    if (FORMATION) endTurn();
  }
  if (TIME === -1) startTurn();
}, 1000);

// Only listen on $ node server.js
const port = parseInt(process.env.PORT || '0', 10) || parseInt(process.argv[2], 10) || 3000;
if (!module.parent) server.listen(port);
console.log('Server now listening on port ' + port + '...');
