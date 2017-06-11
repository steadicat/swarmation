// Module dependencies.
import * as errorhandler from 'errorhandler';
import * as express from 'express';
import * as http from 'http';
import * as SocketIO from 'socket.io';
import * as config from '../config';
import {getFormations, sizeRange} from '../formations';
import * as util from '../util';
import * as fb from './fb';
import * as map from './map';
import {Player, PLAYERS} from './players';

const app = express();
const server = http.createServer(app);
export default server;
const io = SocketIO(server);

// Configuration

const DEBUG = process.env.NODE_ENV !== 'production';

if (DEBUG) {
  app.use(errorhandler());
  app.use('/', express.static('public'));
} else {
  app.use(errorhandler());
}

// Routes

const formationPage = `
<html>
  <head prefix="og: http://ogp.me/ns# fb: http://ogp.me/ns/fb# swarmation: http://ogp.me/ns/fb/swarmation#">
    <meta property="fb:app_id" content="536327243050948" />
    <meta property="og:type" content="game.achievement" />
    <meta property="og:title" content="{name}" />
    <meta property="og:description" content="Joined a formation of {points} players on Swarmation." />
    <meta property="og:url" content="http://swarmation.com/formation/{name}" />
    <meta property="og:image" content="http://swarmation.com/formation/{name}.png" />
    <meta property="game:points" content="{points}" />
  </head>
</html>`;

app.get('/formation/:name', (req, res) => {
  const formation = formations[req.params.name];
  if (!formation) {
    console.log(`Formation ${req.params.name} not found`, formations);
    res.send(404);
    return;
  }
  res.send(formationPage.replace(/\{name\}/g, req.params.name).replace(/\{points\}/g, formation.size + ''));
});

// Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

process.on('uncaughtException', e => {
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

// IO

function onConnect(client) {
  client.emit('welcome', {id: client.id, players: Player.getList()});
  if (FORMATION && TIME > 0)
    client.emit('nextFormation', {
      formation: FORMATION.name,
      time: TIME,
      map: FORMATION.map,
      active: Player.getActive(),
    });

  client.on('info', message => {
    const player = Player.get(client);
    player.setInfo(message);
    // mark players that are active
    if (!message.name) player.setActive();
    message.id = client.id;
    client.broadcast.emit('info', message);
  });

  client.on('flash', message => {
    message.id = client.id;
    client.broadcast.emit('flash', message);
  });

  client.on('lockIn', message => {
    message.id = client.id;
    client.broadcast.emit('lockIn', message);
  });

  client.on('login', message => {
    const player = Player.get(client);
    if (!player) return;
    player.login(message.userId, message.token);
    fb.get(config.appId + '/scores', message.token, (err, res) => {
      if (err) throw err;
      player.score = res.data[0].score;
      console.log('FB: Loaded score for user ' + message.userId + ': ' + player.score);
      io.sockets.emit('info', {id: client.id, score: player.score});
    });
  });

  client.on('disconnect', () => {
    Player.get(client).disconnect(io.sockets);
  });
}

io.sockets.on('connection', onConnect);

// Formation countdown

const formations = getFormations();

const FORMATIONS = [];
let FORMATION;
const [MIN_SIZE, MAX_SIZE] = sizeRange(formations);

for (let i = 0; i <= MAX_SIZE; i++) FORMATIONS[i] = [];

for (const id in formations) {
  const formation = formations[id];
  for (let i = formation.size; i <= MAX_SIZE; i++) {
    FORMATIONS[i].push(formation);
  }
}

function pickFormation() {
  const available = FORMATIONS[Math.max(MIN_SIZE, Math.min(Player.getActive(), MAX_SIZE))];
  if (available.length === 0) return;
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
  });
  for (const id of ids) {
    const player = players[id];
    player.setActive();
    if (ids.indexOf(id) >= 0) {
      player.score += gain;
    } else {
      player.score = Math.max(0, player.score - loss);
    }
    if (player.userId) {
      // post formation
      fb.post(
        player.userId + '/achievements',
        config.token,
        {achievement: 'http://swarmation.com/formation/' + FORMATION.name},
        (err, res) => {
          if (err) throw err;
          console.log(`FB: Published completion of ${FORMATION.name} for ${player.userId}.`);
        }
      );
      // save score
      fb.post(player.userId + '/scores', config.token, {score: player.score}, (err, res) => {
        if (err) throw err;
        console.log(`FB: Saved score of ${player.score} for ${player.userId}.`);
      });
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
