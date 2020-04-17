// Module dependencies.
import * as errorhandler from 'errorhandler';
import * as express from 'express';
import * as http from 'http';
import * as SocketIO from 'socket.io';
import {Formation, getFormations, sizeRange} from '../formations';
import {
  FlashMessage,
  FormationMessage,
  InfoMessage,
  LockInMessage,
  NextFormationMessage,
  WelcomeMessage,
} from '../types';
import * as map from './map';
import {Player, PLAYERS} from './players';

const app = express();
const server = http.createServer(app);
const io = SocketIO(server);

// Configuration

app.use(errorhandler());
app.use('/', express.static('public'));

// Routes

// Error Handling
app.use((err: Error | null, _: express.Request, res: express.Response, _next: unknown) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

process.on('uncaughtException', (e: Error) => {
  console.log(e.stack);
});

function shutdown() {
  if (io.sockets) io.sockets.emit('restart');
  setTimeout(() => {
    process.exit();
  }, 2000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGHUP', shutdown);

// Events

const PlayerEvents = {
  info(player: Player, message: InfoMessage) {
    player.setInfo(message);
    // mark players that are active
    if (!message.name) player.setActive();
    message.id = player.id;
    io.to(ROOM).emit('info', message);
  },

  flash(player: Player, message: FlashMessage) {
    message.id = player.id;
    io.to(ROOM).emit('flash', message);
  },

  lockIn(player: Player, message: FlashMessage) {
    message.id = player.id;
    io.to(ROOM).emit('lockIn', message);
  },

  disconnect(player: Player) {
    player.disconnect(io.sockets);
  },
};

// IO

const ROOM = 'main';

io.sockets.on('connection', (client: SocketIO.Socket) => {
  client.join(ROOM);
  client.emit('welcome', {id: client.id, players: Player.getList()} as WelcomeMessage);

  if (FORMATION && TIME > 0) {
    client.emit('nextFormation', {
      formation: FORMATION.name,
      time: TIME,
      map: FORMATION.map,
      active: Player.getActive(),
    } as NextFormationMessage);
  }

  client.on('info', (message: InfoMessage) => PlayerEvents.info(Player.get(client), message));
  client.on('flash', (message: FlashMessage) => PlayerEvents.flash(Player.get(client), message));
  client.on('lockIn', (message: LockInMessage) => PlayerEvents.lockIn(Player.get(client), message));
  client.on('disconnect', () => {
    client.leave(ROOM);
    PlayerEvents.disconnect(Player.get(client));
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

function pickFormation(): Formation | null {
  const available = FORMATIONS[Math.max(MIN_SIZE, Math.min(Player.getActive(), MAX_SIZE))];
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

function startTurn() {
  console.log(`Starting turn with ${Player.getCount()} players (${Player.getActive()} active).`);
  FORMATION = pickFormation();
  while (!FORMATION) FORMATION = pickFormation();
  TIME = FORMATION.difficulty;
  console.log(`Next formation is ${FORMATION.name} of size ${FORMATION.size}.`);
  io.sockets.emit('nextFormation', {
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
  io.sockets.emit('formation', {
    formation: FORMATION.name,
    difficulty: FORMATION.difficulty,
    gain,
    loss,
    ids,
  } as FormationMessage);
  for (const id of ids) {
    const player = players[id];
    player.setActive();
    if (ids.indexOf(id) >= 0) {
      player.score += gain;
    } else {
      player.score = Math.max(0, player.score - loss);
    }
  }
  Player.endTurn();
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
const port = parseInt(process.env.PORT, 10) || parseInt(process.argv[2], 10) || 3000;
if (!module.parent) server.listen(port);
console.log('Server now listening on port ' + port + '...');
