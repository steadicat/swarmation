// Module dependencies.

var express = require('express')
var errorhandler = require('errorhandler')
var util = require('util')
var http = require('http')
var map = require('./map')
var util = require('./js/util')
var fb = require('./fb')

var app = express()
var server = module.exports = http.createServer(app)
var io = require('socket.io')(server)

// Configuration

var DEBUG = process.env.NODE_ENV !== 'production';

if (DEBUG) {
  app.use(errorhandler({ dumpExceptions: true, showStack: true }))
} else {
  app.use(errorhandler())
}

app.use('/', express.static(__dirname + '/public'))

// Routes

app.get('/', function(req, res) {
  res.sendFile('public/index.html')
})

var formationPage = '<html>' +
'<head prefix="og: http://ogp.me/ns# fb: http://ogp.me/ns/fb# swarmation: http://ogp.me/ns/fb/swarmation#">' +
'<meta property="fb:app_id" content="536327243050948" />' +
'<meta property="og:type" content="game.achievement" />' +
'<meta property="og:title" content="{name}" />' +
'<meta property="og:description" content="Joined a formation of {points} players on Swarmation." />' +
'<meta property="og:url" content="http://swarmation.com/formation/{name}" />' +
'<meta property="og:image" content="http://swarmation.com/formation/{name}.png" />' +
'<meta property="game:points" content="{points}" />' +
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
  console.log(e.stack)
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
  if (FORMATION && (TIME > 0)) client.emit('nextFormation', {
    formation: FORMATION.name, time: TIME, map: FORMATION.map, active: Player.getActive()
  })

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
    client.broadcast.emit('flash', message)
  })

  client.on('login', function(message) {
    var player = Player.get(client)
    if (!player) return
    player.login(message.userId, message.token)
    fb.get(config.appId + '/scores', message.token, function(err, res) {
      if (err) throw err
      player.score = res.data[0].score
      console.log('FB: Loaded score for user '+message.userId+': ' + player.score)
      io.sockets.emit('info', { id: client.id, score: player.score })
    })
  })

  client.on('disconnect', function() {
    Player.get(client).disconnect(io.sockets)
  })
}

io.sockets.on('connection', onConnect)

// Formation countdown

var formations = require('./formations').getFormations()
var config = require('./config')

var FORMATIONS = []
var FORMATION
var MIN_SIZE = 3
var MAX_SIZE = 20

for (var i=0; i<=MAX_SIZE; i++) FORMATIONS[i] = []

util.each(formations, function(id, formation) {
  for (var i=formation.size; i<=MAX_SIZE; i++) {
    FORMATIONS[i].push(formation)
  }

  // register achievements with FB
  fb.post(config.appId + '/achievements', config.token, {
    achievement: 'http://swarmation.com/formation/' + formation.name
  }, function(err, res) {
    if (err) throw err
    console.log('FB: Registered formation ' + formation.name)
  })
})

function pickFormation() {
  var available = FORMATIONS[Math.max(MIN_SIZE, Math.min(Player.getActive(), MAX_SIZE))]
  if (available.length == 0) return
  return available[Math.floor(Math.random()*available.length)]
}

function startTurn() {
  console.log('There are '+Player.getActive()+' active players.')
  FORMATION = pickFormation()
  while (!FORMATION) FORMATION = pickFormation()
  TIME = FORMATION.difficulty
  console.log('Next formation is ' + FORMATION.name +', of size '+(FORMATION.size)+'.')
  io.sockets.emit('nextFormation', {
    formation: FORMATION.name, time: TIME, map: FORMATION.map, active: Player.getActive()
  })
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
        player.userId+'/achievements',
        config.token,
        { achievement: 'http://swarmation.com/formation/' + FORMATION.name },
        function(err, res) {
          if (err) throw err
          console.log('FB: Published completion of ' + FORMATION.name + ' for ' + player.userId)
        }
      )
      // save score
      fb.post(
        player.userId+'/scores',
        config.token,
        { score: player.score },
        function(err, res) {
          if (err) throw err
          console.log('FB: Saved score of ' + player.score + ' for ' + player.userId)
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
var port = parseInt(process.env.PORT, 10) || parseInt(process.argv[2], 10) || 3000
if (!module.parent) server.listen(port)
console.log('Server now listening on port '+port+'...')
