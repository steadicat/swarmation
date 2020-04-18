// Module dependencies.
import * as errorhandler from 'errorhandler';
import * as express from 'express';
import * as http from 'http';
import * as SocketIO from 'socket.io';
import {Formation, getFormations, sizeRange} from '../formations';
import * as map from './map';
import {Player, PLAYERS} from './players';
import {validate} from './signing';
import {serverListen, serverEmit, serverBroadcast} from '../protocol';

const app = express();
const server = http.createServer(app);
const io = SocketIO(server);

// Configuration

app.use(errorhandler());
app.use('/', express.static('public'));

// Routes

// Error Handling
app.use((err: Error | null, _: express.Request, res: express.Response, _next: unknown) => {
  err && console.error(err.stack);
  res.status(500).send('Something broke!');
});

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

// IO

io.sockets.on('connection', (client: SocketIO.Socket) => {
  const scores = Object.values(PLAYERS).map((player) => player.getScore());
  const positions = Object.values(PLAYERS).map((player) => player.getPosition());
  serverEmit(client, {type: 'welcome', id: client.id, scores, positions});

  if (FORMATION && TIME > 0) {
    serverEmit(client, {
      type: 'nextFormation',
      formation: FORMATION.name,
      time: TIME,
      map: FORMATION.map,
      active: Player.getActive(),
    });
  }

  serverListen(client, (message) => {
    switch (message.type) {
      case 'progress': {
        const player = Player.get(client);
        const validProgress = validate(message.progress) as {
          score: number;
          succeeded: number;
          total: number;
        } | null;
        if (validProgress) {
          const {score, succeeded, total} = validProgress;
          serverEmit(io.sockets, {type: 'score', id: player.id, score, succeeded, total});
        }
        break;
      }

      case 'position': {
        const player = Player.get(client);
        player.setPosition(message);
        player.setActive();
        serverBroadcast(client, {...message, id: player.id});
        break;
      }

      case 'flash': {
        const player = Player.get(client);
        serverBroadcast(client, {...message, id: player.id});
        break;
      }

      case 'lockIn': {
        const player = Player.get(client);
        serverBroadcast(client, {...message, id: player.id});
        break;
      }

      default:
        // @ts-ignore
        throw new Error(`Message type ${message.type} not implemented`);
    }
  });

  client.on('disconnect', () => {
    const player = Player.get(client);
    player.disconnect(io.sockets);
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
  const available = FORMATIONS[Math.max(MIN_SIZE, Math.min(Player.getActive(), MAX_SIZE))];
  if (available.length === 0) throw new Error('No formations available');
  return available[Math.floor(Math.random() * available.length)];
}

function startTurn() {
  console.log(`Starting turn with ${Player.getCount()} players (${Player.getActive()} active).`);
  FORMATION = pickFormation();
  while (!FORMATION) FORMATION = pickFormation();
  TIME = FORMATION.difficulty;
  console.log(`Next formation is ${FORMATION.name} of size ${FORMATION.size}.`);
  serverEmit(io.sockets, {
    type: 'nextFormation',
    formation: FORMATION.name,
    time: TIME,
    map: FORMATION.map,
    active: Player.getActive(),
  });
}

const MAX_POINTS = 26;

function endTurn() {
  const players = map.checkFormation(FORMATION, PLAYERS);
  const gain = FORMATION.difficulty;
  const loss = Math.round((MAX_POINTS - FORMATION.difficulty) / 4);
  const ids = Object.keys(players);
  console.log(`Formation ${FORMATION.name} completed with ${ids.length} participants.`);
  serverEmit(io.sockets, {
    type: 'formation',
    formation: FORMATION.name,
    difficulty: FORMATION.difficulty,
    gain,
    loss,
    ids,
  });
  for (const player of Object.values(PLAYERS)) {
    if (ids.indexOf(player.id) >= 0) {
      player.setActive();
      player.score += gain;
    } else {
      player.score = Math.max(0, player.score - loss);
    }
    player.endTurn();
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
