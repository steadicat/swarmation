var DEBUG = true

// Module dependencies.

var express = require('express')
var connect = require('connect')
var stylus = require('stylus')
var nib = require('nib')
var sys = require('sys')
var http = require('http')
var request = require('request')

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

var formationPage = '<html>' +
'<head prefix="og: http://ogp.me/ns# fb: http://ogp.me/ns/fb# swarmation: http://ogp.me/ns/fb/swarmation#">' +
'<meta property="fb:app_id" content="536327243050948" />' +
'<meta property="og:type" content="swarmation:formation" />' +
'<meta property="og:title" content="{name}" />' +
'<meta property="og:description" content="A formation of {points} players on Swarmation." />' +
'<meta property="og:url" content="http://swarmation.com/formations/{name}" />' +
'<meta property="og:image" content="http://swarmation.com/images/formations/{name}.png" />' +
'<meta property="swarmation:size" content="{points}" />' +
'</head></html>';

app.get('/formation/:name', function(req, res) {
  res.send(
    formationPage
      .replace(/\{name\}/g, req.params.name)
      .replace(/\{points\}/g, formations[req.params.name].size)
  )
})

// Error Handling

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

  // forward events to other clients
  function forward(client, event) {
    client.on(event, function(message) {
      message.id = client.id
      client.broadcast.emit(event, message)
    })
  }
  ['flash', 'info'].map(forward.bind(null, client))

  client.on('formation', function(message) {
    Player.get(client).setActive()
    client.broadcast.emit('formation', message)
    message.ids.forEach(function(id) {
      var player = Player.byId(id)
      if (player) player.setActive()
      if (player && player.userId) {
        request.post(
          'https://graph.facebook.com/'+player.userId+'/swarmation:join',
          { form: {
            access_token: config.token,
            formation: 'http://swarmation.com/formation/' + message.formation
          }},
          function(err, resp, body) {
            console.log('Published completion of ' + message.formation + ' for ' + player.userId, body)
          }
        )
      }
    })
  })

  client.on('login', function(message) {
    var player = Player.get(client)
    if (!player) return
    player.login(message.userId, message.token)
    console.log(      'https://graph.facebook.com/'+message.userId+'/scores?access_token=' + config.token)
    request.get(
      'https://graph.facebook.com/'+config.appId+'/scores?access_token=' + message.token,
      function(err, resp, body) {
        body = JSON.parse(body)
        player.score = body.data[0].score
        console.log('Got score for '+message.userId+': ' + player.score, body)
        io.sockets.emit('info', { id: client.id, score: player.score })
      }
    )
  })

  client.on('save', function(message) {
    // message.total, message.succeeded
    var player = Player.get(client)
    if (player && player.userId) {
      request.post(
        'https://graph.facebook.com/'+player.userId+'/scores',
        { form: {
          access_token: config.token,
          score: message.score }},
        function(err, resp, body) {
          console.log('Saved score', message.score, body)
        }
      )
    }
  })

  client.on('disconnect', function() {
    Player.get(client).disconnect(io.sockets)
  })
}

io.sockets.on('connection', onConnect)

// Formation countdown

var Forms = require('./js/forms.js')
var formations = Forms.getFormations()

var config = require('./config')

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
var port = parseInt(process.env.PORT, 10) || parseInt(process.argv[2], 10) || 80
if (!module.parent) server.listen(port)
sys.log('Server now listening on port '+port+'...')
