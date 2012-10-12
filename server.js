var DEBUG = true

// Module dependencies.

var express = require('express')
var connect = require('connect')
var sys = require('sys')
var http = require('http')

var app = express()
var server = module.exports = http.createServer(app)
var io = require('socket.io').listen(server)

// Configuration

app.configure(function() {
  app.use('/', express.static(__dirname + '/public'))
})

app.configure('development', function(){
  app.use(connect.errorHandler({ dumpExceptions: true, showStack: true }))
})

app.configure('production', function(){
  app.use(connect.errorHandler())
})

// Routes

app.get('/', function(req, res) {
  res.sendfile('public/index.html')
})

// Error Handling

process.on('uncaughtException', function(e) {
  sys.log(e.stack)
})

process.on('SIGINT', function() {
  if (io.sockets) io.sockets.emit('restart')
  setTimeout(function() {
    process.exit()
  }, 2000)
})

// Model
var players = require('./players')
var PLAYERS = players.PLAYERS
var Player = players.Player

// IO

function onConnect(client) {

  client.emit('welcome', { id: client.id, players: Player.getList() })
  if (FORMATION && (TIME > 0)) client.emit('nextFormation', { formation: FORMATION.name, time: TIME })

  // cache state for new clients
  client.on('info', function(message) {
    Player.get(client).setInfo(message)
  })

  // mark players that are active
  client.on('info', function(message) {
    if (!message.name) Player.get(client).setActive()
  })

  client.on('formation', function(message) {
    Player.get(client).setActive()
    for (var i in message.ids) {
      Player.byId(message.ids[i]).setActive()
    }
  })

  // forward most events to other clients
  function forward(client, event) {
    client.on(event, function(message) {
      message.id = client.id
      client.broadcast.emit(event, message)
    })
  }
  ['flash', 'formation', 'info'].map(forward.bind(null, client))

  // player profile saving and loading
  client.on('save', function(message) {
    //Player.get(client.id).save(message)
  })

  client.on('load', function(message) {
    //Player.get(client.id).load(message.player)
  })

  client.on('disconnect', function() {
    Player.get(client).disconnect(io.sockets)
  })
}

io.sockets.on('connection', onConnect)

// Formation countdown

var formations = require('./public/js/formations.js').Formations
var compileFormation = require('./public/js/forms.js').compileFormations
formations = compileFormations(formations)

var FORMATIONS = []
var FORMATION
var MIN_SIZE = 3
var MAX_SIZE = 20
var MARGIN = 2000

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

var TIME = 1
setInterval(function() {
  TIME -= 1
  if (TIME != 0) return
  Player.endTurn(io.socket)
  sys.log('There are '+Player.getActive()+' active players.')
  FORMATION = pickFormation()
  if (!FORMATION) return
  TIME = -1
  setTimeout(function() {
    TIME = FORMATION.difficulty
    sys.log('Next formation is ' + FORMATION.name +', of size '+(FORMATION.size)+'.')
    io.sockets.emit('nextFormation', { formation: FORMATION.name, time: TIME })
  }, MARGIN)
}, 1000)

// Only listen on $ node server.js
var port = parseInt(process.env.PORT, 10) || parseInt(process.argv[2], 10) || 3000
if (!module.parent) server.listen(port)
sys.log('Server now listening on port '+port+'...')
