// Module dependencies.

var express = require('express')
var connect = require('connect')
var stylus = require('stylus')
var nib = require('nib')
var sys = require('sys')
var http = require('http')
var map = require('./map')
var util = require('./js/util')
var fb = require('./fb')

var app = express()
var server = module.exports = http.createServer(app)
var io = require('socket.io').listen(server)

// Configuration

var public = __dirname + '/public'
app.configure(function() {
  app.use(
    stylus.middleware({
      src: public,
      dest: public,
      compile: function(str, path) {
        return stylus(str)
          .set('filename', path)
          .set('compress', true)
          .define('url', stylus.url())
          .use(nib())
      }
    })
  )
  app.use('/', express.static(public))
})

app.configure('development', function() {
  app.use(connect.errorHandler({ dumpExceptions: true, showStack: true }))
})

app.configure('production', function() {
  app.use(connect.errorHandler())
})

io.configure('development', function() {
  io.set('log level', 2)
})
io.configure('production', function() {
  io.set('log level', 1)
  io.set('transports', [
    'websocket',
    'flashsocket',
    'htmlfile',
    'xhr-polling',
    'jsonp-polling'
  ])
  io.enable('browser client minification')
  io.enable('browser client etag')
  io.enable('browser client gzip')
})

// Routes

app.get('/', function(req, res) {
  res.sendfile('public/index.html')
})

var formationPage = '<html>' +
'<head prefix="og: http://ogp.me/ns# fb: http://ogp.me/ns/fb# swarmation: http://ogp.me/ns/fb/swarmation#">' +
'<meta property="fb:app_id" content="536327243050948" />' +
'<meta property="og:type" content="swarmation:formation" />' +
'<meta property="og:title" content="{name}" />' +
'<meta property="og:description" content="A formation of {points} players on Swarmation." />' +
'<meta property="og:url" content="http://swarmation.com/formation/{name}" />' +
'<meta property="og:image" content="http://swarmation.com/formation/{name}.png" />' +
'<meta property="swarmation:size" content="{points}" />' +
'</head></html>';

var images = require('./images')

app.get('/formation/:name.png', function(req, res) {
  var formation = formations[req.params.name]
  if (!formation) res.send(404)
  images.getImage(formation, function(err, buffer) {
    if (err) throw err
    res.type('png').send(buffer)
  })
})

app.get('/formation/:name', function(req, res) {
  var formation = formations[req.params.name]
  if (!formation) res.send(404)
  res.send(
    formationPage
      .replace(/\{name\}/g, req.params.name)
      .replace(/\{points\}/g, formation.size)
  )
})


// Error Handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.send(500, 'Something broke!');
});

process.on('uncaughtException', function(e) {
  sys.log(e.stack)
})

function shutdown() {
  if (io.sockets) io.sockets.emit('restart')
  setTimeout(function() {
    process.exit()
  }, 2000)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
process.on('SIGHUP', shutdown)

// Model
var map = require('./map')
var players = require('./players')
var PLAYERS = players.PLAYERS
var Player = players.Player

// IO

function onConnect(client) {

  client.emit('welcome', { id: client.id, players: Player.getList() })
  if (FORMATION && (TIME > 0)) client.emit('nextFormation', { formation: FORMATION.name, time: TIME })

  client.on('info', function(message) {
    var player = Player.get(client)
    player.setInfo(message)
    // mark players that are active
    if (!message.name) player.setActive()
    message.id = client.id
    client.broadcast.emit('info', message)
  })

  client.on('flash', function(message) {
    message.id = client.id
    client.broadcast.emit('info', message)
  })

  client.on('login', function(message) {
    var player = Player.get(client)
    if (!player) return
    player.login(message.userId, message.token)
    fb.get(config.appId + '/scores', message.token, function(err, res) {
      if (err) throw err
      player.score = res.data[0].score
      sys.log('FB: Loaded score for user '+message.userId+': ' + player.score)
      io.sockets.emit('info', { id: client.id, score: player.score })
    })
  })

  client.on('disconnect', function() {
    Player.get(client).disconnect(io.sockets)
  })
}

io.sockets.on('connection', onConnect)

// Formation countdown

var Forms = require('./forms')
var formations = Forms.getFormations()

var config = require('./config')

var FORMATIONS = []
var FORMATION
var MIN_SIZE = 3
var MAX_SIZE = 20

for (var i=0; i<=MAX_SIZE; i++) FORMATIONS[i] = []

for (var id in formations) {
  for (var i=formations[id].size; i<=MAX_SIZE; i++) {
    FORMATIONS[i].push(formations[id])
  }
}

function pickFormation() {
  var available = FORMATIONS[Math.max(MIN_SIZE, Math.min(Player.getActive(), MAX_SIZE))]
  if (available.length == 0) return
  return available[Math.floor(Math.random()*available.length)]
}

function startTurn() {
  sys.log('There are '+Player.getActive()+' active players.')
  FORMATION = pickFormation()
  while (!FORMATION) FORMATION = pickFormation()
  TIME = FORMATION.difficulty
  sys.log('Next formation is ' + FORMATION.name +', of size '+(FORMATION.size)+'.')
  io.sockets.emit('nextFormation', { formation: FORMATION.name, time: TIME })
}

var MAX_POINTS = 26

function endTurn() {
  var players = map.checkFormation(FORMATION, PLAYERS)
  var gain = FORMATION.difficulty
  var loss = Math.round((MAX_POINTS-FORMATION.difficulty)/4)
  var ids = Object.keys(players)
  io.sockets.emit('formation', {
    formation: FORMATION.name,
    difficulty: FORMATION.difficulty,
    gain: gain,
    loss: loss,
    ids: ids
  })
  util.each(players, function(id, player) {
    player.setActive()
    if (ids.indexOf(id) >= 0) {
      player.score += gain
    } else {
      player.score = Math.max(0, player.score-loss)
    }
    if (player.userId) {
      // post formation
      fb.post(
        player.userId+'/swarmation:join',
        config.token,
        { formation: 'http://swarmation.com/formation/' + FORMATION.name },
        function(err, res) {
          if (err) throw err
          sys.log('FB: Published completion of ' + FORMATION.name + ' for ' + player.userId)
        }
      )
      // save score
      fb.post(
        player.userId+'/scores',
        config.token,
        { score: player.score },
        function(err, res) {
          if (err) throw err
          sys.log('FB: Saved score of ' + player.score + ' for ' + player.userId)
        }
      )
    }
  })
  Player.endTurn()
}

// main loop
var TIME = 0
setInterval(function() {
  TIME--
  if (TIME == 0) {
    if (FORMATION) endTurn()
  }
  if (TIME == -1) startTurn()
}, 1000)

// Only listen on $ node server.js
var port = parseInt(process.env.PORT, 10) || parseInt(process.argv[2], 10) || 80
if (!module.parent) server.listen(port)
sys.log('Server now listening on port '+port+'...')

