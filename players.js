var MAX_IDLE = 100
var IDLE_AFTER_TURNS = 6

var PLAYERS = this.PLAYERS = {}

var Player = this.Player = function Player(client) {
    this.id = client.id
    this.client = client
    this.idleTurns = 0
}

Player.get = function(client) {
  if (!PLAYERS[client.id]) PLAYERS[client.id] = new Player(client)
  return PLAYERS[client.id]
}

Player.byId = function(id) {
  return PLAYERS[id]
}

Player.getList = function() {
  var list = []
  for (var id in PLAYERS) {
      list.push(PLAYERS[id].getInfo())
  }
  return list
}

Player.getActive = function() {
  var n = 0
  for (var id in PLAYERS) {
      if (!PLAYERS[id].idleTurns) n++
  }
  return n
}

Player.endTurn = function(socket) {
  for (var id in PLAYERS) PLAYERS[id].endTurn()
}

Player.prototype = {
  setInfo: function(info) {
    for (var key in info) {
      if ((key == 'id') || (key == 'type')) continue
      if ((info[key] !== undefined) && (info[key] !== null)) this[key] = info[key]
    }
  },

  getInfo: function() {
    return {
      id: this.id,
      left: this.left,
      top: this.top,
      name: this.name,
      score: this.score,
      total: this.total,
      succeeded: this.succeeded
    }
  },

  setActive: function() {
    this.active = true
  },

  endTurn: function() {
    if (this.active) {
      this.idleTurns = 0
    } else {
      if (this.idleTurns == IDLE_AFTER_TURNS) {
        this.client.emit('idle', { id: this.id })
        this.client.broadcast.emit('idle', { id: this.id })
      }
      this.idleTurns++
      if (this.idleTurns > MAX_IDLE) this.kick()
    }
    this.active = false
  },

  login: function(userId, token) {
    this.userId = userId
    this.token = token
  },

  disconnect: function(sockets) {
    sockets.emit('disconnected', { id: this.id })
    delete PLAYERS[this.id]
  },

  kick: function(socket) {
    this.client.emit('kick', { reason: 'idle' })
    this.client.broadcast.emit('disconnected', { id: this.id })
    this.client.connection.end()
    delete PLAYERS[this.id]
  }

}
